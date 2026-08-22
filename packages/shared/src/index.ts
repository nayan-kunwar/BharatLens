export const API_ENVELOPE_VERSION = 'v1' as const;

export type ApiSuccess<T> = {
  success: true;
  data: T;
  meta: Record<string, unknown>;
};

export type ApiErrorBody = {
  success: false;
  error: {
    code: string;
    message: string;
  };
};

export function ok<T>(data: T, meta: Record<string, unknown> = {}): ApiSuccess<T> {
  return { success: true, data, meta };
}

export function fail(code: string, message: string): ApiErrorBody {
  return {
    success: false,
    error: { code, message },
  };
}

export const ErrorCode = {
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;
