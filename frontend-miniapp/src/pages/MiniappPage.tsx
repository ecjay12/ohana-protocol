/**
 * Single-page miniapp: profile widget for address from URL or postMessage.
 */
import { useSearchParams } from "react-router-dom";
import { useHostAddress } from "@/hooks/useHostAddress";
import { useHandshakeReadOnly } from "@/hooks/useHandshakeReadOnly";
import { useProfileData } from "@/hooks/useProfileData";
import { ProfileWidgetCard } from "@/components/ProfileWidgetCard";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { useInjectedWallet } from "@/hooks/useInjectedWallet";

export function MiniappPage() {
  const [searchParams] = useSearchParams();
  const chainIdParam = searchParams.get("chainId");
  const chainId = chainIdParam ? parseInt(chainIdParam, 10) : 4201;

  const profileAddress = useHostAddress();
  const { chainId: walletChainId } = useInjectedWallet();
  const effectiveChainId = [42, 4201].includes(chainId) ? chainId : walletChainId;

  const { received, given, loading, error, refetch } = useHandshakeReadOnly(
    effectiveChainId,
    profileAddress
  );
  const { profile } = useProfileData(effectiveChainId, profileAddress);

  if (!profileAddress) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="glass-card max-w-md rounded-2xl p-8 text-center">
          <h1 className="mb-2 text-xl font-semibold text-theme-text">Handshake</h1>
          <p className="mb-4 text-sm text-theme-text-muted">Reputation Layer</p>
          <p className="text-theme-text-muted">
            Add this miniapp to your Universal Profile by including this link in your LSP3 profile:
          </p>
          <code className="mt-2 block break-all rounded bg-theme-surface-strong px-3 py-2 text-sm text-theme-text">
            {typeof window !== "undefined"
              ? `${window.location.origin}/?address=0xYourUPAddress`
              : "https://miniapp.ohana.gg/?address=0xYourUPAddress"}
          </code>
          <p className="mt-4 text-xs text-theme-text-dim">
            Replace <code>0xYourUPAddress</code> with your Universal Profile address.
          </p>
        </div>
      </div>
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
    <div className="relative min-h-screen">
      <div className="absolute right-4 top-4 z-10">
        <ThemeSwitcher />
      </div>
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <ProfileWidgetCard
          profileAddress={profileAddress}
          received={received}
          given={given}
          profileName={profile?.name}
          loading={loading}
          onRefetch={refetch}
        />
      </div>
    </div>
  );
}
