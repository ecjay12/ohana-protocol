/**
 * Deploy core protocol + OhanaPoints hub on the **currently selected** Hardhat network.
 * Run once per network, e.g. `npx hardhat run scripts/deployMultiChain.js --network luksoTestnet`
 */
const hre = require("hardhat");

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function deployOnNetwork() {
  const [deployer] = await hre.ethers.getSigners();
  if (!deployer) {
    throw new Error("No deployer. Set PRIVATE_KEY and use --network <name>.");
  }
  const net = await hre.ethers.provider.getNetwork();
  console.log(`\n=== Deploying (chainId ${net.chainId}) deployer ${deployer.address} ===\n`);

  const OhanaPoints = await hre.ethers.getContractFactory("OhanaPoints");
  const points = await OhanaPoints.deploy(deployer.address);
  await points.waitForDeployment();
  const hubAddr = await points.getAddress();
  console.log("OhanaPoints:", hubAddr);

  const verifier =
    process.env.IMPACT_VERIFIER && hre.ethers.isAddress(process.env.IMPACT_VERIFIER)
      ? process.env.IMPACT_VERIFIER
      : deployer.address;
  const ImpactLedger = await hre.ethers.getContractFactory("ImpactLedger");
  const impact = await ImpactLedger.deploy(verifier);
  await impact.waitForDeployment();
  console.log("ImpactLedger:", await impact.getAddress(), "verifier:", verifier);

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
  const repAddr = await rep.getAddress();
  console.log("ReputationStation:", repAddr);

  const LSP17VouchExtension = await hre.ethers.getContractFactory("LSP17VouchExtension");
  const ext = await LSP17VouchExtension.deploy();
  await ext.waitForDeployment();
  console.log("LSP17VouchExtension:", await ext.getAddress());

  await delay(2000);

  const fee = await hre.ethers.provider.getFeeData();
  const g =
    fee.maxFeePerGas != null
      ? {
          maxFeePerGas: (fee.maxFeePerGas * 130n) / 100n,
          maxPriorityFeePerGas: fee.maxPriorityFeePerGas
            ? (fee.maxPriorityFeePerGas * 130n) / 100n
            : undefined,
        }
      : {};

  async function wire(txLabel, txPromise) {
    const tx = await txPromise;
    await tx.wait();
    console.log("  ok:", txLabel);
    await delay(5000);
  }

  await wire("grantRewarder Handshake", points.grantRewarder(handshakeAddr, g));
  await wire("grantRewarder POAPForge", points.grantRewarder(forgeAddr, g));
  await wire("grantRewarder ReputationStation", points.grantRewarder(repAddr, g));
  await wire("grantRewarder ImpactLedger", points.grantRewarder(await impact.getAddress(), g));
  await wire("setTrustedFactory", points.setTrustedFactory(forgeAddr, g));
  await wire("Handshake.setOhanaPointsHub", handshake.setOhanaPointsHub(hubAddr, g));
  await wire("POAPForge.setOhanaPointsHub", forge.setOhanaPointsHub(hubAddr, g));
  await wire("ReputationStation.setOhanaPointsHub", rep.setOhanaPointsHub(hubAddr, g));
  await wire("ImpactLedger.setOhanaPointsHub", impact.setOhanaPointsHub(hubAddr, g));

  console.log("\nOhanaPoints wired.");
  console.log(
    "\nchainConfig ohanaPointsAddresses entry:",
    JSON.stringify({ [String(net.chainId)]: hubAddr.toLowerCase() }, null, 2)
  );

  return {
    hubAddr,
    forgeAddr,
    handshakeAddr,
    repAddr,
    impactAddr: await impact.getAddress(),
    chainId: Number(net.chainId),
  };
}

async function main() {
  await deployOnNetwork();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
