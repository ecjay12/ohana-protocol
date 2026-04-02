/**
 * Batch-call Handshake.retroHandshakePoints for historical VouchAccepted events.
 * Skips pairs already settled (on-chain revert with "Handshake pair already settled").
 *
 * Usage:
 *   npx hardhat run scripts/retroHandshakePoints.js --network baseSepolia
 * Env:
 *   HANDSHAKE — Handshake contract address (required)
 *   FROM_BLOCK — optional from block (default 0)
 */
const hre = require("hardhat");

async function main() {
  const addr = process.env.HANDSHAKE;
  if (!addr) {
    console.error("Set HANDSHAKE in .env");
    process.exit(1);
  }
  const fromBlock = parseInt(process.env.FROM_BLOCK ?? "0", 10);
  const [runner] = await hre.ethers.getSigners();
  const handshake = await hre.ethers.getContractAt("Handshake", addr, runner);

  const own = await handshake.owner();
  if (own.toLowerCase() !== runner.address.toLowerCase()) {
    console.error("Signer must be Handshake owner. Owner:", own, "Signer:", runner.address);
    process.exit(1);
  }

  const filter = handshake.filters.VouchAccepted();
  const latest = await hre.ethers.provider.getBlockNumber();
  console.log("Scanning VouchAccepted from block", fromBlock, "to", latest);

  const logs = await handshake.queryFilter(filter, fromBlock, latest);
  console.log("Events:", logs.length);

  let ok = 0;
  let skip = 0;
  for (const log of logs) {
    const target = log.args[0];
    const voucher = log.args[1];
    try {
      const tx = await handshake.retroHandshakePoints(target, voucher);
      await tx.wait();
      ok++;
      console.log("retro ok", ok, "/", logs.length, target, voucher);
    } catch (e) {
      skip++;
      const msg = e?.shortMessage || e?.message || String(e);
      if (!msg.includes("Handshake pair already settled") && !msg.includes("Hub not set")) {
        console.warn("retro fail", target, voucher, msg);
      }
    }
  }

  console.log("Done. Awarded:", ok, "skipped/failed:", skip);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
