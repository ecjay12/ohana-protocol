/**
 * Unified vouch history card showing all vouches given and received.
 * Replaces GivenVouchesCard with comprehensive history view and CSV export.
 */

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Download, EyeOff, Eye, Trash2, Share2 } from "lucide-react";
import { Link } from "react-router-dom";
import { GlassCard } from "./GlassCard";
import { GlowButton } from "./GlowButton";
import { exportVouchesToCSV, type VouchHistoryRow } from "@/lib/csvExport";
import { getStoredAgentId } from "@/lib/agentIdStorage";
import type { BrowserProvider } from "ethers";

interface CategoryOption {
  value: number;
  label: string;
}

export interface HistoryVouch {
  type: "given" | "received";
  address: string;
  category: number;
  status: number;
  timestamp: bigint;
  updatedAt: bigint;
  hidden: boolean;
  message?: string;
}

interface HistoryCardProps {
  chainId: number;
  account: string;
  provider: BrowserProvider | null;
  vouchesGiven: HistoryVouch[];
  vouchesReceived: HistoryVouch[];
  loading: boolean;
  txPending: boolean;
  statusLabels: Record<number, string>;
  categories: readonly CategoryOption[];
  hiddenVouchers: Set<string>;
  onHideVouch?: (voucher: string) => void;
  onUnhideVouch?: (voucher: string) => void;
  onRemoveVouch?: (target: string) => void;
  onRefresh: () => void;
  disabled?: boolean;
  hasERC8004Support?: boolean;
  onPublishToERC8004?: (targetAddress: string, category: number, targetAgentId: number) => Promise<void>;
}

