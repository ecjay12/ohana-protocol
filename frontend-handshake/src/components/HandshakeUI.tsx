import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useHandshake, CATEGORIES, type VouchData } from "@/hooks/useHandshake";

type HandshakeUIProps = {
  provider: ReturnType<typeof import("@/hooks/useInjectedWallet").useInjectedWallet>["provider"];
  chainId: number;
  account: string;
};

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export function HandshakeUI({ provider, chainId, account }: HandshakeUIProps) {
  const {
    error,
    txPending,
    fee,
    isSupported,
    vouch,
    acceptVouch,
    denyVouch,
    cancelVouch,
    getVouch,
    getVouchersFor,
    getIncomingPending,
    STATUS_LABELS,
  } = useHandshake(provider, chainId, account);

  const [targetAddress, setTargetAddress] = useState("");
  const [category, setCategory] = useState(0);
  const [incoming, setIncoming] = useState<{ voucher: string; category: number }[]>([]);
  const [vouchersForMe, setVouchersForMe] = useState<string[]>([]);
  const [vouchStatuses, setVouchStatuses] = useState<Record<string, VouchData>>({});
  const [checkTarget, setCheckTarget] = useState("");
  const [myVouchToTarget, setMyVouchToTarget] = useState<VouchData | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!isSupported || !account) {
      setIncoming([]);
      setVouchersForMe([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([getIncomingPending(), getVouchersFor(account)])
      .then(([inc, list]) => {
        if (!cancelled) {
          setIncoming(inc);
          setVouchersForMe(list);
        }
      })
      .catch(() => {
        if (!cancelled) setIncoming([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [isSupported, account, getIncomingPending, getVouchersFor, refreshKey]);

  useEffect(() => {
    if (!isSupported || !account || vouchersForMe.length === 0) {
      setVouchStatuses({});
      return;
    }
    let cancelled = false;
    const load = async () => {
      const map: Record<string, VouchData> = {};
      for (const voucher of vouchersForMe) {
        try {
          const v = await getVouch(account, voucher);
          if (v && !cancelled) map[voucher] = v;
        } catch {}
      }
      if (!cancelled) setVouchStatuses(map);
    };
    load();
    return () => { cancelled = true; };
  }, [isSupported, account, getVouch, vouchersForMe, refreshKey]);

  const handleCheckMyVouch = useCallback(async () => {
    const target = checkTarget.trim();
    if (!target || !account) return;
    try {
      const v = await getVouch(target, account);
      setMyVouchToTarget(v ?? null);
    } catch {
      setMyVouchToTarget(null);
    }
  }, [checkTarget, account, getVouch]);

  const handleVouch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAddress.trim()) return;
    try {
      await vouch(targetAddress.trim(), category);
      setTargetAddress("");
      refresh();
    } catch {}
  };

  const handleAccept = async (voucher: string) => {
    try {
      await acceptVouch(voucher);
      refresh();
    } catch {}
  };

  const handleDeny = async (voucher: string) => {
    try {
      await denyVouch(voucher);
      refresh();
    } catch {}
  };

  const handleCancel = async (target: string) => {
    try {
      await cancelVouch(target);
      setMyVouchToTarget(null);
      setCheckTarget("");
      refresh();
    } catch {}
  };

  if (!isSupported) {
    return (
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="rounded-2xl border border-amber-200 bg-amber-50 p-6"
      >
        <p className="text-amber-800">
          Handshake isn't available on this network. Switch to LUKSO Testnet or Base Sepolia.
        </p>
      </motion.div>
    );
  }

  const feeEth = fee ? (Number(fee) / 1e18).toFixed(4) : "0";

  return (
    <div className="space-y-6">
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </motion.div>
      )}

      {/* Hero / Vouch CTA */}
      <motion.section
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-card-hover)]"
      >
        <h2 className="mb-1 text-lg font-semibold text-slate-800">Vouch for a profile</h2>
        <p className="mb-4 text-sm text-slate-500">
          Endorse someone's skill, trust, or attendance. Fee: {feeEth} native
        </p>
        <form onSubmit={handleVouch} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-0 flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-500">Profile address</label>
            <input
              type="text"
              placeholder="0x..."
              value={targetAddress}
              onChange={(e) => setTargetAddress(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 font-mono text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(Number(e.target.value))}
              className="rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={txPending || !targetAddress.trim()}
            className="rounded-xl bg-emerald-500 px-5 py-2.5 font-medium text-white transition-all hover:bg-emerald-600 disabled:opacity-50"
          >
            {txPending ? "Sending…" : "Vouch"}
          </button>
        </form>
      </motion.section>

      {/* Check my vouch */}
      <motion.section
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[var(--shadow-card)]"
      >
        <h3 className="mb-3 text-base font-semibold text-slate-800">Check my vouch</h3>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <input
              type="text"
              placeholder="Address I vouched for"
              value={checkTarget}
              onChange={(e) => setCheckTarget(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 font-mono text-sm focus:border-emerald-400 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={handleCheckMyVouch}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Check
          </button>
        </div>
        <AnimatePresence>
          {myVouchToTarget !== null && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-3"
            >
              <span className="text-sm font-medium text-slate-700">
                Status: {STATUS_LABELS[myVouchToTarget.status as keyof typeof STATUS_LABELS]}
              </span>
              <span className="text-sm text-slate-500">
                {CATEGORIES.find((c) => c.value === myVouchToTarget.category)?.label ?? myVouchToTarget.category}
              </span>
              {myVouchToTarget.status === 1 && (
                <button
                  onClick={() => handleCancel(checkTarget.trim())}
                  disabled={txPending}
                  className="ml-auto rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                >
                  Cancel vouch
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      {/* Incoming (pending) */}
      <motion.section
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[var(--shadow-card)]"
      >
        <h3 className="mb-3 text-base font-semibold text-slate-800">Incoming vouches</h3>
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : incoming.length === 0 ? (
          <p className="text-sm text-slate-500">No pending vouches.</p>
        ) : (
          <ul className="space-y-2">
            <AnimatePresence>
              {incoming.map(({ voucher: vAddr, category: cat }, i) => (
                <motion.li
                  key={vAddr}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/50 p-3"
                >
                  <span className="font-mono text-sm text-slate-700">
                    {vAddr.slice(0, 10)}…{vAddr.slice(-8)}
                  </span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    {CATEGORIES.find((c) => c.value === cat)?.label ?? cat}
                  </span>
                  <div className="ml-auto flex gap-2">
                    <button
                      onClick={() => handleAccept(vAddr)}
                      disabled={txPending}
                      className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleDeny(vAddr)}
                      disabled={txPending}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Deny
                    </button>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </motion.section>

      {/* Vouchers for me */}
      <motion.section
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[var(--shadow-card)]"
      >
        <h3 className="mb-3 text-base font-semibold text-slate-800">Vouchers for me</h3>
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : vouchersForMe.length === 0 ? (
          <p className="text-sm text-slate-500">No vouches yet.</p>
        ) : (
          <ul className="space-y-2">
            {vouchersForMe.map((vAddr) => {
              const v = vouchStatuses[vAddr];
              const statusLabel = v ? STATUS_LABELS[v.status as keyof typeof STATUS_LABELS] : "—";
              const catLabel = v ? CATEGORIES.find((c) => c.value === v.category)?.label ?? v.category : "";
              return (
                <li
                  key={vAddr}
                  className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/50 p-3"
                >
                  <span className="font-mono text-sm text-slate-700">
                    {vAddr.slice(0, 10)}…{vAddr.slice(-8)}
                  </span>
                  <span className="text-sm text-slate-500">
                    {statusLabel} · {catLabel}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </motion.section>
    </div>
  );
}
