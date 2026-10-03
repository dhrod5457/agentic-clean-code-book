const FALLBACK_MESSAGE = '요청을 처리하지 못했습니다.';

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return FALLBACK_MESSAGE;
}

type Method = 'GET' | 'POST' | 'PATCH';

async function readErrorBody(response: Response): Promise<{ code: string; message: string }> {
  try {
    const body = (await response.json()) as Partial<{ code: unknown; message: unknown }>;
    return {
      code: typeof body.code === 'string' ? body.code : 'UNKNOWN',
      message: typeof body.message === 'string' ? body.message : FALLBACK_MESSAGE,
    };
  } catch {
    return { code: 'UNKNOWN', message: FALLBACK_MESSAGE };
  }
}

export async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const init: RequestInit = { method, headers, credentials: 'same-origin' };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  const response = await fetch(path, init);
  if (!response.ok) {
    const error = await readErrorBody(response);
    throw new ApiError(response.status, error.code, error.message);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
};
