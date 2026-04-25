import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { getAddress } from "ethers";
import { GlassCard } from "./GlassCard";
import { GlowButton } from "./GlowButton";
import { Lsp3ProfileLookupInput, resolveVouchTargetAddress } from "./Lsp3ProfileLookupInput";
import { useIndexerDisplayNames } from "@/hooks/useIndexerDisplayNames";
import { isShortAddressLabel } from "@/lib/upDisplayLabel";
interface CategoryOption {
  value: number;
  label: string;
}

interface VouchCardProps {
  feeLabel: string;
  categories: readonly CategoryOption[];
  txPending: boolean;
  onVouch: (address: string, category: number) => Promise<void>;
  disabled?: boolean;
  /** Pre-fill the address field (e.g. from /vouch?address=0x... deep-link). */
  initialAddress?: string;
  /** Compact layout for profile page (one primary action). */
  compact?: boolean;
  /** Error message from the hook (displayed below the form). */
  errorMessage?: string | null;
}

export function VouchCard({
  feeLabel,
  categories,
  txPending,
  onVouch,
  disabled = false,
  initialAddress = "",
  compact = false,
  errorMessage = null,
}: VouchCardProps) {
  const [targetAddress, setTargetAddress] = useState(initialAddress);
  /** Set when user picks a profile from indexer search (non-compact). */
  const [pickedAddress, setPickedAddress] = useState<string | null>(null);
  const [category, setCategory] = useState(0);
  const compactTarget = initialAddress.trim();

  const effectiveTargetAddress = useMemo(() => {
    if (compact && compactTarget) return compactTarget;
    if (!compact) {
      return resolveVouchTargetAddress(targetAddress, pickedAddress) ?? "";
    }
    try {
      return getAddress(targetAddress.trim());
    } catch {
      return "";
    }
  }, [compact, compactTarget, targetAddress, pickedAddress]);

  const resolvedForLabel = useMemo(() => {
    if (compact && compactTarget) {
      try {
        return getAddress(compactTarget);
      } catch {
        return null;
      }
    }
    const resolved = resolveVouchTargetAddress(targetAddress, pickedAddress);
    return resolved;
  }, [compact, compactTarget, targetAddress, pickedAddress]);

  const oneAddr = useMemo(() => (resolvedForLabel ? [resolvedForLabel] : []), [resolvedForLabel]);
  const targetIndexerLabels = useIndexerDisplayNames(oneAddr, { enabled: Boolean(resolvedForLabel) });
  const targetDisplayName = resolvedForLabel
    ? targetIndexerLabels[resolvedForLabel.toLowerCase()]
    : null;

  useEffect(() => {
    if (initialAddress?.trim()) setTargetAddress(initialAddress.trim());
  }, [initialAddress]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const addr = !compact
      ? resolveVouchTargetAddress(targetAddress, pickedAddress)
      : compact && compactTarget
        ? (() => {
            try {
              return getAddress(compactTarget);
            } catch {
              return null;
            }
          })()
        : (() => {
            try {
              return getAddress(targetAddress.trim());
            } catch {
              return null;
            }
          })();
    if (!addr || disabled) return;
    await onVouch(addr, category);
    if (!compact) {
      setTargetAddress("");
      setPickedAddress(null);
    }
  };

  return (
    <GlassCard
      className={
        compact ? "" : "!overflow-visible !p-7 sm:!p-8 lg:!p-9"
      }
    >
      <h2
        className={`mb-1 font-semibold text-theme-text ${
          compact ? "text-lg" : "text-xl sm:text-2xl"
        }`}
      >
        {compact ? "Vouch for this profile" : "Vouch for a profile"}
      </h2>
      <p className={`text-theme-text-muted ${compact ? "mb-4 text-sm" : "mb-5 text-base sm:text-lg"}`}>
        {compact ? `Fee: ${feeLabel}` : `Support a Universal Profile by vouching for them. Fee: ${feeLabel}`}
      </p>
      {!compact && (
        <ul className="mb-5 list-inside list-disc space-y-1.5 text-sm text-theme-text-dim sm:mb-6">
          <li>You cannot vouch for yourself</li>
          <li>You can only vouch for a profile once</li>
          <li>The profile owner can accept or deny your vouch</li>
        </ul>
      )}
      <form
        onSubmit={handleSubmit}
        className={
          compact
            ? "flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
            : "flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end"
        }
      >
        <div className="min-w-0 flex-1">
          <label
            className={`mb-1.5 block font-medium text-theme-text-muted ${
              compact ? "text-xs" : "text-sm"
            }`}
          >
            {compact ? "Profile address" : "Find a profile"}
          </label>
          {compact && compactTarget ? (
            <input
              type="text"
              placeholder="0x... or profile on LUKSO"
              value={compactTarget}
              readOnly
              className="w-full rounded-xl border border-theme-border bg-theme-surface px-4 py-2.5 font-mono text-sm text-theme-text placeholder:text-theme-dim focus:border-theme-accent focus:outline-none focus:ring-2 focus:ring-theme-accent-soft"
            />
          ) : compact ? (
            <input
              type="text"
              placeholder="0x... or profile on LUKSO"
              value={targetAddress}
              onChange={(e) => setTargetAddress(e.target.value)}
              className="w-full rounded-xl border border-theme-border bg-theme-surface px-4 py-2.5 font-mono text-sm text-theme-text placeholder:text-theme-dim focus:border-theme-accent focus:outline-none focus:ring-2 focus:ring-theme-accent-soft"
            />
          ) : (
            <Lsp3ProfileLookupInput
              value={targetAddress}
              onValueChange={(v) => {
                setTargetAddress(v);
                setPickedAddress(null);
              }}
              selectedAddress={pickedAddress}
              onSelectedAddressChange={setPickedAddress}
              disabled={disabled}
              size="lg"
            />
          )}
          {targetDisplayName && resolvedForLabel && !isShortAddressLabel(targetDisplayName) && (
            <p className={`mt-2 font-medium text-theme-accent ${compact ? "text-xs" : "text-sm"}`}>
              <Link to={`/profile/${resolvedForLabel}`} className="hover:underline" title={resolvedForLabel}>
                {targetDisplayName}
              </Link>
            </p>
          )}
        </div>
        <div>
          <label
            className={`mb-1.5 block font-medium text-theme-text-muted ${
              compact ? "text-xs" : "text-sm"
            }`}
          >
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(Number(e.target.value))}
            className={
              compact
                ? "select-readable rounded-xl border border-theme-border px-4 py-2.5 text-sm focus:border-theme-accent focus:outline-none"
                : "select-readable min-h-[3.25rem] rounded-xl border border-theme-border px-4 py-3 text-base focus:border-theme-accent focus:outline-none sm:min-h-[3.5rem] sm:px-5 sm:text-lg"
            }
          >
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <GlowButton
          type="submit"
          variant="primary"
          disabled={disabled || txPending || !effectiveTargetAddress}
          className={compact ? undefined : "min-h-[3.25rem] px-6 text-base sm:min-h-[3.5rem] sm:px-8 sm:text-lg"}
        >
          {txPending ? "Sending…" : compact ? "Vouch" : `Vouch (${feeLabel})`}
        </GlowButton>
      </form>
      {errorMessage && (
        <p className="mt-3 text-sm text-red-400">{errorMessage}</p>
      )}
    </GlassCard>
  );
}
