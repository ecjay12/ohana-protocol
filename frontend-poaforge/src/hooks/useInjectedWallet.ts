/**
 * Connect via browser-injected wallet (MetaMask, Brave, etc.).
 */
import { useCallback, useState, useEffect } from "react";
import { BrowserProvider, type Eip1193Provider } from "ethers";

export const CHAINS = {
  4201: { name: "LUKSO Testnet", rpc: "https://rpc.testnet.lukso.network" },
  84532: { name: "Base Sepolia", rpc: "https://sepolia.base.org" },
} as const;

type WalletState = {
  accounts: string[];
  chainId: number;
  isConnected: boolean;
  provider: BrowserProvider | null;
  error: string | null;
  hasInjected: boolean;
};

declare global {
  interface Window {
    ethereum?: Eip1193Provider & { on?: (event: string, cb: (...args: unknown[]) => void) => void };
  }
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

  const connect = useCallback(async () => {
    const eth = window.ethereum;
    if (!eth) {
      setState((s) => ({ ...s, error: "No wallet found. Install MetaMask or another browser wallet." }));
      return;
    }
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
      eth.on?.("chainChanged", (id: unknown) => {
        setState((s) => ({ ...s, chainId: typeof id === "string" ? parseInt(id, 16) : Number(id) }));
      });
      eth.on?.("accountsChanged", (accs: unknown) => {
        const list = Array.isArray(accs) ? (accs as string[]) : [];
        setState((s) => ({ ...s, accounts: list, isConnected: list.length > 0, provider: list.length > 0 ? s.provider : null }));
      });
    } catch (e) {
      setState((s) => ({ ...s, error: e instanceof Error ? e.message : "Connection failed" }));
    }
  }, []);

  const disconnect = useCallback(() => {
    setState({
      accounts: [],
      chainId: 4201,
      isConnected: false,
      provider: null,
      error: null,
      hasInjected: !!window.ethereum,
    });
  }, []);

  const switchChain = useCallback(async (chainId: number) => {
    const eth = window.ethereum;
    if (!eth || !CHAINS[chainId as keyof typeof CHAINS]) return;
    try {
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: `0x${chainId.toString(16)}` }] });
      setState((s) => ({ ...s, chainId }));
    } catch (e) {
      setState((s) => ({ ...s, error: e instanceof Error ? e.message : "Switch chain failed" }));
    }
  }, []);

  useEffect(() => {
    setState((s) => ({ ...s, hasInjected: !!window.ethereum }));
  }, []);

  return { ...state, connect, disconnect, switchChain, chains: CHAINS };
}
