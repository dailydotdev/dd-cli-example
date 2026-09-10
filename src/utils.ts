import type { Post } from './schema.ts';

export const render = (posts: Post[]) => {
  for (const post of posts) {
    console.log(
      `▲${post.numUpvotes}\t💬${post.numComments}\t${post.readTime ?? '?'}m\t${post.title}`,
    );
    console.log(`\t${post.id}  ${post.url}\n`);
  }
};
