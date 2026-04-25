/**
 * Batch-fetch Universal Profile rows from the LSP Hasura indexer (LUKSO) — LSP3 metadata, links, tags, images.
 * One GraphQL round-trip per leaderboard load.
 * @see https://indexer.sigmacore.io/docs/quickstart
 */

import { getAddress } from "ethers";

const DEFAULT_GRAPHQL = "https://indexer.sigmacore.io/v1/graphql";

const indexerBatchCache = new Map<
  string,
  { fetchedAt: number; data: Record<string, IndexerLeaderboardProfile> }
>();

function indexerUrl(): string {
  const u = import.meta.env.VITE_INDEXER_URL;
  return u && String(u).trim().length > 0 ? String(u).trim() : DEFAULT_GRAPHQL;
}

/** Browser cannot always call the GraphQL indexer (CORS); same-origin /api/* proxies. */
function useIndexerHttpProxy(): boolean {
  return typeof globalThis !== "undefined" && typeof (globalThis as { window?: unknown }).window !== "undefined";
}

/** ipfs://… and ipfs://CID/path → https://ipfs.io/ipfs/… */
function toDisplayUrl(url: string): string {
  const n = url.replace(/^ifps:\/\//i, "ipfs://").trim();
  if (n.startsWith("http://") || n.startsWith("https://")) return n;
  if (n.startsWith("ipfs://")) {
    return `https://ipfs.io/ipfs/${n.slice("ipfs://".length)}`;
  }
  return n;
}

function firstImageUrl(images: null | { url: string }[]): string | null {
  const u = images?.[0]?.url;
  return u ? toDisplayUrl(u) : null;
}

export type IndexerLeaderboardProfile = {
  address: string;
  timestamp: string | null;
  blockNumber: number | null;
  transactionIndex: number | null;
  logIndex: number | null;
  /** Accounts that follow this UP (from indexer follow graph). */
  followerCount: number;
  /** Accounts this UP follows. */
  followingCount: number;
  name: string | null;
  description: string | null;
  tags: string[];
  links: { title: string; url: string }[];
  avatarUrl: string | null;
  backgroundUrl: string | null;
};

type GqlLsp3 = {
  name: null | { value: string | null };
  description: null | { value: string | null };
  tags: null | { value: string | null }[];
  links: null | { title: string | null; url: string | null }[];
  profileImage: null | { url: string }[];
  backgroundImage: null | { url: string }[];
};

type GqlAggregate = { aggregate?: { count?: number | null } | null } | null;

type GqlRow = {
  address: string;
  timestamp: string | null;
  block_number: number | null;
  transaction_index: number | null;
  log_index: number | null;
  followedBy_aggregate: GqlAggregate;
  followed_aggregate: GqlAggregate;
  lsp3Profile: GqlLsp3 | null;
};

function aggregateCount(agg: GqlAggregate): number {
  const n = agg?.aggregate?.count;
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

type GqlResponse = {
  data?: { universal_profile?: GqlRow[] };
  errors?: { message: string }[];
};

/** Escape user text for PostgreSQL ILIKE so `%` / `_` / `\` are literal. */
function escapeIlikePattern(fragment: string): string {
  return fragment.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

const NAME_SEARCH_QUERY = `
query ProfileSearchByName($pattern: String!, $lim: Int!) {
  universal_profile(
    where: { lsp3Profile: { name: { value: { _ilike: $pattern } } } }
    limit: $lim
  ) {
    address
    lsp3Profile {
      name { value }
    }
  }
}
`;

export type ProfileNameSearchHit = {
  address: string;
  name: string | null;
};

/**
 * Search indexed LUKSO Universal Profiles by LSP3 display name (case-insensitive substring).
 * Uses the same Hasura indexer as leaderboard enrichment.
 */
export async function searchUniversalProfilesByLsp3Name(
  rawName: string,
  opts?: { limit?: number; signal?: AbortSignal }
): Promise<ProfileNameSearchHit[]> {
  const trimmed = rawName.trim();
  if (trimmed.length < 2) return [];

  const lim = Math.min(Math.max(opts?.limit ?? 20, 1), 50);
  const pattern = `%${escapeIlikePattern(trimmed)}%`;

  type GqlNameRow = {
    address: string;
    lsp3Profile: null | { name: null | { value: string | null } };
  };
  type GqlNameResponse = {
    data?: { universal_profile?: GqlNameRow[] };
    errors?: { message: string }[];
  };

  if (useIndexerHttpProxy()) {
    try {
      const u = new URL("/api/profile-search", window.location.origin);
      u.searchParams.set("q", trimmed);
      u.searchParams.set("limit", String(lim));
      const res = await fetch(u.toString(), {
        signal: opts?.signal,
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return [];
      const json = (await res.json()) as { hits?: ProfileNameSearchHit[]; error?: string };
      if (json.error) return [];
      if (!Array.isArray(json.hits)) return [];
      return json.hits;
    } catch {
      /* try direct */
    }
  }

  try {
    const res = await fetch(indexerUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: NAME_SEARCH_QUERY,
        variables: { pattern, lim },
      }),
      signal: opts?.signal,
    });
    if (!res.ok) return [];

    const json = (await res.json()) as GqlNameResponse;
    if (json.errors?.length) return [];

    const rows = json.data?.universal_profile ?? [];
    return rows.map((row) => {
      let address = row.address;
      try {
        address = getAddress(row.address);
      } catch {
        /* keep indexer form */
      }
      const name = row.lsp3Profile?.name?.value?.trim() || null;
      return { address, name };
    });
  } catch {
    return [];
  }
}

const QUERY = `
query LeaderboardProfiles($addresses: [String!]!) {
  universal_profile(where: { address: { _in: $addresses } }) {
    address
    timestamp
    block_number
    transaction_index
    log_index
    followedBy_aggregate {
      aggregate {
        count
      }
    }
    followed_aggregate {
      aggregate {
        count
      }
    }
    lsp3Profile {
      name { value }
      description { value }
      tags { value }
      links { title url }
      profileImage { url }
      backgroundImage { url }
    }
  }
}
`;

function parseRow(row: GqlRow): IndexerLeaderboardProfile {
  const l3 = row.lsp3Profile;
  const links =
    l3?.links
      ?.map((l) => ({
        title: (l.title ?? "").trim() || "Link",
        url: (l.url ?? "").trim(),
      }))
      .filter((l) => l.url.length > 0) ?? [];
  const tags =
    l3?.tags?.map((t) => (t.value ?? "").trim()).filter((t) => t.length > 0) ?? [];

  return {
    address: row.address,
    timestamp: row.timestamp ?? null,
    blockNumber: row.block_number ?? null,
    transactionIndex: row.transaction_index ?? null,
    logIndex: row.log_index ?? null,
    followerCount: aggregateCount(row.followedBy_aggregate),
    followingCount: aggregateCount(row.followed_aggregate),
    name: l3?.name?.value?.trim() || null,
    description: l3?.description?.value?.trim() || null,
    tags,
    links,
    avatarUrl: l3 ? firstImageUrl(l3.profileImage) : null,
    backgroundUrl: l3 ? firstImageUrl(l3.backgroundImage) : null,
  };
}

/**
 * Map lowercased address → indexer profile row (only addresses returned by Hasura).
 * @param opts.cacheTtlMs — When set (e.g. leaderboard), batch results are cached in memory for this duration. Single-address profile loads omit this.
 */
export async function fetchLuksoProfilesFromIndexer(
  addresses: string[],
  opts?: { signal?: AbortSignal; cacheTtlMs?: number }
): Promise<Record<string, IndexerLeaderboardProfile>> {
  const unique = [
    ...new Set(
      addresses
        .map((a) => a?.trim())
        .filter(Boolean)
        .map((a) => a.toLowerCase())
    ),
  ];
  if (unique.length === 0) return {};

  const cacheKey = [...unique].sort().join(",");
  const ttl = opts?.cacheTtlMs;
  if (ttl != null && ttl > 0) {
    const hit = indexerBatchCache.get(cacheKey);
    if (hit && Date.now() - hit.fetchedAt < ttl) {
      if (opts?.signal?.aborted) return {};
      return { ...hit.data };
    }
  }

  if (useIndexerHttpProxy()) {
    try {
      const res = await fetch(`${window.location.origin}/api/indexer-profiles`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ addresses: unique }),
        signal: opts?.signal,
      });
      if (res.ok) {
        const json = (await res.json()) as {
          profiles?: Record<string, IndexerLeaderboardProfile>;
          error?: string;
        };
        if (!json.error && json.profiles) {
          const out = json.profiles;
          if (ttl != null && ttl > 0 && !opts?.signal?.aborted) {
            indexerBatchCache.set(cacheKey, { fetchedAt: Date.now(), data: { ...out } });
          }
          return { ...out };
        }
      }
    } catch {
      /* direct indexer below */
    }
  }

  try {
    const res = await fetch(indexerUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: QUERY, variables: { addresses: unique } }),
      signal: opts?.signal,
    });
    if (!res.ok) return {};

    const json = (await res.json()) as GqlResponse;
    if (json.errors?.length) return {};

    const rows = json.data?.universal_profile ?? [];
    const out: Record<string, IndexerLeaderboardProfile> = {};
    for (const row of rows) {
      const parsed = parseRow(row);
      out[parsed.address.toLowerCase()] = parsed;
    }
    if (ttl != null && ttl > 0 && !opts?.signal?.aborted) {
      indexerBatchCache.set(cacheKey, { fetchedAt: Date.now(), data: { ...out } });
    }
    return out;
  } catch {
    return {};
  }
}
