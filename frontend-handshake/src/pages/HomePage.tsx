/**
 * Home page — landing page explaining Handshake, use cases, and proof of humanity.
 */

import { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Shield,
  Users,
  CheckCircle,
  Bot,
  Zap,
  ExternalLink,
  Globe,
  Network,
  UserCircle,
} from "lucide-react";
import { AppLayout } from "@/layout/AppLayout";
import { useInjectedWallet } from "@/hooks/useInjectedWallet";
import { useWalletDisplayLabel } from "@/hooks/useWalletDisplayLabel";
import { useProfileData } from "@/hooks/useProfileData";
import { GlowButton } from "@/components/GlowButton";
import { useTheme } from "@/contexts/ThemeContext";
import { THEME_LOGOS } from "@/config/themeLogos";
import { ProofOfWordScroll } from "@/components/ProofOfWordScroll";
import { LuksoActivitySection } from "@/components/LuksoActivitySection";

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

export function HomePage() {
  const wallet = useInjectedWallet();
  const { theme } = useTheme();
  const logoSrc = THEME_LOGOS[theme];
  const { profileData: userProfileData, isUP: userIsUP, loading: userProfileLoading } =
    useProfileData(wallet.provider, wallet.accounts[0] ?? null, wallet.chainId);
  const walletDisplayLabel = useWalletDisplayLabel(wallet.accounts[0] ?? null);

  /** Warm cache for the dashboard route (same SPA shell; helps repeat visits feel instant). */
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.href = "/app";
    document.head.appendChild(link);
    return () => {
      link.remove();
    };
  }, []);

  return (
    <AppLayout
      chainId={wallet.chainId}
      chains={wallet.chains as Record<number, { name: string; rpc: string }>}
      shortAddress={walletDisplayLabel}
      account={wallet.accounts[0]}
      isConnected={wallet.isConnected}
      hasInjected={wallet.hasInjected}
      availableWallets={wallet.availableWallets}
      walletError={wallet.error}
      userProfileData={userProfileData}
      userProfileLoading={userProfileLoading}
      userIsUP={userIsUP}
      onConnect={wallet.connect}
      onConnectWith={wallet.connectWith}
      onSwitchChain={wallet.switchChain}
      onDisconnect={wallet.disconnect}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="mx-auto max-w-6xl space-y-10 px-3 py-6 sm:space-y-14 sm:px-5 sm:py-10 md:px-8 md:py-14"
      >
        {/* Hero — large, professional section */}
        <motion.section
          variants={container}
          initial="hidden"
          animate="visible"
          aria-labelledby="hero-heading"
          className="relative overflow-x-hidden rounded-2xl border border-theme-border bg-theme-surface px-4 py-6 sm:px-8 sm:py-8 md:px-14 md:py-10 lg:px-16 lg:py-12"
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.055]"
            style={{
              backgroundImage: `
                radial-gradient(ellipse 85% 70% at 50% 42%, var(--theme-accent) 0%, transparent 52%),
                radial-gradient(ellipse 120% 85% at 50% 55%, var(--theme-border) 0%, transparent 50%),
                radial-gradient(circle at 18% 78%, var(--theme-accent) 0%, transparent 38%)
              `,
            }}
          />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
            <div className="min-w-0 flex-1 content-safe text-left lg:max-w-3xl">
              <motion.div
                variants={item}
                className="mb-3 inline-flex max-w-full items-center gap-2 rounded-full border border-theme-border bg-theme-surface-strong px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-theme-text-muted sm:text-xs"
              >
                <Shield className="h-3.5 w-3.5 shrink-0" />
                Trust you can verify
              </motion.div>
              <motion.div variants={item}>
                <ProofOfWordScroll id="hero-heading" />
              </motion.div>
              <motion.p
                variants={item}
                className="mt-3 max-w-lg text-base leading-relaxed text-theme-text-muted sm:text-lg"
              >
                <span className="font-semibold text-theme-text">Handshake</span>
                {" — "}People vouch for people. Your reputation stays with you—not locked in one app.
              </motion.p>
              <motion.div variants={item} className="mt-5 flex flex-wrap items-center gap-3 sm:gap-4">
                <Link to="/app">
                  <GlowButton
                    variant="primary"
                    className="inline-flex items-center gap-2 !rounded-full px-6 py-3 text-base"
                  >
                    Get started
                    <ArrowRight className="h-4 w-4" />
                  </GlowButton>
                </Link>
                <a
                  href="https://app.cg/c/OhanaDao/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-theme-accent transition-opacity hover:opacity-90"
                >
                  Community
                  <ExternalLink className="h-4 w-4 shrink-0" />
                </a>
              </motion.div>
            </div>
            <motion.div
              variants={item}
              className="relative flex shrink-0 items-center justify-center lg:ml-8"
            >
              {logoSrc && (
                <>
                  <motion.div
                    animate={{ scale: [1, 1.03, 1], opacity: [0.5, 0.8, 0.5] }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="absolute inset-0 rounded-full bg-theme-accent/20 blur-2xl"
                  />
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                    className="relative flex h-44 w-44 items-center justify-center rounded-3xl border border-theme-border bg-theme-surface-strong shadow-[0_22px_56px_-18px_rgba(15,23,42,0.14),0_8px_24px_-12px_rgba(15,23,42,0.08)] sm:h-52 sm:w-52 md:h-60 md:w-60 dark:shadow-[0_22px_56px_-18px_rgba(0,0,0,0.45),0_8px_24px_-12px_rgba(0,0,0,0.35)]"
                  >
                    <img
                      src={logoSrc}
                      alt="Handshake logo"
                      className="h-28 w-28 sm:h-32 sm:w-32 md:h-40 md:w-40"
                      decoding="async"
                    />
                  </motion.div>
                </>
              )}
            </motion.div>
          </div>
        </motion.section>

        {/* What is Handshake */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4 rounded-2xl border border-theme-border bg-theme-surface px-4 py-8 sm:px-8 sm:py-10 md:px-10"
        >
          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="text-balance text-center text-xl font-bold tracking-tight text-theme-text sm:text-2xl md:text-3xl"
          >
            What is Handshake?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            className="text-center text-base font-medium leading-snug text-theme-accent sm:text-lg"
          >
            Verifiable vouches you own.
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="mx-auto max-w-2xl text-center text-base leading-relaxed text-theme-text-muted content-safe"
          >
            Someone vouches for you; you accept. That proof is public and moves with your wallet—not one company’s
            database.
          </motion.p>
        </motion.section>

        {/* Use Cases */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          <h2 className="text-balance text-xl font-bold tracking-tight text-theme-text sm:text-2xl md:text-3xl">
            Use cases
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {[
              {
                icon: CheckCircle,
                title: "Proof of humanity",
                desc: "Show you’re a real person, backed by people who know you.",
              },
              {
                icon: Zap,
                title: "Portable trust",
                desc: "Take your vouches across apps and networks.",
              },
              {
                icon: Bot,
                title: "Agents & bots",
                desc: "Tag AI or bot accounts clearly when needed.",
              },
              {
                icon: Users,
                title: "Communities",
                desc: "Events, DAOs, and groups can recognize members.",
              },
              {
                icon: Shield,
                title: "Universal Profile",
                desc: "Show counts on your LUKSO profile and grid.",
              },
              {
                icon: Globe,
                title: "Real-world trust",
                desc: "Bring offline reputation on-chain.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="min-w-0 rounded-xl border border-theme-border bg-theme-surface p-4 transition-colors hover:border-theme-accent/30 sm:p-5"
              >
                <Icon className="mb-2 h-5 w-5 shrink-0 text-theme-accent" />
                <h3 className="text-sm font-semibold text-theme-text sm:text-base">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-theme-text-muted content-safe">{desc}</p>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32 }}
          className="space-y-4"
        >
          <LuksoActivitySection />
        </motion.section>

        {/* Social Human Verification */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="relative overflow-hidden rounded-2xl border border-theme-accent/30 p-5 sm:p-8 md:p-10"
        >
          <div
            className="pointer-events-none absolute inset-0 bg-theme-accent/10"
            aria-hidden
          />
          <div className="relative content-safe">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="flex flex-col items-center justify-center gap-2 sm:flex-row"
          >
            <CheckCircle className="h-7 w-7 shrink-0 text-theme-accent" />
            <h2 className="text-balance text-center text-xl font-bold tracking-tight text-theme-text sm:text-2xl md:text-3xl">
              Human verification
            </h2>
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="mx-auto mt-4 max-w-2xl text-center text-base leading-relaxed text-theme-text"
          >
            Real people vouch for each other. You choose what shows on your profile. No single company owns the list.
          </motion.p>
          <motion.ul
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.08, delayChildren: 0.6 } },
            }}
            className="mx-auto mt-4 max-w-2xl space-y-2.5 text-sm leading-relaxed text-theme-text-muted sm:text-base"
          >
            {[
              "Vouches from people you know",
              "You accept or decline what appears",
              "Proof is public",
            ].map((text, i) => (
              <motion.li
                key={i}
                variants={{ hidden: { opacity: 0, x: -8 }, visible: { opacity: 1, x: 0 } }}
                className="flex items-start gap-2"
              >
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-theme-accent" />
                {text}
              </motion.li>
            ))}
          </motion.ul>
          </div>
        </motion.section>

        {/* How it works */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="space-y-4"
        >
          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="text-balance text-center text-xl font-bold tracking-tight text-theme-text sm:text-2xl md:text-3xl"
          >
            How it works
          </motion.h2>
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.12, delayChildren: 0.6 } },
            }}
            className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:justify-between sm:gap-3"
          >
            <motion.div
              variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
              className="min-w-0 flex-1 rounded-xl border border-theme-border bg-theme-surface p-4 sm:p-5"
            >
              <span className="text-sm font-medium text-theme-accent">1. Vouch</span>
              <p className="mt-2 text-sm leading-relaxed text-theme-text-muted content-safe">
                Someone sends you a vouch (human or agent).
              </p>
            </motion.div>
            <motion.span
              variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
              className="hidden self-center text-theme-text-muted sm:inline"
            >
              →
            </motion.span>
            <motion.div
              variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
              className="min-w-0 flex-1 rounded-xl border border-theme-border bg-theme-surface p-4 sm:p-5"
            >
              <span className="text-sm font-medium text-theme-accent">2. Accept</span>
              <p className="mt-2 text-sm leading-relaxed text-theme-text-muted content-safe">
                You choose what appears on your profile.
              </p>
            </motion.div>
            <motion.span
              variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
              className="hidden self-center text-theme-text-muted sm:inline"
            >
              →
            </motion.span>
            <motion.div
              variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
              className="min-w-0 flex-1 rounded-xl border border-theme-border bg-theme-surface p-4 sm:p-5"
            >
              <span className="text-sm font-medium text-theme-accent">3. Show on UP</span>
              <p className="mt-2 text-sm leading-relaxed text-theme-text-muted content-safe">
                Optional: display on your Universal Profile.
              </p>
            </motion.div>
          </motion.div>
        </motion.section>

        {/* Network graph — global view; ego graph on /profile/:address */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
        >
          <Link
            to="/vouch-graph"
            className="group block overflow-hidden rounded-2xl border border-theme-border bg-theme-surface transition-all duration-300 hover:border-theme-accent/40 hover:shadow-lg hover:shadow-theme-accent/5"
          >
            <div className="relative flex min-w-0 flex-col gap-6 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-8 md:p-10">
              <div
                className="pointer-events-none absolute right-0 top-0 h-32 w-48 opacity-[0.06] sm:opacity-[0.08]"
                style={{
                  backgroundImage: `radial-gradient(circle at 70% 30%, var(--theme-accent) 0%, transparent 60%)`,
                }}
              />
              <div className="relative min-w-0 flex-1 content-safe">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-theme-accent/30 bg-theme-accent-soft/50 px-3 py-1 text-xs font-medium text-theme-accent">
                  <Network className="h-3.5 w-3.5 shrink-0" />
                  Interactive
                </div>
                <h2 className="text-balance text-lg font-bold tracking-tight text-theme-text sm:text-xl md:text-2xl">
                  Explore the network
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-theme-text-muted sm:text-base">
                  A 3D map of vouches. Open any profile to zoom in on one person.
                </p>
                <span className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-theme-accent transition-colors group-hover:gap-3">
                  Open graph
                  <ArrowRight className="h-4 w-4 shrink-0" />
                </span>
              </div>
              <div className="relative flex shrink-0 items-center justify-center">
                <div className="flex h-24 w-24 items-center justify-center rounded-xl border border-theme-accent/20 bg-theme-accent-soft/30 transition-colors group-hover:border-theme-accent/40 group-hover:bg-theme-accent-soft/50 sm:h-28 sm:w-28">
                  <Network className="h-12 w-12 text-theme-accent/80 sm:h-14 sm:w-14" />
                </div>
              </div>
            </div>
          </Link>
        </motion.section>

        {/* What is a Universal Profile — after network explorer */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          aria-labelledby="up-heading"
          className="space-y-4 rounded-2xl border border-theme-border bg-theme-surface px-4 py-8 sm:px-8 sm:py-10 md:px-10"
        >
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-theme-accent/25 bg-theme-accent-soft/40 sm:h-12 sm:w-12">
              <UserCircle className="h-6 w-6 text-theme-accent sm:h-7 sm:w-7" aria-hidden />
            </div>
            <h2
              id="up-heading"
              className="text-balance text-center text-xl font-bold tracking-tight text-theme-text sm:text-left md:text-3xl"
            >
              Universal Profile?
            </h2>
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mx-auto max-w-2xl text-center text-base leading-relaxed text-theme-text-muted content-safe"
          >
            A <strong className="font-semibold text-theme-text">UP</strong> is your public profile on LUKSO—name,
            photo, links, and apps in one place you control.
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mx-auto max-w-2xl text-center text-base leading-relaxed text-theme-text-muted content-safe"
          >
            Connect Handshake so your vouches show next to your identity.
          </motion.p>
          <motion.ul
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.06, delayChildren: 0.22 } },
            }}
            className="mx-auto max-w-2xl space-y-2 text-left text-sm text-theme-text-muted sm:text-base"
          >
            {[
              "One profile address for your public info.",
              "Link extra wallets so all your vouches match.",
            ].map((text, i) => (
              <motion.li
                key={i}
                variants={{ hidden: { opacity: 0, x: -6 }, visible: { opacity: 1, x: 0 } }}
                className="flex items-start gap-2.5"
              >
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-theme-accent" aria-hidden />
                <span className="content-safe">{text}</span>
              </motion.li>
            ))}
          </motion.ul>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.28 }}
            className="flex flex-col items-center justify-center gap-2 pt-1 sm:flex-row sm:gap-6"
          >
            <Link
              to={
                wallet.accounts[0]
                  ? `/profile/${wallet.accounts[0]}#link-wallets`
                  : "/app"
              }
              className="inline-flex items-center gap-1.5 text-sm font-medium text-theme-accent transition-colors hover:underline"
            >
              Link wallets
              <ArrowRight className="h-4 w-4 shrink-0" />
            </Link>
            <a
              href="https://lukso.network/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-theme-text-muted transition-colors hover:text-theme-accent"
            >
              About LUKSO
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            </a>
          </motion.div>
        </motion.section>

        {/* Final CTA */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col items-center justify-center rounded-2xl border border-theme-border bg-theme-surface px-4 py-12 text-center sm:py-14 md:py-16"
        >
          <h2 className="text-balance text-lg font-bold tracking-tight text-theme-text sm:text-xl md:text-2xl">
            Start with a wallet
          </h2>
          <p className="mt-2 max-w-md text-sm text-theme-text-muted sm:text-base">
            Connect, then vouch or get vouched.
          </p>
          <Link to="/app" className="mt-6">
            <GlowButton variant="primary" className="inline-flex min-h-[44px] items-center gap-2 px-6">
              Get started
              <ArrowRight className="h-4 w-4 shrink-0" />
            </GlowButton>
          </Link>
          <p className="mt-5 max-w-sm text-center text-sm text-theme-text-muted content-safe">
            New to Universal Profiles?{" "}
            <a
              href="https://universalprofile.cloud/create"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-theme-accent hover:underline"
            >
              Create one
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            </a>
          </p>
        </motion.section>
      </motion.div>
    </AppLayout>
  );
}
