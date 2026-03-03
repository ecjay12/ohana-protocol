/**
 * LUKSO UP Provider integration for mini-apps.
 * When embedded in LUKSO Grid (e.g. LUKSO app, universaleverything.io):
 * - contextAccount = profile owner (already connected from parent — who to vouch for)
 * - account = visitor (who signs in on the parent UI — who is vouching)
 * @see https://docs.lukso.tech/learn/mini-apps/connect-upprovider/
 */
import { useState, useEffect, useCallback } from "react";
import { BrowserProvider } from "ethers";
import { createClientUPProvider } from "@lukso/up-provider";

const inIframe = typeof window !== "undefined" && window.self !== window.top;

/** Use UP Provider when in an iframe, except on known non-LUKSO hosts (Vercel preview, localhost) to avoid "No UP found" there. */
function shouldUseUPProvider(): boolean {
  if (!inIframe || typeof document === "undefined") return false;
  const ref = (document.referrer || "").toLowerCase();
  if (ref.includes("vercel.com") || ref.includes("localhost") || ref.includes("127.0.0.1")) return false;
  return true;
}

export interface UPProviderState {
  /** Profile owner (UP hosting the mini-app) - who to vouch for */
  contextAccount: string | null;
  /** Visitor's connected account - who is vouching */
  account: string | null;
  /** Ethers provider for transactions (when connected) */
  provider: BrowserProvider | null;
  chainId: number;
  /** True when embedded in LUKSO and connected */
  isInUPContext: boolean;
  /** True when provider has accounts (visitor connected) */
  isConnected: boolean;
}

export function useUPProvider(): UPProviderState {
  const [contextAccount, setContextAccount] = useState<string | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [chainId, setChainId] = useState<number>(4201);
  const [isInUPContext, setIsInUPContext] = useState(false);

  const updateFromProvider = useCallback((upProvider: ReturnType<typeof createClientUPProvider> | null) => {
    if (!upProvider) return;
    try {
      const ctx = upProvider.contextAccounts;
      const acc = upProvider.accounts;
      const ctx0 = ctx?.[0] ?? null;
      const acc0 = acc?.[0] ?? null;
      setContextAccount(ctx0);
      setAccount(acc0);
      const raw = upProvider.chainId ?? 4201;
      const num = typeof raw === "string" ? (raw.startsWith("0x") ? parseInt(raw, 16) : parseInt(raw, 10)) : Number(raw);
      setChainId(Number.isNaN(num) ? 4201 : num);
      setIsInUPContext(ctx != null && ctx.length > 0);
      if (acc0) {
        setProvider(new BrowserProvider(upProvider as unknown as import("ethers").Eip1193Provider));
      } else {
        setProvider(null);
      }
    } catch {
      // Library can throw e.g. "No UP found" — treat as no context
      setContextAccount(null);
      setAccount(null);
      setProvider(null);
      setIsInUPContext(false);
    }
  }, []);

  useEffect(() => {
    if (!shouldUseUPProvider()) return;

    let mounted = true;
    let upProvider: ReturnType<typeof createClientUPProvider> | null = null;
    try {
      upProvider = createClientUPProvider();
    } catch {
      return;
    }

    function sync() {
      if (!mounted || !upProvider) return;
      try {
        updateFromProvider(upProvider);
      } catch {
        // ignore
      }
    }

    const onAccountsChanged = () => sync();
    const onContextAccountsChanged = () => sync();
    const     onChainChanged = () => {
      if (mounted && upProvider) {
        try {
          const raw = upProvider.chainId ?? 4201;
          const num = typeof raw === "string" ? (raw.startsWith("0x") ? parseInt(raw, 16) : parseInt(raw, 10)) : Number(raw);
          setChainId(Number.isNaN(num) ? 4201 : num);
        } catch { /* ignore */ }
      }
    };
    const onInitialized = () => sync();

    try {
      upProvider.on("accountsChanged", onAccountsChanged);
      upProvider.on("contextAccountsChanged", onContextAccountsChanged);
      upProvider.on("chainChanged", onChainChanged);
      upProvider.on("initialized", onInitialized);
      sync();
      upProvider.resume(500);
    } catch {
      upProvider = null;
      setContextAccount(null);
      setAccount(null);
      setProvider(null);
      setIsInUPContext(false);
      return;
    }

    const poll = setInterval(sync, 1500);
    const stop = setTimeout(() => clearInterval(poll), 8000);

    return () => {
      mounted = false;
      clearInterval(poll);
      clearTimeout(stop);
      if (upProvider) {
        upProvider.removeListener("accountsChanged", onAccountsChanged);
        upProvider.removeListener("contextAccountsChanged", onContextAccountsChanged);
        upProvider.removeListener("chainChanged", onChainChanged);
        upProvider.removeListener("initialized", onInitialized);
      }
    };
  }, [updateFromProvider]);

  return {
    contextAccount,
    account,
    provider,
    chainId,
    isInUPContext,
    isConnected: !!account,
  };
}
