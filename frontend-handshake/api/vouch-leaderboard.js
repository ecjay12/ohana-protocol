/**
 * GET /api/vouch-leaderboard?limit=20
 * Builds Handshake vouch leaderboard once per ~12h (in-memory on warm instances),
 * enriches with LUKSO indexer profiles server-side. CDN-friendly Cache-Control.
 */
import { Contract, Interface, JsonRpcProvider, getAddress } from "ethers";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { handshakeAddresses, chains: chainsJson } = require("../shared/chainConfig.json");

const HANDSHAKE_IFACE = new Interface([
  "event VouchAccepted(address indexed target, address indexed voucher)",
  "function acceptedCount(address target) view returns (uint256)",
]);

const DEFAULT_CHUNK = 15000n;
const ACCEPTED_COUNT_CONCURRENCY = 4;
const GET_LOGS_INTER_CHUNK_MS = 50;
const RPC_MAX_RETRIES = 6;
const RPC_BASE_DELAY_MS = 350;

const VOUCH_LEADERBOARD_TOP = 20;
const REFRESH_MS = 12 * 60 * 60 * 1000;
const DEFAULT_GRAPHQL = "https://indexer.sigmacore.io/v1/graphql";

const CACHE_SECONDS = 12 * 60 * 60;
const STALE_WHILE_REVALIDATE_SECONDS = 24 * 60 * 60;

const HANDSHAKE_ADDRESSES = Object.fromEntries(
  Object.entries(handshakeAddresses).map(([k, v]) => [parseInt(k, 10), v])
);

function getHandshakeAddress(chainId) {
  const addr = HANDSHAKE_ADDRESSES[chainId];
  return addr && String(addr).length > 0 ? addr : null;
}

function rpcForChain(chainId) {
  const c = chainsJson[String(chainId)];
  const rpc = c?.rpc;
  return rpc && rpc.length > 0 ? rpc : null;
}

function startBlockForChain(chainId) {
  const raw = chainsJson[String(chainId)]?.vouchSyncFromBlock;
  if (raw && /^\d+$/.test(String(raw))) return BigInt(raw);
  return 0n;
}

function handshakeChainsConfigured() {
  return Object.keys(handshakeAddresses)
    .map((k) => parseInt(k, 10))
    .filter((id) => getHandshakeAddress(id) && rpcForChain(id));
}

