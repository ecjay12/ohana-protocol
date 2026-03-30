/**
 * GET /api/vouch-graph?chainId=4201
 * Global vouch graph edges for the network-wide 3D view.
 * Stub response until an indexer provides real edges; shape matches GlobalVouchGraphPayload.
 */

const CACHE_SECONDS = 120;

const STUB_EDGES = [
  ["0x1000000000000000000000000000000000000001", "0x2000000000000000000000000000000000000002"],
  ["0x2000000000000000000000000000000000000002", "0x3000000000000000000000000000000000000003"],
  ["0x3000000000000000000000000000000000000003", "0x4000000000000000000000000000000000000004"],
  ["0x1000000000000000000000000000000000000001", "0x4000000000000000000000000000000000000004"],
  ["0x2000000000000000000000000000000000000002", "0x5000000000000000000000000000000000000005"],
];

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const chainIdRaw = req.query.chainId;
  const chainId =
    typeof chainIdRaw === "string"
      ? parseInt(chainIdRaw, 10)
      : Array.isArray(chainIdRaw)
        ? parseInt(chainIdRaw[0], 10)
        : NaN;

  if (!Number.isFinite(chainId)) {
    return res.status(400).json({ error: "Invalid or missing chainId" });
  }

  const nodes = new Set();
  const edges = STUB_EDGES.map(([voucher, target]) => {
    nodes.add(voucher.toLowerCase());
    nodes.add(target.toLowerCase());
    return {
      voucher: voucher.toLowerCase(),
      target: target.toLowerCase(),
      strength: 1,
    };
  });

  res.setHeader("Cache-Control", `s-maxage=${CACHE_SECONDS}, stale-while-revalidate=300`);
  return res.status(200).json({
    nodes: Array.from(nodes),
    edges,
    centerAddress: null,
    source: "stub",
    message:
      "Indexer not connected — sample subgraph. Replace this handler with indexed edges when ready.",
    chainId,
  });
}
