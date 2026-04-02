/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Main Handshake dashboard URL (e.g. Vercel production). */
  readonly VITE_FULL_APP_URL?: string;
  /** When `window` is missing (tests/build), optional static miniapp origin. */
  readonly VITE_MINIAPP_PUBLIC_ORIGIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
