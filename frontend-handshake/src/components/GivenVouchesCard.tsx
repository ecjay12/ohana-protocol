import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Share2 } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { GlowButton } from "./GlowButton";
import type { VouchData } from "@/types/handshake";
import { getStoredAgentId, setStoredAgentId } from "@/lib/agentIdStorage";

interface CategoryOption {
  value: number;
  label: string;
}

interface GivenVouchesCardProps {
  chainId: number;
  account: string;
  txPending: boolean;
  statusLabels: Record<number, string>;
  categories: readonly CategoryOption[];
  myVouchToTarget: VouchData | null;
  hasERC8004Support: boolean;
  onCheck: (targetAddress: string) => void;
  onCancel: (targetAddress: string) => void;
  onRefresh: () => void;
  onPublishToERC8004?: (targetAddress: string, category: number, targetAgentId: number) => Promise<void>;
  disabled?: boolean;
}

export function GivenVouchesCard({
  chainId,
  account,
  txPending,
  statusLabels,
  categories,
  myVouchToTarget,
  hasERC8004Support,
  onCheck,
  onCancel,
  onRefresh,
  onPublishToERC8004,
  disabled = false,
}: GivenVouchesCardProps) {
  const [checkTarget, setCheckTarget] = useState("");
  const [targetAgentIdInput, setTargetAgentIdInput] = useState("");
  const [myAgentIdInput, setMyAgentIdInput] = useState("");
  const [publishPending, setPublishPending] = useState(false);

  const storedMyAgentId = getStoredAgentId(chainId, account);
  useEffect(() => {
    if (storedMyAgentId) setMyAgentIdInput(storedMyAgentId);
  }, [storedMyAgentId]);
  useEffect(() => {
    if (
      myVouchToTarget &&
      checkTarget.trim().toLowerCase() === account.toLowerCase() &&
      storedMyAgentId &&
      !targetAgentIdInput
    ) {
      setTargetAgentIdInput(storedMyAgentId);
    }
  }, [myVouchToTarget, checkTarget, account, storedMyAgentId]);

  const handleCheck = () => {
    const t = checkTarget.trim();
    if (t) onCheck(t);
  };

  const categoryLabel = (cat: number) => categories.find((c) => c.value === cat)?.label ?? String(cat);

  return (
    <GlassCard>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">Check my vouch</h3>
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
      <p className="mb-4 text-sm text-white/70">See status of a vouch you gave. You can cancel if it is still pending.</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label className="mb-1 block text-xs font-medium text-white/70">Address I vouched for</label>
          <input
            type="text"
            placeholder="0x..."
            value={checkTarget}
            onChange={(e) => setCheckTarget(e.target.value)}
            className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 font-mono text-sm text-white placeholder:text-white/40 focus:border-[#00f3ff]/50 focus:outline-none focus:ring-2 focus:ring-[#00f3ff]/20"
          />
        </div>
        <GlowButton variant="secondary" disabled={disabled || !checkTarget.trim()} onClick={handleCheck}>
          Check
        </GlowButton>
      </div>
      <AnimatePresence>
        {myVouchToTarget !== null && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-3"
          >
            <span className="text-sm font-medium text-white/90">
              Status: {statusLabels[myVouchToTarget.status]}
            </span>
            <span className="text-sm text-white/70">
              {categoryLabel(myVouchToTarget.category)}
            </span>
            {myVouchToTarget.status === 1 && (
              <GlowButton
                variant="secondary"
                disabled={disabled || txPending}
                onClick={() => onCancel(checkTarget.trim())}
                className="ml-auto border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
              >
                Cancel vouch
              </GlowButton>
            )}
            {myVouchToTarget.status === 2 && hasERC8004Support && onPublishToERC8004 && (
              <div className="mt-3 w-full border-t border-white/10 pt-3">
                <p className="mb-2 text-xs text-white/60">Publish this accepted vouch to ERC-8004 Reputation</p>
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <label className="mb-1 block text-xs font-medium text-white/70">Target&apos;s Agent ID</label>
                    <input
                      type="number"
                      min={0}
                      placeholder={
                        checkTarget.trim().toLowerCase() === account.toLowerCase()
                          ? storedMyAgentId ?? "Your Agent ID"
                          : "Enter agent ID"
                      }
                      value={targetAgentIdInput}
                      onChange={(e) => setTargetAgentIdInput(e.target.value)}
                      className="w-full max-w-[140px] rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-sm text-white focus:border-[#00f3ff]/50 focus:outline-none"
                    />
                  </div>
                  <GlowButton
                    variant="primary"
                    disabled={
                      disabled ||
                      publishPending ||
                      txPending ||
                      !(targetAgentIdInput || (checkTarget.trim().toLowerCase() === account.toLowerCase() ? storedMyAgentId : null))
                    }
                    onClick={async () => {
                      const agentIdStr =
                        targetAgentIdInput ||
                        (checkTarget.trim().toLowerCase() === account.toLowerCase() ? storedMyAgentId : null);
                      if (!agentIdStr || !onPublishToERC8004) return;
                      const agentId = parseInt(agentIdStr, 10);
                      if (Number.isNaN(agentId) || agentId < 0) return;
                      setPublishPending(true);
                      try {
                        await onPublishToERC8004(checkTarget.trim(), myVouchToTarget.category, agentId);
                      } finally {
                        setPublishPending(false);
                      }
                    }}
                  >
                    <span className="flex items-center gap-1.5">
                      <Share2 className="h-4 w-4" />
                      {publishPending ? "Publishing…" : "Publish to ERC-8004"}
                    </span>
                  </GlowButton>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {hasERC8004Support && (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="mb-2 text-xs font-medium text-white/70">Link my Agent ID (for this wallet)</p>
          <div className="flex flex-wrap items-end gap-2">
            <input
              type="number"
              min={0}
              placeholder="Your ERC-8004 Agent ID"
              value={myAgentIdInput}
              onChange={(e) => setMyAgentIdInput(e.target.value)}
              className="max-w-[140px] rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-sm text-white focus:border-[#00f3ff]/50 focus:outline-none"
            />
            <GlowButton
              variant="secondary"
              disabled={disabled}
              onClick={() => {
                const id = myAgentIdInput.trim();
                if (id) setStoredAgentId(chainId, account, id);
              }}
            >
              Save
            </GlowButton>
          </div>
        </div>
      )}
    </GlassCard>
  );
}
