export interface Change {
  type: string; // added, changed, fixed, removed, deprecated, security
  text: string;
}

export interface Release {
  version: string;
  date: string | null;
  type: "major" | "minor" | "patch" | "prerelease" | null;
  changes: Change[];
}

/**
 * Classify semver bump by comparing to the previous version.
 * If there's no previous version, infer from the version string.
 */
function classifyVersion(version: string, previous?: string): Release["type"] {
  const parse = (v: string) => {
    const match = v.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
    if (!match) return null;
    return {
      major: parseInt(match[1]),
      minor: parseInt(match[2]),
      patch: parseInt(match[3]),
      pre: match[4] ?? null,
    };
  };

  const curr = parse(version);
  if (!curr) return null;
  if (curr.pre) return "prerelease";

  if (!previous) {
    // Best guess without a previous version
    if (curr.patch > 0) return "patch";
    if (curr.minor > 0) return "minor";
    return "major";
  }

  const prev = parse(previous);
  if (!prev) return null;

  if (curr.major > prev.major) return "major";
  if (curr.minor > prev.minor) return "minor";
  return "patch";
}

/**
 * Parse a Keep a Changelog formatted markdown string into structured releases.
 *
 * Expected format:
 *   ## [1.0.0] - 2026-02-20
 *   ### Added
 *   - New feature
 *   ### Fixed
 *   - Bug fix
 */
export function parseChangelog(markdown: string): Release[] {
  const lines = markdown.split("\n");
  const releases: Release[] = [];
  let currentRelease: Release | null = null;
  let currentType: string | null = null;

  for (const line of lines) {
    // Match release heading: ## [1.0.0] - 2026-02-20 or ## [Unreleased]
    const releaseMatch = line.match(
      /^##\s+\[?([^\]]+?)\]?(?:\s*[-–—]\s*(\d{4}-\d{2}-\d{2}))?\s*$/
    );
    if (releaseMatch) {
      const version = releaseMatch[1].trim();
      if (version.toLowerCase() === "unreleased") continue;

      currentRelease = {
        version,
        date: releaseMatch[2] ?? null,
        type: null, // filled in after all releases are parsed
        changes: [],
      };
      releases.push(currentRelease);
      currentType = null;
      continue;
    }

    // Match change type heading: ### Added
    const typeMatch = line.match(/^###\s+(.+)$/);
    if (typeMatch && currentRelease) {
      currentType = typeMatch[1].trim().toLowerCase();
      continue;
    }

    // Match change item: - Some change
    const itemMatch = line.match(/^[-*]\s+(.+)$/);
    if (itemMatch && currentRelease) {
      currentRelease.changes.push({
        type: currentType ?? "changed",
        text: itemMatch[1].trim(),
      });
    }
  }

  // Classify version bumps by comparing adjacent releases
  for (let i = 0; i < releases.length; i++) {
    const previous = releases[i + 1]?.version;
    releases[i].type = classifyVersion(releases[i].version, previous);
  }

  return releases;
}
