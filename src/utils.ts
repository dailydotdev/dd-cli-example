import type { Comment, Post } from './schema.ts';

export const render = (posts: Post[]) => {
  for (const post of posts) {
    console.log(
      `▲${post.numUpvotes}\t💬${post.numComments}\t${post.readTime ?? '?'}m\t${post.title}`,
    );
    console.log(`\t${post.id}  ${post.url}\n`);
  }
};

export const renderComments = (comments: Comment[]) => {
  for (const comment of comments) {
    console.log(`▲${comment.numUpvotes}\t${comment.author.name ?? 'unknown'}`);
    console.log(`${comment.content}\n`);
  }
};
