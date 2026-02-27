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

  const POAPForge = await hre.ethers.getContractFactory("POAPForge");
  const forge = await POAPForge.deploy();
  await forge.waitForDeployment();
  console.log("POAPForge:", await forge.getAddress());
  await delay(3000);

  const Handshake = await hre.ethers.getContractFactory("Handshake");
  const handshake = await Handshake.deploy(deployer.address);
  await handshake.waitForDeployment();
  console.log("Handshake:", await handshake.getAddress());
  await delay(3000);

  const ReputationStation = await hre.ethers.getContractFactory("ReputationStation");
  const rep = await ReputationStation.deploy();
  await rep.waitForDeployment();
  console.log("ReputationStation:", await rep.getAddress());
  await delay(3000);

  const LSP17VouchExtension = await hre.ethers.getContractFactory("LSP17VouchExtension");
  const ext = await LSP17VouchExtension.deploy();
  await ext.waitForDeployment();
  console.log("LSP17VouchExtension:", await ext.getAddress());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
