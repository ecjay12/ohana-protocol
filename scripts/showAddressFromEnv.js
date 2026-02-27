/**
 * Print the address derived from PRIVATE_KEY in .env.
 * Run: node -r dotenv/config scripts/showAddressFromEnv.js
 * Or: npx hardhat run scripts/showAddressFromEnv.js (loads .env via hardhat)
 */
require("dotenv").config();
const { ethers } = require("ethers");

const key = process.env.PRIVATE_KEY;
if (!key) {
  console.error("No PRIVATE_KEY in .env");
  process.exit(1);
}

try {
  const wallet = new ethers.Wallet(key.startsWith("0x") ? key : "0x" + key);
  console.log("Address for PRIVATE_KEY in .env:", wallet.address);
} catch (e) {
  console.error("Invalid PRIVATE_KEY:", e.message);
  process.exit(1);
}
