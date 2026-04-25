/**
 * GET /api/profile-search?q=...&limit=20
 * Proxies LSP3 name search to the Hasura indexer (browsers may be blocked from calling GraphQL directly).
 */
import { getAddress } from "ethers";

const DEFAULT_GRAPHQL = "https://indexer.sigmacore.io/v1/graphql";

function escapeIlikePattern(fragment) {
  return String(fragment)
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
}

function indexerUrl() {
  const u = process.env.INDEXER_GRAPHQL_URL || process.env.VITE_INDEXER_URL;
  return u && String(u).trim().length > 0 ? String(u).trim() : DEFAULT_GRAPHQL;
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

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed", hits: [] });
  }

  const raw = String(req.query?.q ?? "").trim();
  const limitRaw = parseInt(String(req.query?.limit ?? req.query?.lim ?? "20"), 10);
  const lim = Math.min(50, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 20));

  if (raw.length < 2) {
    return res.status(400).json({ error: "Query must be at least 2 characters", hits: [] });
  }

  const pattern = `%${escapeIlikePattern(raw)}%`;

  try {
    const gres = await fetch(indexerUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: NAME_SEARCH_QUERY, variables: { pattern, lim } }),
    });
    if (!gres.ok) {
      return res.status(502).json({ error: "Indexer request failed", hits: [] });
    }
    const json = await gres.json();
    if (json.errors?.length) {
      return res.status(200).json({ error: String(json.errors[0]?.message ?? "GraphQL error"), hits: [] });
    }
    const rows = json.data?.universal_profile ?? [];
    const hits = rows.map((row) => {
      let address = row.address;
      try {
        address = getAddress(row.address);
      } catch {
        /* keep as returned */
      }
      const name = row.lsp3Profile?.name?.value?.trim() || null;
      return { address, name };
    });
    return res.status(200).json({ hits });
  } catch (e) {
    console.error("profile-search error:", e);
    return res.status(500).json({ error: e?.message ?? "Search failed", hits: [] });
  }
}
