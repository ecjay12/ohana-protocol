/**
 * Send testnet funds from RECOVERY_PRIVATE_KEY to RECOVERY_TO_ADDRESS (local utility only).
 * Set in .env — never commit .env. See .env.example.
 *
 * Run: node -r dotenv/config scripts/recoverFundsToWallet.js
 */
require("dotenv").config();
const { ethers } = require("ethers");

let recipient;
try {
  const raw = process.env.RECOVERY_TO_ADDRESS?.trim();
  if (!raw) throw new Error("missing");
  recipient = ethers.getAddress(raw);
} catch {
  console.error("Set RECOVERY_TO_ADDRESS in .env to a valid Ethereum address.");
  process.exit(1);
}
const GAS_BUFFER = ethers.parseEther("0.003"); // leave enough for gas (LYX can be tight)

const NETWORKS = [
  { name: "Base Sepolia", url: "https://sepolia.base.org", chainId: 84532 },
  { name: "LUKSO Testnet", url: "https://rpc.testnet.lukso.network", chainId: 4201 },
];

async function main() {
  const key = process.env.RECOVERY_PRIVATE_KEY;
  if (!key) {
    console.error("Set RECOVERY_PRIVATE_KEY in .env (funding wallet — keep local only).");
    process.exit(1);
  }

  const wallet = new ethers.Wallet(key.startsWith("0x") ? key : "0x" + key);
  console.log("Recovery from:", wallet.address);
  console.log("Recipient:", recipient);
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
        to: recipient,
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
