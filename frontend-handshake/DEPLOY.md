# Deploy Handshake Frontend Online

## Option 1: Vercel (recommended)

1. **Install Vercel CLI** (one-time):
   ```bash
   npm i -g vercel
   ```

2. **Build and deploy** from project root:
   ```bash
   cd frontend-handshake
   npm run build
   vercel
   ```

   Or deploy directly (Vercel builds for you):
   ```bash
   cd frontend-handshake
   vercel
   ```

3. Follow prompts: link to your Vercel account, confirm project. You’ll get a URL like `https://ohana-handshake-xxx.vercel.app`.

4. **Custom domain** (optional): In Vercel dashboard → Project → Settings → Domains.

---

## Option 2: Netlify

1. **Install Netlify CLI**:
   ```bash
   npm i -g netlify-cli
   ```

2. **Build and deploy**:
   ```bash
   cd frontend-handshake
   npm run build
   netlify deploy --prod --dir=dist
   ```

3. Or connect your GitHub repo at [netlify.com](https://netlify.com) and set build command: `npm run build`, publish directory: `dist`.

---

## Option 3: GitHub Pages

1. Create a GitHub repo and push your code.

2. In **Settings → Pages**:
   - Source: GitHub Actions
   - Or: Deploy from branch, `main`, folder: `/ (root)`

3. Add a GitHub Actions workflow (`.github/workflows/deploy.yml`):
   ```yaml
   name: Deploy
   on:
     push:
       branches: [main]
   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with:
             node-version: 20
         - run: npm ci
         - run: cd frontend-handshake && npm ci && npm run build
         - uses: peaceiris/actions-gh-pages@v4
           with:
             github_token: ${{ secrets.GITHUB_TOKEN }}
             publish_dir: frontend-handshake/dist
   ```

4. **Set base path** in `vite.config.ts` if your site is at `https://username.github.io/repo-name/`:
   ```ts
   base: '/repo-name/',
   ```

---

## Build locally first

```bash
cd frontend-handshake
npm run build
```

Output is in `dist/`. Use that folder for any static hosting.
