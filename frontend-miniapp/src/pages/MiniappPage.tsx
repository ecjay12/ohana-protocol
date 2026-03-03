/**
 * Single-page miniapp: profile widget for LUKSO Universal Profiles.
 * Profile from contextAccounts when in LUKSO Grid, else URL ?address=.
 * @see https://docs.lukso.tech/learn/mini-apps/connect-upprovider/
 * @see https://docs.lukso.tech/learn/mini-apps/setting-your-grid/
 */
import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useUPProvider } from "@/hooks/useUPProvider";
import { useHostAddress } from "@/hooks/useHostAddress";
import { useHandshakeReadOnly } from "@/hooks/useHandshakeReadOnly";
import { useProfileData } from "@/hooks/useProfileData";
import { ProfileWidgetCard } from "@/components/ProfileWidgetCard";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { useInjectedWallet } from "@/hooks/useInjectedWallet";
import { getAddress } from "ethers";
import { MINIAPP_PRODUCTION_URL } from "@/config/contracts";
import { Copy, Check } from "lucide-react";

function NoProfileSetup() {
  const [addressInput, setAddressInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const baseUrl = MINIAPP_PRODUCTION_URL;

  const handleTryAddress = () => {
    const trimmed = addressInput.trim();
    if (!trimmed) return;
    setError(null);
    try {
      const addr = getAddress(trimmed);
      navigate(`/?address=${encodeURIComponent(addr)}`);
    } catch {
      setError("Invalid address");
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="glass-card max-w-md rounded-2xl p-8 text-center">
        <h1 className="mb-2 text-xl font-semibold text-theme-text">Handshake</h1>
        <p className="mb-4 text-sm text-theme-text-muted">Reputation Layer</p>

        <p className="mb-4 text-sm text-theme-text-muted">
          <strong>Standalone:</strong> Enter a Universal Profile address to view vouches:
        </p>
        <div className="mb-4 flex gap-2">
          <input
            type="text"
            placeholder="0x..."
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleTryAddress()}
            className="flex-1 rounded-lg border border-theme-border bg-theme-surface px-3 py-2 text-sm text-theme-text placeholder:text-theme-text-dim focus:border-theme-accent focus:outline-none"
          />
          <button
            type="button"
            onClick={handleTryAddress}
            className="miniapp-btn-primary rounded-lg px-4 py-2 text-sm font-medium"
          >
            View
          </button>
        </div>
        {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

        <p className="mb-2 text-xs font-medium text-theme-text">Add to your Grid:</p>
        <Link
          to="/add-to-grid"
          className="miniapp-btn-primary mb-3 block w-full rounded-lg px-4 py-2.5 text-center text-sm font-medium"
        >
          Add to my profile (one-click)
        </Link>
        <p className="mb-2 text-xs text-theme-text-muted">Or copy URL for manual setup:</p>
        <div className="mb-4 flex items-center gap-2 rounded bg-theme-surface-strong px-3 py-2">
          <code className="flex-1 break-all text-xs text-theme-text">
            {baseUrl}/?address=0xYourUP
          </code>
          <button
            type="button"
            onClick={async () => {
              const url = `${baseUrl}/?address=0xYourUP`;
              try {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {
                navigator.clipboard?.writeText?.(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }
            }}
            className="miniapp-btn-secondary flex shrink-0 items-center gap-1 rounded px-2 py-1.5 text-xs font-medium"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <p className="text-xs text-theme-text-dim">
          Use <code className="rounded bg-theme-surface-strong px-1">?address=0xYourUP</code> in the iframe src so the profile loads even if context is delayed.{" "}
          <a href="https://universaleverything.io" target="_blank" rel="noopener noreferrer" className="text-theme-accent hover:underline">
            universaleverything.io
          </a>{" "}
          passes context automatically.{" "}
          <a href="https://docs.lukso.tech/learn/mini-apps/setting-your-grid/" target="_blank" rel="noopener noreferrer" className="text-theme-accent hover:underline">
            LUKSO docs
          </a>
        </p>
      </div>
    </div>
  );
}

const inIframe = typeof window !== "undefined" && window.self !== window.top;

function GridLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="glass-card max-w-md rounded-2xl p-8 text-center">
        <h1 className="mb-2 text-xl font-semibold text-theme-text">Handshake</h1>
        <p className="text-sm text-theme-text-muted">Loading profile from LUKSO…</p>
        <p className="mt-2 text-xs text-theme-text-dim">Connecting to parent page</p>
      </div>
    </div>
  );
}

export function MiniappPage() {
  const [searchParams] = useSearchParams();
  const chainIdParam = searchParams.get("chainId");
  const chainId = chainIdParam ? parseInt(chainIdParam, 10) : 4201;

  // Single source: profile to vouch for = contextAccount (from LUKSO Grid) or ?address= (standalone)
  const { contextAccount, account: upAccount, provider: upProvider, chainId: upChainId, isInUPContext, isConnected: upConnected } = useUPProvider();
  const profileAddress = useHostAddress(contextAccount);
  const injectedWallet = useInjectedWallet();
  const effectiveChainId = isInUPContext ? upChainId : ([42, 4201].includes(chainId) ? chainId : injectedWallet.chainId);

  const [waitingForContext, setWaitingForContext] = useState(inIframe && !profileAddress);

  useEffect(() => {
    if (!inIframe || profileAddress) {
      setWaitingForContext(false);
      return;
    }
    const t = setTimeout(() => setWaitingForContext(false), 4000);
    return () => clearTimeout(t);
  }, [profileAddress]);

  const { received, given, loading, error, refetch } = useHandshakeReadOnly(
    effectiveChainId,
    profileAddress
  );
  const { profile } = useProfileData(effectiveChainId, profileAddress);

  if (!profileAddress) {
    if (waitingForContext) return <GridLoading />;
    return <NoProfileSetup />;
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="glass-card max-w-md rounded-2xl p-8 text-center">
          <h1 className="mb-2 text-xl font-semibold text-theme-text">Handshake</h1>
          <p className="text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  const inGrid = typeof window !== "undefined" && window.self !== window.top;
  return (
    <div className={`relative ${inGrid ? "min-h-0 w-full" : "min-h-screen min-h-[100dvh]"}`}>
      <div className="absolute right-0.5 top-0.5 z-10 sm:right-2 sm:top-2">
        <ThemeSwitcher />
      </div>
      <div className={`flex flex-col items-center ${inGrid ? "min-h-0 justify-start p-0" : "min-h-screen min-h-[100dvh] justify-center p-3 sm:p-6"}`}>
        <ProfileWidgetCard
          profileAddress={profileAddress}
          received={received}
          given={given}
          profileName={profile?.name}
          loading={loading}
          onRefetch={refetch}
          upProviderContext={{
            account: upAccount,
            provider: upProvider,
            chainId: upChainId,
            isConnected: upConnected,
            isInUPContext,
          }}
          injectedWallet={injectedWallet}
        />
      </div>
    </div>
  );
}
