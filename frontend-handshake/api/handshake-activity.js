/**
 * GET /api/handshake-activity
 * Cached Handshake-only activity: LSP28 grid rows that reference our miniapp + recent VouchAccepted (LUKSO).
 * Excludes global LUKSO follow graph. One JSON request for the client.
 */
import { Interface, JsonRpcProvider, getAddress } from "ethers";
import { createRequire } from "module";

import { getDappUrlMarkersFromEnv, lsp28DataValueMentionsDapp } from "../shared/handshakeDappMarkers.mjs";

const require = createRequire(import.meta.url);
const { handshakeAddresses, chains: chainsJson } = require("../shared/chainConfig.json");

const LSP28_KEY = "0x724141d9918ce69e6b8afcf53a91748466086ba2c74b94cab43c649ae2ac23ff";
const DEFAULT_GRAPHQL = "https://indexer.sigmacore.io/v1/graphql";

const VOUCH_IFACE = new Interface(["event VouchAccepted(address indexed target, address indexed voucher)"]);
const VOUCH_TOPIC = VOUCH_IFACE.getEvent("VouchAccepted").topicHash;

const REFRESH_MS = 90_000;

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
  return rpc && String(rpc).length > 0 ? rpc : null;
}

function createProvider(rpc) {
  return new JsonRpcProvider(rpc, undefined, { batchMaxCount: 1, batchStallTime: 0 });
}

function indexerUrl() {
  const u = process.env.INDEXER_GRAPHQL_URL || process.env.VITE_INDEXER_URL;
  return u && String(u).trim().length > 0 ? String(u).trim() : DEFAULT_GRAPHQL;
}

const GQL_GRID = `
query DappGrid($k: String!, $lim: Int!) {
  data_changed(
    where: { data_key: { _eq: $k } }
    order_by: { timestamp: desc }
    limit: $lim
  ) {
    id
    address
    timestamp
    data_value
    universalProfile {
      address
      lsp3Profile { name { value } }
    }
  }
}
`;

const GQL_NAMES = `
query N($addresses: [String!]!) {
  universal_profile(where: { address: { _in: $addresses } }) {
    address
    lsp3Profile { name { value } }
  }
}
`;

let cached;
let cacheFetchedAt = 0;

function miniProfileFromRow(up) {
  if (!up?.address) return null;
  try {
    return {
      address: getAddress(up.address),
      name: up.lsp3Profile?.name?.value?.trim() || null,
    };
  } catch {
    return null;
  }
}

async function fetchIndexerNames(addresses, signal) {
  const unique = [...new Set(addresses.map((a) => a.toLowerCase()).filter(Boolean))];
  if (unique.length === 0) return {};
  try {
    const res = await fetch(indexerUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: GQL_NAMES, variables: { addresses: unique } }),
      signal,
    });
    if (!res.ok) return {};
    const json = await res.json();
    if (json.errors?.length) return {};
    const rows = json.data?.universal_profile ?? [];
    const out = {};
    for (const row of rows) {
      try {
        const a = getAddress(row.address);
        const name = row.lsp3Profile?.name?.value?.trim() || null;
        out[a.toLowerCase()] = { address: a, name };
      } catch {
        /* skip */
      }
    }
    return out;
  } catch {
    return {};
  }
}

async function buildGridItems(markers, signal) {
  const res = await fetch(indexerUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: GQL_GRID, variables: { k: LSP28_KEY, lim: 200 } }),
    signal,
  });
  if (!res.ok) return [];
  const json = await res.json();
  if (json.errors?.length) return [];

  const rows = json.data?.data_changed ?? [];
  const seen = new Set();
  const items = [];
  for (const row of rows) {
    if (signal?.aborted) break;
    if (!lsp28DataValueMentionsDapp(String(row.data_value ?? ""), markers)) continue;
    const key = row.address?.toLowerCase();
    if (!key || seen.has(key)) continue;
    const profile = miniProfileFromRow(row.universalProfile);
    if (!profile) continue;
    seen.add(key);
    const atMs = Date.parse(row.timestamp);
    if (!Number.isFinite(atMs)) continue;
    items.push({ kind: "grid", id: `grid-${row.id}`, atMs, profile });
    if (items.length >= 20) break;
  }

  const needNames = items.filter((i) => i.kind === "grid" && !i.profile.name).map((i) => i.profile.address);
  if (needNames.length > 0) {
    const extra = await fetchIndexerNames(needNames, signal);
    for (const it of items) {
      if (it.kind === "grid" && !it.profile.name) {
        const n = extra[it.profile.address.toLowerCase()];
        if (n?.name) it.profile.name = n.name;
      }
    }
  }

  return items;
}

