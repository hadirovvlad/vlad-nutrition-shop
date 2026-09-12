const BASE = '/api';

export type FieldError = { path: string; message: string };

export class ApiError extends Error {
  status: number;
  details?: FieldError[];

  constructor(status: number, message: string, details?: FieldError[]) {
    super(message);
    this.status = status;
    this.details = details;
  }

  /** Field-level messages keyed by form field name, for inline validation. */
  get fieldErrors(): Record<string, string> {
    const map: Record<string, string> = {};
    for (const detail of this.details ?? []) {
      if (detail.path && !map[detail.path]) map[detail.path] = detail.message;
    }
    return map;
  }
}

type Options = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
};

/**
 * Called when the server rejects a request because the session is no longer
 * valid — token expired, account deactivated, or the user was removed. The
 * AuthProvider registers a handler that signs the visitor out instead of
 * leaving an error state on every screen.
 */
type UnauthorizedHandler = () => void;

let onUnauthorized: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  onUnauthorized = handler;
}

/**
 * The credential endpoints are excluded: a wrong password must surface as a
 * field error on the login form, not as a global sign-out.
 */
function isCredentialPath(path: string) {
  return path.startsWith('/auth/login') || path.startsWith('/auth/register');
}

async function request<T>(path: string, options: Options = {}): Promise<T> {
  const { method = 'GET', body, signal } = options;

  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      // The auth token lives in an httpOnly cookie, so credentials must ride along.
      credentials: 'include',
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(0, 'Немає зв’язку з сервером. Перевірте підключення.');
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    if (response.status === 401 && !isCredentialPath(path)) {
      onUnauthorized?.();
    }

    const data = payload as { message?: string; details?: FieldError[] } | null;
    throw new ApiError(
      response.status,
      data?.message ?? 'Щось пішло не так. Спробуйте ще раз.',
      Array.isArray(data?.details) ? data.details : undefined,
    );
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { signal }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),

  /** Multipart upload for product images. */
  async upload(files: File[]): Promise<{ urls: string[] }> {
    const form = new FormData();
    files.forEach((file) => form.append('files', file));
    const response = await fetch(`${BASE}/mgmt/uploads/images`, {
      method: 'POST',
      credentials: 'include',
      body: form,
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new ApiError(response.status, data?.message ?? 'Не вдалося завантажити файли');
    }
    return (await response.json()) as { urls: string[] };
  },
};

/** Builds a query string, dropping empty values and expanding arrays to CSV. */
export function toQuery(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '' || value === false) continue;
    if (Array.isArray(value)) {
      if (value.length) search.set(key, value.join(','));
    } else {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}
