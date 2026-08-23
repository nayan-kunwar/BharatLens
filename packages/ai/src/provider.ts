import { SYSTEM_PROMPT } from './prompt.js';

export type AnalysisModel = {
  readonly name: string;
  complete(prompt: string): Promise<string>;
};

export class DeterministicAnalysisModel implements AnalysisModel {
  readonly name = 'deterministic-stub';

  async complete(prompt: string): Promise<string> {
    const urls = [...prompt.matchAll(/https?:\/\/[^\s"'\\]+/g)].map((match) =>
      match[0].replace(/[),.;]+$/g, ''),
    );
    const uniqueUrls = [...new Set(urls)].slice(0, 4);
    const lowered = prompt.toLowerCase();
    const energy =
      lowered.includes('hormuz') ||
      lowered.includes('oil') ||
      lowered.includes('crude') ||
      lowered.includes('lng') ||
      lowered.includes('energy');
    const overall = energy ? 'HIGH' : 'MEDIUM';

    return JSON.stringify({
      eventType: energy ? 'ENERGY_SHOCK' : 'GEOPOLITICAL_DEVELOPMENT',
      indiaRelevant: true,
      indiaRelevanceReason: energy
        ? 'Linked sources discuss maritime or energy routes that India uses for imports. This is an interpretive estimate, not a measured fact.'
        : 'The event is described in linked metadata with India exposure language. Relevance is an estimate pending review.',
      entities: [
        { name: 'India', kind: 'COUNTRY' },
        ...(energy ? [{ name: 'Strait of Hormuz', kind: 'PLACE' as const }] : []),
      ],
      summary:
        'Structured stub analysis of the event metadata. No new sources were invented. A reviewer must approve before publication.',
      whyItHappened:
        'The linked titles and summaries describe the immediate situation. Underlying causes are UNKNOWN without additional verified evidence.',
      whyIndiaCares: energy
        ? 'India has documented exposure to seaborne energy imports. A prolonged disruption could affect import costs — ANALYSIS, not FACT.'
        : 'India-related tokens appear in the event record. Specific exposure remains UNKNOWN without more evidence.',
      claims: [
        {
          statement: energy
            ? 'A prolonged energy-route disruption could raise India import costs.'
            : 'Further evidence is required before stating verified facts about this event.',
          type: energy ? 'SCENARIO' : 'UNKNOWN',
          evidenceUrls: uniqueUrls.slice(0, 1),
        },
      ],
      indiaImpact: {
        overallLevel: overall,
        analysisConfidence: 'LOW',
        reasoning:
          'analysisConfidence is an interpretive estimate, not a probability. evidence_strength must be computed from linked evidence rows, not from this model.',
        categories: [
          {
            category: energy ? 'ENERGY' : 'DIPLOMACY',
            level: overall,
            reasoning: energy
              ? 'Energy-route language in the source set. Level is a product assessment, not a measurement.'
              : 'Insufficient category-specific evidence; diplomacy used as a conservative placeholder.',
          },
          {
            category: 'TRADE',
            level: energy ? 'MEDIUM' : 'LOW',
            reasoning: 'Trade effects are inferred from shipping or diplomatic metadata only.',
          },
        ],
      },
      watchNext: energy
        ? ['Official shipping advisories', 'India crude import commentary']
        : ['Primary-source confirmation', 'Government of India statements'],
    });
  }
}

export class HttpAnalysisModel implements AnalysisModel {
  constructor(
    private readonly input: {
      apiKey: string;
      model: string;
      baseUrl: string;
    },
  ) {}

  get name(): string {
    return this.input.model;
  }

  async complete(prompt: string): Promise<string> {
    const endpoint = `${this.input.baseUrl.replace(/\/$/, '')}/chat/completions`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.input.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.input.model,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`LLM HTTP ${response.status}: ${body.slice(0, 500)}`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('LLM response did not include message content');
    }

    return content;
  }
}

export function resolveAnalysisModel(env: NodeJS.ProcessEnv = process.env): AnalysisModel {
  const apiKey = env.LLM_API_KEY?.trim();
  if (!apiKey) {
    return new DeterministicAnalysisModel();
  }

  return new HttpAnalysisModel({
    apiKey,
    model: env.LLM_MODEL?.trim() || 'gpt-4o-mini',
    baseUrl: env.LLM_BASE_URL?.trim() || 'https://api.openai.com/v1',
  });
}
