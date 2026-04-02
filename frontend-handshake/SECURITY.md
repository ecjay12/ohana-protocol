# Security

## Pre–mainnet checklist

- **Secrets**: Never commit `.env`, `.env.local`, or private keys. `PASSPORT_API_KEY` (Gitcoin Passport) belongs only in deployment env (e.g. Vercel), never in the repo or client bundles.
- **APIs**: `/api/vouches` and `/api/github-attestation` are GET-only; `chainId` / `address` are validated against `shared/chainConfig.json`.
- **Embed**: `useHostAddress` accepts postMessage only from same origin or `VITE_ALLOWED_EMBED_ORIGINS` (comma-separated). Set in build env for production embeds.
- **Profile fetches**: LSP profile metadata URLs are validated (no localhost/private IP). Fetch uses 10s timeout.
- **Contract**: Handshake addresses and RPC URLs come from `shared/chainConfig.json` (single source of truth). No user input is used to select RPC beyond `chainId` from the allowlist.

## Reporting

Report vulnerabilities privately to the project maintainers. Do not open public issues for security-sensitive findings.
