/**
 * Home page — landing page explaining Handshake, use cases, and proof of humanity.
 */

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
import { useProfileData } from "@/hooks/useProfileData";
import { GlowButton } from "@/components/GlowButton";
import { useTheme } from "@/contexts/ThemeContext";
import { THEME_LOGOS } from "@/config/themeLogos";

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

  return (
    <AppLayout
      chainId={wallet.chainId}
      chains={wallet.chains as Record<number, { name: string; rpc: string }>}
      shortAddress={wallet.accounts[0] ? `${wallet.accounts[0].slice(0, 6)}…${wallet.accounts[0].slice(-4)}` : ""}
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
        className="mx-auto max-w-6xl space-y-12 px-4 py-8 sm:space-y-16 sm:px-6 sm:py-14 md:px-8 md:py-16"
      >
        {/* Hero — large, professional section */}
        <motion.section
          variants={container}
          initial="hidden"
          animate="visible"
          aria-labelledby="hero-heading"
          className="relative overflow-hidden rounded-2xl border border-theme-border bg-theme-surface px-6 py-16 sm:px-10 sm:py-20 md:px-16 md:py-24 lg:px-20 lg:py-28"
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: `
                radial-gradient(circle at 20% 50%, var(--theme-accent) 0%, transparent 50%),
                radial-gradient(circle at 80% 80%, var(--theme-accent) 0%, transparent 40%)
              `,
            }}
          />
          <div className="relative flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between lg:gap-16">
            <div className="flex-1 lg:max-w-xl">
              <motion.div
                variants={item}
                className="mb-5 inline-flex items-center gap-2 rounded-full border border-theme-border bg-theme-surface-strong px-4 py-2 text-xs font-medium uppercase tracking-wider text-theme-text-muted"
              >
                <Shield className="h-3.5 w-3.5" />
                On-chain trust layer
              </motion.div>
              <motion.h1
                id="hero-heading"
                variants={item}
                className="text-3xl font-bold tracking-tight text-theme-text sm:text-4xl md:text-5xl lg:text-6xl"
              >
                Handshake.
              </motion.h1>
              <motion.p
                variants={item}
                className="mt-6 max-w-lg text-base leading-relaxed text-theme-text-muted sm:text-lg md:text-xl md:leading-relaxed"
              >
                Social proof that travels with your identity. Get vouched by real people, build verifiable trust, and
                prove you&apos;re human.
              </motion.p>
              <motion.div variants={item} className="mt-10 flex flex-wrap items-center gap-4">
                <Link to="/app">
                  <GlowButton variant="primary" className="inline-flex items-center gap-2 px-6 py-3 text-base">
                    Get started
                    <ArrowRight className="h-4 w-4" />
                  </GlowButton>
                </Link>
                <a
                  href="https://app.cg/c/OhanaDao/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-theme-text-muted transition-colors hover:text-theme-accent"
                >
                  Join our community
                  <ExternalLink className="h-4 w-4" />
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
                    className="relative flex h-44 w-44 items-center justify-center rounded-2xl border border-theme-border bg-theme-surface-strong shadow-lg sm:h-52 sm:w-52 md:h-60 md:w-60"
                  >
                    <img src={logoSrc} alt="Handshake logo" className="h-28 w-28 sm:h-32 sm:w-32 md:h-40 md:w-40" />
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
          className="space-y-5 rounded-2xl border border-theme-border bg-theme-surface px-6 py-10 md:px-10 md:py-12"
        >
          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="text-center text-2xl font-bold tracking-tight text-theme-text md:text-3xl"
          >
            What is Handshake?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            className="text-center text-lg font-medium leading-relaxed text-theme-accent md:text-xl"
          >
            Build, earn, and carry your real on-chain reputation across Web3.
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="mx-auto max-w-2xl text-center text-lg leading-relaxed text-theme-text-muted md:text-[1.0625rem]"
          >
            Handshake is an on-chain vouch protocol. When someone vouches for you and you accept, that becomes
            verifiable social proof tied to your wallet. Your reputation is portable and not controlled by any single
            platform.
          </motion.p>
        </motion.section>

        {/* What is a Universal Profile */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          aria-labelledby="up-heading"
          className="space-y-5 rounded-2xl border border-theme-border bg-theme-surface px-6 py-10 md:px-10 md:py-12"
        >
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
            className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-theme-accent/25 bg-theme-accent-soft/40">
              <UserCircle className="h-7 w-7 text-theme-accent" aria-hidden />
            </div>
            <h2
              id="up-heading"
              className="text-center text-2xl font-bold tracking-tight text-theme-text sm:text-left md:text-3xl"
            >
              What is a Universal Profile?
            </h2>
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32 }}
            className="mx-auto max-w-2xl text-center text-lg leading-relaxed text-theme-text-muted md:text-[1.0625rem]"
          >
            A{" "}
            <strong className="font-semibold text-theme-text">Universal Profile (UP)</strong> is a smart-contract
            account on LUKSO—not just a keypair. It holds your identity metadata (name, images, links), can receive
            assets, and is designed to be your portable Web3 profile.
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38 }}
            className="mx-auto max-w-2xl text-center text-lg leading-relaxed text-theme-text-muted md:text-[1.0625rem]"
          >
            Handshake vouches are on-chain proof of trust. You can connect them to your UP so reputation shows where
            your profile lives—without giving any single app custody of your identity.
          </motion.p>
          <motion.ul
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.06, delayChildren: 0.42 } },
            }}
            className="mx-auto max-w-2xl space-y-2.5 text-left text-base text-theme-text-muted md:text-[1.0625rem]"
          >
            {[
              "One contract address represents you; metadata follows open LUKSO standards (e.g. LSP3/LSP4).",
              "Use the Universal Profile extension or a compatible wallet to interact.",
              "Optional: link EOAs and show Handshake activity alongside your UP.",
            ].map((text, i) => (
              <motion.li
                key={i}
                variants={{ hidden: { opacity: 0, x: -6 }, visible: { opacity: 1, x: 0 } }}
                className="flex items-start gap-2.5"
              >
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-theme-accent" aria-hidden />
                <span>{text}</span>
              </motion.li>
            ))}
          </motion.ul>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row sm:gap-6"
          >
            <Link
              to="/up-identity"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-theme-accent transition-colors hover:underline"
            >
              UP identity in Handshake
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="https://docs.lukso.tech/learn/universal-profile/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-theme-text-muted transition-colors hover:text-theme-accent"
            >
              Learn on LUKSO docs
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </motion.div>
        </motion.section>

        {/* Use Cases */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-5"
        >
          <h2 className="text-2xl font-bold tracking-tight text-theme-text md:text-3xl">Use cases</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: CheckCircle,
                title: "Proof of humanity",
                desc: "Social vouches from verified humans; distinguish real people from bots and sybils.",
              },
              {
                icon: Zap,
                title: "Reputation portability",
                desc: "Carry vouches across apps and chains. Your trust follows you.",
              },
              {
                icon: Bot,
                title: "AI/Agent verification",
                desc: "Agent/Bot category for AI agents; publish to ERC-8004 for agent reputation.",
              },
              {
                icon: Users,
                title: "Community trust",
                desc: "DAOs, events, and communities can use vouches for access or roles.",
              },
              {
                icon: Shield,
                title: "Universal Profile integration",
                desc: "Show vouch count on LUKSO profiles and in LUKSO Grid.",
              },
              {
                icon: Globe,
                title: "IRL reputation onchain",
                desc: "Bring your real-world reputation on-chain. Trust from IRL communities becomes verifiable and portable.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-xl border border-theme-border bg-theme-surface p-5 transition-colors hover:border-theme-accent/30"
              >
                <Icon className="mb-3 h-5 w-5 text-theme-accent" />
                <h3 className="font-semibold text-theme-text md:text-base">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-theme-text-muted">{desc}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Social Human Verification */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="relative overflow-hidden rounded-2xl border border-theme-accent/30 p-6 md:p-10"
        >
          <div
            className="pointer-events-none absolute inset-0 bg-theme-accent/10"
            aria-hidden
          />
          <div className="relative">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="flex items-center justify-center gap-2"
          >
            <CheckCircle className="h-7 w-7 text-theme-accent" />
            <h2 className="text-center text-2xl font-bold tracking-tight text-theme-text md:text-3xl">
              Social human verification
            </h2>
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="mx-auto mt-5 max-w-2xl text-center text-lg leading-relaxed text-theme-text"
          >
            Handshake supports proof of humanity by letting real people vouch for each other. Only you decide which
            vouches appear on your profile. Everything is on-chain and verifiable — no single company controls it.
          </motion.p>
          <motion.ul
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.08, delayChildren: 0.6 } },
            }}
            className="mx-auto mt-5 max-w-2xl space-y-3 text-theme-text-muted"
          >
            {[
              "Human vouches from real people you know",
              "Accept/deny flow so only the target controls what appears",
              "On-chain, verifiable, and not controlled by a single company",
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
          className="space-y-5"
        >
          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="text-center text-2xl font-bold tracking-tight text-theme-text md:text-3xl"
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
            className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <motion.div
              variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
              className="flex-1 rounded-xl border border-theme-border bg-theme-surface p-5"
            >
              <span className="text-sm font-medium text-theme-accent">1. Vouch</span>
              <p className="mt-2 text-theme-text-muted leading-relaxed">Someone vouches for you, choosing Human or Agent/Bot.</p>
            </motion.div>
            <motion.span
              variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
              className="hidden sm:inline text-theme-text-muted"
            >
              →
            </motion.span>
            <motion.div
              variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
              className="flex-1 rounded-xl border border-theme-border bg-theme-surface p-5"
            >
              <span className="text-sm font-medium text-theme-accent">2. Accept or deny</span>
              <p className="mt-2 text-theme-text-muted leading-relaxed">You decide which vouches appear on your profile.</p>
            </motion.div>
            <motion.span
              variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
              className="hidden sm:inline text-theme-text-muted"
            >
              →
            </motion.span>
            <motion.div
              variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
              className="flex-1 rounded-xl border border-theme-border bg-theme-surface p-5"
            >
              <span className="text-sm font-medium text-theme-accent">3. Add vouches to your UP</span>
              <p className="mt-2 text-theme-text-muted leading-relaxed">Accepted vouches appear on your Universal Profile as verifiable on-chain reputation.</p>
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
            <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8 md:p-10">
              <div
                className="pointer-events-none absolute right-0 top-0 h-32 w-48 opacity-[0.06] sm:opacity-[0.08]"
                style={{
                  backgroundImage: `radial-gradient(circle at 70% 30%, var(--theme-accent) 0%, transparent 60%)`,
                }}
              />
              <div className="relative flex-1">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-theme-accent/30 bg-theme-accent-soft/50 px-3 py-1 text-xs font-medium text-theme-accent">
                  <Network className="h-3.5 w-3.5" />
                  Interactive
                </div>
                <h2 className="text-xl font-bold tracking-tight text-theme-text sm:text-2xl">
                  Explore the Handshake network
                </h2>
                <p className="mt-2 max-w-xl text-base leading-relaxed text-theme-text-muted">
                  Open a <strong className="font-medium text-theme-text">global</strong> 3D graph of
                  vouch activity on the chain. Visit any profile to see an{" "}
                  <strong className="font-medium text-theme-text">ego</strong> graph centered on
                  that identity.
                </p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-theme-accent transition-colors group-hover:gap-3">
                  Open network graph
                  <ArrowRight className="h-4 w-4" />
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

        {/* Final CTA */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col items-center justify-center rounded-2xl border border-theme-border bg-theme-surface py-14 text-center md:py-16"
        >
          <h2 className="text-xl font-bold tracking-tight text-theme-text md:text-2xl">Ready to build your reputation?</h2>
          <p className="mt-3 text-base text-theme-text-muted md:text-lg">Connect your wallet and start vouching.</p>
          <Link to="/app" className="mt-6">
            <GlowButton variant="primary" className="inline-flex items-center gap-2">
              Get started
              <ArrowRight className="h-4 w-4" />
            </GlowButton>
          </Link>
          <p className="mt-6 text-sm text-theme-text-muted">
            Don&apos;t have a Universal Profile?{" "}
            <a
              href="https://universalprofile.cloud/create"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-theme-accent hover:underline"
            >
              Get a UP today
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </p>
        </motion.section>
      </motion.div>
    </AppLayout>
  );
}
