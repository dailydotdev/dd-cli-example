import { headerNumber } from './schema.ts';

const API = new URL('https://api.daily.dev/public/v1/');

export class RateLimitError extends Error {
  retryAfter: number | null;
  reset: number | null;

  constructor(message: string, retryAfter: number | null, reset: number | null) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
    this.reset = reset;
  }
}

const rateLimitError = async (res: Response) => {
  const body = (await res.json().catch(() => ({}))) as { message?: string };
  const retryAfter = headerNumber.parse(res.headers.get('retry-after'));
  const reset = headerNumber.parse(res.headers.get('x-ratelimit-reset'));

  return new RateLimitError(
    [
      body.message ?? 'Rate limit exceeded.',
      retryAfter === null ? null : `Retry after ${retryAfter}s.`,
    ]
      .filter(Boolean)
      .join(' '),
    retryAfter,
    reset,
  );
};

export const request = async (
  path: string,
  params: Record<string, string> = {},
): Promise<unknown> => {
  const token = process.env.DAILY_DEV_TOKEN;

  if (!token) {
    throw new Error(
      'Set DAILY_DEV_TOKEN — generate one at https://daily.dev/settings/api',
    );
  }

  const url = new URL(path, API);
  url.search = new URLSearchParams(params).toString();

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 429) {
    throw await rateLimitError(res);
  }

  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}: ${await res.text()}`);
  }

  return res.json();
};

export const fetchFeed = (path: string, limit: number) =>
  request(path, { limit: String(limit) });