function createProvider(rpc) {
  return new JsonRpcProvider(rpc, undefined, { batchMaxCount: 1, batchStallTime: 0 });
}

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error("Aborted"));
      return;
    }
    const t = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(new Error("Aborted"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function isRateLimitError(e) {
  const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
  return (
    msg.includes("429") ||
    msg.includes("too many requests") ||
    msg.includes("rate limit") ||
    msg.includes("exceeded")
  );
}

async function withRpcRetry(fn, signal) {
  let last;
  for (let attempt = 0; attempt < RPC_MAX_RETRIES; attempt++) {
    if (signal?.aborted) throw new Error("Aborted");
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (!isRateLimitError(e) || attempt === RPC_MAX_RETRIES - 1) throw e;
      const delay = RPC_BASE_DELAY_MS * 2 ** attempt + Math.floor(Math.random() * 150);
      await sleep(delay, signal);
    }
  }
  throw last;
}

async function fetchVouchCountsForChain(chainId, signal) {
  const handshake = getHandshakeAddress(chainId);
  const rpc = rpcForChain(chainId);
  if (!handshake || !rpc) {
    return { error: `chain ${chainId}: missing Handshake or RPC` };
  }

  const provider = createProvider(rpc);
  const latest = BigInt(await withRpcRetry(() => provider.getBlockNumber(), signal));
  let from = startBlockForChain(chainId);
  const topic0 = HANDSHAKE_IFACE.getEvent("VouchAccepted").topicHash;
  const targets = new Set();

  let chunk = DEFAULT_CHUNK;
  let cursor = from;

  while (cursor <= latest) {
    if (signal?.aborted) return { error: "Aborted" };
    const to = cursor + chunk > latest ? latest : cursor + chunk;
    try {
      const logs = await withRpcRetry(
        () =>
          provider.getLogs({
            address: handshake,
            fromBlock: cursor,
            toBlock: to,
            topics: [topic0],
          }),
        signal
      );
      for (const log of logs) {
        let parsed;
        try {
          parsed = HANDSHAKE_IFACE.parseLog(log);
        } catch {
          continue;
        }
        if (!parsed) continue;
        const target = parsed.args[0];
        targets.add(getAddress(target).toLowerCase());
      }
      cursor = to + 1n;
      if (chunk < DEFAULT_CHUNK) chunk = DEFAULT_CHUNK;
      if (cursor <= latest && GET_LOGS_INTER_CHUNK_MS > 0) {
        await sleep(GET_LOGS_INTER_CHUNK_MS, signal);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (isRateLimitError(e) && chunk > 4000n) {
        chunk = chunk / 2n;
        continue;
      }
      if (chunk > 2000n && (msg.includes("limit") || msg.includes("too large") || msg.includes("range"))) {
        chunk = chunk / 2n;
        continue;
      }
      return { error: msg || "getLogs failed" };
    }
  }

  if (targets.size === 0) {
    return new Map();
  }

  const c = new Contract(handshake, HANDSHAKE_IFACE, provider);
  const list = [...targets];
  const out = new Map();
  for (let i = 0; i < list.length; i += ACCEPTED_COUNT_CONCURRENCY) {
    if (signal?.aborted) return { error: "Aborted" };
    const slice = list.slice(i, i + ACCEPTED_COUNT_CONCURRENCY);
    await Promise.all(
      slice.map(async (addr) => {
        try {
          const n = await withRpcRetry(() => c.acceptedCount(addr), signal);
          const bn = BigInt(n.toString());
          out.set(
            addr,
            Number(bn > BigInt(Number.MAX_SAFE_INTEGER) ? BigInt(Number.MAX_SAFE_INTEGER) : bn)
          );
        } catch {
          out.set(addr, 0);
        }
      })
    );
  }

  return out;
}

function cloneRows(rows) {
  return rows.map((r) => ({ ...r }));
}

async function buildLeaderboardRows(cap, signal) {
  const chains = handshakeChainsConfigured();
  if (chains.length === 0) {
    return {
      rows: [],
      error: "No Handshake networks configured (set handshakeAddresses + chains RPC in chainConfig).",
    };
  }

  /** Sequential chains — avoids hammering public RPCs with parallel getLogs (429 → all chains fail). */
  const settled = [];
  for (const chainId of chains) {
    try {
      const val = await fetchVouchCountsForChain(chainId, signal);
      settled.push({ status: "fulfilled", value: val });
    } catch (reason) {
      settled.push({ status: "rejected", reason });
    }
  }

  const totals = new Map();
  const chainWarnings = [];

  for (let i = 0; i < settled.length; i++) {
    const chainId = chains[i];
    const r = settled[i];
    if (r.status === "rejected") {
      const reason = r.reason;
      const msg = reason instanceof Error ? reason.message : String(reason);
      const isAbort = msg === "Aborted" || (reason instanceof Error && reason.name === "AbortError");
      if (isAbort) continue;
      chainWarnings.push(`Chain ${chainId}: ${msg}`);
      continue;
    }
    const val = r.value;
    if (!(val instanceof Map)) {
      if (val.error !== "Aborted") {
        chainWarnings.push(`Chain ${chainId}: ${val.error}`);
      }
      continue;
    }
    for (const [addr, n] of val) {
      totals.set(addr, (totals.get(addr) ?? 0) + n);
    }
  }

  if (totals.size === 0 && chainWarnings.length > 0) {
    return {
      rows: [],
      error: "Could not load data from all networks. Try again later.",
    };
  }

  const sorted = [...totals.entries()].sort((a, b) => {
    if (a[1] === b[1]) return 0;
    return a[1] > b[1] ? -1 : 1;
  });

  const rows = sorted.slice(0, cap).map(([addr, n]) => ({
    address: getAddress(addr),
    acceptedVouches: n,
  }));

  return { rows };
}

const GQL_QUERY = `
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

function toDisplayUrl(url) {
  const n = url.replace(/^ifps:\/\//i, "ipfs://").trim();
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

function parseGqlRow(row) {
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

function indexerUrl() {
  const u = process.env.INDEXER_GRAPHQL_URL || process.env.VITE_INDEXER_URL;
  return u && String(u).trim().length > 0 ? String(u).trim() : DEFAULT_GRAPHQL;
}

async function fetchIndexerProfiles(addresses, signal) {
  const unique = [...new Set(addresses.map((a) => a?.trim()).filter(Boolean).map((a) => a.toLowerCase()))];
  if (unique.length === 0) return {};

  try {
    const res = await fetch(indexerUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: GQL_QUERY, variables: { addresses: unique } }),
      signal,
    });
    if (!res.ok) return {};
    const json = await res.json();
    if (json.errors?.length) return {};
    const rows = json.data?.universal_profile ?? [];
    const out = {};
    for (const row of rows) {
      const parsed = parseGqlRow(row);
      out[parsed.address.toLowerCase()] = parsed;
    }
    return out;
  } catch {
    return {};
  }
}

/** limit -> { fetchedAt, payload } */
const serverCache = new Map();

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const rawLimit = parseInt(req.query?.limit ?? String(VOUCH_LEADERBOARD_TOP), 10);
  const cap = Math.min(VOUCH_LEADERBOARD_TOP, Math.max(1, Number.isFinite(rawLimit) ? rawLimit : VOUCH_LEADERBOARD_TOP));
  const cacheKey = String(cap);

  const now = Date.now();
  const hit = serverCache.get(cacheKey);
  if (hit && now - hit.fetchedAt < REFRESH_MS) {
    res.setHeader(
      "Cache-Control",
      `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${STALE_WHILE_REVALIDATE_SECONDS}`
    );
    return res.status(200).json(hit.payload);
  }

  const ac = new AbortController();
  const timeout = setTimeout(() => ac.abort(), 240000);

  try {
    const built = await buildLeaderboardRows(cap, ac.signal);
    const rows = built.rows ?? [];
    const rowError = built.error;

    let profiles = {};
    if (rows.length > 0) {
      profiles = await fetchIndexerProfiles(
        rows.map((r) => r.address),
        ac.signal
      );
    }

    const payload = {
      generatedAt: Date.now(),
      rows: cloneRows(rows),
      profiles,
      ...(rowError ? { error: rowError } : {}),
    };

    serverCache.set(cacheKey, { fetchedAt: Date.now(), payload: JSON.parse(JSON.stringify(payload)) });

    res.setHeader(
      "Cache-Control",
      `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${STALE_WHILE_REVALIDATE_SECONDS}`
    );
    return res.status(200).json(payload);
  } catch (e) {
    console.error("vouch-leaderboard API error:", e);
    return res.status(500).json({ error: e?.message ?? "Failed to build leaderboard" });
  } finally {
    clearTimeout(timeout);
  }
}
