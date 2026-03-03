/**
 * Hero section — headline, value prop, and engagement CTAs.
 */

import { motion } from "framer-motion";
import { ArrowRight, Shield, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { GlowButton } from "./GlowButton";
import type { WalletOption } from "@/hooks/useInjectedWallet";
import { useTheme } from "@/contexts/ThemeContext";
import { THEME_LOGOS } from "@/config/themeLogos";

interface HeroSectionProps {
  isConnected?: boolean;
  account?: string;
  vouchesReceived?: number;
  vouchesGiven?: number;
  onConnect?: () => void;
  onConnectWith?: (wallet: WalletOption) => void;
  availableWallets?: WalletOption[];
  hasInjected?: boolean;
}

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
  },
};

export function HeroSection({
  isConnected = false,
  account,
  vouchesReceived = 0,
  vouchesGiven = 0,
  onConnect,
  onConnectWith,
  availableWallets = [],
  hasInjected = false,
}: HeroSectionProps) {
  const { theme } = useTheme();
  const logoSrc = THEME_LOGOS[theme];

  return (
    <section className="relative overflow-hidden rounded-2xl border border-theme-border bg-theme-surface px-6 py-12 md:px-12 md:py-16 lg:py-20">
      {/* Background accents */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 50%, var(--theme-accent) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, var(--theme-accent) 0%, transparent 40%)
          `,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(var(--theme-accent) 1px, transparent 1px),
            linear-gradient(90deg, var(--theme-accent) 1px, transparent 1px)
          `,
          backgroundSize: "64px 64px",
        }}
      />

      <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <motion.div
          variants={container}
          initial="hidden"
          animate="visible"
          className="flex-1"
        >
          <motion.div
            variants={item}
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-theme-border bg-theme-surface-strong px-4 py-1.5 text-xs font-medium text-theme-text-muted"
          >
            <Shield className="h-3.5 w-3.5" />
            On-chain trust layer
          </motion.div>
          <motion.h1
            variants={item}
            className="text-3xl font-bold tracking-tight text-theme-text md:text-4xl lg:text-5xl"
          >
            One Vouch. <span className="text-theme-accent">Infinite Trust.</span>
          </motion.h1>
          <motion.p
            variants={item}
            className="mt-4 max-w-lg text-base text-theme-text-muted md:text-lg"
          >
            Build, earn, and carry your real on-chain reputation across Web3.
          </motion.p>

          <motion.div variants={item} className="mt-8 flex flex-wrap items-center gap-4">
            {isConnected && account ? (
              <>
                <Link to={`/profile/${account}`}>
                  <GlowButton variant="primary" className="inline-flex items-center gap-2">
                    My Profile
                    <ArrowRight className="h-4 w-4" />
                  </GlowButton>
                </Link>
                {(vouchesReceived > 0 || vouchesGiven > 0) && (
                  <div className="flex items-center gap-4 text-sm text-theme-text-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-theme-accent" />
                      {vouchesReceived} received
                    </span>
                    <span className="text-theme-border">·</span>
                    <span>{vouchesGiven} given</span>
                  </div>
                )}
              </>
            ) : (
              <>
                {availableWallets.length > 1 ? (
                  <div className="flex flex-wrap gap-2">
                    {availableWallets.map((w) => (
                      <GlowButton
                        key={w.label}
                        onClick={() => onConnectWith?.(w)}
                        className="inline-flex items-center gap-2"
                      >
                        Connect {w.label}
                      </GlowButton>
                    ))}
                  </div>
                ) : (
                  <GlowButton
                    onClick={onConnect}
                    disabled={!hasInjected}
                    className="inline-flex items-center gap-2"
                  >
                    {logoSrc && (
                      <img
                        src={logoSrc}
                        alt="Handshake logo"
                        className="h-4 w-4 rounded"
                      />
                    )}
                    {hasInjected ? "Connect wallet" : "No wallet found"}
                  </GlowButton>
                )}
                <Link to="/about">
                  <GlowButton variant="secondary">About</GlowButton>
                </Link>
                <p className="w-full text-xs text-theme-text-dim">
                  By connecting your wallet, you agree to our{" "}
                  <Link to="/terms" className="text-theme-accent hover:underline">
                    Terms of Service
                  </Link>
                  .
                </p>
              </>
            )}
          </motion.div>
        </motion.div>

        {/* Visual element */}
        <motion.div
          variants={item}
          initial="hidden"
          animate="visible"
          className="flex shrink-0 items-center justify-center lg:ml-8"
        >
          <div className="relative">
            <motion.div
              animate={{
                scale: [1, 1.02, 1],
                opacity: [0.6, 0.9, 0.6],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute inset-0 rounded-full bg-theme-accent/20 blur-2xl"
            />
            <div className="relative flex h-32 w-32 items-center justify-center rounded-2xl border border-theme-border bg-theme-surface-strong md:h-40 md:w-40">
              {logoSrc ? (
                <img
                  src={logoSrc}
                  alt="Handshake logo"
                  className="h-16 w-16 md:h-20 md:w-20"
                />
              ) : (
                <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-theme-accent" />
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
