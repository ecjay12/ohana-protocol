/**
 * One-click: LSP28 Grid + OhanaHandshake reference on the user’s UP (LUKSO), via Key Manager batch.
 */
import { useState } from "react";
import { LayoutGrid, Loader2 } from "lucide-react";
import { GlowButton } from "@/components/GlowButton";
import type { BrowserProvider } from "ethers";
import {
  ensureOhanaKeyAllowed,
  setHandshakeReferenceAndGrid,
  buildHandshakeReferencePayload,
} from "@/lib/upHandshake";
import { encodeLsp28MiniappGridValue } from "@/lib/encodeLsp28MiniappGrid";

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
      setNotice("Connect your wallet first.");
      return;
    }
    if (!LUKSO_CHAIN_IDS.has(chainId)) {
      setNotice("Switch to LUKSO Mainnet or Testnet in your wallet, then try again.");
      return;
    }
    const payload = buildHandshakeReferencePayload(chainId, acceptedCount);
    if (!payload) {
      setNotice("Handshake is not configured on this chain.");
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const signer = await provider.getSigner();
      const allowed = await ensureOhanaKeyAllowed(signer, upAddress);
      if (!allowed.added) {
        setNotice(allowed.error ?? "Could not allow Ohana keys on your UP.");
        return;
      }
      const gridEncoded = encodeLsp28MiniappGridValue(upAddress, miniappBase);
      await setHandshakeReferenceAndGrid(signer, upAddress, payload, gridEncoded);
      setNotice("Done — Handshake reference and Grid were updated. Check your Universal Profile.");
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
            Add Handshake to your Grid in one click
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-theme-text-muted">
            Writes your Handshake stats and the miniapp iframe to your UP (LSP28 + LSP2) in one
            signed transaction. Uses the same layout as the{" "}
            <a
              href={miniappBase}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-theme-accent hover:underline"
            >
              Handshake mini dapp
            </a>
            .
          </p>
          {!LUKSO_CHAIN_IDS.has(chainId) && (
            <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">
              Switch your wallet to <strong className="font-medium">LUKSO</strong> to run this on
              your Universal Profile.
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
                  Add to Grid
                </>
              )}
            </GlowButton>
          </div>
        </div>
      </div>
    </div>
  );
}
