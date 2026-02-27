import { motion, AnimatePresence } from "framer-motion";
import { Activity } from "lucide-react";
import { GlassCard } from "./GlassCard";
import type { FeedItem } from "@/types/handshake";

interface TransactionFeedProps {
  items: FeedItem[];
}

const typeColors: Record<FeedItem["type"], string> = {
  vouch: "text-[#00f3ff]",
  accept: "text-emerald-400",
  deny: "text-amber-400",
  cancel: "text-white/70",
};

function formatTime(ts: number) {
  const d = new Date(ts);
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60_000) return "Just now";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function TransactionFeed({ items }: TransactionFeedProps) {
  return (
    <GlassCard>
      <div className="mb-3 flex items-center gap-2">
        <Activity className="h-5 w-5 text-[#00f3ff]" />
        <h3 className="text-base font-semibold text-white">Recent actions</h3>
      </div>
      <p className="mb-4 text-sm text-white/70">Session activity from vouches and responses.</p>
      {items.length === 0 ? (
        <p className="text-sm text-white/50">No actions yet.</p>
      ) : (
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {items.map((item, i) => (
              <motion.li
                key={item.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              >
                <span className={`text-sm font-medium capitalize ${typeColors[item.type]}`}>
                  {item.type}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-white/80">{item.label}</span>
                <span className="shrink-0 text-xs text-white/50">{formatTime(item.timestamp)}</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </GlassCard>
  );
}
