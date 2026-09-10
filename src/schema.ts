import { z } from 'zod';

export const postSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string(),
  summary: z.string().nullish(),
  tags: z.array(z.string()).nullish(),
  readTime: z.number().nullish(),
  numUpvotes: z.number(),
  numComments: z.number(),
});

export const feedSchema = z.object({
  data: z.array(postSchema),
  pagination: z.object({
    hasNextPage: z.boolean(),
    endCursor: z.string().nullish(),
  }),
});

export const commentSchema = z.object({
  id: z.string(),
  content: z.string(),
  numUpvotes: z.number(),
  author: z.object({
    name: z.string().nullish(),
    username: z.string().nullish(),
  }),
});

export const commentsSchema = z.object({
  data: z.array(commentSchema),
  pagination: z.object({
    hasNextPage: z.boolean(),
    endCursor: z.string().nullish(),
  }),
});

export const postsSchema = z.object({
  data: z.array(postSchema),
});

export const pageSchema = z.object({
  data: z.array(z.unknown()),
  pagination: z.object({
    hasNextPage: z.boolean(),
    endCursor: z.string().nullish(),
  }),
});

export const folderSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().nullish(),
});

export const foldersSchema = z.object({
  data: z.array(folderSchema),
});

export const createdFolderSchema = z.object({
  data: folderSchema,
});

export const localBookmarksSchema = z.record(
  z.string(),
  z.array(z.string()),
);

const limitArg = z.coerce.number().int().min(1).max(50);

const bookmarkArgs = {
  action: z
    .enum(['list', 'folders', 'add', 'remove', 'move'])
    .nullable()
    .transform((action) => action ?? 'list'),
  target: z.string().nullable(),
  folder: z.string().nullable(),
  limit: limitArg,
  json: z.boolean(),
  unread: z.boolean(),
};

const needsTarget = new Set(['add', 'remove', 'move']);

export const argsSchema = z.discriminatedUnion('command', [
  z.object({
    command: z.enum(['feed', 'popular', 'discussed']),
    limit: limitArg,
    json: z.boolean(),
  }),
  z.object({
    command: z.literal('comments'),
    target: z.string('comments needs a post id').min(1),
    limit: limitArg,
    json: z.boolean(),
  }),
  z
    .object({ command: z.enum(['bookmarks', 'local-bookmarks']), ...bookmarkArgs })
    .refine((args) => !needsTarget.has(args.action) || args.target !== null, {
      message: 'this action needs a post id',
      path: ['target'],
    })
    .refine(
      (args) =>
        args.command === 'bookmarks' ||
        !['add', 'move'].includes(args.action) ||
        args.folder !== null,
      {
        message: 'local bookmarks need a folder: -f "<name>"',
        path: ['folder'],
      },
    ),
]);

export const headerNumber = z
  .string()
  .min(1)
  .transform(Number)
  .pipe(z.number().int().nonnegative())
  .nullable()
  .catch(null);

export type Post = z.infer<typeof postSchema>;
export type Comment = z.infer<typeof commentSchema>;
export type LocalBookmarks = z.infer<typeof localBookmarksSchema>;
export type Folder = z.infer<typeof folderSchema>;
