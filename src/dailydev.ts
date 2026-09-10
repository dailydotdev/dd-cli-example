import { parseArgs } from 'node:util';
import { z } from 'zod';
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
  moveLocalBookmark,
  readLocalBookmarks,
  unfileBookmark,
} from './store.ts';
import { render, renderComments } from './utils.ts';

const feeds = {
  feed: 'feeds/foryou',
  popular: 'feeds/popular',
  discussed: 'feeds/discussed',
};

type BookmarkArgs = Extract<
  z.infer<typeof argsSchema>,
  { command: 'bookmarks' | 'local-bookmarks' }
>;

const runBookmarks = async (args: BookmarkArgs) => {
  if (args.action === 'folders') {
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

  if (args.action === 'add' || args.action === 'move') {
    const folder =
      args.folder === null ? null : await resolveFolder(args.folder);
    const postId = args.target as string;

    if (args.action === 'add') {
      await saveBookmark(postId, folder?.id ?? null);
    } else {
      await moveBookmark(postId, folder?.id ?? null);
    }

    if (folder === null) {
      console.log(
        args.action === 'add'
          ? `Saved ${postId}`
          : `Moved ${postId} out of its folder`,
      );
    } else {
      console.log(
        args.action === 'add'
          ? `Saved ${postId} in ${folder.name}`
          : `Moved ${postId} to ${folder.name}`,
      );
    }

    return;
  }

  if (args.action === 'remove') {
    const postId = args.target as string;

    await removeBookmark(postId);
    console.log(`Removed ${postId}`);

    return;
  }

  const folders = args.folder === null ? [] : await fetchFolders();
  const folder = folders.find(({ name }) => name === args.folder);

  if (args.folder !== null && !folder) {
    throw new Error(
      `No folder named ${args.folder}. Run 'bookmarks folders' to see them.`,
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
};

const runLocalBookmarks = async (args: BookmarkArgs) => {
  const postId = args.target as string;

  if (args.action === 'add') {
    const filed = await fileBookmark(postId, args.folder as string);
    console.log(
      filed
        ? `Filed ${postId} under ${args.folder}`
        : `${postId} is already under ${args.folder}`,
    );

    return;
  }

  if (args.action === 'move') {
    await moveLocalBookmark(postId, args.folder as string);
    console.log(`Moved ${postId} to ${args.folder}`);

    return;
  }

  if (args.action === 'remove') {
    await unfileBookmark(postId, args.folder);
    console.log(`Removed ${postId} from ${args.folder ?? 'all folders'}`);

    return;
  }

  const folders = await readLocalBookmarks();

  if (args.json) {
    console.log(JSON.stringify(folders, null, 2));

    return;
  }

  if (args.action === 'folders') {
    for (const [name, ids] of Object.entries(folders)) {
      console.log(`${name}\t${ids.length} saved`);
    }

    return;
  }

  for (const [name, ids] of Object.entries(folders)) {
    if (args.folder !== null && args.folder !== name) {
      continue;
    }

    console.log(`${name}`);
    for (const id of ids) {
      console.log(`\t${id}`);
    }
  }
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

    const [name = 'feed', second = null, third = null] = positionals;
    const namespaced = name === 'bookmarks' || name === 'local-bookmarks';

    const result = argsSchema.safeParse({
      command: name,
      ...(namespaced ? { action: second, target: third } : { target: second }),
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

    if (args.command === 'comments') {
      const comments = await fetchComments(args.target, args.limit);

      if (args.json) {
        console.log(JSON.stringify(comments, null, 2));
      } else {
        renderComments(commentsSchema.parse(comments).data);
      }

      return;
    }

    if (args.command === 'bookmarks') {
      await runBookmarks(args);

      return;
    }

    if (args.command === 'local-bookmarks') {
      await runLocalBookmarks(args);

      return;
    }

    const { limit, json } = args;
    const feed = await fetchFeed(feeds[args.command], limit);

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
