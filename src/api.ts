import {
  createdFolderSchema,
  foldersSchema,
  headerNumber,
  pageSchema,
} from './schema.ts';

const API = new URL('https://api.daily.dev/public/v1/');

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

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
    const body = (await res.json().catch(() => ({}))) as { message?: string };

    throw new ApiError(
      res.status,
      body.message ?? `${res.status} ${res.statusText}`,
    );
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

export const fetchFolders = async () =>
  foldersSchema.parse(await request('bookmarks/lists')).data;

export const createFolder = async (name: string) =>
  createdFolderSchema.parse(
    await request(
      'bookmarks/lists',
      {},
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      },
    ),
  ).data;

export const resolveFolder = async (name: string) => {
  const existing = await fetchFolders();
  const found = existing.find((folder) => folder.name === name);

  if (found) {
    return found;
  }

  try {
    return await createFolder(name);
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      throw new Error(
        `Bookmark folders need daily.dev Plus. Group it locally instead: file <id> -f "${name}"`,
      );
    }

    throw error;
  }
};

export const fetchBookmarks = async (
  pageSize: number,
  unreadOnly: boolean,
  listId: string | null,
) => {
  const data: unknown[] = [];
  let cursor: string | null = null;

  do {
    const page = pageSchema.parse(
      await request('bookmarks/', {
        limit: String(pageSize),
        ...(unreadOnly ? { unreadOnly: 'true' } : {}),
        ...(listId ? { listId } : {}),
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

export const saveBookmark = (postId: string, listId: string | null) =>
  request(
    'bookmarks/',
    {},
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postIds: [postId], ...(listId ? { listId } : {}) }),
    },
  );

export const moveBookmark = (postId: string, listId: string | null) =>
  request(
    `bookmarks/${postId}`,
    {},
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listId }),
    },
  );

export const removeBookmark = (postId: string) =>
  request(`bookmarks/${postId}`, {}, { method: 'DELETE' });
