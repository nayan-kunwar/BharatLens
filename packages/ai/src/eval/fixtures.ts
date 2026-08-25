import type { ImpactCategory, ImpactLevel } from '@bharatlens/shared';
import type { AnalysisPromptInput } from '../prompt.js';

export type GoldLabels = {
  overallLevel: ImpactLevel;
  dominantClaimType: 'ANALYSIS' | 'SCENARIO' | 'UNKNOWN';
  categoryLevels?: Partial<Record<ImpactCategory, ImpactLevel>>;
};

export type EvalFixture = {
  id: string;
  description: string;
  prompt: Omit<AnalysisPromptInput, 'claims' | 'evidenceUrls'>;
  evidenceUrls: string[];
  gold: GoldLabels;
};

const country = (code: string, name: string) => ({ code, name });
const topic = (slug: string, name: string) => ({ slug, name });
const article = (title: string, url: string, summary: string | null = null) => ({
  title,
  url,
  summary,
});

/**
 * Small gold-labeled scenario set (AGENTS.md §78.1 prefers a small fixture set
 * over a generic judge loop). Gold labels are editorial judgments used to
 * MEASURE model behavior; the human review workflow remains the true arbiter.
 */
export const EVAL_FIXTURES: EvalFixture[] = [
  {
    id: 'hormuz-energy-shock',
    description: 'Chokepoint disruption with direct India energy exposure.',
    prompt: {
      title: 'Strait of Hormuz shipping disruption',
      slug: 'hormuz-eval',
      summary: 'Commercial shipping through the strait reported as disrupted.',
      description:
        'A major route for seaborne crude. Duration unknown; alternative routing discussed.',
      eventType: null,
      countries: [country('IR', 'Iran'), country('IN', 'India'), country('US', 'United States')],
      topics: [topic('energy', 'Energy'), topic('maritime', 'Maritime')],
      articles: [
        article(
          'Hormuz disruption raises freight and insurance costs',
          'https://example.test/hormuz-freight',
          'Insurers reprice Gulf routes; tanker traffic falls.',
        ),
        article(
          'India crude importers watch Gulf shipping lanes closely',
          'https://example.test/hormuz-india',
          'Importers review alternative supply options.',
        ),
      ],
    },
    evidenceUrls: ['https://example.test/hormuz-freight', 'https://example.test/hormuz-india'],
    gold: {
      overallLevel: 'HIGH',
      dominantClaimType: 'SCENARIO',
      categoryLevels: { ENERGY: 'HIGH' },
    },
  },
  {
    id: 'diplomatic-note',
    description: 'Low-signal diplomatic courtesy — should stay LOW/UNKNOWN-heavy.',
    prompt: {
      title: 'Envoys exchange courtesy calls ahead of summit',
      slug: 'diplo-note-eval',
      summary: 'Routine pre-summit diplomacy between several governments.',
      description: null,
      eventType: null,
      countries: [country('FR', 'France'), country('DE', 'Germany')],
      topics: [topic('diplomacy', 'Diplomacy')],
      articles: [
        article(
          'Summit preparatory meetings conclude',
          'https://example.test/summit-prep',
          'Officials described talks as constructive.',
        ),
      ],
    },
    evidenceUrls: ['https://example.test/summit-prep'],
    gold: {
      overallLevel: 'LOW',
      dominantClaimType: 'UNKNOWN',
      categoryLevels: { DIPLOMACY: 'LOW' },
    },
  },
  {
    id: 'conflict-escalation',
    description: 'Armed conflict with regional security implications.',
    prompt: {
      title: 'Border clashes intensify between two states',
      slug: 'conflict-eval',
      summary: 'Sustained artillery exchanges reported along a contested border.',
      description: 'Civilian movement across the border region is being reported.',
      eventType: null,
      countries: [country('AF', 'Afghanistan'), country('PK', 'Pakistan'), country('IN', 'India')],
      topics: [topic('security', 'Security'), topic('military-conflict', 'Military conflict')],
      articles: [
        article(
          'Border shelling continues for a third day',
          'https://example.test/border-shelling',
          'Local officials report casualties without independent verification.',
        ),
      ],
    },
    evidenceUrls: ['https://example.test/border-shelling'],
    gold: {
      overallLevel: 'MEDIUM',
      dominantClaimType: 'ANALYSIS',
      categoryLevels: { SECURITY: 'MEDIUM' },
    },
  },
  {
    id: 'trade-dispute',
    description: 'Tariff dispute cascading into supply chains India uses.',
    prompt: {
      title: 'New tariffs on electronics components take effect',
      slug: 'trade-dispute-eval',
      summary: 'Export controls announced for key electronics components.',
      description: 'Suppliers in several countries are reviewing sourcing arrangements.',
      eventType: null,
      countries: [country('CN', 'China'), country('US', 'United States'), country('IN', 'India')],
      topics: [topic('trade', 'Trade'), topic('technology', 'Technology')],
      articles: [
        article(
          'Component buyers weigh alternative suppliers as controls bite',
          'https://example.test/component-controls',
          'Assembly hubs assess inventory buffers.',
        ),
      ],
    },
    evidenceUrls: ['https://example.test/component-controls'],
    gold: {
      overallLevel: 'MEDIUM',
      dominantClaimType: 'SCENARIO',
      categoryLevels: { TRADE: 'MEDIUM', SUPPLY_CHAIN: 'MEDIUM' },
    },
  },
  {
    id: 'ambiguous-rumor',
    description: 'Unverified rumor — correct behavior is UNKNOWN / LOW confidence.',
    prompt: {
      title: 'Unconfirmed reports of refinery incident circulate online',
      slug: 'ambiguous-rumor-eval',
      summary: 'Social media posts describe an incident; no official confirmation exists.',
      description: null,
      eventType: null,
      countries: [country('AE', 'United Arab Emirates'), country('IN', 'India')],
      topics: [topic('energy', 'Energy')],
      articles: [
        article(
          'Officials decline to comment on circulating claims',
          'https://example.test/no-comment',
          'No statement has been issued.',
        ),
      ],
    },
    evidenceUrls: ['https://example.test/no-comment'],
    gold: {
      overallLevel: 'LOW',
      dominantClaimType: 'UNKNOWN',
    },
  },
  {
    id: 'chain-heavy-multichannel',
    description: 'Multi-channel causal pathway — exercises impact-chain generation.',
    prompt: {
      title: 'Canal blockage halts a major container artery',
      slug: 'chain-heavy-eval',
      summary: 'A blocked canal delays container traffic on one of the busiest trade arteries.',
      description: 'Rerouting adds days of transit time and raises charter rates.',
      eventType: null,
      countries: [country('EG', 'Egypt'), country('IN', 'India'), country('SG', 'Singapore')],
      topics: [topic('maritime', 'Maritime'), topic('trade', 'Trade')],
      articles: [
        article(
          'Charter rates climb as vessels reroute around the canal',
          'https://example.test/canal-reroute',
          'Freight indices move sharply higher.',
        ),
      ],
    },
    evidenceUrls: ['https://example.test/canal-reroute'],
    gold: {
      overallLevel: 'HIGH',
      dominantClaimType: 'SCENARIO',
      categoryLevels: { TRADE: 'HIGH' },
    },
  },
];

