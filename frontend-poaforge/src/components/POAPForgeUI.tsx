import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePOAPForge, type ForgeEvent } from "@/hooks/usePOAPForge";

type POAPForgeUIProps = {
  provider: ReturnType<typeof import("@/hooks/useInjectedWallet").useInjectedWallet>["provider"];
  chainId: number;
  account: string;
};

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

export function POAPForgeUI({ provider, chainId, account }: POAPForgeUIProps) {
  const {
    error,
    txPending,
    createEvent,
    getAllEvents,
    isSupported,
  } = usePOAPForge(provider, chainId, account);

  const [events, setEvents] = useState<ForgeEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const [eventId, setEventId] = useState("");
  const [nftName, setNftName] = useState("");
  const [nftSymbol, setNftSymbol] = useState("");
  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [royaltyBps, setRoyaltyBps] = useState(500);
  const [royaltyReceiver, setRoyaltyReceiver] = useState("");

  useEffect(() => {
    if (!isSupported || !account) {
      setEvents([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getAllEvents()
      .then((list) => {
        if (!cancelled) setEvents(list);
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [isSupported, account, getAllEvents, refreshKey]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = eventId.trim();
    if (!id || !nftName.trim() || !nftSymbol.trim() || !tokenName.trim() || !tokenSymbol.trim()) return;
    try {
      await createEvent(
        id,
        nftName.trim(),
        nftSymbol.trim(),
        tokenName.trim(),
        tokenSymbol.trim(),
        royaltyReceiver.trim() || account,
        royaltyBps
      );
      setEventId("");
      setNftName("");
      setNftSymbol("");
      setTokenName("");
      setTokenSymbol("");
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
          POAP Forge isn't available on this network. Switch to LUKSO Testnet or Base Sepolia.
        </p>
      </motion.div>
    );
  }

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

      {/* Create event */}
      <motion.section
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-card-hover)]"
      >
        <h2 className="mb-1 text-lg font-semibold text-slate-800">Create event</h2>
        <p className="mb-4 text-sm text-slate-500">
          Create an event to get an NFT collection and fungible token. You own both contracts.
        </p>
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Event ID (unique slug)</label>
            <input
              type="text"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              placeholder="my-event-2025"
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">NFT name</label>
              <input
                type="text"
                value={nftName}
                onChange={(e) => setNftName(e.target.value)}
                placeholder="My Event NFT"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">NFT symbol</label>
              <input
                type="text"
                value={nftSymbol}
                onChange={(e) => setNftSymbol(e.target.value)}
                placeholder="MENFT"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Token name</label>
              <input
                type="text"
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
                placeholder="My Event Token"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Token symbol</label>
              <input
                type="text"
                value={tokenSymbol}
                onChange={(e) => setTokenSymbol(e.target.value)}
                placeholder="MET"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Royalty (bps, 100 = 1%)</label>
              <input
                type="number"
                min={0}
                max={10000}
                value={royaltyBps}
                onChange={(e) => setRoyaltyBps(Number(e.target.value) || 0)}
                className="w-24 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-500">Royalty receiver (optional)</label>
              <input
                type="text"
                value={royaltyReceiver}
                onChange={(e) => setRoyaltyReceiver(e.target.value)}
                placeholder="0x..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 font-mono text-sm focus:border-emerald-400 focus:outline-none"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={txPending}
            className="rounded-xl bg-emerald-500 px-6 py-3 font-medium text-white transition-all hover:bg-emerald-600 disabled:opacity-50"
          >
            {txPending ? "Creating…" : "Create event"}
          </button>
        </form>
      </motion.section>

      {/* Events list */}
      <motion.section
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[var(--shadow-card)]"
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-800">Events</h3>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
        {loading && events.length === 0 && (
          <p className="text-sm text-slate-500">Loading events…</p>
        )}
        {!loading && events.length === 0 && (
          <p className="text-sm text-slate-500">No events yet. Create one above.</p>
        )}
        {events.length > 0 && (
          <ul className="space-y-3">
            <AnimatePresence>
              {events.map((evt, i) => (
                <motion.li
                  key={`${evt.eventId}-${evt.creator}-${i}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl border border-slate-100 bg-slate-50/50 p-4"
                >
                  <p className="font-semibold text-slate-800">{evt.eventId}</p>
                  <p className="mt-1 font-mono text-xs text-slate-500">
                    {evt.creator.slice(0, 10)}…{evt.creator.slice(-8)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs font-mono text-slate-500">
                    <span>NFT: {evt.nftContract.slice(0, 10)}…{evt.nftContract.slice(-8)}</span>
                    <span>Token: {evt.tokenContract.slice(0, 10)}…{evt.tokenContract.slice(-8)}</span>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </motion.section>
    </div>
  );
}
