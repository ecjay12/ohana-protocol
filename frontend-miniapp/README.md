# Handshake Mini-Dapp

LUKSO mini-dapp that users add to their Universal Profile so visitors can vouch for them.

## Live URL

**Production:** https://frontend-miniapp-ecjay12s-projects.vercel.app

Add `?address=0xYOUR_UP` when using as a link. When added to LUKSO Grid, the profile address comes from context.

## Add to Your Universal Profile

1. Edit your LSP3 profile metadata (via [LUKSO Profile Editor](https://profile.lukso.network) or similar).
2. Add this to your `links` array or LUKSO Grid:

```json
{
  "title": "Handshake",
  "url": "https://frontend-miniapp-ecjay12s-projects.vercel.app/?address=0xYOUR_UP_ADDRESS"
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

## LUKSO UP Provider

When embedded in LUKSO apps (e.g. [universaleverything.io](https://universaleverything.io)), the miniapp uses [@lukso/up-provider](https://docs.lukso.tech/learn/mini-apps/connect-upprovider/):

- **contextAccounts**: The profile owner (UP hosting the mini-app in its Grid) — no `?address=` needed
- **accounts**: The visitor's connected UP — one-click connect from the parent page

Add the miniapp to your LUKSO Grid; visitors can vouch without a separate Connect flow.

## Embedding

The miniapp accepts the profile address via (priority order):

1. **LUKSO UP Provider** `contextAccounts` (when in LUKSO Grid)
2. **URL**: `?address=0x...`
3. **postMessage**: `{ type: 'ohana-handshake-address', address: '0x...' }` from the host
