/**
 * Wallet connect button. Shows connect or connected address.
 * When multiple wallets available, user picks one then signs in.
 */
import { useState } from "react";
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

  const [selectedWallet, setSelectedWallet] = useState<WalletOption | null>(
    availableWallets[0] ?? null
  );

  const handleSignIn = () => {
    if (availableWallets.length === 1) {
      onConnect();
    } else if (selectedWallet) {
      onConnectWith(selectedWallet);
    }
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {availableWallets.length > 1 && (
        <div className="flex flex-col gap-1">
          <label className="text-xs text-theme-text-muted">Choose wallet</label>
          <select
            value={selectedWallet ? availableWallets.indexOf(selectedWallet).toString() : ""}
            onChange={(e) => {
              const i = parseInt(e.target.value, 10);
              setSelectedWallet(Number.isNaN(i) ? null : availableWallets[i] ?? null);
            }}
            className="rounded-lg border border-theme-border bg-theme-surface px-3 py-2 text-sm text-theme-text focus:border-theme-accent focus:outline-none"
          >
            <option value="">Select wallet…</option>
            {availableWallets.map((w, i) => (
              <option key={i} value={i}>
                {w.label}
              </option>
            ))}
          </select>
        </div>
      )}
      <button
        type="button"
        onClick={handleSignIn}
        disabled={!selectedWallet && availableWallets.length > 1}
        className="miniapp-btn-primary flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Wallet className="h-4 w-4" />
        Sign in to vouch
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
