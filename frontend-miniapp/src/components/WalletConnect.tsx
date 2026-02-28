/**
 * Wallet connect button. Shows connect or connected address.
 */
import { Wallet } from "lucide-react";
import type { WalletOption } from "@/hooks/useInjectedWallet";

interface WalletConnectProps {
  isConnected: boolean;
  account: string | null;
  availableWallets: WalletOption[];
  error: string | null;
  onConnect: () => void;
  onConnectWith: (wallet: WalletOption) => void;
  onDisconnect: () => void;
  className?: string;
}

function truncateAddress(addr: string): string {
  if (addr.length <= 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function WalletConnect({
  isConnected,
  account,
  availableWallets,
  error,
  onConnect,
  onConnectWith,
  onDisconnect,
  className = "",
}: WalletConnectProps) {
  if (isConnected && account) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="text-sm text-theme-text-muted">{truncateAddress(account)}</span>
        <button
          type="button"
          onClick={onDisconnect}
          className="rounded-lg border border-theme-border px-3 py-1.5 text-xs font-medium text-theme-text hover:bg-theme-surface-strong"
        >
          Disconnect
        </button>
      </div>
    );
  }

  if (availableWallets.length > 1) {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        <div className="flex flex-wrap gap-2">
          {availableWallets.map((w) => (
            <button
              key={w.label}
              type="button"
              onClick={() => onConnectWith(w)}
              className="flex items-center gap-2 rounded-lg bg-theme-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              <Wallet className="h-4 w-4" />
              {w.label}
            </button>
          ))}
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <button
        type="button"
        onClick={onConnect}
        className="flex items-center gap-2 rounded-lg bg-theme-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        <Wallet className="h-4 w-4" />
        Connect wallet
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
