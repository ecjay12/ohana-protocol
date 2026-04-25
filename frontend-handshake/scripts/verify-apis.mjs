/**
 * Integration checks for indexer + serverless API handlers (no Vite required).
 * Run: node scripts/verify-apis.mjs
 * Exit 1 on failure.
 */
import { getAddress } from "ethers";
import { fileURLToPath, pathToFileURL } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
function apiUrl(filename) {
  return pathToFileURL(join(root, "api", filename)).href;
}

const GQL = "https://indexer.sigmacore.io/v1/graphql";

const NAME_SEARCH = `
query ProfileSearchByName($pattern: String!, $lim: Int!) {
  universal_profile(
    where: { lsp3Profile: { name: { value: { _ilike: $pattern } } } }
    limit: $lim
  ) {
    address
    lsp3Profile { name { value } }
  }
}
`;

const BATCH = `
query B($addresses: [String!]!) {
  universal_profile(where: { address: { _in: $addresses } }) {
    address
    lsp3Profile { name { value } }
  }
}
`;

function fail(msg) {
  console.error("FAIL:", msg);
  process.exit(1);
}

function ok(msg) {
  console.log("OK:", msg);
}

async function testIndexerNameSearch() {
  const r = await fetch(GQL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: NAME_SEARCH, variables: { pattern: "%lukso%", lim: 3 } }),
  });
  if (!r.ok) fail(`name search http ${r.status}`);
  const j = await r.json();
  if (j.errors?.length) fail(String(j.errors[0].message));
  const n = j.data?.universal_profile?.length ?? 0;
  if (n < 1) fail("name search: expected ≥1 row");
  ok(`indexer LSP3 name search (${n} sample row(s))`);
}

async function testIndexerBatch() {
  const sample = "0x2e5fb1a1a921ed9e71a50107c0289c9a8da79797";
  const r = await fetch(GQL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: BATCH, variables: { addresses: [sample.toLowerCase()] } }),
  });
  if (!r.ok) fail(`batch http ${r.status}`);
  const j = await r.json();
  if (j.errors?.length) fail(String(j.errors[0].message));
  const row = j.data?.universal_profile?.[0];
  if (!row) fail("batch: no row for sample address");
  ok(`indexer batch profile (name: ${row.lsp3Profile?.name?.value ?? "n/a"})`);
}

function mockRes() {
  let payload;
  return {
    setHeader() {},
    status(code) {
      this._code = code;
      return {
        json: (body) => {
          payload = body;
        },
      };
    },
    getPayload() {
      return payload;
    },
  };
}

async function testProfileSearchHandler() {
  const { default: handler } = await import(apiUrl("profile-search.js"));
  const res = mockRes();
  const req = { method: "GET", query: { q: "lukso", limit: "2" } };
  await handler(req, res);
  const p = res.getPayload();
  if (!p || !Array.isArray(p.hits) || p.hits.length < 1) {
    fail("profile-search handler: no hits");
  }
  if (p.error) fail(`profile-search handler error: ${p.error}`);
  try {
    getAddress(p.hits[0].address);
  } catch {
    fail("profile-search: invalid address in hit");
  }
  ok("api/profile-search handler (mock req/res)");
}

async function testIndexerProfilesHandler() {
  const { default: handler } = await import(apiUrl("indexer-profiles.js"));
  const res = mockRes();
  const addr = "0x2e5fb1a1a921ed9e71a50107c0289c9a8da79797";
  const req = {
    method: "POST",
    body: { addresses: [addr] },
    on() {},
  };
  await handler(req, res);
  const p = res.getPayload();
  const k = Object.keys(p?.profiles || {})[0];
  if (!k || !p.profiles[k]) fail("indexer-profiles: empty profiles");
  ok(`api/indexer-profiles handler (name: ${p.profiles[k].name ?? "n/a"})`);
}

async function testHandshakeActivityHandler() {
  const { default: handler } = await import(apiUrl("handshake-activity.js"));
  const res = mockRes();
  const req = { method: "GET", query: {} };
  await handler(req, res);
  const p = res.getPayload();
  if (!p || !Array.isArray(p.items)) fail("handshake-activity: missing items array");
  if (p.source !== "handshake-activity" || p.dapp !== true) fail("handshake-activity: unexpected payload shape");
  const kinds = new Set(p.items.map((i) => i.kind));
  if (p.items.length === 0) {
    console.warn(
      "WARN: handshake-activity returned 0 items (no grid/vouches in the current index window is possible)"
    );
  } else if (!kinds.has("grid") && !kinds.has("vouch")) {
    fail("handshake-activity: item kinds not grid|vouch");
  }
  ok(
    p.items.length
      ? `api/handshake-activity (items: ${p.items.length}, kinds: ${[...kinds].join(",")})`
      : "api/handshake-activity (empty feed, structure OK)"
  );
}

console.log("Handshake API / indexer integration checks\n");
await testIndexerNameSearch();
await testIndexerBatch();
await testProfileSearchHandler();
await testIndexerProfilesHandler();
await testHandshakeActivityHandler();
console.log("\nAll checks passed.");
process.exit(0);