export function HistoryCard({
  chainId,
  account,
  provider: _provider,
  vouchesGiven,
  vouchesReceived,
  loading,
  txPending,
  statusLabels,
  categories,
  hiddenVouchers,
  onHideVouch,
  onUnhideVouch,
  onRemoveVouch,
  onRefresh,
  disabled = false,
  hasERC8004Support = false,
  onPublishToERC8004,
}: HistoryCardProps) {
  const [activeTab, setActiveTab] = useState<"given" | "received">("given");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [expandedPublishTarget, setExpandedPublishTarget] = useState<string | null>(null);
  const [agentIdInputs, setAgentIdInputs] = useState<Record<string, string>>({});
  const [publishPending, setPublishPending] = useState(false);

  const storedMyAgentId = account ? getStoredAgentId(chainId, account) : null;

  const categoryLabel = (cat: number) => categories.find((c) => c.value === cat)?.label ?? String(cat);

  const indexSummary = useMemo(() => {
    const givenAccepted = vouchesGiven.filter((v) => v.status === 2).length;
    const receivedAccepted = vouchesReceived.filter((v) => v.status === 2).length;
    const receivedPending = vouchesReceived.filter((v) => v.status === 1).length;
    return { givenAccepted, receivedAccepted, receivedPending };
  }, [vouchesGiven, vouchesReceived]);

  const filteredVouches = useMemo(() => {
    const list = activeTab === "given" ? vouchesGiven : vouchesReceived;
    return list.filter((v) => {
      // Filter by status
      if (filterStatus !== "all") {
        const statusNum = Number(filterStatus);
        if (v.status !== statusNum) return false;
      }

      // Filter by category
      if (filterCategory !== "all") {
        const catNum = Number(filterCategory);
        if (v.category !== catNum) return false;
      }

      // Filter hidden (for received only)
      if (activeTab === "received" && v.hidden && filterStatus !== "hidden") {
        return false;
      }

      return true;
    });
  }, [activeTab, vouchesGiven, vouchesReceived, filterStatus, filterCategory]);

  const handleExportCSV = () => {
    const allVouches: VouchHistoryRow[] = [
      ...vouchesGiven.map((v) => ({
        type: "given" as const,
        address: v.address,
        category: categoryLabel(v.category),
        status: statusLabels[v.status] ?? String(v.status),
        timestamp: String(v.timestamp),
        message: v.message,
        chainId,
      })),
      ...vouchesReceived.map((v) => ({
        type: "received" as const,
        address: v.address,
        category: categoryLabel(v.category),
        status: statusLabels[v.status] ?? String(v.status),
        timestamp: String(v.timestamp),
        message: v.message,
        chainId,
      })),
    ];
    exportVouchesToCSV(allVouches);
  };

  const formatAddress = (addr: string) => {
    // Security: Only display, don't execute
    return `${addr.slice(0, 10)}…${addr.slice(-8)}`;
  };

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <GlassCard>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-theme-text">Vouch History</h3>
          <p className="mt-1 text-xs text-theme-text-muted">
            {vouchesGiven.length} given ({indexSummary.givenAccepted} accepted) · {vouchesReceived.length} received ({indexSummary.receivedAccepted} accepted, {indexSummary.receivedPending} pending)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {account && (
            <Link
              to={`/profile/${account}`}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-theme-accent hover:bg-theme-accent-soft transition-colors"
            >
              View profile
            </Link>
          )}
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={disabled || (vouchesGiven.length === 0 && vouchesReceived.length === 0)}
            className="rounded-lg p-1.5 text-theme-text-muted transition-colors hover:bg-theme-surface-strong hover:text-theme-text disabled:opacity-50 disabled:pointer-events-none"
            title="Export to CSV"
          >
            <Download className="h-4 w-4" />
          </button>
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
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-2 border-b border-theme-border">
        <button
          type="button"
          onClick={() => setActiveTab("given")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "given"
              ? "border-b-2 border-theme-accent text-theme-accent"
              : "text-theme-text-muted hover:text-theme-text"
          }`}
        >
          Given ({vouchesGiven.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("received")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "received"
              ? "border-b-2 border-theme-accent text-theme-accent"
              : "text-theme-text-muted hover:text-theme-text"
          }`}
        >
          Received ({vouchesReceived.length})
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="select-readable rounded-lg border border-theme-border px-3 py-1.5 text-xs focus:border-theme-accent focus:outline-none"
        >
          <option value="all">All Status</option>
          {Object.entries(statusLabels).map(([val, label]) => (
            <option key={val} value={val}>
              {label}
            </option>
          ))}
          {activeTab === "received" && <option value="hidden">Hidden</option>}
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="select-readable rounded-lg border border-theme-border px-3 py-1.5 text-xs focus:border-theme-accent focus:outline-none"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c.value} value={String(c.value)}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* Vouch List */}
      {loading ? (
        <p className="text-sm text-theme-dim">Loading…</p>
      ) : filteredVouches.length === 0 ? (
        <div className="py-8 text-center text-sm text-theme-dim space-y-2">
          <p>No vouches in this tab.</p>
          {!loading && vouchesGiven.length === 0 && vouchesReceived.length === 0 && (
            <p className="text-xs">Give a vouch above or switch to the chain where you have vouches, then refresh.</p>
          )}
        </div>
      ) : (
        <ul className="space-y-2 max-h-[600px] overflow-y-auto">
          <AnimatePresence>
            {filteredVouches.map((vouch, i) => {
              const isHidden = vouch.hidden || hiddenVouchers.has(vouch.address.toLowerCase());
              return (
                <motion.li
                  key={`${vouch.type}-${vouch.address}-${i}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ delay: i * 0.03 }}
                  className={`flex flex-wrap items-center gap-2 rounded-xl border p-3 ${
                    isHidden ? "border-amber-500/30 bg-amber-500/5" : "border-theme-border bg-theme-surface"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="font-mono text-sm text-theme-text">{formatAddress(vouch.address)}</span>
                    {vouch.address.toLowerCase() === account.toLowerCase() && (
                      <span className="rounded-full bg-theme-accent/20 px-2 py-0.5 text-xs font-medium text-theme-accent">
                        You
                      </span>
                    )}
                    <span className="rounded-full bg-theme-accent-soft px-2 py-0.5 text-xs font-medium text-theme-accent">
                      {categoryLabel(vouch.category)}
                    </span>
                    <span className="text-xs text-theme-text-muted">{statusLabels[vouch.status]}</span>
                    <span className="text-xs text-theme-dim">{formatDate(vouch.timestamp)}</span>
                  </div>
                  {activeTab === "given" && (
                    <div className="flex flex-wrap items-center gap-2">
                      {vouch.status === 2 && hasERC8004Support && onPublishToERC8004 && (
                        <>
                          {expandedPublishTarget === vouch.address ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <input
                                type="number"
                                min={0}
                                placeholder={
                                  vouch.address.toLowerCase() === account.toLowerCase()
                                    ? storedMyAgentId ?? "Your Agent ID"
                                    : "Agent ID"
                                }
                                value={agentIdInputs[vouch.address] ?? ""}
                                onChange={(e) =>
                                  setAgentIdInputs((prev) => ({ ...prev, [vouch.address]: e.target.value }))
                                }
                                className="w-24 rounded-lg border border-theme-border bg-theme-surface px-2 py-1 text-sm focus:border-theme-accent focus:outline-none"
                              />
                              <GlowButton
                                variant="primary"
                                className="px-3 py-1.5 text-sm"
                                disabled={
                                  disabled ||
                                  publishPending ||
                                  txPending ||
                                  !(
                                    agentIdInputs[vouch.address]?.trim() ||
                                    (vouch.address.toLowerCase() === account.toLowerCase() ? storedMyAgentId : null)
                                  )
                                }
                                onClick={async () => {
                                  const agentIdStr =
                                    agentIdInputs[vouch.address]?.trim() ||
                                    (vouch.address.toLowerCase() === account.toLowerCase() ? storedMyAgentId : null);
                                  if (!agentIdStr) return;
                                  const agentId = parseInt(agentIdStr, 10);
                                  if (Number.isNaN(agentId) || agentId < 0) return;
                                  setPublishPending(true);
                                  try {
                                    await onPublishToERC8004(vouch.address, vouch.category, agentId);
                                    setExpandedPublishTarget(null);
                                    setAgentIdInputs((prev) => {
                                      const next = { ...prev };
                                      delete next[vouch.address];
                                      return next;
                                    });
                                  } finally {
                                    setPublishPending(false);
                                  }
                                }}
                              >
                                {publishPending ? "Publishing…" : "Publish"}
                              </GlowButton>
                              <button
                                type="button"
                                onClick={() => {
                                  setExpandedPublishTarget(null);
                                  setAgentIdInputs((prev) => {
                                    const next = { ...prev };
                                    delete next[vouch.address];
                                    return next;
                                  });
                                }}
                                className="text-xs text-theme-text-muted hover:text-theme-text"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <GlowButton
                              variant="secondary"
                              disabled={disabled || txPending}
                              onClick={() => setExpandedPublishTarget(vouch.address)}
                            >
                              <Share2 className="h-3.5 w-3.5 mr-1" />
                              Publish to ERC-8004
                            </GlowButton>
                          )}
                        </>
                      )}
                      {onRemoveVouch && (
                        <GlowButton
                          variant="secondary"
                          disabled={disabled || txPending}
                          onClick={() => onRemoveVouch(vouch.address)}
                          className="border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Revoke
                        </GlowButton>
                      )}
                    </div>
                  )}
                  {activeTab === "received" && vouch.status === 2 && (
                    <div className="flex gap-2">
                      {isHidden ? (
                        onUnhideVouch && (
                          <GlowButton
                            variant="secondary"
                            disabled={disabled || txPending}
                            onClick={() => onUnhideVouch(vouch.address)}
                            className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Unhide
                          </GlowButton>
                        )
                      ) : (
                        onHideVouch && (
                          <GlowButton
                            variant="secondary"
                            disabled={disabled || txPending}
                            onClick={() => onHideVouch(vouch.address)}
                          >
                            <EyeOff className="h-3.5 w-3.5 mr-1" />
                            Hide
                          </GlowButton>
                        )
                      )}
                    </div>
                  )}
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </GlassCard>
  );
}
