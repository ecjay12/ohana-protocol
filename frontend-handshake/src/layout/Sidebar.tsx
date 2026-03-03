import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, LogOut, User, BookOpen, Info, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { HANDSHAKE_CHAIN_IDS } from "@/config/contracts";
import { GlowButton } from "@/components/GlowButton";
import { ProfileHeader } from "@/components/ProfileHeader";
import { LookUpProfileCard } from "@/components/LookUpProfileCard";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import type { WalletOption } from "@/hooks/useInjectedWallet";
import type { ProfileData } from "@/lib/lsp4Profile";

interface SidebarProps {
  chainId: number;
  chains: Record<number, { name: string; rpc: string }>;
  shortAddress: string;
  account?: string;
  isConnected: boolean;
  hasInjected: boolean;
  availableWallets: WalletOption[];
  walletError: string | null;
  userProfileData?: ProfileData | null;
  userIsUP?: boolean;
  onConnect: () => void;
  onConnectWith: (wallet: WalletOption) => void;
  onSwitchChain: (chainId: number) => void;
  onDisconnect: () => void;
  /** When set, sidebar is shown as overlay on mobile; call to close drawer. */
  mobileOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({
  chainId,
  chains,
  shortAddress,
  account,
  isConnected,
  hasInjected,
  availableWallets,
  walletError,
  userProfileData,
  userIsUP: _userIsUP,
  onConnect,
  onConnectWith,
  onSwitchChain,
  onDisconnect,
  mobileOpen = false,
  onClose,
}: SidebarProps) {
  const navigate = useNavigate();

  useEffect(() => {
    if (mobileOpen && typeof document !== "undefined") {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [mobileOpen]);

  const navLinkClass = "flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-theme-text-muted transition-colors hover:bg-theme-surface hover:text-theme-text";
  const handleNavClick = () => onClose?.();
  const profileBlock = (
    <div className="space-y-3 border-b border-theme-border p-3">
      <div className="text-xs font-medium text-theme-dim">Network</div>
      <div className="flex flex-wrap gap-2">
        {HANDSHAKE_CHAIN_IDS.map((id) => {
          const name = chains[id]?.name ?? `Chain ${id}`;
          const isActive = chainId === id;
          return (
            <motion.button
              key={id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSwitchChain(id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? "border border-theme-accent bg-theme-accent-soft text-theme-accent"
                  : "bg-theme-surface text-theme-text-muted hover:bg-theme-surface-strong hover:text-theme-text"
              }`}
            >
              {name.length > 12 ? name.slice(0, 10) + "…" : name}
            </motion.button>
          );
        })}
      </div>
      {isConnected ? (
        <>
          {/* Profile header when we have profile data */}
          {userProfileData && account && (
            <div className="mb-3">
              <ProfileHeader
                profileData={userProfileData}
                address={account}
                isOwnProfile={true}
              />
            </div>
          )}
          <div className="font-mono text-xs text-theme-text-muted">{shortAddress}</div>
          <div className="flex gap-2">
            {account && (
              <GlowButton
                variant="secondary"
                onClick={() => navigate(`/profile/${account}`)}
                className="flex-1"
              >
                <User className="h-4 w-4 mr-1" />
                My Profile
              </GlowButton>
            )}
            <GlowButton variant="secondary" onClick={onDisconnect}>
              <LogOut className="h-4 w-4" />
            </GlowButton>
          </div>
          <p className="text-xs text-theme-dim">Disconnect to switch to another wallet.</p>
        </>
      ) : (
        <>
          {availableWallets.length > 1 ? (
            <div className="space-y-2">
              <p className="text-xs text-theme-text-muted">Connect with:</p>
              {availableWallets.map((wallet) => (
                <GlowButton
                  key={wallet.label}
                  onClick={() => onConnectWith(wallet)}
                  className="w-full"
                >
                  {wallet.label}
                </GlowButton>
              ))}
            </div>
          ) : (
            <GlowButton onClick={onConnect} disabled={!hasInjected} className="w-full">
              {hasInjected ? "Connect wallet" : "No wallet"}
            </GlowButton>
          )}
          <p className="text-xs text-theme-text-dim">
            By connecting, you agree to our{" "}
            <Link to="/terms" className="text-theme-accent hover:underline">
              Terms of Service
            </Link>
            .
          </p>
          {walletError && <p className="text-xs text-red-400">{walletError}</p>}
        </>
      )}
    </div>
  );

  const sidebarContent = (
    <>
      <div className="flex h-14 items-center justify-between border-b border-theme-border px-4">
        <span className="text-lg font-semibold text-theme-text">Handshake</span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="md:hidden rounded-lg p-2 text-theme-text-muted hover:bg-theme-surface hover:text-theme-text"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      {profileBlock}
      <div className="border-b border-theme-border p-3">
        <LookUpProfileCard compact />
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        <Link to="/" className={navLinkClass} onClick={handleNavClick}>
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </Link>
        <Link to="/integrate" className={navLinkClass} onClick={handleNavClick}>
          <BookOpen className="h-4 w-4" />
          Integrate
        </Link>
        <Link to="/about" className={navLinkClass} onClick={handleNavClick}>
          <Info className="h-4 w-4" />
          About
        </Link>
        <div className="mt-2 border-t border-theme-border pt-2">
          <ThemeSwitcher />
        </div>
      </nav>
    </>
  );

  return (
    <>
      {/* Mobile overlay backdrop */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={onClose}
            aria-hidden
          />
        )}
      </AnimatePresence>
      {/* Sidebar: drawer on mobile (slide in), static on md+ */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 max-w-[85vw] flex-col border-r border-theme-border bg-theme-surface backdrop-blur-xl transition-transform duration-200 ease-out md:static md:inset-auto md:z-auto md:max-w-none md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
