/**
 * Handshake-scoped activity: LSP28 grid rows that reference our miniapp + VouchAccepted on LUKSO Handshake.
 * Prefer `fetchHandshakeDappActivity()` — one request to `/api/handshake-activity` (cached server-side).
 */

import { Interface, getAddress } from "ethers";
import { LSP28_THE_GRID_KEY } from "@/config/lsp2Handshake";
import { getHandshakeAddress } from "@/config/contracts";
import { getRpcUrlForChain } from "@/lib/chainRpc";
import { createJsonRpcProvider } from "@/lib/jsonRpcProvider";
import { fetchLuksoProfilesFromIndexer } from "@/lib/lspIndexerProfiles";
import {
  fetchHandshakeActivityFromApi,
  getDappUrlMarkersVite,
  lsp28DataValueMentionsDapp,
} from "@/lib/handshakeDappActivity";

function indexerUrl(): string {
  const u = import.meta.env.VITE_INDEXER_URL;
  return u && String(u).trim().length > 0 ? String(u).trim() : "https://indexer.sigmacore.io/v1/graphql";
}

type GqlUp = {
  address: string;
  lsp3Profile: null | { name: null | { value: string | null } };
};

function miniProfile(up: GqlUp | null | undefined): { address: string; name: string | null } | null {
  if (!up?.address) return null;
  try {
    const address = getAddress(up.address);
    const name = up.lsp3Profile?.name?.value?.trim() || null;
    return { address, name };
  } catch {
    return null;
  }
}

const GRID_QUERY = `
query GridActivity($k: String!, $lim: Int!) {
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

export type LuksoActivityItem =
  | {
      kind: "grid";
      id: string;
      atMs: number;
      profile: { address: string; name: string | null };
    }
  | {
      kind: "vouch";
      id: string;
      atMs: number;
      voucher: { address: string; name: string | null };
      target: { address: string; name: string | null };
    };

async function fetchRecentDappGridActivity(
  signal?: AbortSignal,
  maxProfiles = 14
): Promise<LuksoActivityItem[]> {
  const markers = getDappUrlMarkersVite();
  if (markers.length === 0) return [];

  type Row = {
    id: string;
    address: string;
    timestamp: string;
    data_value: string;
    universalProfile: GqlUp | null;
  };
  type Res = { data?: { data_changed?: Row[] }; errors?: { message: string }[] };

  try {
    const res = await fetch(indexerUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: GRID_QUERY,
        variables: { k: LSP28_THE_GRID_KEY, lim: 200 },
      }),
      signal,
    });
    if (!res.ok) return [];
    const json = (await res.json()) as Res;
    if (json.errors?.length) return [];

    const rows = json.data?.data_changed ?? [];
    const seen = new Set<string>();
    const out: LuksoActivityItem[] = [];

    for (const row of rows) {
      if (signal?.aborted) break;
      if (!lsp28DataValueMentionsDapp(String(row.data_value ?? ""), markers)) continue;
      const key = row.address?.toLowerCase();
      if (!key || seen.has(key)) continue;
      const profile = miniProfile(row.universalProfile);
      if (!profile) continue;
      seen.add(key);
      const atMs = Date.parse(row.timestamp);
      if (!Number.isFinite(atMs)) continue;
      out.push({ kind: "grid", id: `grid-${row.id}`, atMs, profile });
      if (out.length >= maxProfiles) break;
    }
    return out;
  } catch {
    return [];
  }
}

const VOUCH_IFACE = new Interface(["event VouchAccepted(address indexed target, address indexed voucher)"]);
const VOUCH_TOPIC = VOUCH_IFACE.getEvent("VouchAccepted")!.topicHash;

async function fetchRecentVouchActivity(signal?: AbortSignal, logCap = 28): Promise<LuksoActivityItem[]> {
  const rpc = getRpcUrlForChain(42);
  const handshake = getHandshakeAddress(42);
  if (!rpc || !handshake) return [];

  const provider = createJsonRpcProvider(rpc);
  let latest = 0;
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

  const recent = logs.slice(-logCap);
  if (recent.length === 0) return [];

  const blockNums = [...new Set(recent.map((l) => Number(l.blockNumber)))];
  const tsByBlock = new Map<number, number>();
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

  const pairs: { target: string; voucher: string; atMs: number; id: string }[] = [];
  for (const log of recent) {
    if (signal?.aborted) break;
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
    pairs.push({
      target,
      voucher,
      atMs,
      id: `vouch-${log.transactionHash}-${log.index}`,
    });
  }

  const withTime = pairs.filter((p) => p.atMs > 0).reverse();
  if (withTime.length === 0) return [];

  const addrs = [...new Set(withTime.flatMap((p) => [p.target, p.voucher]).map((a) => a.toLowerCase()))];
  let nameByLower: Record<string, string | null> = {};
  try {
    const profiles = await fetchLuksoProfilesFromIndexer(addrs, { signal });
    nameByLower = Object.fromEntries(Object.entries(profiles).map(([k, v]) => [k, v.name ?? null]));
  } catch {
    /* */
  }

  const label = (addr: string) => nameByLower[addr.toLowerCase()] ?? null;

  return withTime.map((p) => ({
    kind: "vouch" as const,
    id: p.id,
    atMs: p.atMs,
    voucher: { address: p.voucher, name: label(p.voucher) },
    target: { address: p.target, name: label(p.target) },
  }));
}

/**
 * Build feed in-browser (slower, many RPC/GraphQL calls). Prefer `fetchHandshakeDappActivity()`.
 */
export async function buildHandshakeDappActivityClient(opts?: {
  signal?: AbortSignal;
  maxItems?: number;
}): Promise<LuksoActivityItem[]> {
  const maxItems = Math.min(Math.max(opts?.maxItems ?? 24, 4), 36);
  const signal = opts?.signal;
  const [grid, vouches] = await Promise.all([fetchRecentDappGridActivity(signal), fetchRecentVouchActivity(signal)]);
  const merged = [...grid, ...vouches].sort((a, b) => b.atMs - a.atMs);
  return merged.slice(0, maxItems);
}

/**
 * Cached API when available, otherwise in-browser build. Dapp-scoped only (no generic LUKSO follows).
 */
export async function fetchHandshakeDappActivity(opts?: {
  signal?: AbortSignal;
  maxItems?: number;
}): Promise<LuksoActivityItem[]> {
  const signal = opts?.signal;
  const maxItems = Math.min(36, Math.max(4, opts?.maxItems ?? 24));

  const fromApi = await fetchHandshakeActivityFromApi(signal);
  if (fromApi && Array.isArray(fromApi.items) && fromApi.items.length > 0) {
    return (fromApi.items as LuksoActivityItem[]).slice(0, maxItems);
  }
  return buildHandshakeDappActivityClient({ signal, maxItems });
}
