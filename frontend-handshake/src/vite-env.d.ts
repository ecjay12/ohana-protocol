/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_INDEXER_URL?: string;
  /** Production app URL for /integrate examples and embeds (defaults to https://ohanahandshake.com). */
  readonly VITE_PUBLIC_APP_URL?: string;
  /** Handshake miniapp base URL — activity feed matches this host inside LSP28 grid data (defaults in code). */
  readonly VITE_MINIAPP_URL?: string;
  /** Public GitHub repo URL for Integrate / footer links (optional). */
  readonly VITE_GITHUB_REPO_URL?: string;
  /** Optional JSON-RPC overrides (Alchemy/Infura/etc.) to avoid public-RPC 429s. Must be https URLs. */
  readonly VITE_RPC_BASE?: string;
  readonly VITE_RPC_BASE_SEPOLIA?: string;
  readonly VITE_RPC_LUKSO?: string;
  readonly VITE_RPC_LUKSO_TESTNET?: string;
  readonly VITE_RPC_ETHEREUM?: string;
}
