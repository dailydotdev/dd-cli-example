import { parseArgs } from 'node:util';
import {
  fetchBookmarks,
  fetchComments,
  fetchFeed,
  fetchFolders,
  moveBookmark,
  removeBookmark,
  resolveFolder,
  saveBookmark,
} from './api.ts';
import {
  argsSchema,
  commentsSchema,
  feedSchema,
  postsSchema,
} from './schema.ts';
import {
  fileBookmark,
  readLocalBookmarks,
  unfileBookmark,
} from './store.ts';
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
        folder: { type: 'string', short: 'f' },
      },
    });

    const result = argsSchema.safeParse({
      command: positionals[0] ?? 'feed',
      target: positionals[1] ?? null,
      limit: values.limit,
      json: values.json,
      unread: values.unread,
      folder: values.folder ?? null,
    });

    if (result.error) {
      throw new Error(
        `Error '${result.error.issues[0].path}': ${result.error.issues[0].message}`,
      );
    }

    const args = result.data;

    if (args.command === 'local-bookmarks') {
      const folders = await readLocalBookmarks();

      if (args.json) {
        console.log(JSON.stringify(folders, null, 2));
      } else {
        for (const [name, ids] of Object.entries(folders)) {
          console.log(`${name}\t${ids.length} saved`);
        }
      }

      return;
    }

    if (args.command === 'file') {
      if (args.folder === null) {
        throw new Error('file needs a folder: --folder "Rust async"');
      }

      const filed = await fileBookmark(args.target, args.folder);
      console.log(
        filed
          ? `Filed ${args.target} under ${args.folder}`
          : `${args.target} is already under ${args.folder}`,
      );

      return;
    }

    if (args.command === 'unfile') {
      await unfileBookmark(args.target, args.folder);
      console.log(`Removed ${args.target} from ${args.folder ?? 'all folders'}`);

      return;
    }

    if (args.command === 'folders') {
      const folders = await fetchFolders();

      if (args.json) {
        console.log(JSON.stringify(folders, null, 2));
      } else if (folders.length === 0) {
        console.log('No folders. Bookmark folders need daily.dev Plus.');
      } else {
        for (const folder of folders) {
          console.log(`${folder.icon ?? '📁'}\t${folder.name}\t${folder.id}`);
        }
      }

      return;
    }

    if (args.command === 'save') {
      const folder =
        args.folder === null ? null : await resolveFolder(args.folder);

      await saveBookmark(args.target, folder?.id ?? null);
      console.log(
        folder === null
          ? `Bookmarked ${args.target}`
          : `Bookmarked ${args.target} in ${folder.name}`,
      );

      return;
    }

    if (args.command === 'move') {
      const folder =
        args.folder === null ? null : await resolveFolder(args.folder);

      await moveBookmark(args.target, folder?.id ?? null);
      console.log(
        folder === null
          ? `Moved ${args.target} out of its folder`
          : `Moved ${args.target} to ${folder.name}`,
      );

      return;
    }

    if (args.command === 'unsave') {
      await removeBookmark(args.target);
      console.log(`Removed ${args.target}`);

      return;
    }

    if (args.command === 'bookmarks') {
      const folders = args.folder === null ? [] : await fetchFolders();
      const folder = folders.find(({ name }) => name === args.folder);

      if (args.folder !== null && !folder) {
        throw new Error(
          `No folder named ${args.folder}. Run 'folders' to see them.`,
        );
      }

      const bookmarks = await fetchBookmarks(
        args.limit,
        args.unread,
        folder?.id ?? null,
      );

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
