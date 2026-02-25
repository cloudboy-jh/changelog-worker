# changelog-api

Tiny Hono + Bun API that parses `CHANGELOG.md` from your GitHub repos and serves structured JSON. Deploy as a Cloudflare Worker.

## Setup

```bash
bun install
bun run dev
```

## Endpoints

### `GET /api/changelog/:repo`

Fetches and parses the changelog from `github.com/{owner}/{repo}`.

**Query params:**

| Param | Default | Description |
|-------|---------|-------------|
| `branch` | `main` | Branch to read from |
| `path` | `CHANGELOG.md` | Path to changelog file |
| `limit` | all | Max number of releases to return |
| `version` | all | Filter to a specific version |

**Examples:**

```bash
# All releases
curl localhost:8787/api/changelog/bento-tui

# Latest 3
curl localhost:8787/api/changelog/bento-tui?limit=3

# Specific version
curl localhost:8787/api/changelog/bento-tui?version=0.3.0

# Different branch or path
curl localhost:8787/api/changelog/pact?branch=dev&path=docs/CHANGELOG.md
```

**Response:**

```json
{
  "repo": "bento-tui",
  "owner": "jackhorton",
  "source": "https://raw.githubusercontent.com/jackhorton/bento-tui/main/CHANGELOG.md",
  "releases": [
    {
      "version": "0.3.0",
      "date": "2026-02-20",
      "type": "minor",
      "changes": [
        { "type": "added", "text": "New layout engine" },
        { "type": "fixed", "text": "Panel resize crash" }
      ]
    }
  ]
}
```

## Changelog Format

Expects [Keep a Changelog](https://keepachangelog.com/) format:

```markdown
## [0.3.0] - 2026-02-20

### Added
- New layout engine

### Fixed  
- Panel resize crash
```

## Deploy

```bash
bun run deploy
```

Set secrets for private repos:

```bash
wrangler secret put GITHUB_TOKEN
```

Edit `wrangler.toml` to configure allowed repos and default owner.

## Astro Integration

In your Astro docs site, fetch at build time:

```ts
// src/content/config.ts or a loader
const res = await fetch("https://changelog-api.your-worker.dev/api/changelog/bento-tui");
const { releases } = await res.json();
```

Or use a content collection loader that pulls from the API on every build.
