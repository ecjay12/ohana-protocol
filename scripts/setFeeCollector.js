/**
 * Update fee collector address on an existing Handshake contract.
 * Caller must be the contract owner.
 *
 * Usage:
 *   HANDSHAKE_ADDRESS=0xfd86a8c73827AE39F4630C6e498e8CCdDD183d4D FEE_COLLECTOR=0x69Cf660b4Dca16197BeE3e050E9cedCC82539793 npx hardhat run scripts/setFeeCollector.js --network lukso
 */
const hre = require("hardhat");

async function main() {
  const handshakeAddr = process.env.HANDSHAKE_ADDRESS || process.argv[2];
  const newCollector = process.env.FEE_COLLECTOR || process.argv[3];

  if (!handshakeAddr || !handshakeAddr.startsWith("0x")) {
    throw new Error("Set HANDSHAKE_ADDRESS in .env or pass as first arg.");
  }
  if (!newCollector || !newCollector.startsWith("0x")) {
    throw new Error("Set FEE_COLLECTOR in .env or pass as second arg.");
  }

  const [deployer] = await hre.ethers.getSigners();
  if (!deployer) throw new Error("No deployer. Set PRIVATE_KEY in .env.");

  const handshake = await hre.ethers.getContractAt("Handshake", handshakeAddr, deployer);
  const current = await handshake.feeCollector();
  if (current.toLowerCase() === newCollector.toLowerCase()) {
    console.log("Fee collector already set to", newCollector);
    return;
  }
  const tx = await handshake.setFeeCollector(newCollector, { gasLimit: 100000 });
  await tx.wait();
  console.log("Fee collector updated to", newCollector);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
