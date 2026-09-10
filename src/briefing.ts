import { request } from './api.ts';
import { commentsSchema, feedSchema } from './schema.ts';

const FEED_POSTS = 15;
const DISCUSSED_POSTS = 10;
const THREADS = 5;
const COMMENTS_PER_THREAD = 10;

export const gatherBriefing = async () => {
  const foryou = await request('feeds/foryou', { limit: String(FEED_POSTS) });
  const discussed = await request('feeds/discussed', {
    limit: String(DISCUSSED_POSTS),
    period: '1',
  });

  const hottest = feedSchema
    .parse(discussed)
    .data.toSorted((a, b) => b.numComments - a.numComments)
    .slice(0, THREADS);

  const threads = await Promise.all(
    hottest.map(async (post) => ({
      postId: post.id,
      title: post.title,
      url: post.url,
      comments: commentsSchema.parse(
        await request(`posts/${post.id}/comments`, {
          limit: String(COMMENTS_PER_THREAD),
        }),
      ).data,
    })),
  );

  return {
    generatedAt: new Date().toISOString(),
    foryou,
    discussed,
    threads,
  };
};
