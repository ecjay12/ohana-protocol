# Handshake Mini-Dapp

LUKSO mini-dapp that users add to their Universal Profile so visitors can vouch for them. Built per [LUKSO mini-app docs](https://docs.lukso.tech/learn/mini-apps/).

## Live URL

**Production:** https://frontend-miniapp-ecjay12s-projects.vercel.app

## Add to Your Universal Profile (LSP28 Grid)

Per [LUKSO: Setting Your Grid](https://docs.lukso.tech/learn/mini-apps/setting-your-grid/):

1. Create your Grid JSON with an IFRAME element:

```json
{
  "LSP28TheGrid": [
    {
      "title": "Handshake",
      "gridColumns": 2,
      "visibility": "public",
      "grid": [
        {
          "width": 2,
          "height": 3,
          "type": "IFRAME",
          "properties": {
            "src": "https://frontend-miniapp-ecjay12s-projects.vercel.app",
            "allow": "accelerometer; autoplay; clipboard-write",
            "sandbox": "allow-forms;allow-pointer-lock;allow-popups;allow-same-origin;allow-scripts;allow-top-navigation",
            "allowfullscreen": true,
            "referrerpolicy": "no-referrer"
          }
        }
      ]
    }
  ]
}
```

2. Encode as VerifiableURI and set via `setData(bytes32,bytes)` on your Universal Profile. Use `@erc725/erc725.js` and the LSP28 schema (data key `keccak256('LSP28TheGrid')`).

3. When visitors view your profile on [universaleverything.io](https://universaleverything.io), the profile address comes from `contextAccounts` — no `?address=` needed.

## Direct Links (standalone)

For links outside the Grid, append `?address=0xYOUR_UP`:

```
https://frontend-miniapp-ecjay12s-projects.vercel.app/?address=0xYourUPAddress
```

## LUKSO UP Provider

When embedded in LUKSO apps (e.g. universaleverything.io), the miniapp uses [@lukso/up-provider](https://docs.lukso.tech/learn/mini-apps/connect-upprovider/):

- **contextAccounts**: Profile owner (UP hosting the mini-app in its Grid)
- **accounts**: Visitor's connected account — one-click connect from the parent page

## Development

```bash
npm run dev
```

From repo root: `npm run frontend:miniapp`

## Build

```bash
npm run build
```

## URL Parameters

- `address` — Profile owner's UP address (for standalone links)
- `theme` — `serene` | `dark` | `light` | `cyberpunk` | `lyx`
- `chainId` — LUKSO (42) or LUKSO Testnet (4201)

## Testing Locally

Per [LUKSO: Testing Mini-Apps Locally](https://docs.lukso.tech/learn/mini-apps/testing-miniapps/), use [localtunnel](https://github.com/localtunnel/localtunnel) to expose your dev server and add the tunnel URL to your Grid for testing on universaleverything.io.
