/**
 * GET /api/profile-index?up=0x...
 * Returns aggregated Ohana Points for a UP + linked EOAs (LUKSO registry events).
 * Requires DATABASE_URL and synced PointsAward rows (see scripts/sync-ohana-points.mjs).
 */
import { createRequire } from "module";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { Contract, JsonRpcProvider, getAddress } from "ethers";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const { handshakeAddresses, chains } = require(join(root, "shared/chainConfig.json"));

const HANDSHAKE_ABI = [
  "event EOARegistered(address indexed eoa, address indexed up)",
  "function getUPForEOA(address eoa) view returns (address)",
];

const LUKSO_IDS = new Set([42, 4201]);

let prismaSingleton;

async function getPrisma() {
  if (!prismaSingleton) {
    const { PrismaClient } = await import("@prisma/client");
    prismaSingleton = new PrismaClient();
  }
  return prismaSingleton;
}

async function getEOAsForUP(upAddress, chainId) {
  const normalizedUP = getAddress(upAddress.trim());
  const lookupChainId = LUKSO_IDS.has(chainId) ? chainId : 4201;
  const contractAddress = handshakeAddresses[String(lookupChainId)];
  const rpc = chains[String(lookupChainId)]?.rpc;
  if (!contractAddress || !rpc) return [];

  const provider = new JsonRpcProvider(rpc);
  const contract = new Contract(contractAddress, HANDSHAKE_ABI, provider);

  try {
    const filter = contract.filters.EOARegistered(null, normalizedUP);
    const events = await contract.queryFilter(filter);
    const eoas = events
      .map((e) => {
        const args = e.args;
        const eoa = args?.[0];
        return typeof eoa === "string" ? getAddress(eoa) : null;
      })
      .filter((a) => a != null);

    const unique = [...new Set(eoas)];
    const stillLinked = [];
    for (const eoa of unique) {
      try {
        const currentUP = await contract.getUPForEOA(eoa);
        if (
          currentUP &&
          currentUP !== "0x0000000000000000000000000000000000000000" &&
          getAddress(currentUP) === normalizedUP
        ) {
          stillLinked.push(eoa.toLowerCase());
        }
      } catch {
        stillLinked.push(eoa.toLowerCase());
      }
    }
    return stillLinked;
  } catch {
    return [];
  }
}

function aggregateRows(rows, identitiesLower, lastClaimedBlockBn) {
  let totalPointsEver = 0n;
  let pendingPoints = 0n;
  const pointsBreakdown = {};

  const set = new Set(identitiesLower);
  for (const r of rows) {
    if (!set.has(r.user.toLowerCase())) continue;
    const pts = BigInt(r.points);
    totalPointsEver += pts;
    const bn = BigInt(r.blockNumber);
    if (bn > lastClaimedBlockBn) pendingPoints += pts;
    const key = r.actionType;
    pointsBreakdown[key] = (pointsBreakdown[key] || 0) + r.points;
  }

  return {
    totalPointsEver: totalPointsEver.toString(),
    pendingPoints: pendingPoints.toString(),
    pointsBreakdown,
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const upParam = req.query.up?.trim();
  if (!upParam) {
    return res.status(400).json({ error: "Missing up (Universal Profile address)" });
  }

  let up;
  try {
    up = getAddress(upParam);
  } catch {
    return res.status(400).json({ error: "Invalid UP address" });
  }

  const chainId = parseInt(req.query.chainId ?? "4201", 10);

  const eoas = await getEOAsForUP(up, chainId);
  const identities = [up.toLowerCase(), ...eoas.map((a) => a.toLowerCase())];

  let prisma;
  let claim;
  let rows;
  try {
    prisma = await getPrisma();
    claim = await prisma.pointsClaim.findUnique({
      where: { upAddress: up.toLowerCase() },
    });
    rows = await prisma.pointsAward.findMany({
      where: { user: { in: identities } },
    });
  } catch {
    return res.status(200).json({
      up: up.toLowerCase(),
      linkedEOAs: eoas,
      pendingPoints: "0",
      pointsBreakdown: {},
      totalPointsEver: "0",
      lastClaimedBlock: "0",
      indexed: false,
      message: "Points indexer DB unavailable — run prisma db push and sync script locally.",
    });
  }

  const lastClaimedBlockBn = claim ? BigInt(claim.lastClaimedBlock) : 0n;

  const agg = aggregateRows(rows, identities, lastClaimedBlockBn);

  res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=120");
  return res.status(200).json({
    up: up.toLowerCase(),
    linkedEOAs: eoas,
    pendingPoints: agg.pendingPoints,
    pointsBreakdown: agg.pointsBreakdown,
    totalPointsEver: agg.totalPointsEver,
    lastClaimedBlock: claim ? claim.lastClaimedBlock : "0",
    lastClaimTxHash: claim?.lastClaimTxHash ?? null,
    indexed: true,
  });
}
