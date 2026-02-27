/**
 * Send testnet ETH/LYX from RECOVERY_PRIVATE_KEY address to your wallet.
 * Add to .env: RECOVERY_PRIVATE_KEY=0x... (the UP key / 0x77Ddc... key)
 * Recipient: 0x5112c47af5e6aa0Fa4c207460970BE3F4D2C26E5 (or set RECOVERY_TO_ADDRESS)
 *
 * Run: node -r dotenv/config scripts/recoverFundsToWallet.js
 */
require("dotenv").config();
const { ethers } = require("ethers");

const RECIPIENT = process.env.RECOVERY_TO_ADDRESS || "0x5112c47af5e6aa0Fa4c207460970BE3F4D2C26E5";
const GAS_BUFFER = ethers.parseEther("0.003"); // leave enough for gas (LYX can be tight)

const NETWORKS = [
  { name: "Base Sepolia", url: "https://sepolia.base.org", chainId: 84532 },
  { name: "LUKSO Testnet", url: "https://rpc.testnet.lukso.network", chainId: 4201 },
];

async function main() {
  const key = process.env.RECOVERY_PRIVATE_KEY;
  if (!key) {
    console.error("Set RECOVERY_PRIVATE_KEY in .env (the key for 0x77Ddc... that has the testnet funds)");
    process.exit(1);
  }

  const wallet = new ethers.Wallet(key.startsWith("0x") ? key : "0x" + key);
  console.log("Recovery from:", wallet.address);
  console.log("Recipient:", RECIPIENT);
  console.log("");

  for (const net of NETWORKS) {
    const provider = new ethers.JsonRpcProvider(net.url);
    const balance = await provider.getBalance(wallet.address);
    const balanceEth = ethers.formatEther(balance);

    if (balance <= GAS_BUFFER) {
      console.log(net.name + ": balance too low to send (" + balanceEth + "), skipping");
      continue;
    }

    const amountToSend = balance - GAS_BUFFER;
    console.log(net.name + ": sending", ethers.formatEther(amountToSend), "...");

    try {
      const tx = await wallet.connect(provider).sendTransaction({
        to: RECIPIENT,
        value: amountToSend,
        gasLimit: 21000,
      });
      console.log("  tx:", tx.hash);
      await tx.wait();
      console.log("  done.");
    } catch (e) {
      console.error("  error:", e.message);
    }
    console.log("");
  }

  console.log("Recovery run complete. Remove RECOVERY_PRIVATE_KEY from .env after.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
