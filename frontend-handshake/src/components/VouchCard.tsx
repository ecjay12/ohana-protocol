import { useState, useEffect } from "react";
import { GlassCard } from "./GlassCard";
import { GlowButton } from "./GlowButton";
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
}

export function VouchCard({
  feeLabel,
  categories,
  txPending,
  onVouch,
  disabled = false,
  initialAddress = "",
  compact = false,
}: VouchCardProps) {
  const [targetAddress, setTargetAddress] = useState(initialAddress);
  const [category, setCategory] = useState(0);

  useEffect(() => {
    if (initialAddress?.trim()) setTargetAddress(initialAddress.trim());
  }, [initialAddress]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAddress.trim() || disabled) return;
    await onVouch(targetAddress.trim(), category);
    setTargetAddress("");
  };

  return (
    <GlassCard>
      <h2 className="mb-1 text-lg font-semibold text-theme-text">
        {compact ? "Vouch for this profile" : "Vouch for a profile"}
      </h2>
      <p className="mb-4 text-sm text-theme-text-muted">
        {compact ? `Fee: ${feeLabel}` : `Support a Universal Profile by vouching for them. Fee: ${feeLabel}`}
      </p>
      {!compact && (
      <ul className="mb-4 list-inside list-disc space-y-1 text-xs text-theme-text-dim">
        <li>You cannot vouch for yourself</li>
        <li>You can only vouch for a profile once</li>
        <li>The profile owner can accept or deny your vouch</li>
      </ul>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-0 flex-1">
          <label className="mb-1 block text-xs font-medium text-theme-text-muted">
            {compact ? "Profile address" : "Universal Profile Address"}
          </label>
          <input
            type="text"
            placeholder="0x..."
            value={targetAddress}
            onChange={(e) => setTargetAddress(e.target.value)}
            className="w-full rounded-xl border border-theme-border bg-theme-surface px-4 py-2.5 font-mono text-sm text-theme-text placeholder:text-theme-dim focus:border-theme-accent focus:outline-none focus:ring-2 focus:ring-theme-accent-soft"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-theme-text-muted">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(Number(e.target.value))}
            className="select-readable rounded-xl border border-theme-border px-4 py-2.5 text-sm focus:border-theme-accent focus:outline-none"
          >
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <GlowButton type="submit" variant="primary" disabled={disabled || txPending || !targetAddress.trim()}>
          {txPending ? "Sending…" : compact ? "Vouch" : `Vouch (${feeLabel})`}
        </GlowButton>
      </form>
    </GlassCard>
  );
}
