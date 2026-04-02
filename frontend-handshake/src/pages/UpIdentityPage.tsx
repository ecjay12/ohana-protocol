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
import {
  runHandshakeRegistryDiagnostics,
  type HandshakeRegistryDiagnostics,
} from "@/lib/handshakeRegistryDiagnostics";

export function UpIdentityPage() {
  const wallet = useInjectedWallet();
  const account = wallet.accounts[0] ?? null;
  const { profileData: userProfileData, isUP: userIsUP, loading: userProfileLoading } =
    useProfileData(wallet.provider, account, wallet.chainId);
  const { getUPForEOA, registerEOAtoUP } = useHandshake(
    wallet.provider,
    wallet.chainId,
    account
  );

  const [upAddress, setUpAddress] = useState("");
  const [linkedUP, setLinkedUP] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "linking" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [debouncedUpInput, setDebouncedUpInput] = useState("");
  const [diag, setDiag] = useState<HandshakeRegistryDiagnostics | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedUpInput(upAddress), 450);
    return () => window.clearTimeout(t);
  }, [upAddress]);

  /** Linking uses the Handshake registry on whatever chain the wallet is on (LUKSO, Base, etc.). */
  const handshakeOnChain = useMemo(
    () => getHandshakeAddress(wallet.chainId),
    [wallet.chainId]
  );
  const canLinkHere = !!handshakeOnChain;

  useEffect(() => {
    if (!canLinkHere || !wallet.isConnected) {
      setDiag(null);
      return;
    }
    let cancelled = false;
    setDiagLoading(true);
    runHandshakeRegistryDiagnostics(
      wallet.chainId,
      account,
      debouncedUpInput.trim() || null
    )
      .then((d) => {
        if (!cancelled) setDiag(d);
      })
      .catch(() => {
        if (!cancelled) setDiag(null);
      })
      .finally(() => {
        if (!cancelled) setDiagLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canLinkHere, wallet.isConnected, wallet.chainId, account, debouncedUpInput]);
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
      console.error("[UpIdentity] registerEOAtoUP failed:", e);
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  };

  const isBusy = status === "linking";

  const registryMissing = Boolean(diag) && !diag!.registryReadable;
  const upHasNoCodeOnThisChain =
    Boolean(diag?.upChecked) && diag!.upIsContract === false;
  /** Plain Handshake vs registry, or pasted UP has no bytecode on current chain (expected on Base for a LUKSO UP). */
  const linkBlockedByDiag = registryMissing || upHasNoCodeOnThisChain;
  /** Same 0x… UP is a contract on LUKSO but an EOA on Base — not a mistake, just wrong network for linking. */
  const linkOnLuksoInstead =
    Boolean(diag?.registryReadable) && isBaseFamily && upHasNoCodeOnThisChain;

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
      userProfileLoading={userProfileLoading}
      userIsUP={userIsUP}
      onConnect={wallet.connect}
      onConnectWith={wallet.connectWith}
      onSwitchChain={wallet.switchChain}
      onDisconnect={wallet.disconnect}
    >
      <div className="mx-auto min-w-0 max-w-xl space-y-6 px-3 py-8 sm:px-4">
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

        <div className="min-w-0 rounded-2xl border border-theme-border bg-theme-surface p-5 sm:p-8">
          <h1 className="text-balance text-2xl font-bold text-theme-text">
            Handshake + your Universal Profile
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-theme-text-muted content-safe">
            One <strong className="font-medium text-theme-text">UP</strong> as your public identity.
            Link EOAs on LUKSO (same address works on Base).{" "}
            <code className="rounded bg-theme-surface-strong px-1 py-0.5 font-mono text-xs">
              /profile/&lt;UP&gt;
            </code>{" "}
            aggregates vouches across deployed networks. Add the app to your UP Grid via the{" "}
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
              <li className="flex min-w-0 gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-theme-accent-soft text-theme-accent">
                  <Wallet className="h-4 w-4" />
                </span>
                <span className="min-w-0 content-safe">
                  <span className="font-medium text-theme-text">Connect per chain</span> — Switch to
                  LUKSO, Base, or Base Sepolia; link each EOA you use there.
                </span>
              </li>
              <li className="flex min-w-0 gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-theme-accent-soft text-theme-accent">
                  <Link2 className="h-4 w-4" />
                </span>
                <span className="min-w-0 content-safe">
                  <span className="font-medium text-theme-text">Link EOA → UP</span> — Paste your UP
                  and sign to attach this wallet&apos;s vouches to that profile.
                </span>
              </li>
              <li className="flex min-w-0 gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-theme-accent-soft text-theme-accent">
                  <UserCircle className="h-4 w-4" />
                </span>
                <span className="min-w-0 content-safe">
                  <span className="font-medium text-theme-text">Profile</span> —{" "}
                  <code className="rounded bg-theme-surface-strong px-1 py-0.5 font-mono text-xs break-all">
                    /profile/YourUP
                  </code>{" "}
                  shows aggregated vouches.
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
                  <strong className="text-theme-text">On Base?</strong> Paste your UP below — if linking is
                  blocked, use <strong className="text-theme-text">Switch to LUKSO</strong> (your UP is a
                  contract there, not on Base).
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
              {linkBlockedByDiag && registryMissing && (
                <div className="rounded-lg border border-red-500/25 bg-red-500/5 px-3 py-2 text-sm text-theme-text-muted">
                  <strong className="text-theme-text">Registry missing on this contract.</strong> The address
                  in chainConfig must be <code className="text-xs">OhanaHandshakeRegistry</code> (not plain
                  Handshake). Open <strong>Technical diagnostics</strong> below for the RPC check.
                </div>
              )}
              {linkBlockedByDiag && linkOnLuksoInstead && (
                <div className="rounded-lg border border-sky-500/30 bg-sky-500/5 px-3 py-3 text-sm text-theme-text-muted">
                  <p>
                    <strong className="text-theme-text">This is expected on Base.</strong> Your Universal
                    Profile is a <strong className="text-theme-text">smart contract on LUKSO</strong>, but the
                    same address on Base usually has <strong className="text-theme-text">no contract code</strong>
                    . The app checks bytecode on the network you&apos;re using, so linking has to be signed on
                    LUKSO (or LUKSO Testnet) — same wallet, same UP address.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <GlowButton
                      type="button"
                      variant="secondary"
                      onClick={() => wallet.switchChain(42)}
                      className="text-sm"
                    >
                      Switch to LUKSO
                    </GlowButton>
                    <GlowButton
                      type="button"
                      variant="secondary"
                      onClick={() => wallet.switchChain(4201)}
                      className="text-sm"
                    >
                      Switch to LUKSO Testnet
                    </GlowButton>
                  </div>
                </div>
              )}
              {linkBlockedByDiag && upHasNoCodeOnThisChain && !linkOnLuksoInstead && !registryMissing && (
                <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-sm text-theme-text-muted">
                  <strong className="text-theme-text">No contract at this address on this chain.</strong>{" "}
                  Paste your real Universal Profile address, or switch to the network where that UP was
                  created (usually LUKSO).
                </div>
              )}
              <GlowButton
                onClick={handleLinkEOAtoUP}
                disabled={isBusy || !upAddress.trim() || linkBlockedByDiag}
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

          {wallet.isConnected && canLinkHere && (
            <details className="mt-6 rounded-xl border border-theme-border bg-theme-background/40 px-3 py-2 text-xs">
              <summary className="cursor-pointer font-medium text-theme-text-muted hover:text-theme-text">
                Technical diagnostics (EOA → UP)
                {diagLoading ? " — loading…" : ""}
              </summary>
              {diag && (
                <dl className="mt-3 space-y-2 text-theme-text-dim">
                  <div>
                    <dt className="font-medium text-theme-text-muted">Chain ID</dt>
                    <dd className="font-mono">{diag.chainId}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-theme-text-muted">Handshake contract</dt>
                    <dd className="break-all font-mono text-[11px]">{diag.handshakeAddress ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-theme-text-muted">getUPForEOA (registry)</dt>
                    <dd>{diag.registryReadable ? "OK — callable" : "Fails — see detail"}</dd>
                  </div>
                  <div className="break-words text-[11px] leading-relaxed">{diag.registryDetail}</div>
                  {diag.linkedUPOnChain && (
                    <div>
                      <dt className="font-medium text-theme-text-muted">Linked UP (read from chain)</dt>
                      <dd className="break-all font-mono text-[11px]">{diag.linkedUPOnChain}</dd>
                    </div>
                  )}
                  {diag.upChecked != null && (
                    <div>
                      <dt className="font-medium text-theme-text-muted">Pasted UP on this chain</dt>
                      <dd>
                        {diag.upIsContract
                          ? "Has bytecode (contract) — OK to register here"
                          : "EOA / no code — register on LUKSO instead"}
                      </dd>
                    </div>
                  )}
                </dl>
              )}
            </details>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
