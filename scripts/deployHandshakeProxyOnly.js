/**
 * Deploy only Handshake proxy (when impl is already deployed).
 * Set in .env: HANDSHAKE_IMPL_ADDRESS=0x...
 * Usage: npx hardhat run scripts/deployHandshakeProxyOnly.js --network ethereum
 */
const hre = require("hardhat");

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const implAddr = process.env.HANDSHAKE_IMPL_ADDRESS;
  if (!implAddr || !implAddr.startsWith("0x")) {
    throw new Error("Set HANDSHAKE_IMPL_ADDRESS in .env to the deployed Handshake implementation address.");
  }

  const [deployer] = await hre.ethers.getSigners();
  if (!deployer) {
    throw new Error("No deployer account. Set PRIVATE_KEY in .env.");
  }
  console.log("Deploying Handshake proxy with impl:", implAddr);
  const network = await deployer.provider.getNetwork();
  console.log("Network:", network.name, "chainId:", network.chainId.toString());

  const Handshake = await hre.ethers.getContractFactory("Handshake");
  const initData = Handshake.interface.encodeFunctionData("initialize", [deployer.address]);
  const HandshakeProxy = await hre.ethers.getContractFactory("HandshakeProxy");
  const proxy = await HandshakeProxy.deploy(implAddr, initData, { gasLimit: 3_000_000 });
  await proxy.waitForDeployment();
  const proxyAddr = await proxy.getAddress();
  console.log("HandshakeProxy:", proxyAddr);
  console.log("\nAdd to frontend-handshake/src/config/contracts.ts:");
  console.log("  " + network.chainId.toString() + ': "' + proxyAddr + '",');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
