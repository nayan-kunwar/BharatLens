export type ImportanceLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ImpactLevel = ImportanceLevel;
export type ClaimType = 'FACT' | 'ANALYSIS' | 'SCENARIO' | 'UNKNOWN';

export type Country = {
  id: string;
  code: string;
  name: string;
  slug: string;
};

export type Topic = {
  id: string;
  slug: string;
  name: string;
};

type EventRelation = {
  slug: string;
  name: string;
};

export type EventSummary = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  status: 'PUBLISHED' | 'UPDATED';
  importance: ImportanceLevel;
  occurredAt: string | null;
  publishedAt: string | null;
  updatedAt: string | null;
  countries: Array<EventRelation & { code: string }>;
  topics: EventRelation[];
  currentImpact: {
    overallLevel: ImpactLevel;
    evidenceStrength: 'WEAK' | 'MODERATE' | 'STRONG';
    analysisConfidence: 'LOW' | 'MEDIUM' | 'HIGH';
    version: number;
    categories: Array<{
      category: string;
      level: ImpactLevel;
    }>;
  } | null;
};

export type EventDetail = EventSummary & {
  description: string | null;
  eventType: string | null;
  watchItems: Array<{
    id: string;
    label: string;
    sortOrder: number;
  }>;
};

export type ImpactAssessmentSnapshot = {
  id: string;
  version: number;
  status: 'DRAFT' | 'PUBLISHED';
  overallLevel: ImpactLevel;
  reasoning: string;
  evidenceStrength: 'WEAK' | 'MODERATE' | 'STRONG';
  analysisConfidence: 'LOW' | 'MEDIUM' | 'HIGH';
  modelName: string | null;
  promptVersion: string | null;
  publishedAt: string | null;
  categories: Array<{
    category: string;
    level: ImpactLevel;
    reasoning: string;
  }>;
};

export type EventImpact = {
  current: ImpactAssessmentSnapshot | null;
  history: ImpactAssessmentSnapshot[];
};

export type ChainNode = {
  id: string;
  kind: 'ROOT' | 'CHANNEL' | 'IMPACT';
  label: string;
  description: string | null;
  category: string | null;
};

export type EventChainSnapshot = {
  id: string;
  version: number;
  status: 'PUBLISHED';
  reasoning: string | null;
  modelName: string | null;
  promptVersion: string | null;
  publishedAt: string | null;
  nodes: ChainNode[];
  edges: Array<{ id: string; fromNodeId: string; toNodeId: string }>;
};

export type EventChain = {
  current: EventChainSnapshot | null;
  history: EventChainSnapshot[];
};

export type Claim = {
  id: string;
  statement: string;
  type: ClaimType;
  status: 'APPROVED';
  evidenceStrength: 'WEAK' | 'MODERATE' | 'STRONG';
  sourceCount: number;
  independentSourceCount: number;
  officialSourceCount: number;
  evidenceReason: string | null;
  evidence: Array<{
    id: string;
    url: string;
    excerpt: string | null;
    publishedAt: string | null;
  }>;
};

export type EventSource = {
  id: string;
  name: string;
  slug: string;
  type: string;
  homepageUrl: string | null;
  articleTitle: string;
  articleUrl: string;
  publishedAt: string | null;
};

export type EventUpdate = {
  id: string;
  occurredAt: string;
  title: string;
  body: string | null;
  impactChange: string | null;
};

export type EventListParams = {
  page?: number;
  limit?: number;
  country?: string;
  topic?: string;
  importance?: ImportanceLevel;
  sort?: 'occurredAt' | 'publishedAt' | 'updatedAt' | 'relevance';
  order?: 'asc' | 'desc';
};

export type PageMeta = {
  page: number;
  limit: number;
  total: number;
  pageCount: number;
};

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  meta?: Record<string, unknown>;
  error?: {
    code: string;
    message: string;
  };
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function getApiBaseUrl() {
  return (process.env.API_BASE_URL ?? 'http://localhost:3001').replace(/\/$/, '');
}

function toQueryString(params: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      searchParams.set(key, String(value));
    }
  }

  const value = searchParams.toString();
  return value ? `?${value}` : '';
}

async function fetchApi<T>(path: string): Promise<{ data: T; meta: Record<string, unknown> }> {
  let response: Response;

  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      cache: 'no-store',
      headers: { accept: 'application/json' },
    });
  } catch {
    throw new ApiError('Live data is temporarily unavailable.', 503);
  }

  const body = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!response.ok || !body?.success || body.data === undefined) {
    throw new ApiError(
      body?.error?.message ?? 'Live data is temporarily unavailable.',
      response.status,
    );
  }

  return { data: body.data, meta: body.meta ?? {} };
}

export async function getEvents(params: EventListParams = {}) {
  const response = await fetchApi<EventSummary[]>(
    `/api/v1/events${toQueryString({
      page: params.page,
      limit: params.limit,
      country: params.country,
      topic: params.topic,
      importance: params.importance,
      sort: params.sort,
      order: params.order,
    })}`,
  );

  return {
    items: response.data,
    meta: response.meta as unknown as PageMeta,
  };
}

export async function getEventPage(slug: string) {
  const event = await fetchApi<EventDetail>(`/api/v1/events/${encodeURIComponent(slug)}`);
  const eventId = event.data.id;
  const [impact, claims, sources, updates, chain] = await Promise.all([
    fetchApi<EventImpact>(`/api/v1/events/${eventId}/impact`),
    fetchApi<Claim[]>(`/api/v1/events/${eventId}/claims`),
    fetchApi<EventSource[]>(`/api/v1/events/${eventId}/sources`),
    fetchApi<EventUpdate[]>(`/api/v1/events/${eventId}/updates`),
    fetchApi<EventChain>(`/api/v1/events/${eventId}/chain`),
  ]);

  return {
    event: event.data,
    impact: impact.data,
    claims: claims.data,
    sources: sources.data,
    updates: updates.data,
    chain: chain.data,
  };
}

export async function getCountries() {
  return (await fetchApi<Country[]>('/api/v1/countries')).data;
}

export async function getCountry(code: string) {
  return (await fetchApi<Country>(`/api/v1/countries/${encodeURIComponent(code)}`)).data;
}

export async function getTopics() {
  return (await fetchApi<Topic[]>('/api/v1/topics')).data;
}

export async function getTopic(slug: string) {
  return (await fetchApi<Topic>(`/api/v1/topics/${encodeURIComponent(slug)}`)).data;
}

export async function searchEvents(
  query: string,
  params: Omit<EventListParams, 'country' | 'topic' | 'importance'> = {},
) {
  const response = await fetchApi<EventSummary[]>(
    `/api/v1/search${toQueryString({
      q: query,
      page: params.page,
      limit: params.limit,
      sort: params.sort,
      order: params.order,
    })}`,
  );

  return {
    items: response.data,
    meta: response.meta as unknown as PageMeta,
  };
}
