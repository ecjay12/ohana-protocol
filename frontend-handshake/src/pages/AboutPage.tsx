/**
 * About page — Ohana Protocol, Handshake, and how they fit together.
 */

import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Handshake,
  Users,
  Shield,
  Share2,
  Target,
  ExternalLink,
  Layers,
  MessageCircle,
  ChevronRight,
} from "lucide-react";
import { AppLayout } from "@/layout/AppLayout";
import { useInjectedWallet } from "@/hooks/useInjectedWallet";
import { useWalletDisplayLabel } from "@/hooks/useWalletDisplayLabel";
import { useProfileData } from "@/hooks/useProfileData";

const COMMON_GROUND_URL = "https://app.cg/c/OhanaDao/";

const fade = (delay: number) => ({
  initial: { opacity: 0, y: 10 } as const,
  animate: { opacity: 1, y: 0 } as const,
  transition: { delay },
});

function Section({
  delay,
  children,
  className = "",
}: {
  delay: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.section
      {...fade(delay)}
      className={`rounded-2xl border border-theme-border bg-theme-surface p-5 sm:p-6 ${className}`}
    >
      {children}
    </motion.section>
  );
}

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <h2 className="flex items-center gap-2.5 text-lg font-semibold text-theme-text">
      <Icon className="h-5 w-5 shrink-0 text-theme-accent" aria-hidden />
      {children}
    </h2>
  );
}

