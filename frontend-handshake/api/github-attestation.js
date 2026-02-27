/**
 * Serverless proxy for Passport stamps: GET /api/github-attestation?address=0x...
 * Returns { hasGitHub: boolean }. Requires PASSPORT_API_KEY env when deployed.
 */
const PASSPORT_STAMPS_URL = "https://api.passport.xyz/v2/stamps";

function hasGitHubStamp(items) {
  if (!Array.isArray(items)) return false;
  for (const item of items) {
    const str = JSON.stringify(item).toLowerCase();
    if (str.includes("github")) return true;
  }
  return false;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const address = req.query.address?.trim();
  if (!address || address.length > 42 || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return res.status(400).json({ error: "Invalid address" });
  }
  const apiKey = process.env.PASSPORT_API_KEY;
  if (!apiKey) {
    return res.status(200).json({ hasGitHub: false });
  }
  try {
    const response = await fetch(`${PASSPORT_STAMPS_URL}/${address}`, {
      headers: { "X-API-KEY": apiKey },
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return res.status(200).json({ hasGitHub: false });
      }
      return res.status(response.status).json({ hasGitHub: false });
    }
    const data = await response.json();
    const items = data?.items ?? [];
    const hasGitHub = hasGitHubStamp(items);
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate");
    return res.status(200).json({ hasGitHub });
  } catch (e) {
    console.error("github-attestation error:", e);
    return res.status(200).json({ hasGitHub: false });
  }
}
