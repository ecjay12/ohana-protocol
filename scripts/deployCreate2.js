/**
 * Deploy OhanaHandshakeRegistry via EIP-2470 Singleton Factory (CREATE2).
 * Same address across LUKSO Testnet, Base Sepolia, Ethereum, Base.
 *
 * Prerequisites:
 * - EIP-2470 factory must exist on the target chain (0xce0042B868300000d44A59004Da54A005ffdcf9f)
 * - If factory doesn't exist, script falls back to regular deployment
 *
 * Usage:
 *   npx hardhat run scripts/deployCreate2.js --network luksoTestnet
 *   npx hardhat run scripts/deployCreate2.js --network baseSepolia
 *   npx hardhat run scripts/deployCreate2.js --network lukso      # LUKSO mainnet
 *   npx hardhat run scripts/deployCreate2.js --network base      # Base mainnet
 *   npm run deploy:mainnet   # Deploy to both LUKSO + Base mainnet
 *   FEE_COLLECTOR=0x... npx hardhat run scripts/deployCreate2.js --network lukso
 */

const hre = require("hardhat");
const { keccak256, getCreate2Address } = require("ethers");

const SINGLETON_FACTORY = "0xce0042B868300000d44A59004Da54A005ffdcf9f";
const SALT = keccak256(Buffer.from("OhanaHandshakeRegistry-v1", "utf8"));

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  if (!deployer) {
    throw new Error("No deployer. Set PRIVATE_KEY in .env");
  }

  const feeCollector = process.env.FEE_COLLECTOR || deployer.address;
  console.log("Fee collector:", feeCollector);
  console.log("Deployer:", deployer.address);

  const Factory = await hre.ethers.getContractFactory("OhanaHandshakeRegistry");
  const deployTx = await Factory.getDeployTransaction(feeCollector);
  const initCode = deployTx.data;

  if (!initCode || initCode === "0x") {
    throw new Error("Failed to get init code");
  }

  const initCodeHash = keccak256(initCode);
  const computedAddress = getCreate2Address(SINGLETON_FACTORY, SALT, initCodeHash);

  console.log("\n=== CREATE2 deployment ===");
  console.log("Computed address (same on all chains):", computedAddress);
  console.log("Salt:", SALT);

  // Check if factory exists
  const factoryCode = await hre.ethers.provider.getCode(SINGLETON_FACTORY);
  const factoryExists = factoryCode && factoryCode !== "0x" && factoryCode.length > 2;

  if (!factoryExists) {
    console.log("\nEIP-2470 factory not deployed on this chain. Using regular deployment.");
    const registry = await Factory.deploy(feeCollector);
    await registry.waitForDeployment();
    const addr = await registry.getAddress();
    console.log("Deployed at (chain-specific):", addr);
    console.log("\nNote: Address differs from CREATE2. Deploy factory or use a chain that has it.");
    return { address: addr, create2: false };
  }

  // Check if already deployed
  const existingCode = await hre.ethers.provider.getCode(computedAddress);
  if (existingCode && existingCode !== "0x" && existingCode.length > 2) {
    console.log("\nContract already deployed at computed address.");
    return { address: computedAddress, create2: true };
  }

  // Deploy via singleton factory
  const factoryAbi = [
    "function deploy(bytes memory _initCode, bytes32 _salt) returns (address payable)",
  ];
  const factory = new hre.ethers.Contract(SINGLETON_FACTORY, factoryAbi, deployer);

  try {
    const tx = await factory.deploy(initCode, SALT);
    const receipt = await tx.wait();
    console.log("Tx:", receipt.hash);

    if (receipt.status === 0) {
      throw new Error("Transaction reverted");
    }

    // Wait for RPC propagation
    await new Promise((r) => setTimeout(r, 5000));

    const code = await hre.ethers.provider.getCode(computedAddress);
    if (code && code !== "0x" && code.length > 2) {
      console.log("\nDeployed at:", computedAddress);
      return { address: computedAddress, create2: true };
    }
  } catch (e) {
    console.log("CREATE2 deploy failed:", e.message);
  }

  // Fallback: regular deployment
  console.log("\nFalling back to regular deployment...");
  const registry = await Factory.deploy(feeCollector);
  await registry.waitForDeployment();
  const addr = await registry.getAddress();
  console.log("Deployed at (chain-specific):", addr);
  return { address: addr, create2: false };
}

main()
  .then((r) => {
    console.log("\nResult:", r);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
