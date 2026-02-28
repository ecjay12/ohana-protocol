# Deploy Handshake Mini-Dapp to GitHub + Vercel

## 1. Push to GitHub

```bash
# From repo root
git add .
git status   # Verify no .env, local/, or private files
git commit -m "Add frontend-miniapp"
git push origin main
```

## 2. Deploy to Vercel

### Option A: Vercel Dashboard (recommended)

1. Go to [vercel.com](https://vercel.com) and sign in.
2. **Add New Project** → Import `ecjay12/ohana-protocol`.
3. Configure:
   - **Root Directory**: `frontend-miniapp` (click Edit, set to `frontend-miniapp`)
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install` (runs in frontend-miniapp)
4. Deploy. You’ll get a URL like `https://ohana-miniapp-xxx.vercel.app`.
5. **Custom domain** (optional): e.g. `miniapp.ohana.gg` in Project → Settings → Domains.

**Production URL:** https://frontend-miniapp-ecjay12s-projects.vercel.app (find exact URL in Vercel Dashboard → Project → Domains)

### Option B: Vercel CLI

```bash
cd frontend-miniapp
vercel
# Follow prompts; set root to frontend-miniapp when asked
```

### Monorepo note

If the main Handshake app is already a Vercel project, create a **separate** Vercel project for the miniapp. Each project uses its own Root Directory (`frontend-handshake` vs `frontend-miniapp`).
