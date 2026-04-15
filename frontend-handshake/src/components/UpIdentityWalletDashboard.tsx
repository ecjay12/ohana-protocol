/**
 * Wallets & UP page — wireframe layout: profile / wallet summary, connected table, manage hints.
 */
import { inferNetworkLabelForIdentity } from "@/lib/inferIdentityNetworks";
import {
  sumIdentityVouchStats,
  type IdentityVouchStat,
} from "@/lib/profileWalletVouchStats";
import { getAddress } from "ethers";

export type UpIdentityWalletDashboardProps = {
  variant: "up" | "eoa";
  /** Signed in as Universal Profile — enables Hide actions per wireframe. */
  navIsUP: boolean;
  targetProfileAddress: string;
  account: string;
  sessionWalletLabel: string;
  upProfileLabel: string;
  namesByAddress: Record<string, string>;
  identityVisible: IdentityVouchStat[] | undefined;
  identityFull: IdentityVouchStat[] | undefined;
  statsLoading: boolean;
  vouchersForTarget: string[];
  targetsVouchedBy: string[];
  viewerIsProfileOwner: boolean;
  hiddenSet: Set<string>;
  setHidden: (eoa: string, hide: boolean) => void;
  /** Turn off hide/show controls (profile page temporary mode). */
  showVisibilityControls?: boolean;
};

function rowNetwork(
  row: IdentityVouchStat,
  isUpRow: boolean,
  vouchersForTarget: string[],
  targetsVouchedBy: string[]
) {
  if (isUpRow) return "LUKSO (profile)";
  const raw = inferNetworkLabelForIdentity(
    row.address,
    vouchersForTarget,
    targetsVouchedBy
  );
  return raw === "—" ? "LUKSO (wallet)" : raw;
}

