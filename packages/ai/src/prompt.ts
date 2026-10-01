export const PROMPT_VERSION = 'event-analysis-v3';

export const SYSTEM_PROMPT = `You are a structured analyst for BharatLens, an India-focused geopolitical context product.

Return a single JSON object that matches the requested schema. No markdown, no commentary.

Rules:
- Never invent URLs, source names, quotes, statistics, or government statements.
- evidenceUrls may only copy URLs listed under Allowed evidence URLs. If none apply, use [].
- Do not label a claim FACT. Use UNKNOWN, ANALYSIS, or SCENARIO.
- analysisConfidence is an interpretive estimate (LOW/MEDIUM/HIGH), not a probability and not evidence strength.
- If India relevance or impact is unclear, say so and use UNKNOWN / LOW confidence rather than guessing.
- Stay politically neutral. Do not tell the reader who to support.
- impactChain must be a causal pathway from the event (one ROOT node) through CHANNEL steps to IMPACT nodes on India. Node keys are short ids you invent; every edge references existing keys; no cycles; every node reachable from the root.`;

export type AnalysisPromptInput = {
  title: string;
  slug: string;
  summary: string | null;
  description: string | null;
  eventType: string | null;
  countries: Array<{ code: string; name: string }>;
  topics: Array<{ slug: string; name: string }>;
  claims: Array<{
    statement: string;
    type: string;
    status: string;
    evidenceStrength: string;
  }>;
  articles: Array<{ title: string; url: string; summary: string | null }>;
  evidenceUrls: string[];
};

export function buildAnalysisPrompt(input: AnalysisPromptInput): string {
  return [
    `Prompt version: ${PROMPT_VERSION}`,
    '',
    'Event',
    JSON.stringify(
      {
        title: input.title,
        slug: input.slug,
        summary: input.summary,
        description: input.description,
        eventType: input.eventType,
        countries: input.countries,
        topics: input.topics,
      },
      null,
      2,
    ),
    '',
    'Existing claims (already stored; do not treat PENDING as verified facts)',
    JSON.stringify(input.claims, null, 2),
    '',
    'Linked article metadata (titles and URLs only; not full text)',
    JSON.stringify(input.articles, null, 2),
    '',
    'Allowed evidence URLs',
    JSON.stringify(input.evidenceUrls, null, 2),
    '',
    'Required JSON keys:',
    'eventType, indiaRelevant, indiaRelevanceReason, entities, summary, whyItHappened, whyIndiaCares, claims, indiaImpact, watchNext, impactChain',
    'entities[] keys: name, kind — each entry is an OBJECT, never a bare string. Example: [{"name": "India", "kind": "COUNTRY"}]',
    'Entity kinds: COUNTRY, ORG, PLACE, OTHER',
    'indiaImpact keys: overallLevel, analysisConfidence, reasoning, categories[] of { category, level, reasoning }',
    'claims[] keys: statement, type, evidenceUrls',
    'impactChain keys: nodes[] of { key, kind, label, description?, category? }, edges[] of { from, to }',
    'Chain node kinds: ROOT (exactly one — the event itself), CHANNEL (transmission step), IMPACT (India-facing consequence)',
    'Impact levels: LOW, MEDIUM, HIGH, CRITICAL',
    'Impact categories: ENERGY, TRADE, ECONOMY, SECURITY, DEFENCE, DIPLOMACY, TECHNOLOGY, SUPPLY_CHAIN, INDIAN_CITIZENS',
    'Claim types: ANALYSIS, SCENARIO, UNKNOWN (not FACT)',
    'analysisConfidence: LOW, MEDIUM, HIGH',
  ].join('\n');
}
