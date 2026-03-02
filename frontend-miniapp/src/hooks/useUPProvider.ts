/**
 * LUKSO UP Provider integration for mini-apps.
 * When embedded in LUKSO apps (e.g. universaleverything.io), provides:
 * - contextAccounts: the profile owner (UP hosting the mini-app in its Grid)
 * - accounts: the visitor's connected UP
 * @see https://docs.lukso.tech/learn/mini-apps/connect-upprovider/
 */
import { useState, useEffect, useCallback } from "react";
import { BrowserProvider } from "ethers";
import { createClientUPProvider } from "@lukso/up-provider";

const upProvider = createClientUPProvider();

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

  const updateFromProvider = useCallback(() => {
    const ctx = upProvider.contextAccounts;
    const acc = upProvider.accounts;
    const ctx0 = ctx?.[0] ?? null;
    const acc0 = acc?.[0] ?? null;
    setContextAccount(ctx0);
    setAccount(acc0);
    setChainId(upProvider.chainId ?? 4201);
    setIsInUPContext(ctx != null && ctx.length > 0);
    if (acc0) {
      setProvider(new BrowserProvider(upProvider as unknown as import("ethers").Eip1193Provider));
    } else {
      setProvider(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const isMiniApp = await upProvider.isMiniApp;
        if (!mounted) return;
        if (isMiniApp) {
          updateFromProvider();
        }
      } catch {
        // Not in mini-app context
      }
    }

    init();
    updateFromProvider();

    const onAccountsChanged = () => {
      if (mounted) updateFromProvider();
    };
    const onContextAccountsChanged = () => {
      if (mounted) updateFromProvider();
    };
    const onChainChanged = () => {
      if (mounted) setChainId(upProvider.chainId ?? 4201);
    };

    upProvider.on("accountsChanged", onAccountsChanged);
    upProvider.on("contextAccountsChanged", onContextAccountsChanged);
    upProvider.on("chainChanged", onChainChanged);

    return () => {
      mounted = false;
      upProvider.removeListener("accountsChanged", onAccountsChanged);
      upProvider.removeListener("contextAccountsChanged", onContextAccountsChanged);
      upProvider.removeListener("chainChanged", onChainChanged);
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