export function UpIdentityWalletDashboard({
  variant,
  navIsUP,
  targetProfileAddress,
  account,
  sessionWalletLabel,
  upProfileLabel,
  namesByAddress,
  identityVisible,
  identityFull,
  statsLoading,
  vouchersForTarget,
  targetsVouchedBy,
  viewerIsProfileOwner,
  hiddenSet,
  setHidden,
  showVisibilityControls = true,
}: UpIdentityWalletDashboardProps) {
  let profileLower: string;
  try {
    profileLower = getAddress(targetProfileAddress).toLowerCase();
  } catch {
    profileLower = "";
  }

  const totalsVisible = identityVisible ? sumIdentityVouchStats(identityVisible) : null;
  const totalsFull = identityFull ? sumIdentityVouchStats(identityFull) : null;

  const sessionRow = identityFull?.find(
    (r) => r.address.toLowerCase() === account.toLowerCase()
  );

  const showManageChrome = viewerIsProfileOwner && profileLower;

  const accountLower = account.toLowerCase();

  return (
    <div className="space-y-6">
      {variant === "up" ? (
        <section className="rounded-2xl border-2 border-theme-border bg-theme-surface p-5 shadow-sm sm:p-7">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-theme-text-muted">
            Universal profile
          </p>
          <div className="mt-3">
            <p className="text-xs font-medium uppercase tracking-wide text-theme-text-muted">Name</p>
            <p className="text-lg font-semibold text-theme-text sm:text-xl">{upProfileLabel}</p>
          </div>
          <p className="mt-4 break-all font-mono text-sm text-theme-text">{targetProfileAddress}</p>
          {statsLoading ? (
            <div className="mt-4 h-8 w-48 animate-pulse rounded bg-theme-background/80" />
          ) : totalsVisible ? (
            <p className="mt-4 text-sm tabular-nums text-theme-text-muted">
              <span className="text-theme-text">Total given {totalsVisible.given}</span>
              {" · "}
              <span className="text-theme-text">Total received {totalsVisible.received}</span>
              {" · "}
              <span className="font-medium text-theme-text">Total {totalsVisible.total}</span>
              {" "}
              <span className="text-theme-text-dim">(visible wallets)</span>
            </p>
          ) : (
            <p className="mt-4 text-sm text-theme-text-muted">No vouch totals yet.</p>
          )}
        </section>
      ) : (
        <section className="rounded-2xl border-2 border-theme-border bg-theme-surface p-5 shadow-sm sm:p-7">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-theme-text-muted">
            This wallet
          </p>
          <p className="mt-2 text-lg font-semibold text-theme-text">{sessionWalletLabel}</p>
          <p className="mt-2 break-all font-mono text-sm text-theme-text">{account}</p>
          {statsLoading ? (
            <div className="mt-4 h-8 w-48 animate-pulse rounded bg-theme-background/80" />
          ) : sessionRow ? (
            <p className="mt-4 text-sm tabular-nums text-theme-text-muted">
              <span className="text-theme-text">Total given {sessionRow.given}</span>
              {" · "}
              <span className="text-theme-text">Total received {sessionRow.received}</span>
              {" · "}
              <span className="font-medium text-theme-text">
                Total {sessionRow.given + sessionRow.received}
              </span>
            </p>
          ) : (
            <p className="mt-4 text-sm text-theme-text-muted">
              No Handshake activity for this address yet, or data is still loading.
            </p>
          )}
        </section>
      )}

      {variant === "eoa" && (
        <section className="rounded-2xl border-2 border-theme-border bg-theme-surface p-5 shadow-sm sm:p-7">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-theme-text-muted">
            Connected UP identity
          </p>
          <p className="mt-2 text-xs uppercase text-theme-text-muted">Network</p>
          <p className="text-sm text-theme-text">LUKSO (Universal Profile)</p>
          <p className="mt-4 text-xs uppercase text-theme-text-muted">Name / address</p>
          <p className="text-lg font-semibold text-theme-text">{upProfileLabel}</p>
          <p className="mt-1 break-all font-mono text-sm text-theme-text">{targetProfileAddress}</p>
          {statsLoading ? (
            <div className="mt-4 h-8 w-56 animate-pulse rounded bg-theme-background/80" />
          ) : totalsFull ? (
            <p className="mt-4 text-sm tabular-nums text-theme-text-muted">
              <span className="text-theme-text">Total given {totalsFull.given}</span>
              {" · "}
              <span className="text-theme-text">Total received {totalsFull.received}</span>
              {" · "}
              <span className="font-medium text-theme-text">Total {totalsFull.total}</span>
              {" "}
              <span className="text-theme-text-dim">— across linked wallets &amp; networks</span>
            </p>
          ) : null}
        </section>
      )}

      <section className="rounded-2xl border-2 border-theme-border bg-theme-surface p-5 shadow-sm sm:p-7">
        <h2 className="text-base font-bold uppercase tracking-wide text-theme-text">
          Connected wallets
        </h2>
        {statsLoading ? (
          <div className="mt-4 h-32 animate-pulse rounded-lg bg-theme-background/80" />
        ) : !identityVisible?.length ? (
          <p className="mt-4 text-sm text-theme-text-muted">No rows to show yet.</p>
        ) : (
          <>
            <div className="mt-4 overflow-x-auto rounded-xl border border-theme-border">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-theme-border bg-theme-background/50 text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
                    <th className="px-3 py-2.5">Name</th>
                    <th className="px-3 py-2.5">Address</th>
                    <th className="px-3 py-2.5">Network</th>
                    <th className="px-3 py-2.5">Vouches</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let eoaOrdinal = 0;
                    return identityVisible.map((row) => {
                      const isUpRow = row.address.toLowerCase() === profileLower;
                      if (!isUpRow) eoaOrdinal += 1;
                      const key = row.address.toLowerCase();
                      const nameCol = isUpRow
                        ? upProfileLabel
                        : namesByAddress[key] ||
                          (key === accountLower ? sessionWalletLabel : `Wallet ${eoaOrdinal}`);
                      return (
                        <tr key={row.address} className="border-b border-theme-border/80 last:border-0">
                          <td className="px-3 py-3 align-top font-medium text-theme-text">{nameCol}</td>
                          <td className="px-3 py-3 align-top font-mono text-xs text-theme-text break-all">
                            {row.address}
                          </td>
                          <td className="px-3 py-3 align-top text-theme-text-muted">
                            {rowNetwork(row, isUpRow, vouchersForTarget, targetsVouchedBy)}
                          </td>
                          <td className="px-3 py-3 align-top tabular-nums text-theme-text">
                            {row.given} given · {row.received} received
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
            {totalsVisible && (
              <p className="mt-3 text-xs text-theme-text-muted">
                Total given {totalsVisible.given} · Total received {totalsVisible.received} · Total{" "}
                {totalsVisible.total} — added to UP across multiple networks (visible rows).
              </p>
            )}
          </>
        )}
      </section>

      {showManageChrome && identityFull && identityFull.length > 0 && (
        <section className="rounded-2xl border-2 border-dashed border-theme-border bg-theme-background/40 p-5 sm:p-6">
          <h2 className="text-center text-sm font-bold uppercase tracking-[0.15em] text-theme-text">
            Manage wallets
          </h2>
          <p className="mt-2 text-center text-xs text-theme-text-muted">
            Add another wallet to your profile in the section below (paste your Universal Profile address while on
            LUKSO).
          </p>
          {showVisibilityControls ? (
            <>
              <p className="mt-4 text-center text-sm font-medium text-amber-700 dark:text-amber-300">
                Hiding only changes what you see while you&apos;re signed in as the owner — the link between
                wallets and your profile stays in place. Others may still see the full picture until account-wide
                privacy options exist.
              </p>
              {!navIsUP && (
                <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-center text-xs text-amber-900 dark:text-amber-100">
                  To hide a wallet from this view, sign in with your Universal Profile and refresh the page.
                </p>
              )}
            </>
          ) : (
            <p className="mt-4 text-center text-sm text-theme-text-muted">
              Wallet visibility controls are temporarily disabled on this page.
            </p>
          )}
          <ul className="mt-5 space-y-2">
            {identityFull
              .filter((row) => row.address.toLowerCase() !== profileLower)
              .map((row) => {
                const hid = hiddenSet.has(row.address.toLowerCase());
                return (
                  <li
                    key={`manage-${row.address}`}
                    className="flex flex-col gap-2 rounded-lg border border-theme-border bg-theme-surface px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-mono text-xs text-theme-text break-all">{row.address}</span>
                      <span className="ml-2 text-xs text-theme-text-muted">
                        {rowNetwork(row, false, vouchersForTarget, targetsVouchedBy)}
                      </span>
                    </div>
                    {showVisibilityControls && navIsUP ? (
                      <button
                        type="button"
                        onClick={() => setHidden(row.address, !hid)}
                        className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${
                          hid
                            ? "border border-theme-border bg-theme-background text-theme-text-muted hover:text-theme-text"
                            : "bg-red-600/90 text-white hover:bg-red-600"
                        }`}
                      >
                        {hid ? "Show" : "Hide"}
                      </button>
                    ) : (
                      <span className="shrink-0 text-[11px] text-theme-text-dim">
                        {showVisibilityControls ? "—" : "Read-only"}
                      </span>
                    )}
                  </li>
                );
              })}
          </ul>
        </section>
      )}
    </div>
  );
}
