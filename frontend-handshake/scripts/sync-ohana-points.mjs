/**
 * Polls OhanaPoints PointsAwarded logs per chain and upserts into Prisma.
 * Run: DATABASE_URL="file:./dev.db" node scripts/sync-ohana-points.mjs
 * Configure ohanaPointsAddresses in shared/chainConfig.json (non-empty per chain).
 */
import { createRequire } from "module";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { Contract, JsonRpcProvider, Interface, id, getAddress } from "ethers";
import { PrismaClient } from "@prisma/client";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const { ohanaPointsAddresses, chains } = require(join(root, "shared/chainConfig.json"));

const POINTS_IFACE = new Interface([
  "event PointsAwarded(address indexed user, uint256 points, bytes32 indexed actionType, uint256 chainId)",
]);

const TOPIC0 = id("PointsAwarded(address,uint256,bytes32,uint256)");

const CHUNK = 2000n;

const prisma = new PrismaClient();

async function getCursor(chainId) {
  const row = await prisma.syncCursor.findUnique({ where: { chainId } });
  return row ? BigInt(row.lastBlock) : null;
}

async function setCursor(chainId, block) {
  await prisma.syncCursor.upsert({
    where: { chainId },
    create: { chainId, lastBlock: block.toString() },
    update: { lastBlock: block.toString() },
  });
}

async function syncChain(chainId, hubAddress, rpc, startBlockFallback) {
  if (!hubAddress || hubAddress.length < 10) {
    console.warn(`Skipping chain ${chainId}: no ohanaPoints address`);
    return;
  }
  const provider = new JsonRpcProvider(rpc);
  const latest = BigInt(await provider.getBlockNumber());
  const floor = startBlockFallback ?? 0n;
  let from = (await getCursor(chainId)) ?? floor;
  if (from < floor) from = floor;
  if (from > latest) return;

  console.log(`Chain ${chainId}: ${hubAddress} blocks ${from}..${latest}`);

  while (from <= latest) {
    const to = from + CHUNK > latest ? latest : from + CHUNK;
    const logs = await provider.getLogs({
      address: getAddress(hubAddress),
      topics: [TOPIC0],
      fromBlock: from,
      toBlock: to,
    });

    for (const log of logs) {
      let parsed;
      try {
        parsed = POINTS_IFACE.parseLog(log);
      } catch {
        continue;
      }
      const user = getAddress(parsed.args[0]);
      const points = Number(parsed.args[1]);
      const actionType = parsed.args[2];
      const block = await provider.getBlock(log.blockNumber);
      await prisma.pointsAward.upsert({
        where: {
          chainId_txHash_logIndex: {
            chainId,
            txHash: log.transactionHash,
            logIndex: log.index,
          },
        },
        create: {
          chainId,
          user: user.toLowerCase(),
          points,
          actionType,
          blockNumber: log.blockNumber.toString(),
          blockTimestamp: block?.timestamp != null ? String(block.timestamp) : null,
          txHash: log.transactionHash,
          logIndex: log.index,
        },
        update: {},
      });
    }

    await setCursor(chainId, to);
    from = to + 1n;
  }
}

async function main() {
  for (const [k, v] of Object.entries(ohanaPointsAddresses)) {
    const chainId = parseInt(k, 10);
    const hub = typeof v === "string" ? v.trim() : "";
    const rpc = chains[k]?.rpc;
    if (!rpc) continue;
    const raw = chains[k]?.pointsSyncFromBlock;
    const startBlockFallback =
      raw !== undefined && raw !== "" ? BigInt(String(raw)) : 0n;
    await syncChain(chainId, hub, rpc, startBlockFallback);
  }
  console.log("Sync done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
