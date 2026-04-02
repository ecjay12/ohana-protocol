/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_INDEXER_URL?: string;
  /** Production app URL for /integrate examples and embeds (defaults to https://ohanahandshake.com). */
  readonly VITE_PUBLIC_APP_URL?: string;
  /** Public GitHub repo URL for Integrate / footer links (optional). */
  readonly VITE_GITHUB_REPO_URL?: string;
}
