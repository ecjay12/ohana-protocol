/**
 * Terms of Service — By connecting your wallet, you agree to these terms.
 */

import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, FileText } from "lucide-react";
import { AppLayout } from "@/layout/AppLayout";
import { useInjectedWallet } from "@/hooks/useInjectedWallet";
import { useProfileData } from "@/hooks/useProfileData";

export function TermsPage() {
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
      <div className="mx-auto max-w-2xl space-y-8 px-3 py-6 sm:space-y-10 sm:px-4 sm:py-8 md:px-6">
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
          className="space-y-8"
        >
          <h1 className="flex items-center gap-2 text-3xl font-bold text-theme-text">
            <FileText className="h-8 w-8 text-theme-accent" />
            Terms of Service
          </h1>
          <p className="text-theme-text-muted">
            Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-theme-text">1. Acceptance of Terms</h2>
            <p className="text-theme-text-muted">
              By connecting your wallet to Ohana Handshake, you agree to be bound by these Terms of Service. If you do not agree, do not connect your wallet or use the service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-theme-text">2. Description of Service</h2>
            <p className="text-theme-text-muted">
              Ohana Handshake is a decentralized vouch protocol that allows users to vouch for others, accept or deny vouches, and build on-chain reputation. The interface provides access to smart contracts deployed on supported networks. We do not custody your assets or control your wallet.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-theme-text">3. No Warranty; As-Is</h2>
            <p className="text-theme-text-muted">
              The service is provided &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; without warranties of any kind, express or implied. We disclaim all warranties including merchantability, fitness for a particular purpose, and non-infringement.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-theme-text">4. Assumption of Risk</h2>
            <p className="text-theme-text-muted">
              You use the service at your own risk. You acknowledge risks including but not limited to: loss of funds, smart contract bugs, network failures, unauthorized access, and third-party actions. You are solely responsible for your use of the protocol and any transactions you initiate.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-theme-text">5. Limitation of Liability</h2>
            <p className="text-theme-text-muted">
              To the maximum extent permitted by law, Ohana Protocol and its affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, data, or funds arising from your use of the service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-theme-text">6. Contact</h2>
            <p className="text-theme-text-muted">
              For questions about these terms, visit{" "}
              <a
                href="https://theohanaprotocol.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-theme-accent hover:underline"
              >
                theohanaprotocol.com
              </a>
              .
            </p>
          </section>
        </motion.div>
      </div>
    </AppLayout>
  );
}
