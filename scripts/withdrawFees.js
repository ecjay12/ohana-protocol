/**
 * Withdraw accumulated vouch fees from Handshake to the fee collector.
 * Callable by owner or fee collector.
 *
 * Usage:
 *   npx hardhat run scripts/withdrawFees.js --network lukso
 *   npx hardhat run scripts/withdrawFees.js --network base
 *
 * Or with explicit address:
 *   HANDSHAKE_ADDRESS=0xfd86a8c73827AE39F4630C6e498e8CCdDD183d4D npx hardhat run scripts/withdrawFees.js --network lukso
 */
const hre = require("hardhat");

const HANDSHAKE_BY_NETWORK = {
  42: "0xfd86a8c73827AE39F4630C6e498e8CCdDD183d4D",   // LUKSO mainnet
  8453: "0x4756E9c6e8a3c4eC749D5953C8c6FE61E76BB5a9", // Base mainnet
};

async function main() {
  const network = await hre.ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  const handshakeAddr = process.env.HANDSHAKE_ADDRESS || HANDSHAKE_BY_NETWORK[chainId];

  if (!handshakeAddr) {
    throw new Error("Set HANDSHAKE_ADDRESS in .env or deploy on LUKSO/Base first.");
  }

  const [caller] = await hre.ethers.getSigners();
  if (!caller) throw new Error("No signer. Set PRIVATE_KEY in .env.");

  const handshake = await hre.ethers.getContractAt("Handshake", handshakeAddr, caller);
  const accumulated = await handshake.accumulatedFees();
  const collector = await handshake.feeCollector();

  if (accumulated === 0n) {
    console.log("No fees to withdraw. accumulatedFees = 0");
    return;
  }

  const tx = await handshake.withdrawFees({ gasLimit: 100000 });
  await tx.wait();
  console.log("Withdrew", hre.ethers.formatEther(accumulated), "to", collector);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
