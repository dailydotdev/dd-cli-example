import { parseArgs } from 'node:util';
import {
  fetchBookmarks,
  fetchComments,
  fetchFeed,
  removeBookmark,
  saveBookmark,
} from './api.ts';
import {
  argsSchema,
  commentsSchema,
  feedSchema,
  postsSchema,
} from './schema.ts';
import { render, renderComments } from './utils.ts';

const feeds = {
  feed: 'feeds/foryou',
  popular: 'feeds/popular',
  discussed: 'feeds/discussed',
};

const main = async () => {
  try {
    const { values, positionals } = parseArgs({
      allowPositionals: true,
      options: {
        limit: { type: 'string', short: 'n', default: '10' },
        json: { type: 'boolean', default: false },
        unread: { type: 'boolean', default: false },
      },
    });

    const result = argsSchema.safeParse({
      command: positionals[0] ?? 'feed',
      target: positionals[1] ?? null,
      limit: values.limit,
      json: values.json,
      unread: values.unread,
    });

    if (result.error) {
      throw new Error(
        `Error '${result.error.issues[0].path}': ${result.error.issues[0].message}`,
      );
    }

    const args = result.data;

    if (args.command === 'save') {
      await saveBookmark(args.target);
      console.log(`Bookmarked ${args.target}`);

      return;
    }

    if (args.command === 'unsave') {
      await removeBookmark(args.target);
      console.log(`Removed ${args.target}`);

      return;
    }

    if (args.command === 'bookmarks') {
      const bookmarks = await fetchBookmarks(args.limit, args.unread);

      if (args.json) {
        console.log(JSON.stringify(bookmarks, null, 2));
      } else {
        render(postsSchema.parse(bookmarks).data);
      }

      return;
    }

    if (args.command === 'comments') {
      const comments = await fetchComments(args.target, args.limit);

      if (args.json) {
        console.log(JSON.stringify(comments, null, 2));
      } else {
        renderComments(commentsSchema.parse(comments).data);
      }

      return;
    }

    const { command, limit, json } = args;
    const feed = await fetchFeed(feeds[command], limit);

    if (json) {
      console.log(JSON.stringify(feed, null, 2));
    } else {
      render(feedSchema.parse(feed).data);
    }
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }
};

main();
