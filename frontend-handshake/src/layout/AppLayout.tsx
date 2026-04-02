import { type ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Footer } from "@/components/Footer";
import { VouchLeaderboardCard } from "@/components/VouchLeaderboardCard";
import type { WalletOption } from "@/hooks/useInjectedWallet";
import type { ProfileData } from "@/lib/lsp4Profile";
import { useTheme } from "@/contexts/ThemeContext";
import { THEME_LOGOS } from "@/config/themeLogos";

interface AppLayoutProps {
  children: ReactNode;
  chainId: number;
  chains: Record<number, { name: string; rpc: string }>;
  shortAddress: string;
  account?: string;
  isConnected: boolean;
  hasInjected: boolean;
  availableWallets: WalletOption[];
  walletError: string | null;
  userProfileData?: ProfileData | null;
  /** True while on-chain LSP profile fetch is in progress (sidebar profile header). */
  userProfileLoading?: boolean;
  userIsUP?: boolean;
  onConnect: () => void;
  onConnectWith: (wallet: WalletOption) => void;
  onSwitchChain: (chainId: number) => void;
  onDisconnect: () => void;
}

export function AppLayout({
  children,
  chainId,
  chains,
  shortAddress,
  account,
  isConnected,
  hasInjected,
  availableWallets,
  walletError,
  userProfileData,
  userProfileLoading = false,
  userIsUP,
  onConnect,
  onConnectWith,
  onSwitchChain,
  onDisconnect,
}: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const hideLeaderboardRail = location.pathname === "/leaderboard";
  const { theme } = useTheme();
  const logoSrc = THEME_LOGOS[theme];

  return (
    <div className="flex min-h-screen bg-theme-background">
      <Sidebar
        chainId={chainId}
        chains={chains}
        shortAddress={shortAddress}
        account={account}
        isConnected={isConnected}
        hasInjected={hasInjected}
        availableWallets={availableWallets}
        walletError={walletError}
        userProfileData={userProfileData}
        userProfileLoading={userProfileLoading}
        userIsUP={userIsUP}
        onConnect={onConnect}
        onConnectWith={onConnectWith}
        onSwitchChain={onSwitchChain}
        onDisconnect={onDisconnect}
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile header: menu button + logo (link to home) + title */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-theme-border bg-theme-background/95 px-3 pt-[max(0px,env(safe-area-inset-top))] backdrop-blur sm:px-6 md:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-theme-text-muted transition-colors hover:bg-theme-surface hover:text-theme-text active:scale-95"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          <Link
            to="/"
            className="flex items-center gap-2 rounded-lg transition-opacity active:scale-[0.98] hover:opacity-90"
          >
            {logoSrc && (
              <img
                src={logoSrc}
                alt="Ohana Handshake logo"
                className="h-6 w-6 rounded-md shadow-sm shadow-theme-shadow"
              />
            )}
            <span className="text-lg font-semibold text-theme-text">Handshake</span>
          </Link>
        </header>
        <div className="flex min-h-0 flex-1 min-w-0">
          <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-theme-background pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {children}
          </main>
          {!hideLeaderboardRail && (
            <aside className="hidden min-h-0 w-[300px] shrink-0 flex-col border-l border-theme-border bg-theme-background/95 xl:flex">
              <div className="sticky top-0 max-h-[calc(100vh-0.5rem)] overflow-y-auto p-4 pt-6">
                <VouchLeaderboardCard />
              </div>
            </aside>
          )}
        </div>
        <Footer />
      </div>
    </div>
  );
}
