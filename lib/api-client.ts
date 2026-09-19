/**
 * Typed browser-side API client. Mirrors the { ok, data | error } envelope.
 *
 * Every request is routed through resolveApiPath(), which converts the app's
 * REST-style paths (/api/admin/products/42/stock) into the PHP file layout the
 * shared host actually serves (/api/admin/product-stock.php?id=42). Components
 * keep their original readable paths; the mapping lives in lib/api-routes.ts.
 */

import { API_CREDENTIALS, resolveApiPath } from './api-routes';

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type Envelope<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; details?: unknown } };

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(resolveApiPath(path), {
      credentials: API_CREDENTIALS,
      cache: 'no-store',
      headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
      ...init,
    });
  } catch {
    throw new ApiError('NETWORK', 'اتصال به سرور برقرار نشد؛ اینترنت خود را بررسی کنید', 0);
  }
  let body: Envelope<T> | null = null;
  try {
    body = (await response.json()) as Envelope<T>;
  } catch {
    throw new ApiError('INTERNAL', 'پاسخ نامعتبر از سرور دریافت شد', response.status);
  }
  if (!body.ok) {
    throw new ApiError(body.error.code, body.error.message, response.status, body.error.details);
  }
  return body.data;
}

export const api = {
  get: <T>(path: string) => call<T>(path),
  post: <T>(path: string, body?: unknown) => call<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) => call<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  del: <T>(path: string) => call<T>(path, { method: 'DELETE' }),
  upload: async <T>(path: string, form: FormData): Promise<T> => {
    let response: Response;
    try {
      response = await fetch(resolveApiPath(path), { method: 'POST', body: form, credentials: API_CREDENTIALS, cache: 'no-store' });
    } catch {
      throw new ApiError('NETWORK', 'اتصال به سرور برقرار نشد', 0);
    }
    const body = (await response.json().catch(() => null)) as Envelope<T> | null;
    if (!body?.ok) {
      throw new ApiError(body && 'error' in body ? body.error.code : 'INTERNAL', body && 'error' in body ? body.error.message : 'پاسخ نامعتبر از سرور', response.status);
    }
    return body.data;
  },
};
