/**
 * On-profile linking: EOAs registered to this Universal Profile (read from LUKSO registry),
 * plus link-another-wallet flow when viewing your own profile.
 */
import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Wallet, Link2, UserCircle, Unlink2 } from "lucide-react";
import { getAddress } from "ethers";
import { useInjectedWallet, CHAINS } from "@/hooks/useInjectedWallet";
import { useProfileData } from "@/hooks/useProfileData";
import { useHandshake } from "@/hooks/useHandshake";
import { GlowButton } from "@/components/GlowButton";
import { getHandshakeAddress, HANDSHAKE_CHAIN_IDS } from "@/config/contracts";
import { getEOAsForUP, getUPForEOAOnLuksoFamily } from "@/lib/upEoaLookup";
import {
  runHandshakeRegistryDiagnostics,
  type HandshakeRegistryDiagnostics,
} from "@/lib/handshakeRegistryDiagnostics";
import type { IdentityVouchStat } from "@/lib/profileWalletVouchStats";

interface ProfileLinkWalletsSectionProps {
  /** Checksummed profile address from URL */
  profileAddress: string;
  isOwnProfile: boolean;
  /** True when this profile is a Universal Profile */
  isProfileUP: boolean;
  /** Per-identity received/given counts when viewing a UP (from ProfilePage aggregation). */
  identityVouchStats?: IdentityVouchStat[];
  identityVouchStatsLoading?: boolean;
  /** Set false when the parent page already shows the full connected address (e.g. Wallets & UP page). */
  showConnectedInBrowserBanner?: boolean;
  /** Plain-language labels and simpler steps (e.g. Wallets & UP page). */
  plainLanguage?: boolean;
  /** Parent renders the linked-wallets table (e.g. UpIdentityWalletDashboard). */
  hideLinkedWalletStatsCard?: boolean;
  /** Do not offer on-chain unregister — prefer display-only hide (Wallets & UP policy). */
  disableOnChainUnlink?: boolean;
  /** When unlink is disabled, mention hide controls (Wallets & UP) or keep generic (ProfilePage). */
  hideControlMessaging?: boolean;
  /** Minimal link-only layout (no extra warnings/explanations). */
  minimalLinkUi?: boolean;
}

function shortAddr(a: string) {
  const s = a.trim();
  if (s.length < 18) return s;
  return `${s.slice(0, 10)}…${s.slice(-8)}`;
}

