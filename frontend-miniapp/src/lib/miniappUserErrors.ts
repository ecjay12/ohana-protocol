/**
 * User-visible error copy for the Handshake miniapp (tx, reads, wallet).
 * Keeps raw RPC phrases like "missing revert data" out of the UI where possible.
 */

export const OPAQUE_TRANSACTION_MESSAGE =
  "[Handshake miniapp] No revert reason was returned (common in the UP app). Check: LUKSO mainnet vs testnet matches this profile, you have enough LYX for the vouch fee plus gas, and you have not already vouched.";

export const OPAQUE_READ_STATS_MESSAGE =
  "[Handshake miniapp] Couldn’t load Received/Given—RPC didn’t return details. Try refresh. If counts stay wrong, confirm ?chainId= matches this profile (42 or 4201).";

function jsonSnippetForMatching(e: unknown): string {
  try {
    const s = JSON.stringify(e, (_k, v) => (typeof v === "bigint" ? v.toString() : v));
    return s.length > 1800 ? s.slice(0, 1800) : s;
  } catch {
    return "";
  }
}

export function extractRevertText(e: unknown): string {
  if (e instanceof Error) {
    const err = e as Error & {
      code?: string | number;
      reason?: string;
      shortMessage?: string;
      data?: string;
      info?: { error?: { message?: string; data?: string }; reason?: string };
    };
    const codeStr = err.code != null ? String(err.code) : "";
    const nested =
      err.info && typeof err.info === "object" && err.info.error?.message
        ? String(err.info.error.message)
        : "";
    const dataStr =
      err.info && typeof err.info === "object" && err.info.error?.data
        ? String(err.info.error.data)
        : err.data
          ? String(err.data)
          : "";
    return [codeStr, err.reason, nested, dataStr, err.shortMessage, err.message].filter(Boolean).join(" ");
  }
  if (e && typeof e === "object" && "message" in (e as object)) {
    return String((e as { message: unknown }).message);
  }
  return String(e ?? "");
}

export function combinedErrorText(e: unknown): string {
  const parts = [extractRevertText(e), jsonSnippetForMatching(e)].filter(Boolean);
  return parts.join(" ").trim() || "Something went wrong";
}

export function isLikelyOpaqueWalletRevert(raw: string): boolean {
  const lower = raw.toLowerCase();
  if (lower.includes("revert data missing")) return true;
  if (lower.includes("missing revert data")) return true;
  if (lower.includes("missing revert data in transaction")) return true;
  if (lower.includes("missing revert")) return true;
  if (lower.includes("missing response")) return true;
  if (lower.includes("no revert data")) return true;
  if (lower.includes("could not coalesce error")) return true;
  if (lower.includes("transaction reverted without a reason")) return true;
  if (lower.includes("internal json-rpc error")) return true;
  if (lower.includes("execution reverted") && lower.includes("unknown custom error")) return true;
  if (
    lower.includes("missing") &&
    lower.includes("revert") &&
    (lower.includes("data") || lower.includes("reason"))
  ) {
    return true;
  }
  return false;
}

function toFriendlyTransactionError(raw: string): string {
  const lower = raw.toLowerCase();
  if (isLikelyOpaqueWalletRevert(raw)) {
    return OPAQUE_TRANSACTION_MESSAGE;
  }
  if (lower.includes("429") || lower.includes("too many requests") || lower.includes("-32016")) {
    return "The network is busy. Wait a moment and try again.";
  }
  if (lower.includes("insufficient funds") || lower.includes("insufficient balance")) {
    return "Not enough LYX to cover the vouch fee plus gas.";
  }
  if (lower.includes("vouch exists") || lower.includes("already vouched")) {
    return "You've already vouched for this profile.";
  }
  if (lower.includes("cannot vouch for self") || lower.includes("cannot vouch for yourself")) {
    return "You can't vouch for yourself.";
  }
  if (lower.includes("invalid target") || lower.includes("invalid address")) {
    return "Please enter a valid address.";
  }
  if (lower.includes("insufficient fee")) return "Please add enough to cover the vouch fee.";
  if (lower.includes("not pending")) return "This vouch is no longer pending.";
  if (lower.includes("user rejected") || lower.includes("user denied")) {
    return "Transaction was cancelled.";
  }
  if (lower.includes("execution reverted") || lower.includes("call exception")) {
    return "The transaction was rejected on-chain. Check that you’re on LUKSO (mainnet or testnet to match this profile) and have enough LYX.";
  }
  return raw.length > 80 ? "Transaction failed. Please try again." : raw;
}

