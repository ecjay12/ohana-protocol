# Ohana Handshake Frontend

React + Vite + Tailwind frontend for the Ohana Handshake vouch protocol.

## Run locally

```bash
npm install
npm run dev
```

Dev server: `http://localhost:5173`. **Production app for integrators:** `https://ohanahandshake.com` (see `/integrate`; set `VITE_PUBLIC_APP_URL` if your deployment URL differs).

## Build

```bash
npm run build
```

Output in `dist/`.

## Deploy

See [DEPLOY.md](./DEPLOY.md) for Vercel, Netlify, and GitHub Pages.

## Config

- `shared/chainConfig.json` — Handshake contract addresses and chain RPCs
- `.env` / `.env.local` — See `.env.example` for optional vars

### 3D Vouch Graph

Visit `/vouch-graph` to see your vouch network in 3D. The route is not in the nav; use the URL directly. Add a nav link when ready to ship.
