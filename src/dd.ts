import { parseArgs } from 'node:util';
import { fetchFeed } from './api.ts';
import { argsSchema, feedSchema } from './schema.ts';
import { render } from './utils.ts';

const feeds = {
  feed: 'feeds/foryou',
  popular: 'feeds/popular',
};

const main = async () => {
  try {
    const { values, positionals } = parseArgs({
      allowPositionals: true,
      options: {
        limit: { type: 'string', short: 'n', default: '10' },
        json: { type: 'boolean', default: false },
      },
    });

    const result = argsSchema.safeParse({
      command: positionals[0] ?? 'feed',
      limit: values.limit,
      json: values.json,
    });

    if (result.error) {
      throw new Error(
        `Error '${result.error.issues[0].path}': ${result.error.issues[0].message}`,
      );
    }

    const { command, limit, json } = result.data;
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
