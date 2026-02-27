# Security

## Pre–mainnet checklist

- **Secrets**: `PASSPORT_API_KEY` (Gitcoin Passport) must be set only in deployment env (e.g. Vercel). Never in repo or client.
- **APIs**: `/api/vouches` and `/api/github-attestation` are GET-only. `chainId` is restricted to configured chains; address is validated with `getAddress()` / regex.
- **Embed**: `useHostAddress` accepts postMessage only from same origin or `VITE_ALLOWED_EMBED_ORIGINS` (comma-separated). Set in build env for production embeds.
- **Profile fetches**: LSP profile metadata URLs are validated (no localhost/private IP). Fetch uses 10s timeout.
- **Contract**: Handshake addresses and RPC URLs come from `shared/chainConfig.json` (single source of truth). No user input is used to select RPC beyond `chainId` from the allowlist.

## Reporting

Report vulnerabilities privately to the project maintainers. Do not open public issues for security-sensitive findings.
