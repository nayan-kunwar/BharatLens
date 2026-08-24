import {
  computeEvidenceStrength,
  isOfficialSourceType,
  statusesAfterSuccessfulAnalysis,
} from '@bharatlens/shared';
import type { EventCatalog } from '@bharatlens/database';
import type { AnalysisModel } from './provider.js';
import { buildAnalysisPrompt, PROMPT_VERSION } from './prompt.js';
import { parseEventAnalysisJson, validateEventAnalysis } from './schema.js';
import { sanitizeEventAnalysis } from './sanitize.js';

export type AnalyzeEventResult = {
  eventSlug: string;
  runId: string;
  status: 'SUCCEEDED' | 'FAILED';
  modelName: string;
  promptVersion: string;
  assessmentId?: string;
  assessmentVersion?: number;
  chainId?: string;
  chainVersion?: number;
  claimsCreated: number;
  watchItemsAdded: number;
  eventStatus?: string;
  errorMessage?: string;
};

export async function analyzeEvent(input: {
  catalog: EventCatalog;
  eventSlug: string;
  model: AnalysisModel;
}): Promise<AnalyzeEventResult> {
  const event = await input.catalog.getEventBySlug(input.eventSlug);
  if (!event) {
    throw new Error(`Event not found: ${input.eventSlug}`);
  }

  const context = await input.catalog.loadAnalysisContext(event.id);
  const evidenceUrls = [
    ...new Set([
      ...context.articles.map((article) => article.url),
      ...context.evidence.map((row) => row.url),
    ]),
  ];
  const allowedUrls = new Set(evidenceUrls);

  const inputReferences = {
    eventId: event.id,
    claimIds: context.claims.map((claim) => claim.id),
    articleIds: context.articles.map((article) => article.id),
    evidenceUrls,
  };

  const run = await input.catalog.startAnalysisRun({
    eventId: event.id,
    modelName: input.model.name,
    promptVersion: PROMPT_VERSION,
    inputReferences,
  });

  const base = {
    eventSlug: event.slug,
    runId: run.id,
    modelName: input.model.name,
    promptVersion: PROMPT_VERSION,
    claimsCreated: 0,
    watchItemsAdded: 0,
  };

  try {
    const prompt = buildAnalysisPrompt({
      title: context.event.title,
      slug: context.event.slug,
      summary: context.event.summary,
      description: context.event.description,
      eventType: context.event.eventType,
      countries: context.countries,
      topics: context.topics,
      claims: context.claims.map((claim) => ({
        statement: claim.statement,
        type: claim.type,
        status: claim.status,
        evidenceStrength: claim.evidenceStrength,
      })),
      articles: context.articles.map((article) => ({
        title: article.title,
        url: article.url,
        summary: article.summary,
      })),
      evidenceUrls,
    });

    const raw = await input.model.complete(prompt);
    const parsed = parseEventAnalysisJson(raw);
    const validated = validateEventAnalysis(parsed);
    const analysis = sanitizeEventAnalysis(validated, allowedUrls);

    const sourceIds = new Set(context.evidence.map((row) => row.sourceId));
    const officialIds = new Set(
      context.evidence
        .filter((row) => isOfficialSourceType(row.sourceType))
        .map((row) => row.sourceId),
    );
    const evidenceStrength = computeEvidenceStrength({
      sourceCount: sourceIds.size,
      independentSourceCount: sourceIds.size,
      officialSourceCount: officialIds.size,
    });

    const assessment = await input.catalog.createImpactAssessment({
      eventId: event.id,
      overallLevel: analysis.indiaImpact.overallLevel,
      reasoning: analysis.indiaImpact.reasoning,
      evidenceStrength,
      analysisConfidence: analysis.indiaImpact.analysisConfidence,
      categories: analysis.indiaImpact.categories,
      status: 'DRAFT',
      modelName: input.model.name,
      promptVersion: PROMPT_VERSION,
    });

    await input.catalog.setEventTypeIfEmpty(event.id, analysis.eventType);

    let claimsCreated = 0;
    const existingStatements = new Set(context.claims.map((claim) => claim.statement));
    for (const claim of analysis.claims) {
      const created = await input.catalog.addClaim({
        eventId: event.id,
        statement: claim.statement,
        type: claim.type,
        status: 'PENDING',
      });
      if (!existingStatements.has(claim.statement)) {
        claimsCreated += 1;
        existingStatements.add(claim.statement);
      }

      for (const url of claim.evidenceUrls) {
        const article = context.articles.find((item) => item.url === url);
        if (!article) {
          continue;
        }
        await input.catalog.addEvidence({
          claimId: created.id,
          sourceId: article.sourceId,
          url: article.url,
          excerpt: article.title,
          articleId: article.id,
          publishedAt: article.publishedAt ?? undefined,
        });
      }
    }

    const existingWatch = new Set(
      context.watchItems.map((item) => item.label.trim().toLowerCase()),
    );
    let watchItemsAdded = 0;
    for (const [index, label] of analysis.watchNext.entries()) {
      const key = label.trim().toLowerCase();
      if (existingWatch.has(key)) {
        continue;
      }
      await input.catalog.addWatchItem(event.id, label.trim(), context.watchItems.length + index);
      existingWatch.add(key);
      watchItemsAdded += 1;
    }

    // Impact chain: refresh the draft for this prompt version or create the
    // next version. Graph invariants are re-checked by the catalog.
    const chainNodes = analysis.impactChain.nodes.map((node) => ({
      key: node.key,
      kind: node.kind,
      label: node.label,
      description: node.description,
      category: node.category ?? null,
    }));
    const chainEdges = analysis.impactChain.edges.map((edge) => ({
      from: edge.from,
      to: edge.to,
    }));

    const existingDraftChain = await input.catalog.findDraftChain(event.id, PROMPT_VERSION);
    const chain = existingDraftChain
      ? await input.catalog.updateDraftChain(existingDraftChain.id, {
          nodes: chainNodes,
          edges: chainEdges,
        })
      : await input.catalog.createDraftChain(event.id, {
          nodes: chainNodes,
          edges: chainEdges,
          reasoning: analysis.indiaImpact.reasoning,
          modelName: input.model.name,
          promptVersion: PROMPT_VERSION,
        });

    for (const nextStatus of statusesAfterSuccessfulAnalysis(context.event.status)) {
      await input.catalog.transitionEvent(event.id, nextStatus);
    }

    const updated = await input.catalog.getEventBySlug(event.slug);

    await input.catalog.completeAnalysisRun(run.id, {
      status: 'SUCCEEDED',
      output: analysis,
    });

    return {
      ...base,
      status: 'SUCCEEDED',
      assessmentId: assessment.id,
      assessmentVersion: assessment.version,
      chainId: chain.id,
      chainVersion: chain.version,
      claimsCreated,
      watchItemsAdded,
      eventStatus: updated?.status,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
    await input.catalog.completeAnalysisRun(run.id, {
      status: 'FAILED',
      errorMessage,
    });

    return {
      ...base,
      status: 'FAILED',
      errorMessage,
    };
  }
}
