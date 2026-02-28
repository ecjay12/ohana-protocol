/**
 * Main profile widget card: stats, Vouch/Revoke, reputation ring.
 * Supports LUKSO UP Provider (one-click when embedded) and injected wallet fallback.
 */
import { useState, useEffect } from "react";
import { ExternalLink } from "lucide-react";
import { ReputationRing } from "./ReputationRing";
import { WalletConnect } from "./WalletConnect";
import { useHandshake, CATEGORIES } from "@/hooks/useHandshake";
import { VOUCH_FEE_DISPLAY } from "@/config/contracts";
import type { BrowserProvider } from "ethers";
import type { WalletOption } from "@/hooks/useInjectedWallet";

const HANDSHAKE_APP_URL = "https://handshake.ohana.gg";
const DOCS_URL = "https://docs.ohana.gg";
const SUPPORT_URL = "https://discord.gg/ohana";
const PRIVACY_URL = "https://ohana.gg/privacy";

interface UPProviderContext {
  account: string | null;
  provider: BrowserProvider | null;
  chainId: number;
  isConnected: boolean;
  isInUPContext: boolean;
}

interface InjectedWalletState {
  isConnected: boolean;
  accounts: string[];
  chainId: number;
  provider: BrowserProvider | null;
  availableWallets: WalletOption[];
  error: string | null;
  connect: () => void;
  connectWith: (wallet: WalletOption) => void;
  disconnect: () => void;
  switchChain: (chainId: number) => void;
  chains: Record<number, { name: string; rpc: string }>;
}

interface ProfileWidgetCardProps {
  profileAddress: string;
  received: number;
  given: number;
  profileName?: string | null;
  loading: boolean;
  onRefetch: () => void;
  upProviderContext?: UPProviderContext;
  injectedWallet: InjectedWalletState;
}

