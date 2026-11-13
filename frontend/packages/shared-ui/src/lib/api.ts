import type { ClientSession } from './types';

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

const SIGNED_IN_MARKER = 'dexa_signed_in=1';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly messages: string[],
  ) {
    super(messages[0]);
  }
}

type QueryParams = Record<string, string | number | undefined | null>;

// Kept in memory only: a page reload gets a new one from the httpOnly session cookie.
let accessToken: string | null = null;
let refreshInFlight: Promise<ClientSession> | null = null;
let notifySessionLost: () => void = () => {};

function fallbackMessage(status: number): string {
  if (status === 401) return 'Sesi Anda telah berakhir. Silakan masuk kembali.';
  if (status === 403) return 'Anda tidak memiliki akses ke fitur ini.';
  if (status === 404) return 'Data tidak ditemukan.';
  if (status === 429) return 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.';
  return 'Server sedang bermasalah. Coba lagi beberapa saat.';
}

async function toApiError(response: Response): Promise<ApiError> {
  let body: { message?: string | string[] } = {};
  try {
    body = (await response.json()) as typeof body;
  } catch {
    // Not JSON, e.g. the dev proxy's reply while the gateway is down.
  }
  const messages = [body.message ?? []].flat().filter(Boolean);
  return new ApiError(
    response.status,
    messages.length > 0 ? messages : [fallbackMessage(response.status)],
  );
}

/** Concurrent 401s share one refresh: the server rotates the cookie on every call. */
function refreshSession(): Promise<ClientSession> {
  refreshInFlight ??= send('/auth/refresh', { method: 'POST' }, { authenticated: false })
    .then((response) => response.json() as Promise<ClientSession>)
    .then((session) => {
      accessToken = session.accessToken;
      return session;
    })
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

async function send(
  path: string,
  init: RequestInit,
  { authenticated = true, isRetry = false } = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (authenticated && accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  let response: Response;
  try {
    response = await fetch(BASE_URL + path, { ...init, headers, credentials: 'include' });
  } catch {
    throw new ApiError(0, ['Tidak dapat terhubung ke server. Periksa koneksi internet Anda.']);
  }

  if (response.status === 401 && authenticated && !isRetry) {
    try {
      await refreshSession();
    } catch {
      accessToken = null;
      notifySessionLost();
      throw await toApiError(response);
    }
    return send(path, init, { authenticated, isRetry: true });
  }
  if (!response.ok) throw await toApiError(response);
  return response;
}

function withQuery(path: string, params?: QueryParams): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  }
  const text = query.toString();
  return text ? `${path}?${text}` : path;
}

async function json<T>(path: string, method: string, body?: unknown, authenticated = true) {
  const response = await send(
    path,
    {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    },
    { authenticated },
  );
  return (response.status === 204 ? undefined : await response.json()) as T;
}

export const api = {
  get: <T>(path: string, params?: QueryParams) => json<T>(withQuery(path, params), 'GET'),
  post: <T>(path: string, body?: unknown) => json<T>(path, 'POST', body),
  put: <T>(path: string, body?: unknown) => json<T>(path, 'PUT', body),
  patch: <T>(path: string, body?: unknown) => json<T>(path, 'PATCH', body),

  /** Multipart upload; the browser sets the Content-Type with its boundary. */
  upload: async <T>(path: string, form: FormData) =>
    (await (await send(path, { method: 'POST', body: form })).json()) as T,

  /** For protected files: an <img src> can't send the Authorization header. */
  blob: async (path: string) => (await send(path, { method: 'GET' })).blob(),

  login: async (identifier: string, password: string, rememberDevice: boolean) => {
    const session = await json<ClientSession>(
      '/auth/login',
      'POST',
      { identifier, password, rememberDevice },
      false,
    );
    accessToken = session.accessToken;
    return session;
  },

  /**
   * Resolves to null when there is no valid session.
   * The cookie is httpOnly, so the gateway's readable marker decides whether to request at all.
   */
  restoreSession: (): Promise<ClientSession | null> =>
    document.cookie.split('; ').includes(SIGNED_IN_MARKER)
      ? refreshSession().catch(() => null)
      : Promise.resolve(null),

  logout: async () => {
    await json('/auth/logout', 'POST', undefined, false).catch(() => undefined);
    accessToken = null;
  },

  setAccessToken: (token: string | null) => {
    accessToken = token;
  },

  /** Called when a request finds the session gone and it can't be renewed. */
  onSessionLost: (listener: () => void) => {
    notifySessionLost = listener;
  },
};
