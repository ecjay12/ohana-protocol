import { Navigate, useSearchParams } from "react-router-dom";

/**
 * Redirects /vouch?address=0x... to /app?vouchAddress=0x... so the dashboard shows with address pre-filled.
 */
export function VouchRedirect() {
  const [searchParams] = useSearchParams();
  const address = searchParams.get("address");
  if (address?.startsWith("0x") && address.length === 42) {
    return <Navigate to={`/app?vouchAddress=${encodeURIComponent(address)}`} replace />;
  }
  return <Navigate to="/app" replace />;
}
