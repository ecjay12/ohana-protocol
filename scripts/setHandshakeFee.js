/**
 * Set vouch fee on an existing Handshake proxy. Fee is chosen by current network.
 * Set HANDSHAKE_PROXY_ADDRESS in .env or pass as first arg.
 * Fees: Ethereum/Base = 0.0009 ETH, LUKSO = 0.1 LYX.
 * Usage: npx hardhat run scripts/setHandshakeFee.js --network ethereum
 *        HANDSHAKE_PROXY_ADDRESS=0x... npx hardhat run scripts/setHandshakeFee.js --network base
 */
const hre = require("hardhat");

const FEE_WEI_BY_CHAIN = {
  1: "900000000000000",       // 0.0009 ETH
  42: "100000000000000000",   // 0.1 LYX (LUKSO mainnet)
  8453: "900000000000000",    // 0.0009 ETH (Base mainnet)
  4201: "100000000000000000", // 0.1 LYX (LUKSO testnet)
  84532: "900000000000000",   // 0.0009 ETH (Base Sepolia)
};

async function main() {
  const proxyAddr = process.env.HANDSHAKE_PROXY_ADDRESS || process.argv[2];
  if (!proxyAddr || !proxyAddr.startsWith("0x")) {
    throw new Error("Set HANDSHAKE_PROXY_ADDRESS in .env or pass proxy address as first arg.");
  }

  const [deployer] = await hre.ethers.getSigners();
  if (!deployer) throw new Error("No deployer. Set PRIVATE_KEY in .env.");
  const network = await deployer.provider.getNetwork();
  const chainId = Number(network.chainId);
  const feeWei = FEE_WEI_BY_CHAIN[chainId];
  if (feeWei === undefined) {
    throw new Error("No fee configured for chainId " + chainId + ". Add to FEE_WEI_BY_CHAIN in this script.");
  }

  const handshake = await hre.ethers.getContractAt("Handshake", proxyAddr, deployer);
  const current = await handshake.fee();
  if (current === BigInt(feeWei)) {
    console.log("Fee already set to", feeWei, "wei. No change.");
    return;
  }
  const tx = await handshake.setFee(feeWei, { gasLimit: 100000 });
  await tx.wait();
  console.log("Handshake at", proxyAddr, "fee set to", feeWei, "wei for chain", chainId);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
