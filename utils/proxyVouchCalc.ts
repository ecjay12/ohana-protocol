/**
 * @file proxyVouchCalc.ts
 * @description Graph traversal for transitive trust scores. Weights human vs AI vouches.
 */

export type VouchEdge = {
  voucher: string;
  target: string;
  category: number;
  weight: number;
  source: "human" | "ai";
  timestamp: number;
};

export type RepScoreResult = {
  totalScore: number;
  byCategory: Record<number, number>;
  humanContribution: number;
  aiContribution: number;
};

const DEFAULT_HUMAN_WEIGHT = 1.0;
const DEFAULT_AI_WEIGHT = 0.5;
const DEFAULT_DECAY = 0.9;

/**
 * Build directed graph from vouch edges. Nodes = addresses, edges = voucher -> target.
 */
function buildGraph(edges: VouchEdge[]): Map<string, { target: string; category: number; weight: number; source: "human" | "ai" }[]> {
  const graph = new Map<string, { target: string; category: number; weight: number; source: "human" | "ai" }[]>();
  for (const e of edges) {
    const list = graph.get(e.voucher) ?? [];
    list.push({ target: e.target, category: e.category, weight: e.weight, source: e.source });
    graph.set(e.voucher, list);
  }
  return graph;
}

/**
 * BFS backward from subject: collect all vouchers (direct + transitive).
 * subject is the person being vouched for. We traverse: who vouched for subject? who vouched for those? etc.
 * Actually for "reputation of subject" we want: subject receives vouches from A, B, C. A receives from X. So X's trust flows to A, and A's to subject.
 * Directed edge: voucher -> target means "voucher vouches for target".
 * So for subject, we need: all edges where target === subject. And transitively, edges where target is a voucher of subject.
 * Graph: reverse direction for traversal. Incoming to subject = direct vouchers. Incoming to those = 2-hop.
 */
function getTransitiveVouchers(
  subject: string,
  edges: VouchEdge[],
  maxDepth: number = 5
): { voucher: string; target: string; category: number; weight: number; source: "human" | "ai"; hop: number }[] {
  const result: { voucher: string; target: string; category: number; weight: number; source: "human" | "ai"; hop: number }[] = [];
  const visited = new Set<string>();
  const queue: { addr: string; hop: number }[] = [{ addr: subject.toLowerCase(), hop: 0 }];

  // Build reverse adjacency: target -> list of (voucher, ...)
  const reverseAdj = new Map<string, { voucher: string; category: number; weight: number; source: "human" | "ai" }[]>();
  for (const e of edges) {
    const key = e.target.toLowerCase();
    const list = reverseAdj.get(key) ?? [];
    list.push({ voucher: e.voucher, category: e.category, weight: e.weight, source: e.source });
    reverseAdj.set(key, list);
  }

  while (queue.length > 0) {
    const { addr, hop } = queue.shift()!;
    if (hop > maxDepth) continue;
    const key = addr;
    if (visited.has(key)) continue;
    visited.add(key);

    const incoming = reverseAdj.get(key) ?? [];
    for (const inc of incoming) {
      result.push({
        voucher: inc.voucher,
        target: addr,
        category: inc.category,
        weight: inc.weight,
        source: inc.source,
        hop,
      });
      queue.push({ addr: inc.voucher.toLowerCase(), hop: hop + 1 });
    }
  }
  return result;
}

/**
 * Compute reputation score with transitive trust and human/AI weighting.
 */
export function computeTransitiveRepScore(
  subject: string,
  edges: VouchEdge[],
  options?: { humanWeight?: number; aiWeight?: number; decay?: number; maxDepth?: number }
): RepScoreResult {
  const humanWeight = options?.humanWeight ?? DEFAULT_HUMAN_WEIGHT;
  const aiWeight = options?.aiWeight ?? DEFAULT_AI_WEIGHT;
  const decay = options?.decay ?? DEFAULT_DECAY;
  const maxDepth = options?.maxDepth ?? 5;

  const transitive = getTransitiveVouchers(subject, edges, maxDepth);
  const byCategory: Record<number, number> = {};
  let humanContribution = 0;
  let aiContribution = 0;

  for (const t of transitive) {
    const w = t.weight * Math.pow(decay, t.hop);
    const sourceMultiplier = t.source === "human" ? humanWeight : aiWeight;
    const contribution = w * sourceMultiplier;

    byCategory[t.category] = (byCategory[t.category] ?? 0) + contribution;
    if (t.source === "human") humanContribution += contribution;
    else aiContribution += contribution;
  }

  const totalScore = humanContribution + aiContribution;
  return {
    totalScore,
    byCategory,
    humanContribution,
    aiContribution,
  };
}

/**
 * Query Ceramic or GraphQL indexer for vouch edges. Stub for integration.
 */
export async function fetchVouchEdgesFromIndexer(
  indexerUrl: string,
  subject?: string
): Promise<VouchEdge[]> {
  // Stub: return empty. Replace with actual GraphQL query to indexer.
  const query = `
    query GetVouches($subject: String) {
      vouches(where: { target: $subject }) {
        voucher
        target
        category
        source
        timestamp
      }
    }
  `;
  try {
    const res = await fetch(indexerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { subject: subject ?? "" } }),
    });
    const json = await res.json();
    const vouches = json?.data?.vouches ?? [];
    return vouches.map((v: any) => ({
      voucher: v.voucher,
      target: v.target,
      category: v.category ?? 0,
      weight: 1,
      source: (v.source ?? "human") as "human" | "ai",
      timestamp: v.timestamp ?? 0,
    }));
  } catch {
    return [];
  }
}
