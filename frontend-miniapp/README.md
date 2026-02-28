# Handshake Mini-Dapp

LUKSO mini-dapp that users add to their Universal Profile so visitors can vouch for them.

## Add to Your Universal Profile

1. Edit your LSP3 profile metadata (via [LUKSO Profile Editor](https://profile.lukso.network) or similar).
2. Add this to your `links` array:

```json
{
  "title": "Handshake",
  "url": "https://miniapp.ohana.gg/?address=0xYOUR_UP_ADDRESS"
}
```

3. Replace `0xYOUR_UP_ADDRESS` with your Universal Profile address.

## Development

```bash
npm run dev
```

From repo root:

```bash
npm run frontend:miniapp
```

## Build

```bash
npm run build
```

## URL Parameters

- `address` — Profile owner's Universal Profile address (required for widget)
- `theme` — `cyberpunk` | `nature` | `gold` | `minimal`
- `chainId` — LUKSO (42) or LUKSO Testnet (4201)

## Embedding

The miniapp accepts the profile address via:

1. **URL**: `?address=0x...`
2. **postMessage**: `{ type: 'ohana-handshake-address', address: '0x...' }` from the host (for iframe embedding)
