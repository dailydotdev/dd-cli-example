import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { foldersSchema, type Folders } from './schema.ts';

const STORE =
  process.env.DAILYDEV_FOLDERS ?? join(homedir(), '.dailydev', 'folders.json');

export const readFolders = async (): Promise<Folders> => {
  const raw = await readFile(STORE, 'utf8').catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') {
        return null;
      }

      throw error;
    },
  );

  return raw === null ? {} : foldersSchema.parse(JSON.parse(raw));
};

export const writeFolders = async (folders: Folders) => {
  await mkdir(dirname(STORE), { recursive: true });
  await writeFile(STORE, `${JSON.stringify(folders, null, 2)}\n`);
};

export const fileBookmark = async (postId: string, folder: string) => {
  const folders = await readFolders();
  const current = folders[folder] ?? [];

  if (current.includes(postId)) {
    return false;
  }

  await writeFolders({ ...folders, [folder]: [...current, postId] });

  return true;
};

export const unfileBookmark = async (postId: string, folder: string | null) => {
  const folders = await readFolders();
  const names = folder === null ? Object.keys(folders) : [folder];

  await writeFolders(
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
