/**
 * Profile address resolution (who to vouch for).
 * Per LUKSO docs: contextAccounts when embedded in LUKSO Grid, else URL ?address=.
 * @see https://docs.lukso.tech/learn/mini-apps/connect-upprovider/
 * @see https://docs.lukso.tech/learn/mini-apps/setting-your-grid/
 */
import { useSearchParams } from "react-router-dom";

export function useHostAddress(contextAccountFromUP: string | null): string | null {
  const [searchParams] = useSearchParams();
  const urlAddress = searchParams.get("address")?.trim() ?? null;
  return contextAccountFromUP ?? urlAddress;
}
