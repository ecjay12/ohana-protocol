# Deploy Handshake Mini-Dapp to Vercel

Per [LUKSO mini-app docs](https://docs.lukso.tech/learn/mini-apps/). The miniapp must be iframe-embeddable for LSP28 Grid.

## Vercel Dashboard

1. [vercel.com](https://vercel.com) → **Add New Project** → Import repo.
2. Configure (critical):
   - **Root Directory**: `frontend-miniapp` (click Edit, set this — required for monorepo)
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Deploy.

**Production URL:** https://frontend-miniapp-ecjay12s-projects.vercel.app (check Vercel Dashboard → Domains)

## Headers

`vercel.json` sets `Content-Security-Policy: frame-ancestors *` so the app can be embedded in iframes (LUKSO Grid, universaleverything.io).
