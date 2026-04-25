/**
 * POST /api/indexer-profiles  body: { "addresses": ["0x...", ...] }  (max 200)
 * Proxies batch UP profile read from the Hasura indexer.
 */
import { getAddress } from "ethers";

const DEFAULT_GRAPHQL = "https://indexer.sigmacore.io/v1/graphql";
const MAX_ADDRS = 200;

function indexerUrl() {
  const u = process.env.INDEXER_GRAPHQL_URL || process.env.VITE_INDEXER_URL;
  return u && String(u).trim().length > 0 ? String(u).trim() : DEFAULT_GRAPHQL;
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
      aggregate { count }
    }
    followed_aggregate {
      aggregate { count }
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

function toDisplayUrl(url) {
  const n = String(url).replace(/^ifps:\/\//i, "ipfs://").trim();
  if (n.startsWith("http://") || n.startsWith("https://")) return n;
  if (n.startsWith("ipfs://")) {
    return `https://ipfs.io/ipfs/${n.slice("ipfs://".length)}`;
  }
  return n;
}

function firstImageUrl(images) {
  const u = images?.[0]?.url;
  return u ? toDisplayUrl(u) : null;
}

function aggregateCount(agg) {
  const n = agg?.aggregate?.count;
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

function parseRow(row) {
  const l3 = row.lsp3Profile;
  const links =
    l3?.links
      ?.map((l) => ({
        title: (l.title ?? "").trim() || "Link",
        url: (l.url ?? "").trim(),
      }))
      .filter((l) => l.url.length > 0) ?? [];
  const tags = l3?.tags?.map((t) => (t.value ?? "").trim()).filter((t) => t.length > 0) ?? [];
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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  let body;
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    body = req.body;
  } else {
    try {
      body = await new Promise((resolve, reject) => {
        const chunks = [];
        req.on("data", (c) => chunks.push(c));
        req.on("end", () => {
          try {
            const t = Buffer.concat(chunks).toString("utf8");
            resolve(t ? JSON.parse(t) : {});
          } catch (e) {
            reject(e);
          }
        });
        req.on("error", reject);
      });
    } catch {
      return res.status(400).json({ error: "Invalid JSON" });
    }
  }

  const addrs = Array.isArray(body?.addresses) ? body.addresses : [];
  const unique = [
    ...new Set(addrs.map((a) => (a == null ? "" : String(a).trim()).toLowerCase()).filter((a) => a.length > 0)),
  ].slice(0, MAX_ADDRS);

  if (unique.length === 0) {
    return res.status(200).json({ profiles: {} });
  }

  try {
    const gres = await fetch(indexerUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: QUERY, variables: { addresses: unique } }),
    });
    if (!gres.ok) {
      return res.status(502).json({ error: "Indexer request failed" });
    }
    const json = await gres.json();
    if (json.errors?.length) {
      return res.status(200).json({ error: String(json.errors[0]?.message ?? "GraphQL error"), profiles: {} });
    }
    const rows = json.data?.universal_profile ?? [];
    const profiles = {};
    for (const row of rows) {
      try {
        const parsed = parseRow(row);
        const key = getAddress(parsed.address).toLowerCase();
        profiles[key] = { ...parsed, address: getAddress(parsed.address) };
      } catch {
        /* skip */
      }
    }
    return res.status(200).json({ profiles });
  } catch (e) {
    console.error("indexer-profiles error:", e);
    return res.status(500).json({ error: e?.message ?? "Failed" });
  }
}