export function ProfileLinkWalletsSection({
  profileAddress,
  isOwnProfile,
  isProfileUP,
  identityVouchStats,
  identityVouchStatsLoading = false,
  showConnectedInBrowserBanner = true,
  plainLanguage = false,
  hideLinkedWalletStatsCard = false,
  disableOnChainUnlink = false,
  hideControlMessaging = true,
  minimalLinkUi = false,
}: ProfileLinkWalletsSectionProps) {
  const wallet = useInjectedWallet();
  const account = wallet.accounts[0] ?? null;
  const { isUP: userIsUP } = useProfileData(wallet.provider, account, wallet.chainId);
  const {
    getUPForEOA,
    registerEOAtoUP,
    unregisterEOAtoUP,
    txPending: handshakeTxPending,
    error: handshakeHookError,
  } = useHandshake(wallet.provider, wallet.chainId, account);

  const [linkedEoas, setLinkedEoas] = useState<string[]>([]);
  const [loadingEoas, setLoadingEoas] = useState(false);

  const [upAddress, setUpAddress] = useState("");
  const [linkedUP, setLinkedUP] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "linking" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [debouncedUpInput, setDebouncedUpInput] = useState("");
  const [diag, setDiag] = useState<HandshakeRegistryDiagnostics | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [profileAddrCopied, setProfileAddrCopied] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedUpInput(upAddress), 450);
    return () => window.clearTimeout(t);
  }, [upAddress]);

  const handshakeOnChain = useMemo(
    () => getHandshakeAddress(wallet.chainId),
    [wallet.chainId]
  );
  const canLinkHere = !!handshakeOnChain;

  useEffect(() => {
    if (!canLinkHere || !account || !isOwnProfile) {
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
  }, [canLinkHere, wallet.chainId, account, debouncedUpInput, isOwnProfile]);

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

  const targetUP = linkedUP ?? (userIsUP ? account : null);

  const registryUP = useMemo(() => {
    if (isProfileUP) return profileAddress;
    if (isOwnProfile && linkedUP) return linkedUP;
    return null;
  }, [isProfileUP, profileAddress, isOwnProfile, linkedUP]);

  useEffect(() => {
    if (!registryUP) {
      setLinkedEoas([]);
      return;
    }
    let cancelled = false;
    setLoadingEoas(true);
    getEOAsForUP(registryUP, wallet.chainId)
      .then((xs) => {
        if (!cancelled) setLinkedEoas(xs);
      })
      .catch(() => {
        if (!cancelled) setLinkedEoas([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingEoas(false);
      });
    return () => {
      cancelled = true;
    };
  }, [registryUP, wallet.chainId]);

  useEffect(() => {
    if (!account || !isOwnProfile) {
      setLinkedUP(null);
      return;
    }
    let cancelled = false;
    (async () => {
      let up = await getUPForEOA(account);
      if (cancelled) return;
      if (!up) {
        up = await getUPForEOAOnLuksoFamily(account);
      }
      if (!cancelled) setLinkedUP(up);
    })().catch(() => {
      if (!cancelled) setLinkedUP(null);
    });
    return () => {
      cancelled = true;
    };
  }, [account, getUPForEOA, isOwnProfile]);

  /** Default UP field when viewing your own UP profile */
  useEffect(() => {
    if (!isOwnProfile || !isProfileUP || !profileAddress) return;
    setUpAddress((prev) => (prev.trim() === "" ? profileAddress : prev));
  }, [isOwnProfile, isProfileUP, profileAddress]);

  const isLuksoRegistryChain = wallet.chainId === 42 || wallet.chainId === 4201;

  const handleUnlinkThisWallet = async (eoa: string) => {
    if (!account || account.toLowerCase() !== eoa.toLowerCase() || !registryUP) return;
    setError(null);
    setUnlinking(true);
    try {
      const ok = await unregisterEOAtoUP();
      if (ok) {
        const xs = await getEOAsForUP(registryUP, wallet.chainId);
        setLinkedEoas(xs);
        let up = await getUPForEOA(account);
        if (!up) up = await getUPForEOAOnLuksoFamily(account);
        setLinkedUP(up);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setUnlinking(false);
    }
  };

  const handleLinkEOAtoUP = async () => {
    if (!account || !upAddress.trim()) {
      setError(
        plainLanguage ? "Enter your main profile address (the long 0x… address)." : "Enter your Universal Profile address."
      );
      return;
    }
    setError(null);
    setStatus("linking");
    try {
      const ok = await registerEOAtoUP(upAddress.trim());
      if (ok) {
        const resolvedUP = getAddress(upAddress.trim());
        setLinkedUP(resolvedUP);
        setStatus("success");
        setError(null);
        const listUP = isProfileUP ? profileAddress : resolvedUP;
        const xs = await getEOAsForUP(listUP, wallet.chainId);
        setLinkedEoas(xs);
      } else {
        setError("Failed to link. Check the UP address and try again.");
        setStatus("error");
      }
    } catch (e) {
      console.error("[ProfileLinkWallets] registerEOAtoUP failed:", e);
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  };

  const isBusy = status === "linking";

  const registryMissing = Boolean(diag) && !diag!.registryReadable;
  const upHasNoCodeOnThisChain =
    Boolean(diag?.upChecked) && diag!.upIsContract === false;
  const linkBlockedByDiag = registryMissing || upHasNoCodeOnThisChain;
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

  /** Others’ EOA profiles: nothing to show here */
  if (!isOwnProfile && !isProfileUP) {
    return null;
  }

  const showLinkedWalletsCard =
    !hideLinkedWalletStatsCard && Boolean(registryUP || (isOwnProfile && account));

  const layoutClass = plainLanguage ? "flex flex-col-reverse gap-6" : "space-y-6";

  return (
    <div className={layoutClass}>
      {showLinkedWalletsCard && (
        <div className="glass-card rounded-2xl border border-theme-border bg-theme-surface p-4 sm:p-6">
          {showConnectedInBrowserBanner && isOwnProfile && account && (
            <div className="mb-4 rounded-xl border border-theme-accent/35 bg-theme-accent-soft px-3 py-2.5 sm:px-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
                {plainLanguage ? "Wallet you're using" : "Signed in with"}
              </p>
              <p className="mt-1 select-all break-all font-mono text-sm text-theme-text">{account}</p>
            </div>
          )}
          <h2 className="text-lg font-semibold text-theme-text">
            {plainLanguage ? "Endorsements by account" : "Wallets linked to this profile"}
          </h2>
          <p className="mt-1 text-sm text-theme-text-muted">
            {plainLanguage
              ? isProfileUP && identityVouchStats != null
                ? "How many endorsements each linked login has received or sent, counted across networks you’ve connected below."
                : "Extra logins tied to your main profile show here once you add them."
              : isProfileUP && identityVouchStats != null
                ? "Each row is someone tied to this profile — your Universal Profile plus wallets you linked on LUKSO. Counts combine endorsements from Base and LUKSO; link your Base wallet to this profile on LUKSO first so everything lines up."
                : "Wallets linked to this Universal Profile on LUKSO (mainnet or testnet) appear here."}
          </p>
          {!registryUP ? (
            <p className="mt-4 text-sm text-theme-text-muted">
              {plainLanguage
                ? "We’re looking up which main profile your wallet is tied to. If nothing appears, switch the network in your wallet to LUKSO or LUKSO Testnet, then refresh this page."
                : "Looking up which Universal Profile your wallet is linked to on LUKSO. If this stays empty, switch to LUKSO or LUKSO Testnet in your wallet, then refresh."}
            </p>
          ) : isProfileUP && identityVouchStats != null ? (
            identityVouchStatsLoading ? (
              <p className="mt-4 text-sm text-theme-text-muted">
                {plainLanguage ? "Loading…" : "Loading vouch data…"}
              </p>
            ) : !identityVouchStats?.length ? (
              <p className="mt-4 text-sm text-theme-text-muted">
                No vouch breakdown available for this profile yet.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-xl border border-theme-border bg-theme-background/40">
                <table className="w-full min-w-[min(100%,320px)] text-left text-sm">
                  <thead>
                    <tr className="border-b border-theme-border text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
                      <th className="px-3 py-2.5">{plainLanguage ? "Account" : "Identity"}</th>
                      <th className="px-3 py-2.5 text-right">{plainLanguage ? "Received" : "Incoming"}</th>
                      <th className="px-3 py-2.5 text-right">{plainLanguage ? "Sent" : "Outgoing"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {identityVouchStats.map((row) => {
                      const isUPRow =
                        row.address.toLowerCase() === profileAddress.toLowerCase();
                      const isSession =
                        !!account && row.address.toLowerCase() === account.toLowerCase();
                      return (
                        <tr
                          key={row.address}
                          className="border-b border-theme-border/80 last:border-0"
                        >
                          <td className="px-3 py-2.5 align-top text-theme-text">
                            <div className="flex flex-wrap items-center gap-2">
                              {isUPRow ? (
                                <span className="font-medium">
                                  {plainLanguage ? "Main profile" : "Universal Profile"}
                                </span>
                              ) : (
                                <span className="font-mono text-xs break-all sm:text-sm">
                                  {row.address}
                                </span>
                              )}
                              {isUPRow && (
                                <span className="font-mono text-[11px] text-theme-text-muted break-all sm:text-xs">
                                  {shortAddr(row.address)}
                                </span>
                              )}
                              {isSession && (
                                <span className="shrink-0 rounded-full bg-theme-accent-soft px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-theme-accent sm:text-xs">
                                  {plainLanguage ? "This login" : "This wallet"}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-theme-text">
                            {row.received}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-theme-text">
                            {row.given}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : loadingEoas ? (
            <p className="mt-4 text-sm text-theme-text-muted">Loading…</p>
          ) : linkedEoas.length === 0 ? (
            isOwnProfile && account ? (
              <ul className="mt-4 space-y-2">
                <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-theme-border bg-theme-background/60 px-3 py-2 font-mono text-sm text-theme-text">
                  <span className="break-all">{account}</span>
                  <span className="shrink-0 rounded-full bg-theme-accent-soft px-2 py-0.5 text-xs font-medium text-theme-accent">
                    {plainLanguage ? "This login" : "This wallet"}
                  </span>
                </li>
                <p className="text-xs text-theme-text-muted">
                  {plainLanguage
                    ? "No other logins are tied to this profile yet. Add another wallet below (you’ll sign on LUKSO)."
                    : "No other linked wallets show up for this profile yet. After you link another wallet on LUKSO, it will appear here."}
                </p>
              </ul>
            ) : (
              <p className="mt-4 text-sm text-theme-text-muted">
                {plainLanguage
                  ? "No linked logins yet. Use “Add a wallet” below and approve in your wallet."
                  : "No linked wallets yet. When you link a wallet and the request finishes, it will show up here."}
              </p>
            )
          ) : (
            <ul className="mt-4 space-y-2">
              {linkedEoas.map((eoa) => {
                const isThisSession =
                  account && eoa.toLowerCase() === account.toLowerCase();
                return (
                  <li
                    key={eoa}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-theme-border bg-theme-background/60 px-3 py-2 font-mono text-sm text-theme-text"
                  >
                    <span className="break-all">{eoa}</span>
                    {isThisSession && (
                      <span className="shrink-0 rounded-full bg-theme-accent-soft px-2 py-0.5 text-xs font-medium text-theme-accent">
                        {plainLanguage ? "This login" : "This wallet"}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {!isOwnProfile && isProfileUP && (
        <p className="text-center text-xs text-theme-text-dim">
          Connect your wallet and open your own profile to link additional addresses.
        </p>
      )}

      {isOwnProfile && (
        minimalLinkUi ? (
          <div className="glass-card rounded-2xl border border-theme-border bg-theme-surface p-5 sm:p-7">
            <h2 className="text-center text-2xl font-black uppercase tracking-wide text-theme-text sm:text-3xl">
              Link wallets to your UP identity
            </h2>
            <p className="mt-3 text-center text-sm font-semibold uppercase tracking-wide text-theme-text">
              Sign in with the wallet you want to link
            </p>

            {account ? (
              <>
                <p className="mt-10 text-center text-3xl font-black uppercase tracking-wide text-theme-text sm:text-4xl">
                  Current wallet:
                  <span className="ml-2 break-all font-mono text-lg sm:text-2xl">{shortAddr(account)}</span>
                </p>
                {!userIsUP && (
                  <p className="mt-3 text-center text-base font-bold uppercase tracking-wide text-theme-text sm:text-lg">
                    Connected UP:
                    <span className="ml-2 break-all font-mono text-sm normal-case sm:text-base">
                      {linkedUP ?? "Not linked yet"}
                    </span>
                  </p>
                )}

                <div className="mt-12 grid gap-3 sm:grid-cols-[1fr_auto]">
                  <input
                    type="text"
                    placeholder="Paste UP address"
                    value={upAddress}
                    onChange={(e) => setUpAddress(e.target.value)}
                    className="rounded-xl border border-theme-border bg-theme-background px-4 py-3 text-xl font-semibold uppercase tracking-wide text-theme-text placeholder:text-theme-text-dim"
                  />
                  <GlowButton
                    onClick={handleLinkEOAtoUP}
                    disabled={
                      isBusy || !upAddress.trim() || !canLinkHere || linkBlockedByDiag || unlinking || userIsUP
                    }
                    className="px-6 py-3 text-xl font-black uppercase tracking-wide"
                  >
                    {status === "linking" ? "Linking..." : "Link wallet to UP"}
                  </GlowButton>
                </div>

                {(error || wallet.error || handshakeHookError) && (
                  <p className="mt-3 text-center text-sm text-red-500">
                    {error ?? wallet.error ?? handshakeHookError}
                  </p>
                )}
              </>
            ) : (
              <div className="mt-8 text-center">
                <GlowButton onClick={wallet.connect} disabled={!wallet.hasInjected}>
                  {wallet.hasInjected ? "Connect wallet" : "No wallet found"}
                </GlowButton>
              </div>
            )}
          </div>
        ) : (
        <div className="glass-card rounded-2xl border border-theme-border bg-theme-surface p-4 sm:p-6">
          {!plainLanguage && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                <AlertTriangle className="mr-1.5 inline h-4 w-4 align-middle" />
                Example: endorsements you received on <strong className="font-semibold">Base</strong> with a regular
                wallet show on your profile after you{" "}
                <strong className="font-semibold">link that same wallet to your Universal Profile on LUKSO</strong>{" "}
                (one approval in your wallet). You don&apos;t re-send endorsements — we combine what already
                happened on each network.
              </p>
            </div>
          )}
          {plainLanguage && (
            <div className="rounded-xl border border-sky-500/25 bg-sky-500/5 px-3 py-2.5">
              <p className="text-sm text-theme-text-muted">
                <strong className="text-theme-text">Tip:</strong> Link your Base and LUKSO wallets here to
                your main Universal Profile so all your vouches and activity appear together on one clean
                public page — nothing is duplicated; we just connect the dots.
              </p>
            </div>
          )}

          <h2 className="mt-6 text-balance text-xl font-bold text-theme-text">
            {plainLanguage
              ? disableOnChainUnlink
                ? "Manage wallets"
                : "Add or remove wallet logins"
              : "Handshake + your Universal Profile"}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-theme-text-muted content-safe">
            {plainLanguage ? (
              disableOnChainUnlink ? (
                <>
                  Your <strong className="font-medium text-theme-text">main profile</strong> is your public
                  identity. Add each wallet you use so endorsements from those addresses count toward that
                  profile.{" "}
                  {hideControlMessaging ? (
                    <>
                      Use <strong className="text-theme-text">Hide</strong> above to stop showing a linked wallet
                      in your totals — the link itself is not removed here.
                    </>
                  ) : (
                    <>Removing links from this screen is turned off here.</>
                  )}
                </>
              ) : (
              <>
                Your <strong className="font-medium text-theme-text">main profile</strong> is your public
                identity. Add each wallet you use so endorsements from those addresses count toward that
                profile. Removing a login only updates this list—you can add it again later.
              </>
              )
            ) : disableOnChainUnlink ? (
              <>
                One <strong className="font-medium text-theme-text">UP</strong> as your public identity.
                Wallet-to-profile linking is recorded on <strong className="font-medium text-theme-text">LUKSO</strong>;
                the same address can have endorsements on{" "}
                <strong className="font-medium text-theme-text">Base</strong> too.{" "}
                Your public profile page{" "}
                aggregates endorsements from every linked wallet across networks.{" "}
                {hideControlMessaging ? (
                  <>
                    This view is configured for <strong className="text-theme-text">hide-only</strong> wallet
                    management; removing links from here isn&apos;t available.
                  </>
                ) : (
                  <>Removing wallet links isn&apos;t available in this view.</>
                )}
              </>
            ) : (
              <>
                One <strong className="font-medium text-theme-text">UP</strong> as your public identity.
                Wallet-to-profile linking is recorded on <strong className="font-medium text-theme-text">LUKSO</strong>;
                the same address can have endorsements on{" "}
                <strong className="font-medium text-theme-text">Base</strong> too.{" "}
                Your public profile page{" "}
                aggregates endorsements from every linked wallet across networks. Add the app to your UP Grid via
                the{" "}
                <a
                  href={miniappBase}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-theme-accent hover:underline"
                >
                  Handshake mini dapp
                </a>
                .
              </>
            )}
          </p>

          <div className="mt-6 rounded-xl border-2 border-theme-accent/30 bg-theme-background/60 p-4 sm:p-5">
            <h3 className="text-base font-semibold text-theme-text">
              {plainLanguage ? "Your wallets" : "Connect & manage wallets"}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-theme-text-muted">
              {plainLanguage ? (
                disableOnChainUnlink ? (
                  <>
                    Add a wallet: paste your main profile address, then approve on LUKSO. Unlinking from this page
                    isn&apos;t available
                    {hideControlMessaging ? (
                      <>
                        {" "}
                        — use <strong className="text-theme-text">Hide</strong> in the section above to change what
                        appears in your profile view.
                      </>
                    ) : (
                      <>.</>
                    )}
                  </>
                ) : (
                <>
                  Add a wallet: paste your main profile address, then approve the prompt. Remove: pick{" "}
                  <strong className="text-theme-text">Remove</strong> next to the login you&apos;re using—you
                  must be on <strong className="text-theme-text">LUKSO</strong> or{" "}
                  <strong className="text-theme-text">LUKSO Testnet</strong> to sign.
                </>
                )
              ) : disableOnChainUnlink ? (
                <>
                  Add or confirm <strong className="text-theme-text">wallet-to-profile</strong> links on{" "}
                  <strong className="text-theme-text">LUKSO</strong> or{" "}
                  <strong className="text-theme-text">LUKSO Testnet</strong>. This page does not remove links for you
                  {hideControlMessaging ? <>; use Hide above instead.</> : <>.</>}
                </>
              ) : (
                <>
                  Add or remove <strong className="text-theme-text">wallet-to-profile</strong> links for this
                  identity. Approve link and remove requests in your wallet on{" "}
                  <strong className="text-theme-text">LUKSO</strong> or{" "}
                  <strong className="text-theme-text">LUKSO Testnet</strong>.
                </>
              )}
            </p>

            {!account ? (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-theme-text-muted">
                  {plainLanguage ? (
                    <>
                      Use the button below to connect a wallet (for example MetaMask or your Universal Profile
                      app). After that you can tie addresses to your main profile.
                    </>
                  ) : (
                    <>
                      Connect on <strong className="text-theme-text">LUKSO</strong>,{" "}
                      <strong className="text-theme-text">Base</strong>, or another chain where Handshake is
                      deployed — then link each address you use.
                    </>
                  )}
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
              </div>
            ) : !canLinkHere ? (
              <div className="mt-4 space-y-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <p className="text-sm text-theme-text">
                  Handshake isn&apos;t available on <strong>{currentChainLabel}</strong>.
                </p>
                <p className="text-sm text-theme-text-muted">
                  Switch your wallet to a network where you can add or remove wallet-to-profile links:
                </p>
                <ul className="list-inside list-disc text-sm text-theme-text-muted">
                  {supportedChainLabels.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <>
                {registryUP && !hideLinkedWalletStatsCard && (
                  <div className="mt-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
                      {plainLanguage ? "Wallets tied to this profile" : "Linked wallet addresses"}
                    </h4>
                    {loadingEoas ? (
                      <p className="mt-2 text-sm text-theme-text-muted">Loading…</p>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {linkedEoas.length === 0 ? (
                          <li className="text-sm text-theme-text-muted">
                            {plainLanguage
                              ? "No extra wallets on file yet. Add one in the form below."
                              : "No linked wallets found for this profile yet. Add one in the form below."}
                          </li>
                        ) : (
                          linkedEoas.map((eoa) => {
                            const isSession = account.toLowerCase() === eoa.toLowerCase();
                            return (
                              <li
                                key={eoa}
                                className="flex flex-col gap-2 rounded-lg border border-theme-border bg-theme-surface/90 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                              >
                                <span className="break-all font-mono text-xs text-theme-text sm:text-sm">
                                  {eoa}
                                </span>
                                <div className="flex flex-wrap items-center gap-2">
                                  {isSession && (
                                    <span className="rounded-full bg-theme-accent-soft px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-theme-accent">
                                      {plainLanguage ? "You’re signed in" : "This wallet"}
                                    </span>
                                  )}
                                  {isSession ? (
                                    !disableOnChainUnlink ? (
                                      isLuksoRegistryChain ? (
                                        <GlowButton
                                          type="button"
                                          variant="secondary"
                                          className="inline-flex items-center gap-1.5 text-xs"
                                          onClick={() => void handleUnlinkThisWallet(eoa)}
                                          disabled={unlinking || isBusy || handshakeTxPending}
                                        >
                                          <Unlink2 className="h-3.5 w-3.5" />
                                          {unlinking ? "Removing…" : plainLanguage ? "Remove" : "Remove from profile"}
                                        </GlowButton>
                                      ) : (
                                        <>
                                          <span className="text-[11px] text-theme-text-muted">
                                            Switch to LUKSO to remove this link
                                          </span>
                                          <GlowButton
                                            type="button"
                                            variant="secondary"
                                            className="text-xs"
                                            onClick={() => wallet.switchChain(42)}
                                          >
                                            LUKSO
                                          </GlowButton>
                                          <GlowButton
                                            type="button"
                                            variant="secondary"
                                            className="text-xs"
                                            onClick={() => wallet.switchChain(4201)}
                                          >
                                            LUKSO Testnet
                                          </GlowButton>
                                        </>
                                      )
                                    ) : (
                                      <span className="text-[11px] text-theme-text-dim">
                                        {plainLanguage && hideControlMessaging
                                          ? "Remove isn’t available here — use Hide above."
                                          : "Removing links isn’t available in this view."}
                                      </span>
                                    )
                                  ) : (
                                    <span className="text-[11px] text-theme-text-dim">
                                      {disableOnChainUnlink
                                        ? plainLanguage
                                          ? hideControlMessaging
                                            ? "Connect as this address elsewhere to link — hide from dashboard when signed with UP."
                                            : "Connect as this address elsewhere to link this wallet."
                                          : "Connect this address to manage."
                                        : "Connect this address in your wallet to remove it"}
                                    </span>
                                  )}
                                </div>
                              </li>
                            );
                          })
                        )}
                      </ul>
                    )}
                  </div>
                )}

                {wallet.availableWallets.length > 1 && (
                  <div className="mt-4 border-t border-theme-border pt-4">
                    <p className="text-xs font-medium text-theme-text-muted">
                      {plainLanguage ? "Use a different wallet app" : "Switch to a different wallet"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {wallet.availableWallets.map((w) => (
                        <GlowButton
                          key={w.label}
                          type="button"
                          variant="secondary"
                          className="text-xs"
                          onClick={() => wallet.connectWith(w)}
                        >
                          {w.label}
                        </GlowButton>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-5 border-t border-theme-border pt-5">
                  {userIsUP ? (
                    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
                      <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                        {plainLanguage
                          ? "To add a wallet, sign in with that wallet first"
                          : "Linking requires your normal wallet account"}
                      </h4>
                      <p className="mt-2 text-sm text-theme-text-muted">
                        {plainLanguage ? (
                          <>
                            You&apos;re connected with your <strong className="text-theme-text">main profile</strong>{" "}
                            address. Adding a link must be <strong className="text-theme-text">approved by each
                            normal wallet</strong> you want to attach (for example the account you use on Base).
                            The form is hidden until you connect with that account.
                          </>
                        ) : (
                          <>
                            The link request is always sent from the wallet you want to add. Switch your wallet to
                            that account, connect it here, then submit the form.
                          </>
                        )}
                      </p>
                      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-theme-text-muted">
                        <li>In your wallet app, switch to the account you want to add.</li>
                        <li>Connect that account on this site (disconnect first if the site still shows your profile).</li>
                        <li>
                          On LUKSO or LUKSO Testnet, paste your main profile address here and approve:{" "}
                          <span className="font-mono text-xs text-theme-text break-all">
                            {registryUP ?? profileAddress}
                          </span>
                        </li>
                      </ol>
                      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-stretch">
                        <code className="flex-1 break-all rounded border border-theme-border bg-theme-background px-3 py-2 font-mono text-xs leading-relaxed text-theme-text">
                          {registryUP ?? profileAddress}
                        </code>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(registryUP ?? profileAddress);
                              setProfileAddrCopied(true);
                              window.setTimeout(() => setProfileAddrCopied(false), 2000);
                            } catch {
                              /* ignore */
                            }
                          }}
                          className="shrink-0 rounded-lg border border-theme-border bg-theme-surface-strong px-4 py-2 text-sm text-theme-text transition-colors hover:bg-theme-surface"
                        >
                          {profileAddrCopied ? "Copied" : plainLanguage ? "Copy profile address" : "Copy"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {isBaseFamily && (
                        <div className="mb-4 rounded-lg border border-sky-500/25 bg-sky-500/5 px-3 py-2.5 text-sm text-theme-text-muted">
                          {plainLanguage ? (
                            <>
                              <strong className="text-theme-text">Using Base?</strong> If the next step fails, switch
                              your wallet to <strong className="text-theme-text">LUKSO</strong> — your main profile
                              lives there.
                            </>
                          ) : (
                            <>
                              <strong className="text-theme-text">On Base?</strong> Paste your UP below — if linking is
                              blocked, switch to <strong className="text-theme-text">LUKSO</strong> (your UP is a
                              contract there).
                            </>
                          )}
                        </div>
                      )}
                      <p className="text-xs font-medium uppercase tracking-wide text-theme-text-muted">
                        {currentChainLabel}
                      </p>
                      <h4 className="mt-2 text-sm font-semibold text-theme-text">
                        {plainLanguage
                          ? registryUP
                            ? "Add another wallet"
                            : "Tie your first wallet"
                          : registryUP
                            ? "Link this wallet to your Universal Profile"
                            : "Register your first link"}
                      </h4>
                      <p className="mt-1 text-sm text-theme-text-muted">
                        {plainLanguage
                          ? registryUP
                            ? "Paste the main profile address this login should count toward (it may already be filled in)."
                            : "Paste your main profile address, then approve in your wallet. Your linked logins will show in the list above."
                          : registryUP
                            ? "Paste the profile address this wallet should count toward (it may default to your own profile)."
                            : "Paste your Universal Profile address, then approve in your wallet. Linked wallets appear in the list above."}
                      </p>
                      <div className="mt-3 flex gap-2">
                        <input
                          type="text"
                          placeholder={
                            plainLanguage ? "Main profile address (0x…)" : "Paste your UP address (0x…)"
                          }
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
                        <div className="mt-3 rounded-lg border border-red-500/25 bg-red-500/5 px-3 py-2 text-sm text-theme-text-muted">
                          <strong className="text-theme-text">We couldn&apos;t reach the linking service on this network.</strong>{" "}
                          Open <strong>Troubleshooting details</strong> below if you need more information.
                        </div>
                      )}
                      {linkBlockedByDiag && linkOnLuksoInstead && (
                        <div className="mt-3 rounded-lg border border-sky-500/30 bg-sky-500/5 px-3 py-3 text-sm text-theme-text-muted">
                          <p>
                            <strong className="text-theme-text">This is expected on Base.</strong> Your Universal
                            Profile is created on <strong className="text-theme-text">LUKSO</strong>. Complete the link
                            on LUKSO or LUKSO Testnet with the same wallet.
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
                        <div className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-sm text-theme-text-muted">
                          <strong className="text-theme-text">This address doesn&apos;t look like a Universal Profile here.</strong>{" "}
                          Double-check you pasted the right profile address, or switch to LUKSO where it was created.
                        </div>
                      )}
                      <GlowButton
                        onClick={handleLinkEOAtoUP}
                        disabled={isBusy || !upAddress.trim() || linkBlockedByDiag || unlinking}
                        className="mt-3 w-full sm:w-auto"
                      >
                        {status === "linking"
                          ? "Working…"
                          : plainLanguage
                            ? "Approve in wallet"
                            : "Sign to link wallet"}
                      </GlowButton>
                      <p className="mt-2 text-xs text-theme-text-dim">
                        {plainLanguage ? "Need a main profile? " : "Don't have a UP? "}
                        <a
                          href="https://universalprofile.cloud/create"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-theme-accent hover:underline"
                        >
                          {plainLanguage ? "Create one on LUKSO" : "Create one"}
                        </a>
                      </p>
                    </>
                  )}
                </div>

                {(userIsUP || linkedUP) && (
                  <div className="mt-6 rounded-xl border border-theme-border bg-theme-background/60 p-4">
                    <h4 className="text-sm font-semibold text-theme-text">
                      {plainLanguage ? "Your public page" : "Profile & vouches"}
                    </h4>
                    {status === "success" && (
                      <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">
                        {plainLanguage
                          ? "Saved. You can add more wallets the same way."
                          : "Wallet linked. You can link other wallets the same way."}
                      </p>
                    )}
                    <p className="mt-2 text-sm text-theme-text-muted">
                      {plainLanguage
                        ? userIsUP
                          ? isProfileUP && identityVouchStats != null
                            ? "You’re on your main profile. The table above shows endorsements received and sent for each linked login, across networks."
                            : "You’re on your main profile. Endorsements from every wallet you add will show together."
                          : `This login is tied to profile ${linkedUP!.slice(0, 10)}…${linkedUP!.slice(-8)}. Endorsements count toward that profile.`
                        : userIsUP
                          ? isProfileUP && identityVouchStats != null
                            ? "You’re signed in as this Universal Profile. Received counts what others gave you; Sent counts what you gave others — combined across LUKSO, Base, and other supported networks. See the table above for detail."
                            : "You’re signed in as your Universal Profile. Your public page can show endorsements from this address and any wallets you’ve linked on each network."
                          : `This wallet is linked to your profile (${linkedUP!.slice(0, 10)}…${linkedUP!.slice(-8)}). Endorsements for this wallet count toward that profile.`}
                    </p>
                    {targetUP && (
                      <Link
                        to={`/profile/${targetUP}`}
                        className="mt-3 inline-flex text-sm font-medium text-theme-accent hover:underline"
                      >
                        {plainLanguage ? "Open full profile page →" : "Open aggregated profile →"}
                      </Link>
                    )}
                    {!plainLanguage && (
                      <p className="mt-4 text-xs text-theme-text-dim">
                        Add to your Universal Profile grid:{" "}
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
                    )}
                    {plainLanguage && (
                      <p className="mt-4 text-xs text-theme-text-dim">
                        Optional: add Handshake to your profile grid via the{" "}
                        <a
                          href={miniappBase}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-theme-accent hover:underline"
                        >
                          mini app
                        </a>
                        .
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <details className="mt-6 rounded-xl border border-theme-border bg-theme-background/80 p-4">
            <summary className="cursor-pointer text-sm font-medium text-theme-text">
              {plainLanguage ? "Steps" : "How it works"}
            </summary>
            {plainLanguage ? (
              <ol className="mt-3 list-decimal space-y-3 pl-5 text-sm text-theme-text-muted">
                <li>
                  <strong className="text-theme-text">Connect a wallet</strong> using the buttons above.
                </li>
                <li>
                  <strong className="text-theme-text">Choose your main profile address</strong> (the one you
                  want people to see) and approve the request. You usually do this on the LUKSO network.
                </li>
                <li>
                  <strong className="text-theme-text">Open your public page</strong> — endorsements from every
                  wallet you added show together. To stop counting a wallet, remove it (you must be signed in
                  with that wallet on LUKSO).
                </li>
              </ol>
            ) : (
              <ol className="mt-3 list-none space-y-3 text-sm text-theme-text-muted">
                <li className="flex min-w-0 gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-theme-accent-soft text-theme-accent">
                    <Wallet className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 content-safe">
                    <span className="font-medium text-theme-text">Connect on each network you use</span> — Switch to
                    LUKSO, Base, or Base Sepolia in your wallet and link each address you use there.
                  </span>
                </li>
                <li className="flex min-w-0 gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-theme-accent-soft text-theme-accent">
                    <Link2 className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 content-safe">
                    <span className="font-medium text-theme-text">Link wallets on LUKSO</span> — Paste your Universal
                    Profile and approve on LUKSO (or LUKSO Testnet) so this wallet is tied to that profile. If you
                    started on Base, switch network here to finish linking.
                  </span>
                </li>
                <li className="flex min-w-0 gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-theme-accent-soft text-theme-accent">
                    <UserCircle className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 content-safe">
                    <span className="font-medium text-theme-text">Your public profile</span> — open your profile page
                    to see combined endorsements from every linked wallet.
                  </span>
                </li>
              </ol>
            )}
          </details>

          {(error || wallet.error || handshakeHookError) && (
            <div className="mt-4 space-y-2">
              <p className="text-sm text-red-500">{error ?? wallet.error ?? handshakeHookError}</p>
            </div>
          )}

          {account && canLinkHere && !plainLanguage && (
            <details className="mt-6 rounded-xl border border-theme-border bg-theme-background/40 px-3 py-2 text-xs">
              <summary className="cursor-pointer font-medium text-theme-text-muted hover:text-theme-text">
                Troubleshooting details (linking)
                {diagLoading ? " — loading…" : ""}
              </summary>
              {diag && (
                <dl className="mt-3 space-y-2 text-theme-text-dim">
                  <div>
                    <dt className="font-medium text-theme-text-muted">Chain ID</dt>
                    <dd className="font-mono">{diag.chainId}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-theme-text-muted">Handshake on this network</dt>
                    <dd className="break-all font-mono text-[11px]">{diag.handshakeAddress ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-theme-text-muted">Profile lookup</dt>
                    <dd>{diag.registryReadable ? "OK" : "Failed — see detail"}</dd>
                  </div>
                  <div className="break-words text-[11px] leading-relaxed">{diag.registryDetail}</div>
                  {diag.linkedUPOnChain && (
                    <div>
                      <dt className="font-medium text-theme-text-muted">Linked profile (from network)</dt>
                      <dd className="break-all font-mono text-[11px]">{diag.linkedUPOnChain}</dd>
                    </div>
                  )}
                  {diag.upChecked != null && (
                    <div>
                      <dt className="font-medium text-theme-text-muted">Profile address on this network</dt>
                      <dd>
                        {diag.upIsContract
                          ? "Looks like a Universal Profile here — you can link from this network."
                          : "Not a profile on this network — try LUKSO instead."}
                      </dd>
                    </div>
                  )}
                </dl>
              )}
            </details>
          )}
        </div>
        )
      )}
    </div>
  );
}
