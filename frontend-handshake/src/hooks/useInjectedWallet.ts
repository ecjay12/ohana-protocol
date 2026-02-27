/**
 * Connect via browser-injected wallet(s). Supports multiple wallets (MetaMask, Universal Profile, etc.)
 * Chain list from shared/chainConfig.json (single source of truth with api/vouches.js).
 */
import { useCallback, useState, useEffect } from "react";
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
  error: string | null;
  hasInjected: boolean;
};

type InjectedEthereum = Eip1193Provider & {
  on?: (event: string, cb: (...args: unknown[]) => void) => void;
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
    if (options.length > 0) return options;
  }

  // Single provider or no .providers: add ethereum and lukso if they are different
  if (eth && typeof eth.request === "function") {
    seen.add(eth);
    const label = (eth as InjectedEthereum).isMetaMask ? "MetaMask" : "Browser wallet";
    options.push({ provider: eth as Eip1193Provider, label });
  }
  if (lukso && typeof lukso.request === "function" && !seen.has(lukso)) {
    seen.add(lukso);
    options.push({ provider: lukso, label: "Universal Profile" });
  }

  return options;
}

export function useInjectedWallet() {
  const [state, setState] = useState<WalletState>({
    accounts: [],
    chainId: 4201,
    isConnected: false,
    provider: null,
    error: null,
    hasInjected: typeof window !== "undefined" && !!window.ethereum,
  });

  const availableWallets = getAvailableWallets();

  const connectWith = useCallback(async (wallet: WalletOption) => {
    const eth = wallet.provider;
    setState((s) => ({ ...s, error: null }));
    try {
      const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      const chainIdHex = (await eth.request({ method: "eth_chainId" })) as string;
      const chainId = parseInt(chainIdHex, 16);
      const ethersProvider = new BrowserProvider(eth as unknown as Eip1193Provider);
      setState({
        accounts,
        chainId,
        isConnected: accounts.length > 0,
        provider: ethersProvider,
        error: null,
        hasInjected: true,
      });
      const withOn = eth as InjectedEthereum;
      withOn.on?.("chainChanged", (id: unknown) => {
        setState((s) => ({ ...s, chainId: typeof id === "string" ? parseInt(id, 16) : Number(id) }));
      });
      withOn.on?.("accountsChanged", (accs: unknown) => {
        const list = Array.isArray(accs) ? (accs as string[]) : [];
        setState((s) => ({
          ...s,
          accounts: list,
          isConnected: list.length > 0,
          provider: list.length > 0 ? s.provider : null,
        }));
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
    setState({
      accounts: [],
      chainId: 4201,
      isConnected: false,
      provider: null,
      error: null,
      hasInjected: getAvailableWallets().length > 0,
    });
  }, []);

  const switchChain = useCallback(async (chainId: number) => {
    if (!state.provider || !CHAINS[chainId as keyof typeof CHAINS]) return;
    const eth = state.provider.provider as unknown as Eip1193Provider;
    if (!eth?.request) return;
    try {
      await eth.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
      setState((s) => ({ ...s, chainId }));
    } catch (e) {
      setState((s) => ({ ...s, error: e instanceof Error ? e.message : "Switch chain failed" }));
    }
  }, [state.provider]);

  useEffect(() => {
    setState((s) => ({ ...s, hasInjected: getAvailableWallets().length > 0 }));
  }, []);

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
