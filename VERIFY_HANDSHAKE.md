# Verify Handshake Contract on LUKSO Block Explorer

## Contract Addresses

| Network        | Address |
|----------------|---------|
| LUKSO Mainnet  | `0xfd86a8c73827AE39F4630C6e498e8CCdDD183d4D` |
| LUKSO Testnet  | `0x469C39f862856D6D4620A2a23eA12C4D2C78B549` |

## Block Explorer Links

- **LUKSO Mainnet:** https://explorer.execution.mainnet.lukso.network/address/0xfd86a8c73827AE39F4630C6e498e8CCdDD183d4D
- **LUKSO Testnet:** https://explorer.execution.testnet.lukso.network/address/0x469C39f862856D6D4620A2a23eA12C4D2C78B549

## Recommended: Verify via Hardhat (easiest)

1. Ensure `PRIVATE_KEY` or `LUKSO_PRIVATE_KEY` is in `.env` (for the network).
2. Run:

```bash
# LUKSO Mainnet (feeCollector from contract)
npx hardhat verify --network lukso 0xfd86a8c73827AE39F4630C6e498e8CCdDD183d4D "0x69Cf660b4Dca16197BeE3e050E9cedCC82539793"

# LUKSO Testnet (fetch feeCollector first, or use deployer address)
npx hardhat verify --network luksoTestnet 0x469C39f862856D6D4620A2a23eA12C4D2C78B549 "0x..."
```

To fetch the feeCollector for a chain:
```bash
node -e "
const { ethers } = require('ethers');
const provider = new ethers.JsonRpcProvider('https://rpc.mainnet.lukso.network');
const c = new ethers.Contract('0xfd86a8c73827AE39F4630C6e498e8CCdDD183d4D', ['function feeCollector() view returns (address)'], provider);
c.feeCollector().then(a => console.log('feeCollector:', a));
"
```

## Manual JSON upload (if Hardhat fails)

If the JSON upload says "No contract could be verified", try Hardhat verify above instead. The manual JSON method can fail due to constructor args, via-IR, or format differences.

1. Go to the contract address → **Contract** tab → **Verify & Publish**.
2. Choose **Solidity (Standard-Json-Input)**.
3. Upload **`handshake-verification-input.json`**.
4. Set **Compiler:** 0.8.24, **Contract:** `contracts/core/OhanaHandshakeRegistry.sol:OhanaHandshakeRegistry`, **Optimization:** 200 runs.
5. Provide constructor arg: `0x69Cf660b4Dca16197BeE3e050E9cedCC82539793` (feeCollector).
