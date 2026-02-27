/**
 * Read-only vouch history for a profile: Given and Received tabs, with search.
 */

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2 } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { GlowButton } from "./GlowButton";

interface CategoryOption {
  value: number;
  label: string;
}

export interface ProfileVouchRow {
  type: "given" | "received";
  address: string;
  category: number;
  status: number;
  timestamp: bigint;
}

const STATUS_LABELS: Record<number, string> = {
  0: "None",
  1: "Pending",
  2: "Accepted",
  3: "Denied",
};

interface ProfileVouchHistoryCardProps {
  vouchesGiven: ProfileVouchRow[];
  vouchesReceived: ProfileVouchRow[];
  categories: readonly CategoryOption[];
  loading?: boolean;
  /** When true, label as "Your vouch history" (connected profile). */
  isConnectedProfile?: boolean;
  /** Called when user revokes a given vouch. Only shown when isConnectedProfile. */
  onRemoveVouch?: (target: string) => void | Promise<void>;
  txPending?: boolean;
  disabled?: boolean;
}

export function ProfileVouchHistoryCard({
  vouchesGiven,
  vouchesReceived,
  categories,
  loading = false,
  isConnectedProfile = false,
  onRemoveVouch,
  txPending = false,
  disabled = false,
}: ProfileVouchHistoryCardProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"given" | "received">("given");
  const [searchQuery, setSearchQuery] = useState("");

  const list = activeTab === "given" ? vouchesGiven : vouchesReceived;
  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((row) => row.address.toLowerCase().includes(q));
  }, [list, searchQuery]);

  const categoryLabel = (cat: number) =>
    categories.find((c) => c.value === cat)?.label ?? String(cat);

  const formatAddress = (addr: string) =>
    `${addr.slice(0, 10)}…${addr.slice(-8)}`;

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <GlassCard>
      <h3 className="mb-4 text-base font-semibold text-theme-text">
        {isConnectedProfile ? "Your vouch history" : "Vouch history"}
      </h3>

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

      <div className="mb-3">
        <input
          type="text"
          placeholder="Search by address…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-theme-border bg-theme-surface px-3 py-2 font-mono text-sm text-theme-text placeholder:text-theme-dim focus:border-theme-accent focus:outline-none focus:ring-2 focus:ring-theme-accent-soft"
          aria-label="Search vouch history by address"
        />
      </div>

      {loading ? (
        <p className="py-6 text-center text-sm text-theme-dim">Loading…</p>
      ) : filteredList.length === 0 ? (
        <p className="py-6 text-center text-sm text-theme-dim">
          {searchQuery.trim()
            ? `No ${activeTab} vouches match your search.`
            : `No ${activeTab} vouches.`}
        </p>
      ) : (
        <ul className="space-y-2 max-h-[400px] overflow-y-auto">
          <AnimatePresence>
            {filteredList.map((row, i) => (
              <motion.li
                key={`${row.type}-${row.address}-${i}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: i * 0.02 }}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-theme-border bg-theme-surface p-3"
              >
                <button
                  type="button"
                  onClick={() => navigate(`/profile/${row.address}`)}
                  className="font-mono text-sm text-theme-text hover:text-theme-accent transition-colors text-left"
                >
                  {formatAddress(row.address)}
                </button>
                <span className="rounded-full bg-theme-accent-soft px-2 py-0.5 text-xs font-medium text-theme-accent">
                  {categoryLabel(row.category)}
                </span>
                <span className="text-xs text-theme-text-muted">
                  {STATUS_LABELS[row.status] ?? row.status}
                </span>
                <span className="text-xs text-theme-dim ml-auto">
                  {formatDate(row.timestamp)}
                </span>
                {row.type === "given" && onRemoveVouch && (
                  <GlowButton
                    variant="secondary"
                    disabled={disabled || txPending}
                    onClick={() => onRemoveVouch(row.address)}
                    className="border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20 shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Revoke
                  </GlowButton>
                )}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </GlassCard>
  );
}
