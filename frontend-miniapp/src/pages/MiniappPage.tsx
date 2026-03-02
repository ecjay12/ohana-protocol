/**
 * Single-page miniapp: profile widget for LUKSO Universal Profiles.
 * Profile from contextAccounts when in LUKSO Grid, else URL ?address=.
 * @see https://docs.lukso.tech/learn/mini-apps/connect-upprovider/
 * @see https://docs.lukso.tech/learn/mini-apps/setting-your-grid/
 */
import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useUPProvider } from "@/hooks/useUPProvider";
import { useHostAddress } from "@/hooks/useHostAddress";
import { useHandshakeReadOnly } from "@/hooks/useHandshakeReadOnly";
import { useProfileData } from "@/hooks/useProfileData";
import { ProfileWidgetCard } from "@/components/ProfileWidgetCard";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { useInjectedWallet } from "@/hooks/useInjectedWallet";
import { getAddress } from "ethers";

function NoProfileSetup() {
  const [addressInput, setAddressInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://frontend-miniapp-ecjay12s-projects.vercel.app";

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

        <p className="mb-2 text-xs font-medium text-theme-text">Or add to your LSP28 Grid:</p>
        <code className="mb-4 block break-all rounded bg-theme-surface-strong px-3 py-2 text-xs text-theme-text">
          {baseUrl}
        </code>
        <p className="text-xs text-theme-text-dim">
          When visitors view your profile on{" "}
          <a href="https://universaleverything.io" target="_blank" rel="noopener noreferrer" className="text-theme-accent hover:underline">
            universaleverything.io
          </a>
          , the profile comes from context.{" "}
          <a href="https://docs.lukso.tech/learn/mini-apps/setting-your-grid/" target="_blank" rel="noopener noreferrer" className="text-theme-accent hover:underline">
            LUKSO docs
          </a>
        </p>
      </div>
    </div>
  );
}

export function MiniappPage() {
  const [searchParams] = useSearchParams();
  const chainIdParam = searchParams.get("chainId");
  const chainId = chainIdParam ? parseInt(chainIdParam, 10) : 4201;

  const { contextAccount, account: upAccount, provider: upProvider, chainId: upChainId, isInUPContext, isConnected: upConnected } = useUPProvider();
  const profileAddress = useHostAddress(contextAccount);
  const injectedWallet = useInjectedWallet();
  const effectiveChainId = isInUPContext ? upChainId : ([42, 4201].includes(chainId) ? chainId : injectedWallet.chainId);

  const { received, given, loading, error, refetch } = useHandshakeReadOnly(
    effectiveChainId,
    profileAddress
  );
  const { profile } = useProfileData(effectiveChainId, profileAddress);

  if (!profileAddress) {
    return (
      <NoProfileSetup />
    );
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

  return (
    <div className="relative min-h-screen min-h-[100dvh]">
      <div className="absolute right-2 top-2 z-10 sm:right-4 sm:top-4">
        <ThemeSwitcher />
      </div>
      <div className="flex min-h-screen min-h-[100dvh] flex-col items-center justify-center p-3 sm:p-6">
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
