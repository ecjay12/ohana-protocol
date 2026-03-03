/**
 * Main profile widget card: stats, Vouch/Revoke, reputation ring.
 * Supports LUKSO UP Provider (one-click when embedded) and injected wallet fallback.
 */
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Copy, Check } from "lucide-react";
import { WalletConnect } from "./WalletConnect";
import { useHandshake, CATEGORIES } from "@/hooks/useHandshake";
import { VOUCH_FEE_DISPLAY, MINIAPP_PRODUCTION_URL, FULL_APP_URL } from "@/config/contracts";
import type { BrowserProvider } from "ethers";
import type { WalletOption } from "@/hooks/useInjectedWallet";
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

  const isInUPContext = upProviderContext?.isInUPContext ?? false;
  const useUP = isInUPContext;
  const account = useUP ? (upProviderContext?.account ?? null) : (accounts[0] ?? null);
  const provider = useUP ? upProviderContext?.provider : injProvider;
  const chainId = useUP ? (upProviderContext?.chainId ?? 4201) : injChainId;
  const isConnected = useUP ? (upProviderContext?.isConnected ?? false) : injConnected;
  const { vouch, removeVouch, getVouch, txPending, error: handshakeError, isSupported } = useHandshake(
    provider ?? null,
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

  const profileLabel = handleDisplay ?? truncateAddress(profileAddress);
  const isOwnProfile = isConnected && account && profileAddress && account.toLowerCase() === profileAddress.toLowerCase();

  const gridUrl = `${MINIAPP_PRODUCTION_URL}/?address=${encodeURIComponent(profileAddress)}`;
  const [copied, setCopied] = useState(false);
  const handleCopyGridUrl = async () => {
    try {
      await navigator.clipboard.writeText(gridUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select and copy
      const el = document.createElement("input");
      el.value = gridUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const inIframe = typeof window !== "undefined" && window.self !== window.top;
  const compact = inIframe;

  return (
    <div className={`miniapp-card glass-card flex w-full flex-col rounded-xl ${compact ? "max-w-[260px] gap-1 p-1.5" : "max-w-md gap-4 rounded-2xl p-4 sm:p-5"}`}>
      <header className={`text-center ${compact ? "mb-0 leading-tight" : ""}`}>
        <h1 className={`font-semibold text-theme-text ${compact ? "text-xs" : "text-lg"}`}>Handshake</h1>
        <p className={`text-theme-text-muted ${compact ? "text-[10px]" : "text-xs"}`}>Reputation Layer</p>
      </header>

      <div className={`rounded-lg border border-theme-border bg-theme-surface-strong/50 ${compact ? "px-2 py-1.5" : "px-3 py-2"}`}>
        <p className="text-xs text-theme-text-muted">Vouch for</p>
        <p className={`font-medium text-theme-text truncate ${compact ? "text-xs" : "text-sm"}`} title={profileAddress}>
          {profileLabel}
        </p>
        <p className="text-[10px] text-theme-text-dim font-mono">{truncateAddress(profileAddress)}</p>
      </div>

      <div className={`flex flex-col items-center ${compact ? "gap-1" : "gap-3"}`}>
        <div className={`flex ${compact ? "gap-3 text-xs" : "gap-4 text-sm"}`}>
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

      <>
        {!isConnected ? (
            isInUPContext ? (
              <p className={`text-center text-theme-text-muted ${compact ? "text-xs" : "text-sm"}`}>
                Sign in on the page above to vouch for this profile.
              </p>
            ) : (
              <div className={`flex w-full flex-col items-center ${compact ? "gap-1" : "gap-2"}`}>
                <p className={`text-center text-theme-text-muted ${compact ? "text-[10px]" : "text-xs"}`}>
                  Sign in to vouch for this profile
                </p>
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
              </div>
            )
          ) : (
            <div className="flex flex-col gap-3">
              {isOwnProfile ? (
                <p className={`text-center text-theme-text-muted ${compact ? "text-xs" : "text-sm"}`}>
                  Can&apos;t vouch for yourself.
                </p>
              ) : isSupported ? (
                <>
                  <div className={`flex ${compact ? "gap-1.5" : "gap-2"}`}>
                    <button
                      type="button"
                      onClick={handleVouch}
                      disabled={txPending}
                      className={`miniapp-btn-primary flex-1 font-medium disabled:opacity-50 ${compact ? "rounded px-2 py-1.5 text-xs" : "rounded-lg px-4 py-2.5"}`}
                    >
                      {txPending ? "Confirming…" : `Vouch (${feeDisplay.amount} ${feeDisplay.symbol})`}
                    </button>
                    {canRevoke && (
                      <button
                        type="button"
                        onClick={handleRevoke}
                        disabled={txPending || checkingRevoke}
                        className={`miniapp-btn-secondary border font-medium disabled:opacity-50 ${compact ? "rounded px-2 py-1.5 text-xs" : "rounded-lg border px-4 py-2.5"}`}
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                  <div className={`flex items-center ${compact ? "gap-1" : "gap-2"}`}>
                    <label className={`text-theme-text-muted ${compact ? "text-[10px]" : "text-xs"}`}>Category:</label>
                    <select
                      value={vouchCategory}
                      onChange={(e) => setVouchCategory(Number(e.target.value))}
                      className={`rounded border border-theme-border bg-theme-surface text-theme-text ${compact ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-sm"}`}
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
                <p className={`text-center text-theme-text-muted ${compact ? "text-xs" : "text-sm"}`}>
                  Switch to LUKSO or LUKSO Testnet to vouch.
                </p>
              )}
            </div>
          )}

        {(handshakeError || walletError) && (
          <p className={`text-center text-red-500 ${compact ? "text-xs" : "text-sm"}`}>{handshakeError ?? walletError}</p>
        )}
      </>

      <div className={`flex flex-col items-center ${compact ? "gap-1" : "gap-2"}`}>
        <a
          href={FULL_APP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center justify-center gap-1 text-theme-accent hover:underline ${compact ? "text-xs" : "text-sm"}`}
        >
          View vouch activity
          <ExternalLink className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
        </a>
        <div className={`flex flex-wrap items-center justify-center ${compact ? "gap-1" : "gap-2"}`}>
          <Link
            to="/add-to-grid"
            className={`miniapp-btn-primary flex items-center gap-1 font-medium ${compact ? "rounded px-1.5 py-0.5 text-[10px]" : "rounded px-2 py-1 text-xs"}`}
          >
            Add to my profile
          </Link>
          <button
            type="button"
            onClick={handleCopyGridUrl}
            className={`miniapp-btn-secondary flex items-center gap-1 font-medium ${compact ? "rounded px-1.5 py-0.5 text-[10px]" : "rounded px-2 py-1 text-xs"}`}
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied" : "Copy URL"}
          </button>
        </div>
      </div>

      {received > 0 && (
        <p className={`text-center text-theme-text-muted ${compact ? "text-[10px]" : "text-xs"}`}>
          {received} profile{received !== 1 ? "s" : ""} trust identity
        </p>
      )}

      {compact && (
        <p className="text-center text-[10px] text-theme-text-dim">
          Resize this tile in your profile Grid settings if needed.
        </p>
      )}

      <footer className={`mt-auto flex flex-wrap items-center justify-between border-t border-theme-border ${compact ? "gap-1 pt-1" : "gap-2 pt-3"}`}>
        <select
          value={chainId}
          onChange={(e) => switchChain(Number(e.target.value))}
          className={`rounded border border-theme-border bg-theme-surface text-theme-text ${compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs"}`}
          disabled={upProviderContext?.isInUPContext}
        >
          {Object.entries(chains).map(([id, c]) => (
            <option key={id} value={id}>
              {c.name}
            </option>
          ))}
        </select>
        <div className={`flex text-theme-text-muted hover:text-theme-accent ${compact ? "gap-2 text-[10px]" : "gap-4 text-xs"}`}>
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
