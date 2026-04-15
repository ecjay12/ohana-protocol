import type { VouchData } from "@/types/handshake";

/** Count rows whose latest status matches one of `statuses`. */
export function countVouchesWithStatus(
  keys: readonly string[],
  statuses: Record<string, VouchData>,
  want: readonly number[]
): number {
  const set = new Set(want);
  let n = 0;
  for (const k of keys) {
    const s = statuses[k]?.status;
    if (s !== undefined && set.has(s)) n += 1;
  }
  return n;
}
