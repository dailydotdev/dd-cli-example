# dailydev — daily.dev from your terminal

A tiny CLI for reading your [daily.dev](https://daily.dev) feed, built on the [public API](https://docs.daily.dev/public-api/). Human-readable by default, `--json` for your coding agent.

This is the companion project for the daily.dev API series — [Read daily.dev from your terminal](https://daily.dev/blog/daily-dev-from-your-terminal) builds the CLI, and [Build your own morning briefing](https://daily.dev/blog/build-your-own-morning-briefing) and [The automated bookmark engine](https://daily.dev/blog/the-automated-bookmark-engine) feed its output into scheduled agents. The posts quote the parts worth talking through; this repo holds the complete code.

It deliberately stops at two commands. Everything else in the API follows the same pattern, and extending it is the point — see [Going further](#going-further).

## Setup

```bash
pnpm install
export DAILY_DEV_TOKEN="dda_your_token_here"
```

Generate a Personal Access Token at [daily.dev/settings/api](https://daily.dev/settings/api). It's shown once, so store it somewhere durable — a gitignored `.env`, your password manager, or your OS credential store.

## Usage

```bash
pnpm dailydev feed              # your personalized For You feed
pnpm dailydev popular           # what's trending platform-wide
pnpm dailydev discussed         # posts with the most active discussions
pnpm dailydev comments <id>     # the comment thread on a post
pnpm dailydev bookmarks         # your saved posts, every page of them
pnpm dailydev bookmarks --unread  # only what you saved but never read
pnpm dailydev save <id>         # bookmark a post
pnpm dailydev unsave <id>       # remove a bookmark
pnpm dailydev feed -n 5         # limit the number of results per page (1-50)
pnpm dailydev feed --json       # raw API response, for agents and pipes
```

Use `pnpm`, which forwards flags straight through. With npm you need `npm run dailydev -- feed -n 5`; without the `--` it swallows the flags and you silently get the defaults.

## How it fits together

| File | Responsibility |
|---|---|
| `src/schema.ts` | zod schemas for the API response and the CLI's own arguments |
| `src/api.ts` | authenticated `fetch` (URL assembly, rate-limit errors, pagination), returning the untouched payload |
| `src/utils.ts` | rendering posts and comments for human eyes |
| `src/dailydev.ts` | argument parsing, validation, and dispatch |

Two details worth knowing before you extend it:

- **`fetchFeed` returns `unknown` on purpose.** Validation happens only on the render path, so `--json` stays byte-for-byte what the API sent. Parse on the way through and zod's default behaviour strips every field your schema doesn't mention — `source`, `createdAt`, anything added later — which is exactly the data an agent wants.
- **`parseArgs` handles mechanics, zod decides correctness.** A bad `--limit` fails with a readable message instead of an `undefined` three functions later.
- **A `429` throws a `RateLimitError`.** It carries the API's own message plus `retryAfter` and `reset`, so a script or an agent can back off programmatically instead of parsing prose.

## Rate limits

The free tier allows 100 requests per day; [Plus](https://daily.dev/plus) raises it to 60 per minute. Every response carries `x-ratelimit-limit`, `x-ratelimit-remaining`, and `x-ratelimit-reset`, and a `429` adds `retry-after`. See the [API docs](https://docs.daily.dev/public-api/) for the current numbers.

## Going further

| Command | Endpoint | What's new about it |
|---|---|---|
| `dailydev tag <tag>` | `GET /feeds/tag/{tag}` | a second positional argument to validate |
| `dailydev read <id>` | `GET /posts/{id}` | a single-post schema, with the AI summary |
| `dailydev search <query>` | `GET /search/posts?q=` | URL-encoding a multi-word query |
| `dailydev search <query> --saved` | `GET /bookmarks/search?q=` | the same command against your own saves |
| `dailydev tags` | `GET /tags` | the tags available to filter by |

Since your agent already knows how to run the tool, every command you add is a capability it picks up for free.

## Letting an agent drive it

```
I have a CLI in this directory for reading daily.dev (my developer news
feed). Run `pnpm dailydev feed` for my personalized feed and `pnpm dailydev popular`
for what's trending. Add --json to any command for machine-readable
output, and -n <count> to change how many posts come back.
```

Never send your token anywhere other than `api.daily.dev`.

## Scripts

```bash
pnpm dailydev <command>   # run the CLI
pnpm typecheck      # tsc --noEmit
```
