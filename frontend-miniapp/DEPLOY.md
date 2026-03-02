# Deploy Handshake Mini-Dapp to Vercel

Per [LUKSO mini-app docs](https://docs.lukso.tech/learn/mini-apps/). The miniapp must be iframe-embeddable for LSP28 Grid.

## Vercel Dashboard

1. [vercel.com](https://vercel.com) → **Add New Project** → Import repo `ecjay12/ohana-protocol`.
2. **Root Directory** (required): Click **Edit** next to Root Directory → set to `frontend-miniapp`. Without this, the build fails with "vite build exited with 127".
3. **Framework Preset**: Vite
4. **Build Command**: `npm run build` (default)
5. **Output Directory**: `dist` (default)
6. Deploy.

**Production URL:** https://frontend-miniapp-ecjay12s-projects.vercel.app (check Vercel Dashboard → Domains)

## Headers

`vercel.json` sets `Content-Security-Policy: frame-ancestors *` so the app can be embedded in iframes (LUKSO Grid, universaleverything.io).

## Troubleshooting

**Build failed: "vite build exited with 127"**
- Root Directory must be `frontend-miniapp`. If it's not set or wrong, Vercel builds from the repo root where `vite` is not installed.
- Go to Project Settings → General → Root Directory → Edit → `frontend-miniapp` → Save.
- Redeploy.

**Alternative (if Root Directory cannot be changed):** Override Build Command to `cd frontend-miniapp && npm install && npm run build` and Output Directory to `frontend-miniapp/dist`.
