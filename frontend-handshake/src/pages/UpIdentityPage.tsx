/**
 * UP as Identity — experimental feature (hidden route: /up-identity)
 *
 * Link EOAs to a Universal Profile so vouches aggregate on /profile/:up.
 * UP Grid / miniapp iframe is configured via the Handshake mini dapp, not here.
 *
 * NOT in main nav — access via URL until ready for production.
 */
import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, AlertTriangle, Wallet, Link2, UserCircle } from "lucide-react";
import { AppLayout } from "@/layout/AppLayout";
import { useInjectedWallet, CHAINS } from "@/hooks/useInjectedWallet";
import { useProfileData } from "@/hooks/useProfileData";
import { useHandshake } from "@/hooks/useHandshake";
import { GlowButton } from "@/components/GlowButton";
import { getHandshakeAddress, HANDSHAKE_CHAIN_IDS } from "@/config/contracts";
import { getAddress } from "ethers";

export function UpIdentityPage() {
  const wallet = useInjectedWallet();
  const account = wallet.accounts[0] ?? null;
  const { profileData: userProfileData, isUP: userIsUP } = useProfileData(
    wallet.provider,
    account,
    wallet.chainId
  );
  const { getUPForEOA, registerEOAtoUP } = useHandshake(
    wallet.provider,
    wallet.chainId,
    account
  );

  const [upAddress, setUpAddress] = useState("");
  const [linkedUP, setLinkedUP] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "linking" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  /** Linking uses the Handshake registry on whatever chain the wallet is on (LUKSO, Base, etc.). */
  const handshakeOnChain = useMemo(
    () => getHandshakeAddress(wallet.chainId),
    [wallet.chainId]
  );
  const canLinkHere = !!handshakeOnChain;
  /** On Base networks, LUKSO UP addresses are usually EOAs here — contract requires UP bytecode (see registerEOAtoUP). */
  const isBaseFamily = wallet.chainId === 8453 || wallet.chainId === 84532;
  const supportedChainLabels = useMemo(
    () =>
      HANDSHAKE_CHAIN_IDS.filter((id) => getHandshakeAddress(id)).map(
        (id) => CHAINS[id as keyof typeof CHAINS]?.name ?? `Chain ${id}`
      ),
    []
  );
  const currentChainLabel =
    CHAINS[wallet.chainId as keyof typeof CHAINS]?.name ?? `Chain ${wallet.chainId}`;

  /** Target UP: either connected UP, or linked UP for this EOA */
  const targetUP = linkedUP ?? (userIsUP ? account : null);

  useEffect(() => {
    if (!account) {
      setLinkedUP(null);
      return;
    }
    let cancelled = false;
    getUPForEOA(account)
      .then((up) => {
        if (!cancelled) setLinkedUP(up);
      })
      .catch(() => {
        if (!cancelled) setLinkedUP(null);
      });
    return () => {
      cancelled = true;
    };
  }, [account, getUPForEOA]);

  const handleLinkEOAtoUP = async () => {
    if (!account || !upAddress.trim()) {
      setError("Enter your Universal Profile address.");
      return;
    }
    setError(null);
    setStatus("linking");
    try {
      const ok = await registerEOAtoUP(upAddress.trim());
      if (ok) {
        setLinkedUP(getAddress(upAddress.trim()));
        setStatus("success");
        setError(null);
      } else {
        setError("Failed to link. Check the UP address and try again.");
        setStatus("error");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  };

  const isBusy = status === "linking";

  const handlePasteUP = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const trimmed = text.trim();
      if (trimmed.startsWith("0x") && trimmed.length === 42) setUpAddress(trimmed);
    } catch {
      /* ignore */
    }
  };

  const miniappBase =
    import.meta.env.VITE_MINIAPP_URL ?? "https://handshake.ohana.gg";

  return (
    <AppLayout
      chainId={wallet.chainId}
      chains={wallet.chains as Record<number, { name: string; rpc: string }>}
      shortAddress={account ? `${account.slice(0, 6)}…${account.slice(-4)}` : ""}
      account={account}
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
      <div className="mx-auto max-w-xl space-y-6 px-4 py-8">
        <Link
          to="/app"
          className="inline-flex items-center gap-2 text-sm text-theme-text-muted transition-colors hover:text-theme-accent"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to App
        </Link>

        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            <AlertTriangle className="mr-1.5 inline h-4 w-4 align-middle" />
            Experimental — not in main app yet
          </p>
        </div>

        <div className="rounded-2xl border border-theme-border bg-theme-surface p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-theme-text">
            Handshake + your Universal Profile
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-theme-text-muted">
            Use <strong className="font-medium text-theme-text">one UP</strong> as your public
            identity. <strong className="font-medium text-theme-text">Link each wallet</strong> you
            use on LUKSO (and other supported chains) so vouches roll up to your profile. To add the
            Handshake app to your UP Grid, use the{" "}
            <a
              href={miniappBase}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-theme-accent hover:underline"
            >
              Handshake mini dapp
            </a>
            .
          </p>

          <div className="mt-6 rounded-xl border border-theme-border bg-theme-background/80 p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
              How it works
            </h2>
            <ol className="mt-3 list-none space-y-3 text-sm text-theme-text-muted">
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-theme-accent-soft text-theme-accent">
                  <Wallet className="h-4 w-4" />
                </span>
                <span>
                  <span className="font-medium text-theme-text">Connect on each chain</span> — Use
                  MetaMask, UP extension, etc. Switch to{" "}
                  <strong className="text-theme-text">LUKSO</strong>,{" "}
                  <strong className="text-theme-text">Base</strong>, or{" "}
                  <strong className="text-theme-text">Base Sepolia</strong> (same UP address on each)
                  — linking is per chain.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-theme-accent-soft text-theme-accent">
                  <Link2 className="h-4 w-4" />
                </span>
                <span>
                  <span className="font-medium text-theme-text">Link wallet → UP</span> — If you
                  connect with an EOA, paste your UP address and sign{" "}
                  <strong className="text-theme-text">Sign to link wallet</strong>. That ties this
                  wallet&apos;s vouches to your UP for the profile page.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-theme-accent-soft text-theme-accent">
                  <UserCircle className="h-4 w-4" />
                </span>
                <span>
                  <span className="font-medium text-theme-text">See vouches on your profile</span> —{" "}
                  Open <code className="rounded bg-theme-surface-strong px-1 py-0.5 font-mono text-xs">/profile/YourUP</code>{" "}
                  to see vouches from your UP and all linked wallets (aggregated across supported
                  chains).
                </span>
              </li>
            </ol>
          </div>

          {!wallet.isConnected ? (
            <div className="mt-8 space-y-4">
              <h3 className="text-sm font-semibold text-theme-text">1 · Connect a wallet</h3>
              <p className="text-sm text-theme-text-muted">
                Connect on <strong className="text-theme-text">LUKSO</strong>,{" "}
                <strong className="text-theme-text">Base</strong>, or another chain where Handshake
                is deployed — then link each wallet to your UP on that chain. Universal Profile on
                LUKSO skips the “link wallet” step below.
              </p>
              {wallet.availableWallets.length > 1 ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  {wallet.availableWallets.map((w) => (
                    <GlowButton
                      key={w.label}
                      onClick={() => wallet.connectWith(w)}
                      className="inline-flex items-center gap-2"
                    >
                      Connect {w.label}
                    </GlowButton>
                  ))}
                </div>
              ) : (
                <GlowButton onClick={wallet.connect} disabled={!wallet.hasInjected}>
                  {wallet.hasInjected ? "Connect wallet" : "No wallet found"}
                </GlowButton>
              )}
              <p className="text-xs text-theme-text-dim">
                Tip: Connect with Universal Profile to use your UP directly — no EOA linking step.
              </p>
            </div>
          ) : !canLinkHere ? (
            <div className="mt-6 space-y-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-sm text-theme-text">
                Handshake isn&apos;t available on <strong>{currentChainLabel}</strong>.
              </p>
              <p className="text-sm text-theme-text-muted">
                Switch your wallet to a network where you can register your EOA → UP link:
              </p>
              <ul className="list-inside list-disc text-sm text-theme-text-muted">
                {supportedChainLabels.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </div>
          ) : userIsUP || linkedUP ? (
            <div className="mt-8 space-y-4">
              <div className="rounded-xl border border-theme-border bg-theme-background/60 p-4">
                <h3 className="text-sm font-semibold text-theme-text">Profile &amp; vouches</h3>
                {status === "success" && (
                  <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">
                    Wallet linked. You can link other wallets on other chains the same way.
                  </p>
                )}
                <p className="mt-2 text-sm text-theme-text-muted">
                  {userIsUP
                    ? "You’re connected as your Universal Profile. Your Handshake profile page can show vouches from this address and any wallets you’ve linked on each chain."
                    : `This EOA is linked to your UP: ${linkedUP!.slice(0, 10)}…${linkedUP!.slice(-8)}. Vouches for this wallet count toward that profile.`}
                </p>
                {targetUP && (
                  <Link
                    to={`/profile/${targetUP}`}
                    className="mt-3 inline-flex text-sm font-medium text-theme-accent hover:underline"
                  >
                    Open aggregated profile →
                  </Link>
                )}
                <p className="mt-4 text-xs text-theme-text-dim">
                  UP Grid / miniapp:{" "}
                  <a
                    href={miniappBase}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-theme-accent hover:underline"
                  >
                    open the Handshake mini dapp
                  </a>
                  .
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-8 space-y-4">
              {isBaseFamily && (
                <div className="rounded-lg border border-sky-500/25 bg-sky-500/5 px-3 py-2.5 text-sm text-theme-text-muted">
                  <strong className="text-theme-text">Link on LUKSO:</strong> On Base, your Universal
                  Profile address is usually <em>not</em> a smart contract, so registration reverts.
                  Switch to <strong className="text-theme-text">LUKSO</strong> or{" "}
                  <strong className="text-theme-text">LUKSO Testnet</strong>, keep the same wallet,
                  and paste the same UP address — your UP exists as a contract there.
                </div>
              )}
              <p className="text-xs font-medium uppercase tracking-wide text-theme-text-muted">
                {currentChainLabel}
              </p>
              <h3 className="text-sm font-semibold text-theme-text">
                2 · Link this wallet to your Universal Profile
              </h3>
              <p className="text-sm text-theme-text-muted">
                You’re on <strong className="text-theme-text">{currentChainLabel}</strong> with an
                EOA. Register it to your UP so vouches from this address on{" "}
                <strong className="text-theme-text">this chain</strong> count toward your profile.
                Use the same UP address when you switch to LUKSO or other chains and link there too.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste your UP address (0x…)"
                  value={upAddress}
                  onChange={(e) => setUpAddress(e.target.value)}
                  className="flex-1 rounded-lg border border-theme-border bg-theme-background px-3 py-2.5 text-sm text-theme-text placeholder:text-theme-text-dim"
                />
                <button
                  type="button"
                  onClick={handlePasteUP}
                  className="rounded-lg border border-theme-border bg-theme-surface-strong px-3 py-2.5 text-sm text-theme-text-muted transition-colors hover:bg-theme-surface hover:text-theme-text"
                  title="Paste from clipboard"
                >
                  Paste
                </button>
              </div>
              <GlowButton
                onClick={handleLinkEOAtoUP}
                disabled={isBusy || !upAddress.trim()}
                className="w-full sm:w-auto"
              >
                {status === "linking" ? "Linking…" : "Sign to link wallet"}
              </GlowButton>
              <p className="text-xs text-theme-text-dim">
                Don&apos;t have a UP?{" "}
                <a
                  href="https://universalprofile.cloud/create"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-theme-accent hover:underline"
                >
                  Create one
                </a>
              </p>
            </div>
          )}

          {(error || wallet.error) && (
            <div className="mt-4 space-y-2">
              <p className="text-sm text-red-500">{error ?? wallet.error}</p>
              <p className="text-xs text-theme-text-dim">
                Check the browser console (F12 → Console) for details. Common issues: unsupported
                network, or invalid UP address.
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
