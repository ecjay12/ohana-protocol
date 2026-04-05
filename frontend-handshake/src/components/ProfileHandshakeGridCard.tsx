/**
 * One-click: LSP28 Grid + OhanaHandshake reference on the user’s UP (LUKSO), via Key Manager batch.
 * Heavy deps (@erc725, upHandshake) load only when the user clicks "Add to my profile home".
 */
import { useState } from "react";
import { LayoutGrid, Loader2 } from "lucide-react";
import { GlowButton } from "@/components/GlowButton";
import type { BrowserProvider } from "ethers";

const LUKSO_CHAIN_IDS = new Set([42, 4201]);

interface ProfileHandshakeGridCardProps {
  provider: BrowserProvider | null;
  chainId: number;
  upAddress: string;
  isOwnProfile: boolean;
  isUP: boolean;
  acceptedCount: number;
}

export function ProfileHandshakeGridCard({
  provider,
  chainId,
  upAddress,
  isOwnProfile,
  isUP,
  acceptedCount,
}: ProfileHandshakeGridCardProps) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  if (!isOwnProfile || !isUP) return null;

  const miniappBase =
    import.meta.env.VITE_MINIAPP_URL ?? "https://handshake.ohana.gg";

  const onAddToGrid = async () => {
    if (!provider) {
      setNotice("Connect your wallet using the button in the sidebar, then try again.");
      return;
    }
    if (!LUKSO_CHAIN_IDS.has(chainId)) {
      setNotice("Use the network switcher in your wallet to pick LUKSO mainnet or testnet, then try again.");
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const [{ buildHandshakeReferencePayload, ensureOhanaKeyAllowed, setHandshakeReferenceAndGrid }, { encodeLsp28MiniappGridValue }] =
        await Promise.all([import("@/lib/upHandshake"), import("@/lib/encodeLsp28MiniappGrid")]);

      const payload = buildHandshakeReferencePayload(chainId, acceptedCount);
      if (!payload) {
        setNotice("Handshake isn’t set up on this network in the app. Try another network or contact support.");
        return;
      }
      const signer = await provider.getSigner();
      const allowed = await ensureOhanaKeyAllowed(signer, upAddress);
      if (!allowed.added) {
        setNotice(
          allowed.error ??
            "We couldn’t get permission to update your profile. Approve the request in your wallet or try again."
        );
        return;
      }
      const gridEncoded = encodeLsp28MiniappGridValue(upAddress, miniappBase);
      await setHandshakeReferenceAndGrid(signer, upAddress, payload, gridEncoded);
      setNotice("Done. Open your Universal Profile to see Handshake on your home screen.");
    } catch (e: unknown) {
      setNotice(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl border border-theme-border bg-theme-surface p-4 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-theme-accent-soft text-theme-accent">
          <LayoutGrid className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-theme-text">
            Show Handshake on your Universal Profile home
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-theme-text-muted">
            Adds a Handshake tile to your profile&apos;s app grid and saves your vouch count in one
            approval—same layout as the{" "}
            <a
              href={miniappBase}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-theme-accent hover:underline"
            >
              Handshake mini app
            </a>
            .
          </p>
          {!LUKSO_CHAIN_IDS.has(chainId) && (
            <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">
              Switch your wallet to the <strong className="font-medium">LUKSO</strong> network first,
              then try again.
            </p>
          )}
          {notice && (
            <p className="mt-3 text-sm text-theme-text-muted whitespace-pre-wrap">{notice}</p>
          )}
          <div className="mt-4">
            <GlowButton
              type="button"
              onClick={onAddToGrid}
              disabled={busy || !provider}
              className="inline-flex items-center gap-2"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Confirm in wallet…
                </>
              ) : (
                <>
                  <LayoutGrid className="h-4 w-4" />
                  Add to my profile home
                </>
              )}
            </GlowButton>
          </div>
        </div>
      </div>
    </div>
  );
}
