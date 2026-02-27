import { motion } from "framer-motion";
import { RefreshCw, ShieldCheck, EyeOff, Eye, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { GlassCard } from "./GlassCard";
import { GlowButton } from "./GlowButton";
import type { VouchData } from "@/types/handshake";
import type { BrowserProvider } from "ethers";

interface CategoryOption {
  value: number;
  label: string;
}

interface AcceptedVouchesCardProps {
  vouchersForMe: string[];
  vouchStatuses: Record<string, VouchData>;
  loading: boolean;
  categories: readonly CategoryOption[];
  hiddenVouchers: Set<string>;
  onHideVouch?: (voucherAddress: string) => void;
  onUnhideVouch?: (voucherAddress: string) => void;
  onRemoveVouch?: (voucherAddress: string) => void;
  provider?: BrowserProvider | null;
  account?: string;
  onRefresh: () => void;
  disabled?: boolean;
}

export function AcceptedVouchesCard({
  vouchersForMe,
  vouchStatuses,
  loading,
  categories,
  hiddenVouchers,
  onHideVouch,
  onUnhideVouch,
  onRemoveVouch,
  provider: _provider,
  account,
  onRefresh,
  disabled = false,
}: AcceptedVouchesCardProps) {
  const navigate = useNavigate();

  const accepted = vouchersForMe.filter((addr) => vouchStatuses[addr]?.status === 2);
  // Filter: exclude if on-chain hidden OR in LSP2/localStorage hidden list
  const visible = accepted.filter((addr) => {
    const v = vouchStatuses[addr];
    const isOnChainHidden = v?.hidden === true;
    const isInHiddenList = hiddenVouchers.has(addr.toLowerCase());
    return !isOnChainHidden && !isInHiddenList;
  });
  const hidden = accepted.filter((addr) => {
    const v = vouchStatuses[addr];
    const isOnChainHidden = v?.hidden === true;
    const isInHiddenList = hiddenVouchers.has(addr.toLowerCase());
    return isOnChainHidden || isInHiddenList;
  });

  return (
    <GlassCard>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-theme-text">
          Accepted Vouches
          {visible.length > 0 && (
            <span className="ml-2 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400">
              {visible.length}
            </span>
          )}
          {hidden.length > 0 && (
            <span className="ml-2 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400">
              {hidden.length} hidden
            </span>
          )}
        </h3>
        <button
          type="button"
          onClick={onRefresh}
          disabled={disabled}
          className="rounded-lg p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50 disabled:pointer-events-none"
          aria-label="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
      <p className="mb-4 text-sm text-theme-text-muted">Profiles that have vouched for you.</p>
      {loading ? (
        <p className="text-sm text-theme-dim">Loading…</p>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-theme-dim">
          <ShieldCheck className="h-12 w-12" />
          <p className="text-sm">
            {accepted.length === 0 ? "No accepted vouches yet" : "No visible vouches"}
          </p>
          <p className="text-xs">
            {accepted.length === 0
              ? "Accept vouches from the Pending vouches section above."
              : "Hidden vouches stay hidden for this account on this device."}
          </p>
        </div>
      ) : (
        <>
          {/* Visible vouches */}
          <ul className="space-y-2">
            {visible.map((vAddr, i) => {
              const v = vouchStatuses[vAddr];
              const catLabel = v ? categories.find((c) => c.value === v.category)?.label ?? v.category : "";
              return (
                <motion.li
                  key={vAddr}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex flex-wrap items-center gap-2 rounded-xl border border-theme-border bg-theme-surface p-3"
                >
                  <button
                    type="button"
                    onClick={() => navigate(`/profile/${vAddr}`)}
                    className="font-mono text-sm text-theme-text hover:text-theme-accent transition-colors text-left"
                  >
                    {vAddr.slice(0, 10)}…{vAddr.slice(-8)}
                  </button>
                  <span className="rounded-full bg-theme-accent-soft px-2 py-0.5 text-xs font-medium text-theme-accent">
                    {catLabel}
                  </span>
                  <div className="ml-auto flex gap-2">
                    {onHideVouch && (
                      <GlowButton
                        variant="secondary"
                        disabled={disabled}
                        onClick={() => onHideVouch(vAddr)}
                      >
                        <EyeOff className="h-3.5 w-3.5 mr-1" />
                        Hide
                      </GlowButton>
                    )}
                  </div>
                </motion.li>
              );
            })}
          </ul>
          {/* Hidden vouches (collapsible) */}
          {hidden.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-theme-text-muted hover:text-theme-text">
                Show {hidden.length} hidden vouch{hidden.length !== 1 ? "es" : ""}
              </summary>
              <ul className="mt-2 space-y-2">
                {hidden.map((vAddr, i) => {
                  const v = vouchStatuses[vAddr];
                  const catLabel = v ? categories.find((c) => c.value === v.category)?.label ?? v.category : "";
                  return (
                    <motion.li
                      key={vAddr}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3"
                    >
                      <button
                        type="button"
                        onClick={() => navigate(`/profile/${vAddr}`)}
                        className="font-mono text-sm text-theme-text hover:text-theme-accent transition-colors text-left"
                      >
                        {vAddr.slice(0, 10)}…{vAddr.slice(-8)}
                      </button>
                      <span className="rounded-full bg-theme-accent-soft px-2 py-0.5 text-xs font-medium text-theme-accent">
                        {catLabel}
                      </span>
                      <div className="ml-auto flex gap-2">
                        {onUnhideVouch && (
                          <GlowButton
                            variant="secondary"
                            disabled={disabled}
                            onClick={() => onUnhideVouch(vAddr)}
                            className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Unhide
                          </GlowButton>
                        )}
                        {onRemoveVouch && account && vAddr.toLowerCase() === account.toLowerCase() && (
                          <GlowButton
                            variant="secondary"
                            disabled={disabled}
                            onClick={() => onRemoveVouch(vAddr)}
                            className="border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Remove
                          </GlowButton>
                        )}
                      </div>
                    </motion.li>
                  );
                })}
              </ul>
            </details>
          )}
        </>
      )}
    </GlassCard>
  );
}
