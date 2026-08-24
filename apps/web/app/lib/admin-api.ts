import { cookies } from 'next/headers';

export const ADMIN_SESSION_COOKIE = 'bharatlens_admin_session';
const API_BASE = (process.env.API_BASE_URL ?? 'http://localhost:3001').replace(/\/$/, '');

export class AdminAuthError extends Error {
  constructor() {
    super('Admin session required');
    this.name = 'AdminAuthError';
  }
}

/**
 * Server-side admin fetch: forwards the browser's session cookie to the API.
 * Throws AdminAuthError so pages can redirect to /admin/login.
 */
export async function adminFetch<T>(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const jar = await cookies();
  const cookieValue = jar.get(ADMIN_SESSION_COOKIE)?.value;
  if (!cookieValue) {
    throw new AdminAuthError();
  }

  const headers: Record<string, string> = {
    accept: 'application/json',
    'content-type': 'application/json',
    cookie: `${ADMIN_SESSION_COOKIE}=${cookieValue}`,
  };

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/v1/admin${path}`, {
      ...init,
      cache: 'no-store',
      headers,
      body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
    });
  } catch {
    throw new Error('Admin API is unavailable.');
  }

  if (response.status === 401) {
    throw new AdminAuthError();
  }

  const body = (await response.json().catch(() => null)) as {
    success: boolean;
    data?: T;
    error?: { code: string; message: string };
  } | null;

  if (!response.ok || !body?.success || body.data === undefined) {
    throw new Error(body?.error?.message ?? `Request failed (${response.status})`);
  }

  return body.data;
}

// --- Response types ---

export type AdminEventRow = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  status: string;
  importance: string;
  occurredAt: string | null;
  publishedAt: string | null;
  updatedAt: string | null;
};

export type AdminOverview = {
  countsByStatus: Record<string, number>;
  reviewQueue: number;
  candidates: number;
  recentAnalysisRuns: Array<{
    id: string;
    eventId: string;
    eventSlug: string;
    eventTitle: string;
    status: string;
    modelName: string;
    promptVersion: string;
    errorMessage: string | null;
    createdAt: string | null;
  }>;
  queues: Array<{
    name: string;
    counts: Record<string, number>;
  }>;
};

export type AdminClaim = {
  id: string;
  statement: string;
  type: string;
  status: string;
  evidenceStrength: string | null;
  sourceCount: number;
  independentSourceCount: number;
  officialSourceCount: number;
  evidenceReason: string | null;
  evidence: Array<{ id: string; url: string; excerpt: string; publishedAt: string | null }>;
};

export type AdminAssessment = {
  id: string;
  version: number;
  status: 'DRAFT' | 'PUBLISHED';
  overallLevel: string;
  reasoning: string;
  evidenceStrength: string;
  analysisConfidence: string;
  modelName: string | null;
  promptVersion: string | null;
  publishedAt: string | null;
  createdAt: string | null;
  categories: Array<{ category: string; level: string; reasoning: string }>;
};

export type AdminEventDetail = AdminEventRow & {
  description: string | null;
  eventType: string | null;
  watchItems: Array<{ id: string; label: string; sortOrder: number }>;
  claims: AdminClaim[];
  assessments: AdminAssessment[];
  chains: Array<{
    id: string;
    version: number;
    status: 'DRAFT' | 'PUBLISHED';
    reasoning: string | null;
    modelName: string | null;
    promptVersion: string | null;
    publishedAt: string | null;
    createdAt: string | null;
    nodes: Array<{
      id: string;
      kind: 'ROOT' | 'CHANNEL' | 'IMPACT';
      label: string;
      description: string | null;
      category: string | null;
      sortOrder: number;
    }>;
    edges: Array<{ id: string; fromNodeId: string; toNodeId: string }>;
  }>;
  analysisRuns: Array<{
    id: string;
    status: string;
    modelName: string;
    promptVersion: string;
    errorMessage: string | null;
    generatedAt: string | null;
    reviewedAt: string | null;
    reviewedBy: string | null;
    createdAt: string | null;
  }>;
};
