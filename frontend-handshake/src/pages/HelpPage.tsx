/**
 * Help & support — plain-language entry point; community on Common Ground.
 */
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { LifeBuoy, ExternalLink, MessageCircle, BookOpen, ArrowLeft } from "lucide-react";
import { AppLayout } from "@/layout/AppLayout";
import { useInjectedWallet } from "@/hooks/useInjectedWallet";
import { useProfileData } from "@/hooks/useProfileData";

const COMMON_GROUND_URL = "https://app.cg/c/OhanaDao/";

export function HelpPage() {
  const wallet = useInjectedWallet();
  const { profileData, isUP, loading } = useProfileData(
    wallet.provider,
    wallet.accounts[0] ?? null,
    wallet.chainId
  );

  return (
    <AppLayout
      chainId={wallet.chainId}
      chains={wallet.chains as Record<number, { name: string; rpc: string }>}
      shortAddress={
        wallet.accounts[0] ? `${wallet.accounts[0].slice(0, 6)}…${wallet.accounts[0].slice(-4)}` : ""
      }
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

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-theme-accent-soft text-theme-accent sm:h-12 sm:w-12">
              <LifeBuoy className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden />
            </span>
            <h1 className="text-balance text-xl font-bold tracking-tight text-theme-text sm:text-2xl md:text-3xl">
              Help &amp; support
            </h1>
          </div>
          <p className="text-base leading-relaxed text-theme-text-muted content-safe">
            Connect a wallet and pick a network. For questions or issues, use Common Ground below.
          </p>
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="rounded-2xl border border-theme-accent/25 bg-theme-accent-soft/30 p-6"
        >
          <h2 className="flex items-center gap-2 text-lg font-semibold text-theme-text">
            <MessageCircle className="h-5 w-5 text-theme-accent" aria-hidden />
            Get help from the community
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-theme-text-muted content-safe">
            Chat with the Ohana community on Common Ground.
          </p>
          <a
            href={COMMON_GROUND_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-theme-accent px-4 py-3 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90"
          >
            Open Common Ground
            <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
          </a>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="space-y-3 rounded-2xl border border-theme-border bg-theme-surface p-6"
        >
          <h2 className="flex items-center gap-2 text-lg font-semibold text-theme-text">
            <BookOpen className="h-5 w-5 text-theme-accent" aria-hidden />
            Quick tips
          </h2>
          <ul className="list-inside list-disc space-y-2 text-sm leading-relaxed text-theme-text-muted content-safe">
            <li>
              <strong className="text-theme-text">Wallet:</strong> Install MetaMask or UP extension,
              then Connect in the menu.
            </li>
            <li>
              <strong className="text-theme-text">Network:</strong> Match the chain you use (e.g. Base
              or LUKSO). Add the network in your wallet if needed.
            </li>
            <li>
              <strong className="text-theme-text">Fees:</strong> Vouching costs a small gas fee—the app
              shows it before you confirm.
            </li>
            <li>
              <strong className="text-theme-text">Universal Profile:</strong>{" "}
              <a
                href="https://lukso.network/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-theme-accent underline-offset-2 hover:underline"
              >
                LUKSO
              </a>
              {" · "}
              <Link to="/up-identity" className="text-theme-accent underline-offset-2 hover:underline">
                Link wallets
              </Link>
            </li>
          </ul>
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
