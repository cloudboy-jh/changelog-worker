import { Hono } from "hono";
import { cors } from "hono/cors";
import { cache } from "hono/cache";
import { parseChangelog } from "./parser.js";

type Env = {
  GITHUB_OWNER: string;
  GITHUB_TOKEN?: string;
  ALLOWED_REPOS: string;
};

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors());

app.use(
  "/api/*",
  cache({ cacheName: "changelog-api", cacheControl: "public, max-age=300" })
);

app.get("/api/changelog/:repo", async (c) => {
  const repo = c.req.param("repo");
  const owner = c.env.GITHUB_OWNER;
  const allowed = c.env.ALLOWED_REPOS.split(",").map((r) => r.trim());

  if (!allowed.includes(repo)) {
    return c.json({ error: `repo not allowed: ${repo}` }, 403);
  }

  // Optional query params
  const branch = c.req.query("branch") ?? "main";
  const path = c.req.query("path") ?? "CHANGELOG.md";
  const limit = parseInt(c.req.query("limit") ?? "0") || 0;
  const version = c.req.query("version"); // filter to single version

  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;

  const headers: Record<string, string> = {
    "User-Agent": "changelog-api",
  };
  if (c.env.GITHUB_TOKEN) {
    headers["Authorization"] = `token ${c.env.GITHUB_TOKEN}`;
  }

  const res = await fetch(url, { headers });

  if (!res.ok) {
    if (res.status === 404) {
      return c.json({ error: `CHANGELOG.md not found in ${owner}/${repo}` }, 404);
    }
    return c.json({ error: `GitHub returned ${res.status}` }, 502);
  }

  const markdown = await res.text();
  let releases = parseChangelog(markdown);

  // Filter to single version if requested
  if (version) {
    releases = releases.filter((r) => r.version === version);
    if (releases.length === 0) {
      return c.json({ error: `version ${version} not found` }, 404);
    }
  }

  // Limit results
  if (limit > 0) {
    releases = releases.slice(0, limit);
  }

  return c.json({
    repo,
    owner,
    source: url,
    releases,
  });
});

// Health check
app.get("/", (c) => c.json({ name: "changelog-api", status: "ok" }));

export default app;