export function AboutPage() {
  const wallet = useInjectedWallet();
  const { profileData: userProfileData, isUP: userIsUP, loading: userProfileLoading } =
    useProfileData(wallet.provider, wallet.accounts[0] ?? null, wallet.chainId);
  const walletDisplayLabel = useWalletDisplayLabel(wallet.accounts[0] ?? null);

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
      <div className="mx-auto min-w-0 max-w-2xl space-y-6 px-3 py-6 sm:space-y-8 sm:px-4 sm:py-8 md:px-6">
        <Link
          to="/app"
          className="inline-flex items-center gap-2 text-sm text-theme-text-muted transition-colors hover:text-theme-text"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to App
        </Link>

        {/* ---------- Hero ---------- */}
        <motion.div {...fade(0)} className="space-y-4">
          <h1 className="text-balance text-2xl font-bold text-theme-text sm:text-3xl">
            About Handshake
          </h1>
          <p className="text-lg leading-relaxed text-theme-text-muted content-safe">
            Handshake is the on-chain vouching protocol built by{" "}
            <strong className="text-theme-text">Ohana Protocol</strong> — a
            decentralized social reputation framework for Web3 and AI.
          </p>
        </motion.div>

        {/* ---------- Our Mission ---------- */}
        <Section delay={0.04}>
          <SectionTitle icon={Target}>Our mission</SectionTitle>
          <p className="mt-2 text-sm leading-relaxed text-theme-text-muted content-safe">
            Trust is the foundation of meaningful collaboration. In a world of
            anonymous interactions and increasingly powerful AI agents, verifying
            who you can rely on is one of the biggest challenges in Web3.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-theme-text-muted content-safe">
            Ohana Protocol creates a{" "}
            <strong className="text-theme-text">human-centred, on-chain reputation system</strong>{" "}
            that brings transparency, accountability, and verifiable social proof
            to decentralized ecosystems — so communities can measure and reward
            reputation based on real contributions, not just token holdings.
          </p>
          <ul className="mt-4 space-y-1.5 text-sm text-theme-text-muted content-safe">
            <li className="flex gap-2">
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-theme-accent" />
              Creators and contributors are recognised for their impact
            </li>
            <li className="flex gap-2">
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-theme-accent" />
              Collaboration happens with confidence
            </li>
            <li className="flex gap-2">
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-theme-accent" />
              Positive behaviour is incentivised on-chain
            </li>
            <li className="flex gap-2">
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-theme-accent" />
              AI agents and humans interact with verifiable credibility
            </li>
          </ul>
        </Section>

        {/* ---------- What is Handshake ---------- */}
        <Section delay={0.08}>
          <SectionTitle icon={Handshake}>What is Handshake?</SectionTitle>
          <p className="mt-2 text-sm leading-relaxed text-theme-text-muted content-safe">
            Handshake lets any Universal Profile on{" "}
            <a
              href="https://lukso.network/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-theme-accent hover:underline"
            >
              LUKSO
            </a>{" "}
            (or any wallet on Base) publicly vouch for another creator, developer, or
            community member. Vouches are stored immutably in an on-chain registry
            and become part of each user's reputation graph.
          </p>
          <ul className="mt-3 space-y-2 text-sm text-theme-text-muted content-safe">
            <li>
              <strong className="text-theme-text">Vouch</strong> — Endorse someone
              as <em>Human</em> or <em>Agent/Bot</em>.
            </li>
            <li>
              <strong className="text-theme-text">Accept or deny</strong> — The
              recipient approves or rejects the vouch.
            </li>
            <li>
              <strong className="text-theme-text">Count</strong> — Accepted vouches
              become a permanent, public trust score.
            </li>
            <li>
              <strong className="text-theme-text">Revoke</strong> — Change your mind
              any time; the revocation is recorded on-chain too.
            </li>
          </ul>
          <p className="mt-3 text-sm text-theme-text-muted content-safe">
            Unlike off-chain endorsements, every vouch is transparent, timestamped,
            and permanently recorded — creating a living social trust layer.
          </p>
        </Section>

        {/* ---------- How Handshake Powers Ohana ---------- */}
        <Section delay={0.12}>
          <SectionTitle icon={Layers}>
            How Handshake powers Ohana's reputation framework
          </SectionTitle>
          <ul className="mt-3 space-y-3 text-sm text-theme-text-muted content-safe">
            <li className="flex gap-2">
              <Share2 className="mt-0.5 h-4 w-4 shrink-0 text-theme-accent" />
              <span>
                <strong className="text-theme-text">Social reputation layer</strong>{" "}
                — Vouches add a direct human signal to reputation scores,
                complementing automated metrics.
              </span>
            </li>
            <li className="flex gap-2">
              <Share2 className="mt-0.5 h-4 w-4 shrink-0 text-theme-accent" />
              <span>
                <strong className="text-theme-text">Knowledge graph integration</strong>{" "}
                — Vouch data feeds into Ohana's decentralised knowledge graph for
                advanced discoverability.
              </span>
            </li>
            <li className="flex gap-2">
              <Share2 className="mt-0.5 h-4 w-4 shrink-0 text-theme-accent" />
              <span>
                <strong className="text-theme-text">Custom reputation scoring</strong>{" "}
                — Communities and dApps can weight Handshake vouches in their own
                reputation algorithms.
              </span>
            </li>
            <li className="flex gap-2">
              <Share2 className="mt-0.5 h-4 w-4 shrink-0 text-theme-accent" />
              <span>
                <strong className="text-theme-text">Meritocratic governance</strong>{" "}
                — High-reputation members backed by genuine vouches gain greater
                influence in DAOs and community decisions.
              </span>
            </li>
          </ul>
        </Section>

        {/* ---------- Why It Matters ---------- */}
        <Section delay={0.16}>
          <SectionTitle icon={Shield}>Why it matters</SectionTitle>
          <p className="mt-2 text-sm leading-relaxed text-theme-text-muted content-safe">
            Without centralised gatekeepers, reputation becomes the new currency of
            trust. Handshake + Ohana Protocol together create infrastructure for a
            more accountable, collaborative internet — where your contributions and
            character are permanently recognised on-chain.
          </p>
          <p className="mt-2 text-base font-medium text-theme-text">
            We're building the social fabric of Web3, one honest vouch at a time.
          </p>
        </Section>

        {/* ---------- What You Can Do ---------- */}
        <Section delay={0.2}>
          <SectionTitle icon={Users}>What you can do today</SectionTitle>
          <ul className="mt-3 space-y-2 text-sm text-theme-text-muted content-safe">
            <li className="flex gap-2">
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-theme-accent" />
              Vouch, accept, deny, or revoke — all on-chain
            </li>
            <li className="flex gap-2">
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-theme-accent" />
              Link multiple wallets to one Universal Profile identity
            </li>
            <li className="flex gap-2">
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-theme-accent" />
              Explore the global vouch graph and leaderboard
            </li>
            <li className="flex gap-2">
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-theme-accent" />
              Embed your vouch count as a badge on any site
            </li>
            <li className="flex gap-2">
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-theme-accent" />
              Publish Agent/Bot vouches to ERC-8004
            </li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              to="/app"
              className="inline-flex items-center gap-1.5 rounded-xl border-2 border-theme-accent bg-theme-accent-soft px-4 py-2.5 text-sm font-semibold text-theme-accent shadow-theme-glow transition-shadow duration-200 hover:shadow-theme-hover"
            >
              Open the App
              <ChevronRight className="h-4 w-4" />
            </Link>
            <Link
              to="/help"
              className="inline-flex items-center gap-1.5 rounded-xl border border-theme-border bg-theme-surface-strong px-4 py-2.5 text-sm font-medium text-theme-text transition-colors hover:bg-theme-surface"
            >
              How It Works
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </Section>

        {/* ---------- Community ---------- */}
        <motion.section
          {...fade(0.24)}
          className="rounded-2xl border border-theme-accent/25 bg-theme-accent-soft/30 p-5 sm:p-6"
        >
          <h2 className="flex items-center gap-2 text-lg font-semibold text-theme-text">
            <MessageCircle className="h-5 w-5 text-theme-accent" aria-hidden />
            Join the community
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-theme-text-muted content-safe">
            Questions, ideas, or just want to say hi? Chat with the Ohana community
            on Common Ground.
          </p>
          <a
            href={COMMON_GROUND_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl border-2 border-theme-accent bg-theme-accent-soft px-4 py-3 text-sm font-semibold text-theme-accent shadow-theme-glow transition-shadow duration-200 hover:shadow-theme-hover"
          >
            Open Common Ground
            <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
          </a>
        </motion.section>

        <p className="text-center text-sm text-theme-text-dim">
          <Link to="/help" className="text-theme-accent hover:underline">
            How It Works
          </Link>
          {" · "}
          <Link to="/terms" className="text-theme-accent hover:underline">
            Terms
          </Link>
        </p>
      </div>
    </AppLayout>
  );
}
