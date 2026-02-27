/**
 * Deploy Handshake implementation + proxy only (for mainnet or any network).
 * Sets vouch fee per chain: Ethereum/Base = 0.0009 ETH, LUKSO = 0.1 LYX.
 * Usage: npx hardhat run scripts/deployHandshake.js --network ethereum
 *        npx hardhat run scripts/deployHandshake.js --network base
 *        npx hardhat run scripts/deployHandshake.js --network luksoTestnet
 */
const hre = require("hardhat");

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// Vouch fee in wei per chain (anti-spam). Same decimals as ETH/LYX (18).
const FEE_WEI_BY_CHAIN = {
  1: "900000000000000",       // Ethereum: 0.0009 ETH
  8453: "900000000000000",    // Base: 0.0009 ETH
  4201: "100000000000000000", // LUKSO (testnet/mainnet): 0.1 LYX
  84532: "900000000000000",   // Base Sepolia: 0.0009 ETH (testnet)
};

function getFeeForChain(chainId) {
  const id = typeof chainId === "bigint" ? Number(chainId) : chainId;
  return FEE_WEI_BY_CHAIN[id] || "0";
}

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  if (!deployer) {
    throw new Error(
      "No deployer account. Set PRIVATE_KEY in .env (project root). Use --network ethereum or --network base for mainnet."
    );
  }
  console.log("Deploying Handshake with:", deployer.address);
  const network = await deployer.provider.getNetwork();
  const chainId = Number(network.chainId);
  console.log("Network:", network.name, "chainId:", chainId);

  const gasOpts = { gasLimit: 3_000_000 };
  const Handshake = await hre.ethers.getContractFactory("Handshake");
  const handshakeImpl = await Handshake.deploy(gasOpts);
  await handshakeImpl.waitForDeployment();
  const implAddr = await handshakeImpl.getAddress();
  console.log("Handshake impl:", implAddr);
  await delay(5000);

  const initData = Handshake.interface.encodeFunctionData("initialize", [deployer.address]);
  const HandshakeProxy = await hre.ethers.getContractFactory("HandshakeProxy");
  const proxy = await HandshakeProxy.deploy(implAddr, initData, gasOpts);
  await proxy.waitForDeployment();
  const proxyAddr = await proxy.getAddress();
  console.log("HandshakeProxy:", proxyAddr);

  const feeWei = getFeeForChain(chainId);
  if (feeWei !== "0") {
    await delay(2000);
    const handshake = await hre.ethers.getContractAt("Handshake", proxyAddr, deployer);
    const tx = await handshake.setFee(feeWei, gasOpts);
    await tx.wait();
    console.log("Fee set to", feeWei, "wei for chain", chainId);
  }

  console.log("\nAdd to frontend-handshake/src/config/contracts.ts:");
  console.log("  " + chainId + ': "' + proxyAddr + '",');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
