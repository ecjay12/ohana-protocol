/**
 * POST /api/points-claim
 * Body JSON: { up, lastClaimedBlock, lastClaimTxHash, lastSnapshotTotal? }
 * Records that the user wrote a claim snapshot to their UP (off-chain mirror for pending math).
 */
import { createRequire } from "module";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { getAddress } from "ethers";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

let prismaSingleton;

async function getPrisma() {
  if (!prismaSingleton) {
    const { PrismaClient } = await import("@prisma/client");
    prismaSingleton = new PrismaClient();
  }
  return prismaSingleton;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  let prisma;
  try {
    prisma = await getPrisma();
  } catch {
    return res.status(503).json({ error: "Prisma client unavailable" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: "Invalid JSON" });
    }
  }

  const { up, lastClaimedBlock, lastClaimTxHash, lastSnapshotTotal } = body ?? {};
  if (!up || lastClaimedBlock == null) {
    return res.status(400).json({ error: "Missing up or lastClaimedBlock" });
  }

  let normalized;
  try {
    normalized = getAddress(String(up).trim());
  } catch {
    return res.status(400).json({ error: "Invalid up" });
  }

  const blockStr = String(lastClaimedBlock);
  const snap =
    lastSnapshotTotal != null ? String(lastSnapshotTotal) : "0";

  try {
    await prisma.pointsClaim.upsert({
      where: { upAddress: normalized.toLowerCase() },
      create: {
        upAddress: normalized.toLowerCase(),
        lastClaimedBlock: blockStr,
        lastClaimTxHash: lastClaimTxHash ? String(lastClaimTxHash) : null,
        lastSnapshotTotal: snap,
      },
      update: {
        lastClaimedBlock: blockStr,
        lastClaimTxHash: lastClaimTxHash ? String(lastClaimTxHash) : null,
        lastSnapshotTotal: snap,
      },
    });
  } catch {
    return res.status(503).json({ error: "Points database unavailable" });
  }

  return res.status(200).json({ ok: true });
}
