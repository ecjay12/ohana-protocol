/**
 * About page — plain-language explanation of what Ohana Handshake does.
 */

import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Handshake, Users, Shield, Share2 } from "lucide-react";
import { AppLayout } from "@/layout/AppLayout";
import { useInjectedWallet } from "@/hooks/useInjectedWallet";
import { useProfileData } from "@/hooks/useProfileData";

export function AboutPage() {
  const wallet = useInjectedWallet();
  const { profileData: userProfileData, isUP: userIsUP } = useProfileData(
    wallet.provider,
    wallet.accounts[0] ?? null,
    wallet.chainId
  );

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
      userIsUP={userIsUP}
      onConnect={wallet.connect}
      onConnectWith={wallet.connectWith}
      onSwitchChain={wallet.switchChain}
      onDisconnect={wallet.disconnect}
    >
      <div className="mx-auto max-w-2xl space-y-10 px-4 py-8 md:px-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-theme-text-muted transition-colors hover:text-theme-text"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <h1 className="text-3xl font-bold text-theme-text">What is Ohana Handshake?</h1>
          <p className="text-lg text-theme-text-muted">
            Ohana Handshake is a simple way to build trust for any identity — people, bots, or AI agents. You vouch for someone, they accept or deny, and accepted vouches become a public reputation count anyone can check.
          </p>

          <div className="space-y-4">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-theme-text">
              <Handshake className="h-5 w-5 text-theme-accent" />
              How it works
            </h2>
            <ul className="space-y-2 text-theme-text-muted">
              <li><strong className="text-theme-text">Vouch</strong> — You support someone by vouching for them. You pick a category: Agent/Bot (for AI or bots) or Human.</li>
              <li><strong className="text-theme-text">Accept or deny</strong> — The person you vouched for sees your request and can accept or deny it.</li>
              <li><strong className="text-theme-text">Reputation</strong> — Accepted vouches count toward their reputation. Anyone can see how many vouches someone has.</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-theme-text">
              <Users className="h-5 w-5 text-theme-accent" />
              What you can do
            </h2>
            <ul className="space-y-2 text-theme-text-muted">
              <li>Vouch for others (people, bots, or agents)</li>
              <li>Accept or deny vouches sent to you</li>
              <li>Hide vouches you don&apos;t want on your profile</li>
              <li>Revoke a vouch you gave (if it&apos;s still pending)</li>
              <li>Publish Agent/Bot vouches to ERC-8004 (for AI agent reputation)</li>
              <li>Add your vouch count to your Universal Profile (on LUKSO)</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-theme-text">
              <Shield className="h-5 w-5 text-theme-accent" />
              Why it matters
            </h2>
            <p className="text-theme-text-muted">
              In Web3, anyone can create many addresses. Handshake lets real people and projects build a verifiable track record. Your vouch count is stored on a public ledger — no company controls it, and it can&apos;t be faked.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-theme-text">
              <Share2 className="h-5 w-5 text-theme-accent" />
              Categories
            </h2>
            <p className="text-theme-text-muted">
              When you vouch, you choose <strong className="text-theme-text">Agent/Bot</strong> or <strong className="text-theme-text">Human</strong>. Agent/Bot vouches can be published to ERC-8004, a standard for AI agent reputation. Human vouches are for people. Both count toward the same reputation total.
            </p>
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
