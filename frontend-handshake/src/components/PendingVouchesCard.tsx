import { motion, AnimatePresence } from "framer-motion";
import { Users, RefreshCw } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { GlowButton } from "./GlowButton";

interface CategoryOption {
  value: number;
  label: string;
}

interface PendingVouchesCardProps {
  incoming: { voucher: string; category: number }[];
  loading: boolean;
  txPending: boolean;
  categories: readonly CategoryOption[];
  onAccept: (voucher: string) => void;
  onDeny: (voucher: string) => void;
  onRefresh: () => void;
  disabled?: boolean;
  /** When set, these pending vouches are for this address (e.g. linked UP). Connect with that wallet to accept/deny. */
  pendingTargetAddress?: string | null;
}

function categoryLabel(categories: readonly CategoryOption[], cat: number) {
  return categories.find((c) => c.value === cat)?.label ?? String(cat);
}

export function PendingVouchesCard({
  incoming,
  loading,
  txPending,
  categories,
  onAccept,
  onDeny,
  onRefresh,
  disabled = false,
  pendingTargetAddress = null,
}: PendingVouchesCardProps) {
  return (
    <GlassCard>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-theme-text">Pending Vouches</h3>
        <button
          type="button"
          onClick={onRefresh}
          disabled={disabled}
          className="rounded-lg p-1.5 text-theme-text-muted transition-colors hover:bg-theme-surface-strong hover:text-theme-text disabled:opacity-50 disabled:pointer-events-none"
          aria-label="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
      <p className="mb-4 text-sm text-theme-text-muted">
        {pendingTargetAddress
          ? "These pending vouches are for your linked Universal Profile. Connect with your UP to accept or deny."
          : "Manage vouches received for your Universal Profile."}
      </p>
      {loading ? (
        <p className="text-sm text-theme-dim">Loading…</p>
      ) : incoming.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-theme-dim">
          <Users className="h-12 w-12" />
          <p className="text-sm">No pending vouches</p>
        </div>
      ) : (
        <ul className="space-y-2">
          <AnimatePresence>
            {incoming.map(({ voucher, category: cat }, i) => (
              <motion.li
                key={voucher}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ delay: i * 0.05 }}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-theme-border bg-theme-surface p-3"
              >
                <span className="font-mono text-sm text-theme-text">
                  {voucher.slice(0, 10)}…{voucher.slice(-8)}
                </span>
                <span className="rounded-full bg-theme-accent-soft px-2 py-0.5 text-xs font-medium text-theme-accent">
                  {categoryLabel(categories, cat)}
                </span>
                <div className="ml-auto flex gap-2">
                  <GlowButton
                    variant="primary"
                    disabled={disabled || txPending || !!pendingTargetAddress}
                    onClick={() => onAccept(voucher)}
                  >
                    Accept
                  </GlowButton>
                  <GlowButton
                    variant="secondary"
                    disabled={disabled || txPending || !!pendingTargetAddress}
                    onClick={() => onDeny(voucher)}
                  >
                    Deny
                  </GlowButton>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </GlassCard>
  );
}
