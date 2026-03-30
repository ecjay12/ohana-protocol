/**
 * Complete OhanaPoints wiring after deploy (or recover from partial deploy).
 * Usage:
 *   npx hardhat run scripts/wireOhanaPoints.js --network baseSepolia
 * Env (required):
 *   OHANA_HUB, HANDSHAKE, POAP_FORGE, REPUTATION_STATION, IMPACT_LEDGER
 */
const hre = require("hardhat");

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function gasOpts(provider) {
  const fee = await provider.getFeeData();
  if (!fee.maxFeePerGas) return {};
  return {
    maxFeePerGas: (fee.maxFeePerGas * 130n) / 100n,
    maxPriorityFeePerGas: fee.maxPriorityFeePerGas
      ? (fee.maxPriorityFeePerGas * 130n) / 100n
      : undefined,
  };
}

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const hub = process.env.OHANA_HUB;
  const handshakeAddr = process.env.HANDSHAKE;
  const forgeAddr = process.env.POAP_FORGE;
  const repAddr = process.env.REPUTATION_STATION;
  const impactAddr = process.env.IMPACT_LEDGER;

  if (!hub || !handshakeAddr || !forgeAddr || !repAddr || !impactAddr) {
    console.error(
      "Set OHANA_HUB, HANDSHAKE, POAP_FORGE, REPUTATION_STATION, IMPACT_LEDGER in .env"
    );
    process.exit(1);
  }

  const g = await gasOpts(hre.ethers.provider);
  const points = await hre.ethers.getContractAt("OhanaPoints", hub);
  const handshake = await hre.ethers.getContractAt("Handshake", handshakeAddr);
  const forge = await hre.ethers.getContractAt("POAPForge", forgeAddr);
  const rep = await hre.ethers.getContractAt("ReputationStation", repAddr);
  const impact = await hre.ethers.getContractAt("ImpactLedger", impactAddr);

  const REWARDER_ROLE = await points.REWARDER_ROLE();

  async function grantIfNeeded(label, addr) {
    if (await points.hasRole(REWARDER_ROLE, addr)) {
      console.log("skip grantRewarder (already):", label, addr);
      return;
    }
    console.log("grantRewarder:", label, addr);
    const tx = await points.grantRewarder(addr, g);
    await tx.wait();
    await delay(5000);
  }

  await grantIfNeeded("Handshake", handshakeAddr);
  await grantIfNeeded("POAPForge", forgeAddr);
  await grantIfNeeded("ReputationStation", repAddr);
  await grantIfNeeded("ImpactLedger", impactAddr);

  const tf = await points.trustedFactory();
  if (tf.toLowerCase() !== forgeAddr.toLowerCase()) {
    console.log("setTrustedFactory:", forgeAddr);
    await (await points.setTrustedFactory(forgeAddr, g)).wait();
    await delay(5000);
  } else {
    console.log("skip setTrustedFactory (already):", forgeAddr);
  }

  if ((await handshake.ohanaPointsHub()).toLowerCase() !== hub.toLowerCase()) {
    console.log("Handshake.setOhanaPointsHub");
    await (await handshake.setOhanaPointsHub(hub, g)).wait();
    await delay(5000);
  } else {
    console.log("skip Handshake.setOhanaPointsHub");
  }

  if ((await forge.ohanaPointsHub()).toLowerCase() !== hub.toLowerCase()) {
    console.log("POAPForge.setOhanaPointsHub");
    await (await forge.setOhanaPointsHub(hub, g)).wait();
    await delay(5000);
  } else {
    console.log("skip POAPForge.setOhanaPointsHub");
  }

  if ((await rep.ohanaPointsHub()).toLowerCase() !== hub.toLowerCase()) {
    console.log("ReputationStation.setOhanaPointsHub");
    await (await rep.setOhanaPointsHub(hub, g)).wait();
    await delay(5000);
  } else {
    console.log("skip ReputationStation.setOhanaPointsHub");
  }

  if ((await impact.ohanaPointsHub()).toLowerCase() !== hub.toLowerCase()) {
    console.log("ImpactLedger.setOhanaPointsHub");
    await (await impact.setOhanaPointsHub(hub, g)).wait();
    await delay(5000);
  } else {
    console.log("skip ImpactLedger.setOhanaPointsHub");
  }

  console.log("\nDone. Wired by:", deployer.address);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
