/**
 * Connect via browser-injected wallet(s). Supports multiple wallets (MetaMask, Universal Profile, etc.)
 * Chain list from shared/chainConfig.json (single source of truth with api/vouches.js).
 */
import { useCallback, useState, useEffect, useRef } from "react";
import { BrowserProvider, type Eip1193Provider } from "ethers";
import chainConfig from "../../shared/chainConfig.json";

const chainsRaw = chainConfig.chains as Record<string, { name: string; rpc: string }>;
export const CHAINS: Record<number, { name: string; rpc: string }> = Object.fromEntries(
  Object.entries(chainsRaw).map(([k, v]) => [parseInt(k, 10), v])
) as Record<number, { name: string; rpc: string }>;

export interface WalletOption {
  provider: Eip1193Provider;
  label: string;
}

type WalletState = {
  accounts: string[];
  chainId: number;
  isConnected: boolean;
  provider: BrowserProvider | null;
  rawProvider: Eip1193Provider | null;
  error: string | null;
  hasInjected: boolean;
};

const WALLET_PREF_KEY = "ohana-handshake-wallet-preference";
/** After disconnect(), skip silent eth_accounts reconnect until user picks a wallet again (connectWith). */
const SKIP_AUTO_RECONNECT_KEY = "ohana-handshake-skip-autoreconnect";

/**
 * MetaMask / some wallets: drop site permission so the next eth_requestAccounts can show
 * account selection instead of returning a stale authorized address.
 */
async function revokeSiteEthAccountsPermission(provider: Eip1193Provider | null) {
  if (!provider?.request) return;
  try {
    await provider.request({
      method: "wallet_revokePermissions",
      params: [{ eth_accounts: {} }],
    });
  } catch {
    /* Unsupported (e.g. older extension) or already revoked — safe to ignore */
  }
}

type InjectedEthereum = Eip1193Provider & {
  on?: (event: string, cb: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, cb: (...args: unknown[]) => void) => void;
  providers?: InjectedEthereum[];
  isMetaMask?: boolean;
};

declare global {
  interface Window {
    ethereum?: InjectedEthereum;
    lukso?: Eip1193Provider;
  }
}

/** Collect all available injected wallet providers with labels. */
function getAvailableWallets(): WalletOption[] {
  if (typeof window === "undefined") return [];
  const options: WalletOption[] = [];
  const seen = new Set<unknown>();

  const eth = window.ethereum;
  const lukso = window.lukso;

  // When multiple wallets are installed, some inject into ethereum.providers (e.g. MetaMask)
  if (eth?.providers && Array.isArray(eth.providers)) {
    for (const p of eth.providers) {
      if (seen.has(p)) continue;
      seen.add(p);
      const label =
        (p as InjectedEthereum).isMetaMask
          ? "MetaMask"
          : p === lukso
            ? "Universal Profile"
            : "Wallet";
      options.push({ provider: p as Eip1193Provider, label });
    }
  }

  // When no providers array (single wallet), add window.ethereum
  if (options.length === 0 && eth && typeof eth.request === "function") {
    seen.add(eth);
    const label = (eth as InjectedEthereum).isMetaMask ? "MetaMask" : "Browser wallet";
    options.push({ provider: eth as Eip1193Provider, label });
  }

  // Always add window.lukso (Universal Profile) — it injects separately and may not be in eth.providers
  if (lukso && typeof lukso.request === "function" && !seen.has(lukso)) {
    seen.add(lukso);
    options.push({ provider: lukso, label: "Universal Profile" });
  }

  // Prefer Universal Profile first for LUKSO-focused Handshake app (so picker shows UP before MetaMask)
  return options.sort((a, b) => {
    if (a.label === "Universal Profile" && b.label !== "Universal Profile") return -1;
    if (b.label === "Universal Profile" && a.label !== "Universal Profile") return 1;
    return 0;
  });
}

