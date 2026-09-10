import { headerNumber, pageSchema } from './schema.ts';

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
  init: RequestInit = {},
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
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...init.headers },
  });

  if (res.status === 429) {
    throw await rateLimitError(res);
  }

  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}: ${await res.text()}`);
  }

  if (res.status === 204) {
    return null;
  }

  return res.json();
};

export const fetchFeed = (path: string, limit: number) =>
  request(path, { limit: String(limit) });

export const fetchComments = (postId: string, limit: number) =>
  request(`posts/${postId}/comments`, { limit: String(limit) });

export const fetchBookmarks = async (pageSize: number, unreadOnly: boolean) => {
  const data: unknown[] = [];
  let cursor: string | null = null;

  do {
    const page = pageSchema.parse(
      await request('bookmarks/', {
        limit: String(pageSize),
        ...(unreadOnly ? { unreadOnly: 'true' } : {}),
        ...(cursor ? { cursor } : {}),
      }),
    );

    data.push(...page.data);
    cursor = page.pagination.hasNextPage
      ? (page.pagination.endCursor ?? null)
      : null;
  } while (cursor);

  return { data };
};

export const saveBookmark = (postId: string) =>
  request(
    'bookmarks/',
    {},
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postIds: [postId] }),
    },
  );

export const removeBookmark = (postId: string) =>
  request(`bookmarks/${postId}`, {}, { method: 'DELETE' });
