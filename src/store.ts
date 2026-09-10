import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { localBookmarksSchema, type LocalBookmarks } from './schema.ts';

const STORE =
  process.env.DAILYDEV_LOCAL_BOOKMARKS ??
  join(homedir(), '.dailydev', 'local-bookmarks.json');

export const readLocalBookmarks = async (): Promise<LocalBookmarks> => {
  const raw = await readFile(STORE, 'utf8').catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') {
        return null;
      }

      throw error;
    },
  );

  return raw === null ? {} : localBookmarksSchema.parse(JSON.parse(raw));
};

export const writeLocalBookmarks = async (folders: LocalBookmarks) => {
  await mkdir(dirname(STORE), { recursive: true });
  await writeFile(STORE, `${JSON.stringify(folders, null, 2)}\n`);
};

export const moveLocalBookmark = async (postId: string, folder: string) => {
  await unfileBookmark(postId, null);
  await fileBookmark(postId, folder);
};

export const fileBookmark = async (postId: string, folder: string) => {
  const folders = await readLocalBookmarks();
  const current = folders[folder] ?? [];

  if (current.includes(postId)) {
    return false;
  }

  await writeLocalBookmarks({ ...folders, [folder]: [...current, postId] });

  return true;
};

export const unfileBookmark = async (postId: string, folder: string | null) => {
  const folders = await readLocalBookmarks();
  const names = folder === null ? Object.keys(folders) : [folder];

  await writeLocalBookmarks(
    Object.fromEntries(
      Object.entries(folders)
        .map(([name, ids]): [string, string[]] => [
          name,
          names.includes(name) ? ids.filter((id) => id !== postId) : ids,
        ])
        .filter(([, ids]) => ids.length > 0),
    ),
  );
};
