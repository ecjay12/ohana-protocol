# UP as Identity (Experimental)

**Status:** In development — not in main nav. Access via `/up-identity`.

## Concept

Use your **Universal Profile (UP)** as your primary identity. Multiple wallets (EOAs) can link to one UP.

- **One UP, multiple wallets** — Link several EOAs to the same Universal Profile (per chain via `registerEOAtoUP`)
- **Profile vouches** — `/profile/:upAddress` aggregates vouches from the UP and linked EOAs across supported chains
- **UP Grid / miniapp** — Not on this page; use the **Handshake mini dapp** (`VITE_MINIAPP_URL`, default `https://handshake.ohana.gg`) to add the app to your Grid

## How to use

1. Go to `https://your-handshake-app/up-identity` (or `http://localhost:5173/up-identity` in dev)
2. Connect a LUKSO wallet (EOA or UP)
3. **Link EOA to UP** — If connected with an EOA, enter your UP address and sign to link
4. Open **`/profile/YourUP`** to see aggregated vouches
5. For **Grid + miniapp**, use the Handshake mini dapp in the browser

## Contract

Uses `OhanaHandshakeRegistry.registerEOAtoUP(up)` — one EOA can link to one UP. Multiple EOAs can each link to the same UP.

## Notes

- **Profile aggregation (read-only):** On `/profile/:upAddress`, vouches are merged across **hardcoded** chains (`src/config/upProfileAggregation.ts`: LUKSO mainnet/testnet, Base mainnet/Sepolia). Users must call `registerEOAtoUP` on **each** chain where they use a wallet so linked EOAs are discoverable per chain.
