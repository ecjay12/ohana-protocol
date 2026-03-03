/**
 * Main profile widget card: stats, Vouch/Revoke, reputation ring.
 * Supports LUKSO UP Provider (one-click when embedded) and injected wallet fallback.
 */
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Copy, Check } from "lucide-react";
import { WalletConnect } from "./WalletConnect";
import { useHandshake, CATEGORIES } from "@/hooks/useHandshake";
import { VOUCH_FEE_DISPLAY, MINIAPP_PRODUCTION_URL, FULL_APP_URL } from "@/config/contracts";
import { THEME_LOGOS } from "@/config/themeLogos";
import { useTheme } from "@/components/ThemeSwitcher";
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
  const { vouch, removeVouch, getVouch, getIncomingPending, acceptVouch, denyVouch, txPending, error: handshakeError, isSupported } = useHandshake(
    provider ?? null,
    chainId,
    isConnected ? account : null
  );

  const [canRevoke, setCanRevoke] = useState(false);
  const [vouchCategory, setVouchCategory] = useState(1);
  const [checkingRevoke, setCheckingRevoke] = useState(false);
  const [pendingVouches, setPendingVouches] = useState<{ voucher: string; category: number }[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);

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

  // If contract reverts with "already vouched", sync canRevoke so UI shows correct state (e.g. when getVouch failed in embedded context)
  useEffect(() => {
    if (handshakeError?.toLowerCase().includes("already vouched")) {
      setCanRevoke(true);
    }
  }, [handshakeError]);

  const refreshPending = useCallback(() => {
    if (!account || !profileAddress || account.toLowerCase() !== profileAddress.toLowerCase()) return;
    setLoadingPending(true);
    getIncomingPending(profileAddress)
      .then(setPendingVouches)
      .finally(() => setLoadingPending(false));
  }, [account, profileAddress, getIncomingPending]);

  useEffect(() => {
    if (!account || !profileAddress || account.toLowerCase() !== profileAddress.toLowerCase()) {
      setPendingVouches([]);
      return;
    }
    refreshPending();
  }, [account, profileAddress, refreshPending]);

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
  const theme = useTheme();
  const logoSrc = THEME_LOGOS[theme];

  return (
    <div className={`miniapp-card glass-card flex w-full flex-col rounded-xl ${compact ? "max-w-[360px] shrink-0 self-center gap-2 p-2.5 sm:p-3" : "max-w-md gap-4 rounded-2xl p-4 sm:p-5"}`}>
      <header className={`flex flex-col items-center text-center ${compact ? "mb-0 leading-tight" : ""}`}>
        <img
          src={logoSrc}
          alt="Handshake"
          className={`object-contain ${compact ? "h-8" : "h-10"}`}
        />
        <h1 className={`font-semibold text-theme-text ${compact ? "text-sm" : "text-lg"}`}>Handshake</h1>
        <p className={`text-theme-text-muted ${compact ? "text-[10px]" : "text-xs"}`}>Reputation Layer</p>
      </header>

      <div className={`rounded-lg border border-theme-border bg-theme-surface-strong/50 ${compact ? "px-2.5 py-2" : "px-3 py-2"}`}>
        <p className={`text-theme-text-muted ${compact ? "text-[10px]" : "text-xs"}`}>Vouch for</p>
        <p className="font-medium text-theme-text truncate text-sm" title={profileAddress}>
          {profileLabel}
        </p>
        <p className="text-[9px] font-mono text-theme-text-dim opacity-50">{truncateAddress(profileAddress)}</p>
      </div>

      <div className={`flex flex-col items-center ${compact ? "gap-2" : "gap-3"}`}>
        <div className={`flex w-full ${compact ? "gap-2" : "gap-4"}`}>
          <div className={`flex-1 rounded-lg border border-theme-border bg-theme-surface-strong/50 ${compact ? "px-2 py-2 text-center" : "px-4 py-3 text-center"}`}>
            <p className={`font-semibold text-theme-text ${compact ? "text-lg" : "text-xl"}`}>{received}</p>
            <p className={`text-theme-text-muted ${compact ? "text-[10px]" : "text-xs"}`}>Received</p>
          </div>
          <div className={`flex-1 rounded-lg border border-theme-border bg-theme-surface-strong/50 ${compact ? "px-2 py-2 text-center" : "px-4 py-3 text-center"}`}>
            <p className={`font-semibold text-theme-text ${compact ? "text-lg" : "text-xl"}`}>{given}</p>
            <p className={`text-theme-text-muted ${compact ? "text-[10px]" : "text-xs"}`}>Given</p>
          </div>
        </div>
        {loading && <p className="text-[10px] text-theme-text-dim">Loading…</p>}
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
                <div className={`flex flex-col ${compact ? "gap-2" : "gap-3"}`}>
                  <p className={`text-center text-theme-text-muted ${compact ? "text-xs" : "text-sm"}`}>
                    Can&apos;t vouch for yourself.
                  </p>
                  {pendingVouches.length > 0 && (
                    <div className={`rounded-lg border border-theme-border bg-theme-surface-strong/50 ${compact ? "p-2" : "p-3"}`}>
                      <p className={`font-medium text-theme-text ${compact ? "text-xs mb-1.5" : "text-sm mb-2"}`}>
                        Pending vouches ({pendingVouches.length})
                      </p>
                      <div className={`space-y-2 ${compact ? "space-y-1.5" : ""}`}>
                        {pendingVouches.map(({ voucher, category }) => (
                          <div
                            key={voucher}
                            className={`flex flex-wrap items-center justify-between gap-2 rounded border border-theme-border bg-theme-surface px-2 py-1.5 ${compact ? "px-1.5 py-1" : ""}`}
                          >
                            <span className={`font-mono text-theme-text truncate ${compact ? "text-[10px]" : "text-xs"}`} title={voucher}>
                              {voucher.slice(0, 8)}…{voucher.slice(-6)}
                            </span>
                            <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium text-theme-accent bg-theme-accent-soft`}>
                              {CATEGORIES.find((c) => c.value === category)?.label ?? "Vouch"}
                            </span>
                            <div className={`flex shrink-0 gap-1 ${compact ? "gap-0.5" : ""}`}>
                              <button
                                type="button"
                                onClick={async () => {
                                  await acceptVouch(voucher);
                                  onRefetch();
                                  refreshPending();
                                }}
                                disabled={txPending}
                                className={`miniapp-btn-primary font-medium disabled:opacity-50 ${compact ? "rounded px-1.5 py-0.5 text-[10px]" : "rounded px-2 py-1 text-xs"}`}
                              >
                                Accept
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  await denyVouch(voucher);
                                  onRefetch();
                                  refreshPending();
                                }}
                                disabled={txPending}
                                className={`miniapp-btn-secondary border font-medium disabled:opacity-50 ${compact ? "rounded px-1.5 py-0.5 text-[10px]" : "rounded px-2 py-1 text-xs"}`}
                              >
                                Deny
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {loadingPending && pendingVouches.length === 0 && (
                    <p className={`text-center text-theme-text-dim ${compact ? "text-[10px]" : "text-xs"}`}>Loading pending…</p>
                  )}
                  {!loadingPending && pendingVouches.length === 0 && (
                    <p className={`text-center text-theme-text-dim ${compact ? "text-[10px]" : "text-xs"}`}>No pending vouches</p>
                  )}
                </div>
              ) : isSupported ? (
                <>
                  {canRevoke ? (
                    <div className={`flex flex-col ${compact ? "gap-1" : "gap-2"}`}>
                      <p className={`text-center text-theme-text-muted ${compact ? "text-xs" : "text-sm"}`}>
                        You&apos;ve already vouched for this profile.
                      </p>
                      <button
                        type="button"
                        onClick={handleRevoke}
                        disabled={txPending || checkingRevoke}
                        className={`miniapp-btn-secondary border font-medium disabled:opacity-50 ${compact ? "rounded px-2 py-1.5 text-xs" : "rounded-lg border px-4 py-2.5"}`}
                      >
                        Revoke
                      </button>
                    </div>
                  ) : (
                    <div className={`flex ${compact ? "gap-1.5" : "gap-2"}`}>
                      <button
                        type="button"
                        onClick={handleVouch}
                        disabled={txPending}
                        className={`miniapp-btn-primary flex-1 font-medium disabled:opacity-50 ${compact ? "rounded px-2 py-1.5 text-xs" : "rounded-lg px-4 py-2.5"}`}
                      >
                        {txPending ? "Confirming…" : `Vouch (${feeDisplay.amount} ${feeDisplay.symbol})`}
                      </button>
                    </div>
                  )}
                  {!canRevoke && (
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
                  )}
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
        <p className={`text-center ${compact ? "text-[9px] text-theme-text-dim opacity-70" : "text-xs text-theme-text-muted"}`}>
          {received} profile{received !== 1 ? "s" : ""} trust identity
        </p>
      )}

      {compact && (
        <p className="text-center text-[9px] text-theme-text-dim opacity-50">
          Resize this tile in your profile Grid settings if needed.
        </p>
      )}

      <footer className={`mt-auto flex flex-wrap items-center justify-between border-t border-theme-border ${compact ? "gap-1 pt-1.5" : "gap-2 pt-3"}`}>
        <select
          value={chainId}
          onChange={(e) => switchChain(Number(e.target.value))}
          className={`rounded border border-theme-border bg-theme-surface text-theme-text opacity-70 ${compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-1 text-xs"}`}
          disabled={upProviderContext?.isInUPContext}
        >
          {Object.entries(chains).map(([id, c]) => (
            <option key={id} value={id}>
              {c.name}
            </option>
          ))}
        </select>
        <div className={`flex text-theme-text-dim hover:text-theme-accent ${compact ? "gap-2 text-[9px] opacity-60" : "gap-4 text-xs"}`}>
          <a href={DOCS_URL} target="_blank" rel="noopener noreferrer" className="text-theme-text-dim hover:text-theme-accent">
            DOCS
          </a>
          <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className="text-theme-text-dim hover:text-theme-accent">
            SUPPORT
          </a>
          <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer" className="text-theme-text-dim hover:text-theme-accent">
            PRIVACY POLICY & TERMS
          </a>
        </div>
      </footer>
    </div>
  );
}
