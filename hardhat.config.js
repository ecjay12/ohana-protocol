require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {},
    luksoTestnet: {
      url: "https://rpc.testnet.lukso.network",
      chainId: 4201,
      accounts: (process.env.LUKSO_PRIVATE_KEY || process.env.PRIVATE_KEY) ? [process.env.LUKSO_PRIVATE_KEY || process.env.PRIVATE_KEY] : [],
    },
    baseSepolia: {
      url: "https://sepolia.base.org",
      chainId: 84532,
      accounts: (process.env.BASE_PRIVATE_KEY || process.env.PRIVATE_KEY) ? [process.env.BASE_PRIVATE_KEY || process.env.PRIVATE_KEY] : [],
    },
    lukso: {
      url: process.env.LUKSO_RPC_URL || "https://rpc.mainnet.lukso.network",
      chainId: 42,
      accounts: (process.env.LUKSO_PRIVATE_KEY || process.env.PRIVATE_KEY) ? [process.env.LUKSO_PRIVATE_KEY || process.env.PRIVATE_KEY] : [],
    },
    ethereum: {
      url: process.env.ETHEREUM_RPC_URL || "https://eth.llamarpc.com",
      chainId: 1,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    base: {
      url: process.env.BASE_RPC_URL || "https://mainnet.base.org",
      chainId: 8453,
      accounts: (process.env.BASE_PRIVATE_KEY || process.env.PRIVATE_KEY) ? [process.env.BASE_PRIVATE_KEY || process.env.PRIVATE_KEY] : [],
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
