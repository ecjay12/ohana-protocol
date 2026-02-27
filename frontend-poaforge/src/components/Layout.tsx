import { ReactNode, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSupabaseAuth } from "../hooks/useSupabaseAuth";
import { useInjectedWallet } from "../hooks/useInjectedWallet";
import { AuthModal } from "./AuthModal";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, signOut } = useSupabaseAuth();
  const { accounts, isConnected, connect, disconnect, chainId, switchChain, chains } = useInjectedWallet();
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const chainName = chains[chainId as keyof typeof chains]?.name ?? `Chain ${chainId}`;
  const shortAddr = accounts[0] ? `${accounts[0].slice(0, 6)}…${accounts[0].slice(-4)}` : "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-700 to-teal-900">
      <header className="sticky top-0 z-50 border-b border-white/10 glass-card shadow-glass">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-xl font-bold text-white sm:text-2xl">
              POAP Forge
            </Link>
            <nav className="hidden gap-4 sm:flex">
              <Link to="/" className="text-sm font-medium text-white/80 hover:text-white">
                Discover
              </Link>
              <Link to="/create" className="text-sm font-medium text-white/80 hover:text-white">
                Create Event
              </Link>
              {user && (
                <Link to="/profile" className="text-sm font-medium text-white/80 hover:text-white">
                  Profile
                </Link>
              )}
            </nav>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {user ? (
              <>
                <span className="text-sm text-white/80">{user.email}</span>
                <button
                  onClick={signOut}
                  className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate("/create")}
                  className="rounded-full bg-lime-400 px-6 py-2 text-sm font-bold text-slate-900 shadow-lg shadow-lime-400/25 hover:bg-lime-500"
                >
                  Create Event
                </button>
              </>
            )}

            {!isConnected && (
              <button
                onClick={connect}
                className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
              >
                Connect Wallet
              </button>
            )}

            {isConnected && (
              <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5">
                <span className="text-xs font-medium text-white/80">{chainName}</span>
                <span className="font-mono text-xs text-white/60">{shortAddr}</span>
                <div className="flex gap-1">
                  {[4201, 84532].map((id) => (
                    <button
                      key={id}
                      onClick={() => switchChain(id)}
                      className={`rounded-full px-2 py-1 text-xs font-medium transition-colors ${
                        chainId === id
                          ? "bg-lime-400 text-slate-900"
                          : "bg-white/10 text-white/80 hover:bg-white/20"
                      }`}
                    >
                      {id === 4201 ? "LUKSO" : "Base"}
                    </button>
                  ))}
                </div>
                <button
                  onClick={disconnect}
                  className="rounded-full bg-white/10 px-2 py-1 text-xs text-white/80 hover:bg-white/20"
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto min-h-[calc(100vh-80px)] max-w-7xl px-4 py-8 md:px-6">
        {children}
      </main>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}