/** Errors from vouch, revoke, accept, deny, and grid setData. */
export function formatTransactionError(e: unknown): string {
  const raw = combinedErrorText(e);
  const friendly = toFriendlyTransactionError(raw);
  if (isLikelyOpaqueWalletRevert(raw) || isLikelyOpaqueWalletRevert(friendly)) {
    return OPAQUE_TRANSACTION_MESSAGE;
  }
  return friendly;
}

/** Map persisted handshake/wallet error strings for display (e.g. after opaque RPC). */
export function userFacingHandshakeError(message: string | null | undefined): string | null {
  if (message == null || message === "") return null;
  if (isLikelyOpaqueWalletRevert(message)) return OPAQUE_TRANSACTION_MESSAGE;
  return message;
}

/** Stats RPC (`acceptedCount`, `getTargetsVouchedBy`). */
export function formatReadStatsError(e: unknown): string {
  const raw = combinedErrorText(e);
  const lower = raw.toLowerCase();
  if (isLikelyOpaqueWalletRevert(raw)) return OPAQUE_READ_STATS_MESSAGE;
  if (lower.includes("429") || lower.includes("too many requests") || lower.includes("-32016")) {
    return "Public RPC is rate-limited. Wait a moment and try again.";
  }
  if (
    lower.includes("fetch failed") ||
    lower.includes("network error") ||
    lower.includes("failed to fetch") ||
    lower.includes("networkrequestfailed")
  ) {
    return "Network error. Check your connection and try again.";
  }
  if (lower.includes("timeout") || lower.includes("timed out")) {
    return "Request timed out. Try again.";
  }
  if (
    lower.includes("bad data") ||
    lower.includes("could not decode") ||
    lower.includes("invalid bigint") ||
    lower.includes("overflow")
  ) {
    return "Couldn’t read on-chain data—confirm this profile uses Handshake on LUKSO (chain and contract).";
  }
  if (lower.includes("execution reverted") || lower.includes("call exception")) {
    return "Couldn’t read vouch stats on this network. Check ?chainId= matches the profile (42 / 4201).";
  }
  if (raw.length > 100) return "Couldn’t load vouch stats. Try again.";
  return raw;
}

/** Injected wallet: connect + switch chain. */
export function formatWalletConnectError(e: unknown): string {
  const raw = combinedErrorText(e);
  const lower = raw.toLowerCase();
  if (isLikelyOpaqueWalletRevert(raw)) {
    return "[Handshake miniapp] Wallet didn’t return error details. Try again or use the Universal Profile / LUKSO app.";
  }
  if (
    lower.includes("user rejected") ||
    lower.includes("user denied") ||
    lower.includes("rejected the request") ||
    lower.includes("user cancelled")
  ) {
    return "Request was cancelled in your wallet.";
  }
  if (
    lower.includes("4902") ||
    lower.includes("chain not added") ||
    lower.includes("unrecognized chain") ||
    lower.includes("wrong network")
  ) {
    return "Add or switch to the LUKSO network in your wallet, then try again.";
  }
  if (lower.includes("already pending")) {
    return "A wallet request is already open—finish or close it first.";
  }
  if (lower.includes("wallet") && lower.includes("not")) {
    return "No usable wallet. Install the Universal Profile browser extension or open in the LUKSO app.";
  }
  if (raw.length > 120) return "Wallet action failed. Try again.";
  return raw;
}