async function buildVouchItems(signal) {
  const chainId = 42;
  const rpc = rpcForChain(chainId);
  const handshake = getHandshakeAddress(chainId);
  if (!rpc || !handshake) return [];

  const provider = createProvider(rpc);
  let latest;
  try {
    latest = await provider.getBlockNumber();
  } catch {
    return [];
  }
  if (signal?.aborted) return [];

  const span = 6000;
  const fromBlock = latest > span ? latest - span : 0;
  let logs;
  try {
    logs = await provider.getLogs({
      address: handshake,
      topics: [VOUCH_TOPIC],
      fromBlock,
      toBlock: latest,
    });
  } catch {
    return [];
  }

  const recent = logs.slice(-30);
  if (recent.length === 0) return [];

  const blockNums = [...new Set(recent.map((l) => Number(l.blockNumber)))];
  const tsByBlock = new Map();
  try {
    await Promise.all(
      blockNums.map(async (bn) => {
        if (signal?.aborted) return;
        const b = await provider.getBlock(bn);
        tsByBlock.set(bn, b?.timestamp ?? 0);
      })
    );
  } catch {
    return [];
  }

  const base = [];
  for (const log of recent) {
    let parsed;
    try {
      parsed = VOUCH_IFACE.parseLog(log);
    } catch {
      continue;
    }
    if (!parsed) continue;
    const target = getAddress(String(parsed.args.target));
    const voucher = getAddress(String(parsed.args.voucher));
    const bn = Number(log.blockNumber);
    const ts = tsByBlock.get(bn) ?? 0;
    const atMs = ts > 0 ? ts * 1000 : 0;
    if (atMs <= 0) continue;
    base.push({
      id: `vouch-${log.transactionHash}-${log.index}`,
      atMs,
      target,
      voucher,
    });
  }
  if (base.length === 0) return [];

  const withTime = base.reverse();
  const addrs = [...new Set(withTime.flatMap((p) => [p.target, p.voucher]).map((a) => a.toLowerCase()))];
  const names = await fetchIndexerNames(addrs, signal);

  return withTime.map((p) => {
    const tv = names[p.voucher.toLowerCase()];
    const tt = names[p.target.toLowerCase()];
    return {
      kind: "vouch",
      id: p.id,
      atMs: p.atMs,
      voucher: { address: p.voucher, name: tv?.name ?? null },
      target: { address: p.target, name: tt?.name ?? null },
    };
  });
}

async function buildPayload(signal) {
  const markers = getDappUrlMarkersFromEnv(process.env);
  const [grid, vouches] = await Promise.all([buildGridItems(markers, signal), buildVouchItems(signal)]);
  const merged = [...grid, ...vouches].sort((a, b) => b.atMs - a.atMs).slice(0, 24);
  return {
    source: "handshake-activity",
    dapp: true,
    generatedAt: Date.now(),
    markers: markers.length,
    items: merged,
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const now = Date.now();
  if (cached && now - cacheFetchedAt < REFRESH_MS) {
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return res.status(200).json(cached);
  }

  const ac = new AbortController();
  const timeout = setTimeout(() => ac.abort(), 120_000);
  try {
    const payload = await buildPayload(ac.signal);
    cached = JSON.parse(JSON.stringify(payload));
    cacheFetchedAt = Date.now();
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return res.status(200).json(payload);
  } catch (e) {
    console.error("handshake-activity error:", e);
    if (cached) {
      res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=120");
      return res.status(200).json(cached);
    }
    return res.status(500).json({ error: e?.message ?? "Failed" });
  } finally {
    clearTimeout(timeout);
  }
}
