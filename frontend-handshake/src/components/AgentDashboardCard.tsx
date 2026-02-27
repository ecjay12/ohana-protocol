import { motion } from "framer-motion";
import { Activity } from "lucide-react";
import { GlassCard } from "./GlassCard";

interface AgentDashboardCardProps {
  isSupported: boolean;
  chainName: string;
}

export function AgentDashboardCard({ isSupported, chainName }: AgentDashboardCardProps) {
  return (
    <GlassCard>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            className="relative flex h-3 w-3"
            animate={
              isSupported
                ? {
                    scale: [1, 1.3, 1],
                    opacity: [1, 0.6, 1],
                  }
                : {}
            }
            transition={{
              duration: 1.5,
              repeat: Infinity,
              repeatType: "loop",
            }}
          >
            <span
              className={`absolute inline-flex h-full w-full rounded-full ${
                isSupported ? "bg-emerald-500" : "bg-theme-surface-strong"
              }`}
            />
            {isSupported && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-40" />
            )}
          </motion.div>
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <Activity className="h-4 w-4 text-[#00f3ff]" />
              Network status
            </div>
            <div className="text-xs text-theme-text-muted">
              {isSupported ? "Handshake contract connected on this network" : "Connect wallet and switch to a supported network"}
            </div>
          </div>
        </div>
        <span className="rounded-full bg-theme-surface-strong px-3 py-1 text-xs font-medium text-theme-text-muted">
          {chainName}
        </span>
      </div>
    </GlassCard>
  );
}