function truncateAddress(addr: string): string {
  if (addr.length <= 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function ProfileWidgetCard({
  profileAddress,
  received,
  given,
  profileName,
  loading,
  onRefetch,
  upProviderContext,
  injectedWallet,
}: ProfileWidgetCardProps) {
  const {
    isConnected: injConnected,
    accounts,
    chainId: injChainId,
    provider: injProvider,
    availableWallets,
    error: walletError,
    connect,
    connectWith,
    disconnect,
    switchChain,
    chains,
  } = injectedWallet;

  const isEmbedded = typeof window !== "undefined" && window.self !== window.top;
  const useUP = upProviderContext?.isInUPContext && upProviderContext?.isConnected;
  const account = useUP ? (upProviderContext?.account ?? null) : (accounts[0] ?? null);
  const provider = useUP ? upProviderContext?.provider : injProvider;
  const chainId = useUP ? (upProviderContext?.chainId ?? 4201) : injChainId;
  const isConnected = useUP || injConnected;
  const { vouch, removeVouch, getVouch, txPending, error: handshakeError, isSupported } = useHandshake(
    provider,
    chainId,
    isConnected ? account : null
  );

  const [canRevoke, setCanRevoke] = useState(false);
  const [vouchCategory, setVouchCategory] = useState(1);
  const [checkingRevoke, setCheckingRevoke] = useState(false);

  useEffect(() => {
    if (!account || !profileAddress) {
      setCanRevoke(false);
      return;
    }
    setCheckingRevoke(true);
    getVouch(profileAddress, account)
      .then((v) => {
        setCanRevoke(v !== null && v.status !== 0);
      })
      .finally(() => setCheckingRevoke(false));
  }, [account, profileAddress, getVouch]);

  const handleVouch = async () => {
    if (!account || account.toLowerCase() === profileAddress.toLowerCase()) return;
    try {
      await vouch(profileAddress, vouchCategory);
      onRefetch();
    } catch {
      // error shown via handshakeError
    }
  };

  const handleRevoke = async () => {
    if (!account) return;
    try {
      await removeVouch(profileAddress);
      onRefetch();
    } catch {
      // error shown via handshakeError
    }
  };

  const feeDisplay = VOUCH_FEE_DISPLAY[chainId] ?? { amount: "0.1", symbol: "LYX" };
  const handleDisplay = profileName ? (profileName.startsWith("@") ? profileName : `@${profileName}`) : null;

  return (
    <div className="miniapp-card glass-card flex w-full max-w-md flex-col gap-4 rounded-2xl p-4 sm:p-5">
      <header className="text-center">
        <h1 className="text-lg font-semibold text-theme-text">Handshake</h1>
        <p className="text-xs text-theme-text-muted">Reputation Layer</p>
      </header>

      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
        <div className="flex-shrink-0">
          <ReputationRing received={received} className="text-theme-accent" size={52} strokeWidth={5} />
        </div>
        <div className="flex-1 text-center sm:text-left min-w-0">
          <p className="font-medium text-theme-text text-sm truncate">
            {handleDisplay ?? truncateAddress(profileAddress)}
          </p>
          <p className="text-xs text-theme-text-muted">{truncateAddress(profileAddress)}</p>
          <div className="mt-1.5 flex gap-3 text-sm">
            <span>
              <strong className="text-theme-text">{received}</strong>{" "}
              <span className="text-theme-text-muted">Received</span>
            </span>
            <span>
              <strong className="text-theme-text">{given}</strong>{" "}
              <span className="text-theme-text-muted">Given</span>
            </span>
            {loading && <span className="text-theme-text-dim">·</span>}
            {loading && <span className="text-xs text-theme-text-dim">Loading…</span>}
          </div>
        </div>
      </div>

      <>
        {!isConnected ? (
            isEmbedded ? (
              <p className="text-center text-sm text-theme-text-muted">
                Connect via the parent page to vouch.
              </p>
            ) : (
              <WalletConnect
                isConnected={false}
                account={null}
                availableWallets={availableWallets}
                error={walletError}
                onConnect={connect}
                onConnectWith={connectWith}
                onDisconnect={disconnect}
                className="w-full justify-center"
              />
            )
          ) : (
            <div className="flex flex-col gap-3">
              {account?.toLowerCase() === profileAddress.toLowerCase() ? (
                <p className="text-center text-sm text-theme-text-muted">
                  This is your profile. Share the link so others can vouch for you.
                </p>
              ) : isSupported ? (
                <>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleVouch}
                      disabled={txPending}
                      className="miniapp-btn-primary flex-1 rounded-lg px-4 py-2.5 font-medium disabled:opacity-50"
                    >
                      {txPending ? "Confirming…" : `Vouch (${feeDisplay.amount} ${feeDisplay.symbol})`}
                    </button>
                    {canRevoke && (
                      <button
                        type="button"
                        onClick={handleRevoke}
                        disabled={txPending || checkingRevoke}
                        className="miniapp-btn-secondary rounded-lg border px-4 py-2.5 font-medium disabled:opacity-50"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-theme-text-muted">Category:</label>
                    <select
                      value={vouchCategory}
                      onChange={(e) => setVouchCategory(Number(e.target.value))}
                      className="rounded border border-theme-border bg-theme-surface px-2 py-1 text-sm text-theme-text"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <p className="text-center text-sm text-theme-text-muted">
                  Switch to LUKSO or LUKSO Testnet to vouch.
                </p>
              )}
            </div>
          )}

        {(handshakeError || walletError) && (
          <p className="text-center text-sm text-red-500">{handshakeError ?? walletError}</p>
        )}
      </>

      <a
        href={`${HANDSHAKE_APP_URL}/?address=${encodeURIComponent(profileAddress)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1 text-sm text-theme-accent hover:underline"
      >
        View vouch activity
        <ExternalLink className="h-3.5 w-3.5" />
      </a>

      {received > 0 && (
        <p className="text-center text-xs text-theme-text-muted">
          {received} profile{received !== 1 ? "s" : ""} trust identity
        </p>
      )}

      <footer className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-theme-border pt-3">
        <select
          value={chainId}
          onChange={(e) => switchChain(Number(e.target.value))}
          className="rounded border border-theme-border bg-theme-surface px-2 py-1 text-xs text-theme-text"
          disabled={isEmbedded}
        >
          {Object.entries(chains).map(([id, c]) => (
            <option key={id} value={id}>
              {c.name}
            </option>
          ))}
        </select>
        <div className="flex gap-4 text-xs">
          <a href={DOCS_URL} target="_blank" rel="noopener noreferrer" className="text-theme-text-muted hover:text-theme-accent">
            DOCS
          </a>
          <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className="text-theme-text-muted hover:text-theme-accent">
            SUPPORT
          </a>
          <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer" className="text-theme-text-muted hover:text-theme-accent">
            PRIVACY POLICY & TERMS
          </a>
        </div>
      </footer>
    </div>
  );
}
