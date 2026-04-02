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
      <div className="mx-auto min-w-0 max-w-2xl space-y-8 px-3 py-6 sm:space-y-10 sm:px-4 sm:py-8 md:px-6">
        <Link
          to="/app"
          className="inline-flex items-center gap-2 text-sm text-theme-text-muted transition-colors hover:text-theme-text"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to App
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <h1 className="text-balance text-3xl font-bold text-theme-text">What is Ohana Handshake?</h1>
          <p className="text-lg leading-relaxed text-theme-text-muted content-safe">
            A simple trust layer for people, bots, and agents: you vouch, they accept or decline, and accepted vouches become a public count anyone can verify.
          </p>

          <div className="space-y-4">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-theme-text">
              <Handshake className="h-5 w-5 text-theme-accent" />
              How it works
            </h2>
            <ul className="space-y-2 text-theme-text-muted content-safe">
              <li><strong className="text-theme-text">Vouch</strong> — Support someone; choose Agent/Bot or Human.</li>
              <li><strong className="text-theme-text">Accept or deny</strong> — They approve or reject your request.</li>
              <li><strong className="text-theme-text">Count</strong> — Accepted vouches add to their public total.</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-theme-text">
              <Users className="h-5 w-5 text-theme-accent" />
              What you can do
            </h2>
            <ul className="space-y-2 text-theme-text-muted content-safe">
              <li>Vouch, accept or deny, hide or revoke pending vouches</li>
              <li>Optional ERC-8004 publish for Agent/Bot vouches</li>
              <li>Show your count on a Universal Profile (LUKSO)</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-theme-text">
              <Shield className="h-5 w-5 text-theme-accent" />
              Why it matters
            </h2>
            <p className="text-theme-text-muted content-safe">
              Many addresses are easy to spin up; Handshake gives a verifiable track record on-chain — no central gatekeeper.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-theme-text">
              <Share2 className="h-5 w-5 text-theme-accent" />
              Categories
            </h2>
            <p className="text-theme-text-muted content-safe">
              Pick <strong className="text-theme-text">Agent/Bot</strong> or <strong className="text-theme-text">Human</strong>. Both add to the same total; Agent/Bot can publish to ERC-8004.
            </p>
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
