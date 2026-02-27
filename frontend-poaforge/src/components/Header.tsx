import { Link } from "react-router-dom";
import { useSupabaseAuth } from "../hooks/useSupabaseAuth";
import { useInjectedWallet } from "../hooks/useInjectedWallet";
import { ThemeToggle } from "./ThemeToggle";
import { useTheme } from "../hooks/useTheme";
import { useState } from "react";
import { AuthModal } from "./AuthModal";

export function Header() {
  const { user, signOut } = useSupabaseAuth();
  const { accounts, isConnected, connect, disconnect, chainId, switchChain, chains } = useInjectedWallet();
  const { theme } = useTheme();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const chainName = chains[chainId as keyof typeof chains]?.name ?? `Chain ${chainId}`;
  const shortAddr = accounts[0] ? `${accounts[0].slice(0, 6)}…${accounts[0].slice(-4)}` : "";

  const isDark = theme === "dark";
  const headerBg = isDark ? "bg-[#1a1a2e]" : "bg-white/95 backdrop-blur-sm";
  const textColor = isDark ? "text-white" : "text-slate-900";
  const navLinkColor = isDark ? "text-white/80 hover:text-white" : "text-slate-600 hover:text-slate-900";

  return (
    <>
      <header className={`sticky top-0 z-50 border-b ${isDark ? "border-white/10" : "border-slate-200/80"} ${headerBg} shadow-sm`}>
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isDark ? "bg-purple-600" : "bg-purple-500"}`}>
                <span className="text-xl font-bold text-white">E</span>
              </div>
              <span className={`text-xl font-bold ${textColor} sm:text-2xl`}>POAP Forge</span>
            </Link>
            <nav className="hidden gap-6 sm:flex">
              <Link to="/events" className={`text-sm font-medium transition-colors ${navLinkColor}`}>
                Events
              </Link>
              <Link to="/blog" className={`text-sm font-medium transition-colors ${navLinkColor}`}>
                Blog
              </Link>
              <Link to="/create" className={`text-sm font-medium transition-colors ${navLinkColor}`}>
                Create
              </Link>
              {user && (
                <Link to="/profile" className={`text-sm font-medium transition-colors ${navLinkColor}`}>
                  Profile
                </Link>
              )}
            </nav>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <ThemeToggle />

            {user ? (
              <>
                <span className={`text-sm ${isDark ? "text-white/80" : "text-slate-600"}`}>{user.email}</span>
                <button
                  onClick={signOut}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    isDark
                      ? "border-white/20 bg-white/10 text-white hover:bg-white/20"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Sign Out
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className={`rounded-full px-6 py-2 text-sm font-medium transition-colors ${
                  isDark
                    ? "bg-purple-600 text-white hover:bg-purple-700"
                    : "bg-purple-600 text-white hover:bg-purple-700"
                }`}
              >
                Login
              </button>
            )}

            {!isConnected && (
              <button
                onClick={connect}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  isDark
                    ? "border-white/20 bg-white/10 text-white hover:bg-white/20"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                Connect Wallet
              </button>
            )}

            {isConnected && (
              <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 ${isDark ? "bg-white/10" : "bg-slate-100"}`}>
                <span className={`text-xs font-medium ${isDark ? "text-white/80" : "text-slate-600"}`}>{chainName}</span>
                <span className={`font-mono text-xs ${isDark ? "text-white/60" : "text-slate-500"}`}>{shortAddr}</span>
                <div className="flex gap-1">
                  {[4201, 84532].map((id) => (
                    <button
                      key={id}
                      onClick={() => switchChain(id)}
                      className={`rounded-full px-2 py-1 text-xs font-medium transition-colors ${
                        chainId === id
                          ? isDark
                            ? "bg-purple-600 text-white"
                            : "bg-purple-600 text-white"
                          : isDark
                          ? "bg-white/10 text-white/80 hover:bg-white/20"
                          : "bg-white text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {id === 4201 ? "LUKSO" : "Base"}
                    </button>
                  ))}
                </div>
                <button
                  onClick={disconnect}
                  className={`rounded-full px-2 py-1 text-xs transition-colors ${
                    isDark ? "text-white/80 hover:bg-white/20" : "text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  ×
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
}
