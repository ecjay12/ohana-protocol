/**
 * Help / How It Works — comprehensive guide to using Ohana Handshake.
 */
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LifeBuoy,
  ExternalLink,
  MessageCircle,
  ArrowLeft,
  Handshake,
  Wallet,
  Link2,
  UserCircle,
  Shield,
  ChevronRight,
  Globe,
  CheckCircle2,
} from "lucide-react";
import { AppLayout } from "@/layout/AppLayout";
import { useInjectedWallet } from "@/hooks/useInjectedWallet";
import { useWalletDisplayLabel } from "@/hooks/useWalletDisplayLabel";
import { useProfileData } from "@/hooks/useProfileData";

const COMMON_GROUND_URL = "https://app.cg/c/OhanaDao/";

const fade = (delay: number) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
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

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-theme-accent-soft text-sm font-bold text-theme-accent">
        {n}
      </span>
      <div className="min-w-0">
        <p className="font-medium text-theme-text">{title}</p>
        <p className="mt-0.5 text-sm leading-relaxed text-theme-text-muted content-safe">
          {children}
        </p>
      </div>
    </li>
  );
}

export function HelpPage() {
  const wallet = useInjectedWallet();
  const { profileData, isUP, loading } = useProfileData(
    wallet.provider,
    wallet.accounts[0] ?? null,
    wallet.chainId
  );

  const profileLink = wallet.accounts[0]
    ? `/profile/${wallet.accounts[0]}`
    : "/app";
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
      userProfileData={profileData}
      userProfileLoading={loading}
      userIsUP={isUP}
      onConnect={wallet.connect}
      onConnectWith={wallet.connectWith}
      onSwitchChain={wallet.switchChain}
      onDisconnect={wallet.disconnect}
    >
      <div className="mx-auto max-w-2xl space-y-6 px-3 py-8 sm:space-y-8 sm:px-6 sm:py-12 md:py-14">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-theme-text-muted transition-colors hover:text-theme-text"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        {/* ---------- Hero ---------- */}
        <motion.div {...fade(0)} className="space-y-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-theme-accent-soft text-theme-accent sm:h-12 sm:w-12">
              <LifeBuoy className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden />
            </span>
            <h1 className="text-balance text-xl font-bold tracking-tight text-theme-text sm:text-2xl md:text-3xl">
              How It Works
            </h1>
          </div>
          <p className="text-base leading-relaxed text-theme-text-muted content-safe">
            Ohana Handshake is a public trust layer. Vouch for people, bots, or
            agents — accepted vouches become a reputation anyone can verify for themselves.
            No central authority, no middleman.
          </p>
        </motion.div>

        {/* ---------- 1. Getting Started ---------- */}
        <Section delay={0.04}>
          <SectionTitle icon={Wallet}>1. Getting started</SectionTitle>
          <ol className="mt-4 list-none space-y-4">
            <Step n={1} title="Install a wallet">
              Use{" "}
              <a
                href="https://metamask.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-theme-accent hover:underline"
              >
                MetaMask
              </a>{" "}
              (for Base or Ethereum) or the{" "}
              <a
                href="https://chromewebstore.google.com/detail/universal-profiles/abpickdkkbnbcoepogfhkhennhfhehfn"
                target="_blank"
                rel="noopener noreferrer"
                className="text-theme-accent hover:underline"
              >
                Universal Profile app
              </a>{" "}
              (for LUKSO). You can use either with this site.
            </Step>
            <Step n={2} title="Connect your wallet">
              Open the menu and tap <strong className="text-theme-text">Connect</strong>.
              If you have more than one wallet installed, pick the one you want to use.
            </Step>
            <Step n={3} title="Pick the right network">
              Handshake works on <strong className="text-theme-text">LUKSO</strong>,{" "}
              <strong className="text-theme-text">Base</strong>, and their testnets.
              Switch networks inside your wallet — the app will follow automatically.
            </Step>
          </ol>
        </Section>

        {/* ---------- 2. Vouching ---------- */}
        <Section delay={0.08}>
          <SectionTitle icon={Handshake}>2. Vouching for someone</SectionTitle>
          <p className="mt-2 text-sm leading-relaxed text-theme-text-muted content-safe">
            A vouch is a public endorsement that says &quot;I trust this address&quot; — recorded where everyone can see it.
          </p>
          <ol className="mt-4 list-none space-y-4">
            <Step n={1} title="Go to their profile">
              Search for someone or open their profile link (it looks like a normal web address with their ID in it).
              You can also find people on the{" "}
              <Link to="/leaderboard" className="text-theme-accent hover:underline">
                Leaderboard
              </Link>{" "}
              or{" "}
              <Link to="/vouch-graph" className="text-theme-accent hover:underline">
                Vouch Graph
              </Link>.
            </Step>
            <Step n={2} title="Click Vouch">
              The target address is filled in automatically.
              Pick a category —{" "}
              <strong className="text-theme-text">Human</strong> or{" "}
              <strong className="text-theme-text">Agent/Bot</strong>.
            </Step>
            <Step n={3} title="Confirm in your wallet">
              Vouching costs a small fee (shown before you confirm) plus gas.
              After it goes through, your vouch appears on their profile.
            </Step>
          </ol>
          <div className="mt-4 rounded-xl border border-theme-border bg-theme-background/50 px-4 py-3">
            <p className="text-sm text-theme-text-muted content-safe">
              <strong className="text-theme-text">Fees by network:</strong>{" "}
              LUKSO — 0.1 LYX &nbsp;·&nbsp; Base / Ethereum — 0.0009 ETH.
              The exact fee is shown in the app each time you vouch.
            </p>
          </div>
        </Section>

        {/* ---------- 3. Accepting & Managing Vouches ---------- */}
        <Section delay={0.12}>
          <SectionTitle icon={CheckCircle2}>
            3. Accepting &amp; managing vouches
          </SectionTitle>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-theme-text-muted content-safe">
            <li className="flex gap-2">
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-theme-accent" />
              <span>
                <strong className="text-theme-text">Accept</strong> — Approve a
                pending vouch so it counts toward your public total.
              </span>
            </li>
            <li className="flex gap-2">
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-theme-accent" />
              <span>
                <strong className="text-theme-text">Deny</strong> — Reject a vouch
                you don't want associated with your profile.
              </span>
            </li>
            <li className="flex gap-2">
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-theme-accent" />
              <span>
                <strong className="text-theme-text">Revoke</strong> — Take back a
                vouch you previously gave.
              </span>
            </li>
          </ul>
          <p className="mt-3 text-sm text-theme-text-muted content-safe">
            Each action is a normal wallet approval — connect the wallet that sent or received the vouch and confirm the prompt.
          </p>
        </Section>

        {/* ---------- 4. Your Profile ---------- */}
        <Section delay={0.16}>
          <SectionTitle icon={UserCircle}>4. Your profile</SectionTitle>
          <p className="mt-2 text-sm leading-relaxed text-theme-text-muted content-safe">
            Every person has a profile page (same idea as a social link). It shows:
          </p>
          <ul className="mt-3 space-y-1.5 text-sm text-theme-text-muted content-safe">
            <li className="flex gap-2">
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-theme-accent" />
              Total vouches received and given
            </li>
            <li className="flex gap-2">
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-theme-accent" />
              Full vouch history (who, when, category)
            </li>
            <li className="flex gap-2">
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-theme-accent" />
              Connected wallets (if using a Universal Profile)
            </li>
            <li className="flex gap-2">
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-theme-accent" />
              Interactive 3D vouch graph
            </li>
          </ul>
          <Link
            to={profileLink}
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-theme-accent hover:underline"
          >
            Open your profile
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Section>

        {/* ---------- 5. Universal Profile & Linking Wallets ---------- */}
        <Section
          delay={0.2}
          className="border-theme-accent/25 bg-theme-accent-soft/10"
        >
          <SectionTitle icon={Link2}>
            5. Adding wallets to your Universal Profile identity
          </SectionTitle>
          <p className="mt-2 text-sm leading-relaxed text-theme-text-muted content-safe">
            A{" "}
            <a
              href="https://universalprofile.cloud/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-theme-accent hover:underline"
            >
              Universal Profile (UP)
            </a>{" "}
            is your public identity on LUKSO. You can link other wallets you use on any supported network so that
            all your endorsements roll up into one profile page.
          </p>

          <h3 className="mt-5 text-sm font-semibold uppercase tracking-wide text-theme-text">
            Why link wallets?
          </h3>
          <p className="mt-1 text-sm text-theme-text-muted content-safe">
            If you vouch on Base with one wallet and on LUKSO with another,
            linking both to the same UP means your profile shows the combined
            reputation — no need to re-vouch on every chain.
          </p>

          <h3 className="mt-5 text-sm font-semibold uppercase tracking-wide text-theme-text">
            How to link a wallet
          </h3>
          <ol className="mt-3 list-none space-y-4">
            <Step n={1} title="Switch to the wallet you want to link">
              In your wallet app (for example MetaMask), pick the account you want to attach.
              You need to be signed in with that regular wallet — not while signed in only as your Universal Profile.
            </Step>
            <Step n={2} title="Connect that wallet on Handshake">
              If the site still shows your UP, disconnect first, then reconnect
              with the wallet you want to link.
            </Step>
            <Step n={3} title="Switch to LUKSO network">
              Wallet-to-profile linking is completed on LUKSO. If your wallet is on Base or
              another network, switch it to{" "}
              <strong className="text-theme-text">LUKSO</strong> (or LUKSO Testnet) first.
            </Step>
            <Step n={4} title="Go to your profile and scroll to 'Link wallets'">
              Visit{" "}
              <Link
                to={profileLink}
                className="text-theme-accent hover:underline"
              >
                your profile page
              </Link>{" "}
              or the{" "}
              <Link
                to="/up-identity"
                className="text-theme-accent hover:underline"
              >
                Linked wallets
              </Link>{" "}
              page. Paste your Universal Profile address into the input field.
            </Step>
            <Step n={5} title="Approve the transaction">
              Click <strong className="text-theme-text">Link wallet to UP</strong>{" "}
              and confirm in your wallet.               Once it finishes, the wallet shows in your list and its endorsements count on your Universal Profile page.
            </Step>
          </ol>

          <div className="mt-5 rounded-xl border border-theme-border bg-theme-background/50 px-4 py-3">
            <p className="text-sm text-theme-text-muted content-safe">
              <strong className="text-theme-text">Don't have a Universal Profile?</strong>{" "}
              <a
                href="https://universalprofile.cloud/create"
                target="_blank"
                rel="noopener noreferrer"
                className="text-theme-accent hover:underline"
              >
                Create one on LUKSO
              </a>{" "}
              — it's free and takes about a minute.
            </p>
          </div>
        </Section>

        {/* ---------- 6. Supported Networks ---------- */}
        <Section delay={0.24}>
          <SectionTitle icon={Globe}>6. Supported networks</SectionTitle>
          <div className="mt-3 overflow-hidden rounded-xl border border-theme-border">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-theme-border bg-theme-background/60 text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
                  <th className="px-4 py-2.5">Network</th>
                  <th className="px-4 py-2.5">Vouch fee</th>
                  <th className="px-4 py-2.5">Wallet linking</th>
                </tr>
              </thead>
              <tbody className="text-theme-text">
                <tr className="border-b border-theme-border/60">
                  <td className="px-4 py-2.5 font-medium">LUKSO</td>
                  <td className="px-4 py-2.5 tabular-nums">0.1 LYX</td>
                  <td className="px-4 py-2.5 text-emerald-600 dark:text-emerald-400">Yes</td>
                </tr>
                <tr className="border-b border-theme-border/60">
                  <td className="px-4 py-2.5 font-medium">Base</td>
                  <td className="px-4 py-2.5 tabular-nums">0.0009 ETH</td>
                  <td className="px-4 py-2.5 text-theme-text-muted">Link on LUKSO</td>
                </tr>
                <tr className="border-b border-theme-border/60">
                  <td className="px-4 py-2.5 font-medium">LUKSO Testnet</td>
                  <td className="px-4 py-2.5 tabular-nums">0.1 LYX</td>
                  <td className="px-4 py-2.5 text-emerald-600 dark:text-emerald-400">Yes</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-medium">Base Sepolia</td>
                  <td className="px-4 py-2.5 tabular-nums">0.0009 ETH</td>
                  <td className="px-4 py-2.5 text-theme-text-muted">Link on LUKSO</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-theme-text-dim content-safe">
            Linking a wallet to your profile is always completed on LUKSO or LUKSO Testnet,
            even if that wallet usually lives on Base.
          </p>
        </Section>

        {/* ---------- 7. Security & Trust ---------- */}
        <Section delay={0.28}>
          <SectionTitle icon={Shield}>7. Security &amp; trust</SectionTitle>
          <ul className="mt-3 space-y-2 text-sm text-theme-text-muted content-safe">
            <li className="flex gap-2">
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-theme-accent" />
              <span>
                <strong className="text-theme-text">Public by design</strong> — Every
                vouch and wallet link is recorded where anyone can verify it. We don&apos;t keep a private copy on our servers.
              </span>
            </li>
            <li className="flex gap-2">
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-theme-accent" />
              <span>
                <strong className="text-theme-text">No custody</strong> — Handshake
                never holds your keys or funds. You sign every action in your own
                wallet.
              </span>
            </li>
            <li className="flex gap-2">
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-theme-accent" />
              <span>
                <strong className="text-theme-text">Revocable</strong> — You can
                revoke a vouch or unlink a wallet at any time.
              </span>
            </li>
          </ul>
        </Section>

        {/* ---------- Community ---------- */}
        <motion.section
          {...fade(0.32)}
          className="rounded-2xl border border-theme-accent/25 bg-theme-accent-soft/30 p-6"
        >
          <h2 className="flex items-center gap-2 text-lg font-semibold text-theme-text">
            <MessageCircle className="h-5 w-5 text-theme-accent" aria-hidden />
            Need more help?
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-theme-text-muted content-safe">
            Chat with the Ohana community on Common Ground — we're happy to help.
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
          <Link to="/about" className="text-theme-accent hover:underline">
            About Handshake
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
