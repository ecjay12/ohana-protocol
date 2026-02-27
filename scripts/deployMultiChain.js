/**
 * Deploy Ohana Protocol to LUKSO testnet and Base Sepolia.
 * Includes Axelar/Wormhole wrapper placeholders for Solana/Polkadot.
 */
const hre = require("hardhat");

const NETWORKS = {
  luksoTestnet: { chainId: 4201, name: "LUKSO Testnet" },
  baseSepolia: { chainId: 84532, name: "Base Sepolia" },
};

async function deployOnNetwork(networkName) {
  const provider = hre.ethers.provider;
  const [deployer] = await hre.ethers.getSigners();
  const network = await provider.getNetwork();
  console.log(`\n=== Deploying on ${networkName} (chainId ${network.chainId}) ===`);

  const POAPForge = await hre.ethers.getContractFactory("POAPForge");
  const forge = await POAPForge.deploy();
  await forge.waitForDeployment();
  const forgeAddr = await forge.getAddress();
  console.log("POAPForge:", forgeAddr);

  const Handshake = await hre.ethers.getContractFactory("Handshake");
  const handshake = await Handshake.deploy(deployer.address);
  await handshake.waitForDeployment();
  const handshakeAddr = await handshake.getAddress();
  console.log("Handshake:", handshakeAddr);

  const ReputationStation = await hre.ethers.getContractFactory("ReputationStation");
  const rep = await ReputationStation.deploy();
  await rep.waitForDeployment();
  console.log("ReputationStation:", await rep.getAddress());

  const LSP17VouchExtension = await hre.ethers.getContractFactory("LSP17VouchExtension");
  const ext = await LSP17VouchExtension.deploy();
  await ext.waitForDeployment();
  console.log("LSP17VouchExtension:", await ext.getAddress());

  return { forgeAddr, handshakeAddr, chainId: Number(network.chainId) };
}

async function main() {
  const results = {};

  for (const [netName, netInfo] of Object.entries(NETWORKS)) {
    try {
      const deployed = await deployOnNetwork(netInfo.name);
      results[netName] = deployed;
    } catch (e) {
      console.error(`Failed on ${netName}:`, e.message);
      results[netName] = { error: e.message };
    }
  }

  console.log("\n=== Deployment Summary ===");
  console.log(JSON.stringify(results, null, 2));

  console.log("\n=== Axelar/Wormhole Wrapper Placeholders ===");
  console.log(`
  // TODO: Axelar GMP - Cross-chain mint request
  // 1. Deploy OhanaCrossChainBridge.sol that:
  //    - Emits CrossChainMintRequest(sourceChainId, tokenId, destChainId)
  //    - Registers with Axelar Gateway for EVM chains
  // 2. For Solana: Use Axelar GMP Solana SDK
  //    - gateway.mintOnSolana(nftMetadata, recipient)
  //    - See: https://docs.axelar.dev/dev/general-message-passing/solana/gmp-contracts

  // TODO: Wormhole - NFT bridge
  // 1. Deploy Wormhole-compatible wrapper for POAP NFTs
  // 2. For Polkadot (Acala EVM+): Wormhole has launched
  //    - https://acalanetwork.medium.com/wormhole-bridge-launches-on-acala-evm
  // 3. For Solana: Wormhole NFT bridge already supports Solana <-> EVM
  `);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
