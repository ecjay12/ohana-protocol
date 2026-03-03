import { type ReactNode, useState } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Footer } from "@/components/Footer";
import type { WalletOption } from "@/hooks/useInjectedWallet";
import type { ProfileData } from "@/lib/lsp4Profile";

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
  userIsUP,
  onConnect,
  onConnectWith,
  onSwitchChain,
  onDisconnect,
}: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
        userIsUP={userIsUP}
        onConnect={onConnect}
        onConnectWith={onConnectWith}
        onSwitchChain={onSwitchChain}
        onDisconnect={onDisconnect}
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile header: menu button + title */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-theme-border bg-theme-background/95 px-4 backdrop-blur sm:px-6 md:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-theme-text-muted hover:bg-theme-surface hover:text-theme-text"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          <span className="text-lg font-semibold text-theme-text">Handshake</span>
        </header>
        <main className="flex-1 overflow-auto bg-theme-background">
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
}
