# Ohana Protocol

Decentralized vouch protocol for Web3 identity. Vouch for others, accept or deny vouches, and build verifiable on-chain reputation.

## Ohana Handshake

Handshake is the vouch layer for Web3. Get vouched, vouch for others, and build reputation on LUKSO and Base.

### Live

- **Frontend**: Deployed on Vercel (see `frontend-handshake/DEPLOY.md`)
- **Mini-dapp**: LUKSO Universal Profile widget (see `frontend-miniapp/DEPLOY.md`)
- **Networks**: LUKSO mainnet (42), Base mainnet (8453), LUKSO Testnet (4201), Base Sepolia (84532)

### Deployed Contracts

| Network      | Chain ID | Handshake Address |
|-------------|----------|-------------------|
| LUKSO       | 42       | `0xfd86a8c73827AE39F4630C6e498e8CCdDD183d4D` |
| Base        | 8453     | `0x4756E9c6e8a3c4eC749D5953C8c6FE61E76BB5a9` |
| LUKSO Testnet | 4201   | `0x469C39f862856D6D4620A2a23eA12C4D2C78B549` |
| Base Sepolia | 84532   | `0x4fcC091A73a72E4ed24369c272a8c348e74D6FCD` |

## Structure

```
ohana-protocol/
├── contracts/           # Solidity: OhanaHandshakeRegistry, Handshake, LSP17VouchExtension
├── scripts/             # Deploy, setFee, setFeeCollector, withdrawFees
├── frontend-handshake/  # React + Vite + Tailwind (main app)
│   ├── src/
│   └── shared/chainConfig.json
├── frontend-miniapp/    # LUKSO mini-dapp for Universal Profiles
├── test/
└── frontend-poaforge/   # POAP Forge (separate dapp)
```

## Quick Start

```bash
# Install
npm install
cd frontend-handshake && npm install

# Run frontend locally
npm run frontend:handshake
# → http://localhost:5173

# Build for production
cd frontend-handshake && npm run build
```

## Development

### Contracts

```bash
npm run compile
npm run test
npm run deploy:mainnet    # Deploy to LUKSO + Base mainnet
```

### Environment

Copy `.env.example` to `.env` and add your keys:

- `LUKSO_PRIVATE_KEY` — for LUKSO mainnet/testnet deployment
- `BASE_PRIVATE_KEY` — for Base mainnet/Sepolia deployment

See [DEPLOY_MAINNET.md](./DEPLOY_MAINNET.md) for deployment details.

### Frontend

```bash
cd frontend-handshake
npm run dev      # Development
npm run build    # Production build
npm run preview  # Preview production build
```

See [frontend-handshake/DEPLOY.md](./frontend-handshake/DEPLOY.md) for deploying the frontend (Vercel, Netlify).

## Integrate

- **Read vouches**: `contract.acceptedCount(address)`, `contract.getVouchersFor(address)`
- **Badge**: `<iframe src="https://yoursite.com/badge?address=0x...&chainId=42" />`
- **API**: `GET /api/vouches?chainId=42&address=0x...`

See the [Integrate](/integrate) page in the app for full docs.

## License

MIT