export function useInjectedWallet() {
  const [state, setState] = useState<WalletState>({
    accounts: [],
    chainId: 4201,
    isConnected: false,
    provider: null,
    rawProvider: null,
    error: null,
    hasInjected: typeof window !== "undefined" && !!window.ethereum,
  });

  /** Latest raw EIP-1193 provider for disconnect revoke (refs update before disconnect clears state). */
  const rawProviderRef = useRef<Eip1193Provider | null>(null);
  useEffect(() => {
    rawProviderRef.current = state.rawProvider;
  }, [state.rawProvider]);

  const availableWallets = getAvailableWallets();

  const connectWith = useCallback(async (wallet: WalletOption) => {
    const eth = wallet.provider;
    setState((s) => ({ ...s, error: null }));
    try {
      localStorage.setItem(WALLET_PREF_KEY, wallet.label);
    } catch {
      /* ignore */
    }
    try {
      const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      if (accounts.length > 0) {
        try {
          localStorage.removeItem(SKIP_AUTO_RECONNECT_KEY);
        } catch {
          /* ignore */
        }
      }
      const chainIdHex = (await eth.request({ method: "eth_chainId" })) as string;
      const chainId = parseInt(chainIdHex, 16);
      const ethersProvider = new BrowserProvider(eth as unknown as Eip1193Provider);
      setState({
        accounts,
        chainId,
        isConnected: accounts.length > 0,
        provider: ethersProvider,
        rawProvider: eth as unknown as Eip1193Provider,
        error: null,
        hasInjected: true,
      });
    } catch (e) {
      setState((s) => ({
        ...s,
        error: e instanceof Error ? e.message : "Connection failed",
      }));
    }
  }, []);

  const connect = useCallback(async () => {
    const wallets = getAvailableWallets();
    if (wallets.length === 0) {
      setState((s) => ({
        ...s,
        error: "No wallet found. Install MetaMask or the Universal Profile extension.",
      }));
      return;
    }
    // If only one wallet, connect with it directly
    if (wallets.length === 1) {
      await connectWith(wallets[0]);
      return;
    }
    // Multiple wallets: caller should show a picker and use connectWith(choice)
    setState((s) => ({ ...s, error: null }));
  }, [connectWith]);

  const disconnect = useCallback(() => {
    try {
      localStorage.setItem(SKIP_AUTO_RECONNECT_KEY, "1");
    } catch {
      /* ignore */
    }
    const p = rawProviderRef.current;
    rawProviderRef.current = null;
    void revokeSiteEthAccountsPermission(p);
    setState({
      accounts: [],
      chainId: 4201,
      isConnected: false,
      provider: null,
      rawProvider: null,
      error: null,
      hasInjected: getAvailableWallets().length > 0,
    });
  }, []);

  const switchChain = useCallback(async (chainId: number) => {
    if (!state.rawProvider || !CHAINS[chainId as keyof typeof CHAINS]) return;
    const eth = state.rawProvider;
    if (!eth?.request) return;
    const hexChainId = `0x${chainId.toString(16)}`;
    try {
      await eth.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: hexChainId }],
      });
      const newProvider = new BrowserProvider(eth);
      setState((s) => ({ ...s, chainId, provider: newProvider }));
    } catch (e: unknown) {
      const code = (e as { code?: number })?.code;
      // 4902 = chain not added to wallet yet — try adding it
      if (code === 4902) {
        const chain = CHAINS[chainId as keyof typeof CHAINS];
        try {
          await eth.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: hexChainId,
              chainName: chain.name,
              rpcUrls: [chain.rpc],
            }],
          });
          const newProvider = new BrowserProvider(eth);
          setState((s) => ({ ...s, chainId, provider: newProvider }));
          return;
        } catch (addErr) {
          setState((s) => ({ ...s, error: addErr instanceof Error ? addErr.message : "Failed to add chain" }));
          return;
        }
      }
      setState((s) => ({ ...s, error: e instanceof Error ? e.message : "Switch chain failed" }));
    }
  }, [state.rawProvider, state.chainId, state.isConnected]);

  useEffect(() => {
    setState((s) => ({ ...s, hasInjected: getAvailableWallets().length > 0 }));
  }, []);

  // Auto-reconnect on mount if wallet is already connected (eth_accounts, no prompt)
  useEffect(() => {
    const wallets = getAvailableWallets();
    if (wallets.length === 0) return;

    let cancelled = false;

    // Try preferred wallet first (user's last choice)
    let ordered = [...wallets];
    try {
      const pref = localStorage.getItem(WALLET_PREF_KEY);
      if (pref) {
        const idx = wallets.findIndex((w) => w.label === pref);
        if (idx > 0) {
          ordered = [wallets[idx], ...wallets.slice(0, idx), ...wallets.slice(idx + 1)];
        }
      }
    } catch {
      /* ignore */
    }

    const tryReconnect = async () => {
      try {
        if (localStorage.getItem(SKIP_AUTO_RECONNECT_KEY) === "1") {
          return;
        }
      } catch {
        /* ignore */
      }
      for (const wallet of ordered) {
        if (cancelled) return;
        try {
          const accounts = (await wallet.provider.request({ method: "eth_accounts" })) as string[];
          if (accounts.length > 0 && !cancelled) {
            const chainIdHex = (await wallet.provider.request({ method: "eth_chainId" })) as string;
            const chainId = parseInt(chainIdHex, 16);
            const rawEip = wallet.provider as unknown as Eip1193Provider;
            const ethersProvider = new BrowserProvider(rawEip);
            setState({
              accounts,
              chainId,
              isConnected: true,
              provider: ethersProvider,
              rawProvider: rawEip,
              error: null,
              hasInjected: true,
            });
            return;
          }
        } catch {
          // Try next wallet
        }
      }
    };

    tryReconnect();
    return () => {
      cancelled = true;
    };
  }, []);

  /** One chain/accounts listener per raw provider — reconnect used to stack handlers and flood RPC. */
  useEffect(() => {
    const eth = state.rawProvider as InjectedEthereum | null;
    if (!eth?.on) return;

    const onChainChanged = (id: unknown) => {
      const newChainId = typeof id === "string" ? parseInt(id, 16) : Number(id);
      setState((s) => {
        if (!s.rawProvider) return s;
        const newEthersProvider = new BrowserProvider(s.rawProvider);
        return { ...s, chainId: newChainId, provider: newEthersProvider };
      });
    };

    const onAccountsChanged = (accs: unknown) => {
      const list = Array.isArray(accs) ? (accs as string[]) : [];
      setState((s) => ({
        ...s,
        accounts: list,
        isConnected: list.length > 0,
        provider: list.length > 0 ? s.provider : null,
        rawProvider: list.length > 0 ? s.rawProvider : null,
      }));
    };

    eth.on("chainChanged", onChainChanged);
    eth.on("accountsChanged", onAccountsChanged);

    return () => {
      eth.removeListener?.("chainChanged", onChainChanged);
      eth.removeListener?.("accountsChanged", onAccountsChanged);
    };
  }, [state.rawProvider]);

  return {
    ...state,
    availableWallets,
    connect,
    connectWith,
    disconnect,
    switchChain,
    chains: CHAINS,
  };
}
