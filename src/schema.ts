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

export const argsSchema = z.object({
  command: z.enum(['feed', 'popular', 'discussed', 'briefing']),
  limit: z.coerce.number().int().min(1).max(50),
  json: z.boolean(),
});

export const headerNumber = z
  .string()
  .min(1)
  .transform(Number)
  .pipe(z.number().int().nonnegative())
  .nullable()
  .catch(null);

export type Post = z.infer<typeof postSchema>;
export type Comment = z.infer<typeof commentSchema>;