/** Adversarial raw outputs exercising the pipeline's defenses (Tier 1). */
export type AdversarialCase = {
  id: string;
  raw: string;
  expect: {
    schemaPass: boolean;
    factLeakRaw?: boolean;
    fabricationCaught?: boolean;
    chainValid?: boolean;
  };
};

const VALID_GOOD_OUTPUT = JSON.stringify({
  eventType: 'ENERGY_SHOCK',
  indiaRelevant: true,
  indiaRelevanceReason: 'Linked sources discuss crude import routes.',
  entities: [{ name: 'India', kind: 'COUNTRY' }],
  summary: 'Shipping disruption reported.',
  whyItHappened: 'UNKNOWN from supplied metadata.',
  whyIndiaCares: 'Import exposure is an interpretation.',
  claims: [
    { statement: 'A prolonged disruption could raise costs.', type: 'SCENARIO', evidenceUrls: [] },
  ],
  indiaImpact: {
    overallLevel: 'HIGH',
    analysisConfidence: 'LOW',
    reasoning: 'Estimate only.',
    categories: [{ category: 'ENERGY', level: 'HIGH', reasoning: 'Route exposure.' }],
  },
  watchNext: ['Shipping advisories'],
  impactChain: {
    nodes: [
      { key: 'event', kind: 'ROOT', label: 'Disruption reported' },
      { key: 'route', kind: 'CHANNEL', label: 'Transport risk rises' },
      { key: 'bill', kind: 'IMPACT', label: 'Import bill pressure' },
    ],
    edges: [
      { from: 'event', to: 'route' },
      { from: 'route', to: 'bill' },
    ],
  },
});

export const ADVERSARIAL_CASES: AdversarialCase[] = [
  {
    id: 'good-output-passes',
    raw: VALID_GOOD_OUTPUT,
    expect: { schemaPass: true, factLeakRaw: false, chainValid: true },
  },
  {
    id: 'malformed-json-rejected',
    raw: '{"eventType": "ENERGY_SHOCK", oops}',
    expect: { schemaPass: false },
  },
  {
    id: 'numeric-confidence-rejected',
    raw: VALID_GOOD_OUTPUT.replace('"analysisConfidence":"LOW"', '"analysisConfidence":0.82'),
    expect: { schemaPass: false },
  },
  {
    id: 'fact-leak-detected-and-neutralized',
    raw: VALID_GOOD_OUTPUT.replace('"type":"SCENARIO"', '"type":"FACT"').replace(
      '"statement":"A prolonged disruption could raise costs."',
      '"statement":"The strait is closed permanently."',
    ),
    expect: { schemaPass: true, factLeakRaw: true },
  },
  {
    id: 'fabricated-url-caught',
    raw: VALID_GOOD_OUTPUT.replace(
      '"evidenceUrls": []',
      '"evidenceUrls": ["https://invented.example/fake"]',
    ).replace(
      '"watchNext"',
      '"claims": [{"statement": "Costs rise.", "type": "SCENARIO", "evidenceUrls": ["https://invented.example/fake"]}], "watchNext"',
    ),
    expect: { schemaPass: true, fabricationCaught: true },
  },
  {
    id: 'cyclic-chain-rejected',
    raw: VALID_GOOD_OUTPUT.replace(
      '{"from":"event","to":"route"},{"from":"route","to":"bill"}',
      '{"from":"event","to":"route"},{"from":"route","to":"bill"},{"from":"bill","to":"event"}',
    ),
    expect: { schemaPass: true, chainValid: false },
  },
];
