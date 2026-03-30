const hre = require("hardhat");

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  if (!deployer) {
    throw new Error(
      "No deployer account. Set PRIVATE_KEY in .env (project root). For remote networks use: --network luksoTestnet or --network baseSepolia"
    );
  }
  console.log("Deploying with:", deployer.address);

  const OhanaPoints = await hre.ethers.getContractFactory("OhanaPoints");
  const points = await OhanaPoints.deploy(deployer.address);
  await points.waitForDeployment();
  const hubAddr = await points.getAddress();
  console.log("OhanaPoints (hub):", hubAddr);
  await delay(3000);

  const verifier =
    process.env.IMPACT_VERIFIER && hre.ethers.isAddress(process.env.IMPACT_VERIFIER)
      ? process.env.IMPACT_VERIFIER
      : deployer.address;
  const ImpactLedger = await hre.ethers.getContractFactory("ImpactLedger");
  const impact = await ImpactLedger.deploy(verifier);
  await impact.waitForDeployment();
  console.log("ImpactLedger:", await impact.getAddress(), "(verifier:", verifier + ")");
  await delay(3000);

  const POAPForge = await hre.ethers.getContractFactory("POAPForge");
  const forge = await POAPForge.deploy();
  await forge.waitForDeployment();
  const forgeAddr = await forge.getAddress();
  console.log("POAPForge:", forgeAddr);
  await delay(3000);

  const Handshake = await hre.ethers.getContractFactory("Handshake");
  const handshake = await Handshake.deploy(deployer.address);
  await handshake.waitForDeployment();
  const handshakeAddr = await handshake.getAddress();
  console.log("Handshake:", handshakeAddr);
  await delay(3000);

  const ReputationStation = await hre.ethers.getContractFactory("ReputationStation");
  const rep = await ReputationStation.deploy();
  await rep.waitForDeployment();
  const repAddr = await rep.getAddress();
  console.log("ReputationStation:", repAddr);
  await delay(3000);

  const LSP17VouchExtension = await hre.ethers.getContractFactory("LSP17VouchExtension");
  const ext = await LSP17VouchExtension.deploy();
  await ext.waitForDeployment();
  console.log("LSP17VouchExtension:", await ext.getAddress());
  await delay(3000);

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

  // Wire hub: REWARDER for contracts that call award(); trustedFactory for POAP child NFT registration.
  await wire("grantRewarder Handshake", points.grantRewarder(handshakeAddr, g));
  await wire("grantRewarder POAPForge", points.grantRewarder(forgeAddr, g));
  await wire("grantRewarder ReputationStation", points.grantRewarder(repAddr, g));
  await wire("grantRewarder ImpactLedger", points.grantRewarder(await impact.getAddress(), g));
  await wire("setTrustedFactory(POAPForge)", points.setTrustedFactory(forgeAddr, g));
  await wire("Handshake.setOhanaPointsHub", handshake.setOhanaPointsHub(hubAddr, g));
  await wire("POAPForge.setOhanaPointsHub", forge.setOhanaPointsHub(hubAddr, g));
  await wire("ReputationStation.setOhanaPointsHub", rep.setOhanaPointsHub(hubAddr, g));
  await wire("ImpactLedger.setOhanaPointsHub", impact.setOhanaPointsHub(hubAddr, g));
  console.log("OhanaPoints wired (rewarders + trustedFactory + setOhanaPointsHub on dApps).");

  const net = await hre.ethers.provider.getNetwork();
  const chainIdStr = String(net.chainId);
  console.log(
    "\nAdd to frontend-handshake/shared/chainConfig.json under ohanaPointsAddresses:",
    JSON.stringify({ [chainIdStr]: hubAddr.toLowerCase() }, null, 2)
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
