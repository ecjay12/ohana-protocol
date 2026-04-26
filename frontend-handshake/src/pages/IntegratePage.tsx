/**
 * Integrate / Developers page: how to read Handshake, embed badge, deep-link.
 */

import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Code, Link2, ExternalLink, Github } from "lucide-react";
import { HANDSHAKE_ADDRESSES, HANDSHAKE_CHAIN_IDS, getHandshakeAddress } from "@/config/contracts";
import { GITHUB_REPO_URL, getIntegrationExampleBaseUrl } from "@/config/publicDev";
import { AppLayout } from "@/layout/AppLayout";
import { useInjectedWallet } from "@/hooks/useInjectedWallet";
import { useWalletDisplayLabel } from "@/hooks/useWalletDisplayLabel";
import { useProfileData } from "@/hooks/useProfileData";

const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum",
  42: "LUKSO",
  4201: "LUKSO Testnet",
  8453: "Base",
  84532: "Base Sepolia",
};

function getContractReadme(): string {
  const lines = ["// Handshake addresses from shared/chainConfig.json"];
  for (const id of HANDSHAKE_CHAIN_IDS) {
    const addr = getHandshakeAddress(id);
    if (addr) lines.push(`// ${CHAIN_NAMES[id] ?? `Chain ${id}`} (${id}): ${addr}`);
  }
  lines.push(
    "",
    "const count = await contract.acceptedCount(targetAddress);",
    "const vouchers = await contract.getVouchersFor(targetAddress);",
    "const vouch = await contract.getVouch(targetAddress, voucherAddress);",
    "// vouch: { status, category, timestamp, updatedAt, hidden }"
  );
  return lines.join("\n");
}

export function IntegratePage() {
  const wallet = useInjectedWallet();
  const { profileData: userProfileData, isUP: userIsUP, loading: userProfileLoading } =
    useProfileData(wallet.provider, wallet.accounts[0] ?? null, wallet.chainId);
  const walletDisplayLabel = useWalletDisplayLabel(wallet.accounts[0] ?? null);
  /** Production Handshake app base — for integrators (not localhost; override with `VITE_PUBLIC_APP_URL`). */
  const appOrigin = getIntegrationExampleBaseUrl();

  return (
    <AppLayout
      chainId={wallet.chainId}
      chains={wallet.chains as Record<number, { name: string; rpc: string }>}
      shortAddress={walletDisplayLabel}
      account={wallet.accounts[0]}
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
      <div className="mx-auto min-w-0 max-w-4xl space-y-8 px-3 py-6 sm:space-y-10 sm:px-4 sm:py-8 md:px-6">
        <Link
          to="/app"
          className="inline-flex items-center gap-2 text-sm text-theme-text-muted transition-colors hover:text-theme-text"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to App
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <h1 className="text-balance text-3xl font-bold text-theme-text">Integrate with Ohana Handshake</h1>
          <p className="text-theme-text-muted content-safe">
            Read vouch counts from the contract, embed a badge, or deep-link into the vouch flow.
          </p>
        </motion.div>

        {/* Source & hosting */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="space-y-4 rounded-2xl border border-theme-border bg-theme-surface p-5 sm:p-6"
        >
          <h2 className="flex items-center gap-2 text-lg font-semibold text-theme-text">
            <Github className="h-5 w-5" />
            Source &amp; hosting
          </h2>
          <ul className="list-inside list-disc space-y-2 text-sm text-theme-text-muted content-safe">
            <li>
              <strong className="text-theme-text">Repository</strong> —{" "}
              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-theme-accent hover:underline"
              >
                {GITHUB_REPO_URL.replace(/^https?:\/\//, "")}
              </a>
              . Monorepo: contracts, this app (<code className="rounded bg-theme-surface-strong px-1 font-mono text-xs">frontend-handshake/</code>
              ), LUKSO mini dapp (<code className="rounded bg-theme-surface-strong px-1 font-mono text-xs">frontend-miniapp/</code>
              ).
            </li>
            <li>
              <strong className="text-theme-text">Vercel</strong> — Production deploy is the Vite build from{" "}
              <code className="rounded bg-theme-surface-strong px-1 font-mono text-xs">frontend-handshake</code>{" "}
              with serverless routes in{" "}
              <code className="rounded bg-theme-surface-strong px-1 font-mono text-xs">api/*.js</code>{" "}
              (see below). Set project root to that folder if the Vercel project imports the whole repo.
            </li>
            <li>
              <strong className="text-theme-text">URLs below</strong> — All examples use the production app{" "}
              <code className="rounded bg-theme-surface-strong px-1 font-mono text-xs">{appOrigin}</code>
              . Set{" "}
              <code className="rounded bg-theme-surface-strong px-1 font-mono text-xs">VITE_PUBLIC_APP_URL</code>{" "}
              in Vercel if your live URL differs (custom domain).
            </li>
          </ul>
        </motion.section>

        {/* Read from contract */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          <h2 className="flex items-center gap-2 text-xl font-semibold text-theme-text">
            <Code className="h-5 w-5" />
            Read from contract
          </h2>
          <p className="text-theme-text-muted">
            Contract addresses per chain. Use ethers v6 (or equivalent) to call the Handshake contract.
          </p>
          <div className="overflow-x-auto rounded-xl border border-theme-border bg-theme-surface p-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-theme-text-muted">
                  <th className="pb-2 pr-4">Chain</th>
                  <th className="pb-2">Handshake address</th>
                </tr>
              </thead>
              <tbody className="text-theme-text">
                {HANDSHAKE_CHAIN_IDS.filter((id) => HANDSHAKE_ADDRESSES[id]).map((id) => (
                  <tr key={id}>
                    <td className="py-1 pr-4">{CHAIN_NAMES[id] ?? `Chain ${id}`}</td>
                    <td className="font-mono text-xs">{HANDSHAKE_ADDRESSES[id]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs leading-relaxed text-theme-text-muted content-safe">
            Single source of truth:{" "}
            <code className="rounded bg-theme-surface-strong px-1">frontend-handshake/shared/chainConfig.json</code>{" "}
            in the repo. Redeploy the frontend after changing addresses.
          </p>
          <div className="rounded-xl border border-theme-border bg-theme-surface p-4">
            <p className="mb-2 text-sm font-medium text-theme-text">Main read methods</p>
            <ul className="list-inside list-disc space-y-1 text-sm text-theme-text-muted">
              <li><code className="rounded bg-theme-surface-strong px-1">acceptedCount(address target)</code> → number of accepted vouches</li>
              <li><code className="rounded bg-theme-surface-strong px-1">getVouchersFor(address target)</code> → list of voucher addresses</li>
              <li><code className="rounded bg-theme-surface-strong px-1">getVouch(address target, address voucher)</code> → single vouch (status, category, timestamp, hidden)</li>
            </ul>
          </div>
          <pre className="overflow-x-auto rounded-xl border border-theme-border bg-theme-surface p-4 font-mono text-xs text-theme-text">
            {getContractReadme()}
          </pre>
        </motion.section>

        {/* Deep-link to vouch */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <h2 className="flex items-center gap-2 text-xl font-semibold text-theme-text">
            <Link2 className="h-5 w-5" />
            Deep-link to vouch
          </h2>
          <p className="text-theme-text-muted">
            Link directly to the vouch flow with an address pre-filled. Use this from explorers, profiles, or your app.
          </p>
          <div className="max-w-full overflow-x-auto rounded-xl border border-theme-border bg-theme-surface p-4 font-mono text-sm text-theme-text">
            <code className="break-all">{appOrigin}/vouch?address=0x...</code>
          </div>
          <p className="text-sm text-theme-text-muted">
            The dashboard will open with the address field pre-filled. User connects wallet and submits the vouch.
          </p>
        </motion.section>

        {/* Read from API */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="space-y-4"
        >
          <h2 className="flex items-center gap-2 text-xl font-semibold text-theme-text">
            <Code className="h-5 w-5" />
            Read from API
          </h2>
          <p className="text-theme-text-muted content-safe">
            On Vercel, handlers in <code className="rounded bg-theme-surface-strong px-1">frontend-handshake/api/</code>{" "}
            map to <code className="rounded bg-theme-surface-strong px-1">/api/*</code>. They read the same{" "}
            <code className="rounded bg-theme-surface-strong px-1">shared/chainConfig.json</code> as the client build.
          </p>
          <div className="rounded-xl border border-theme-border bg-theme-surface p-4">
            <p className="mb-2 text-sm font-medium text-theme-text">GET /api/vouches</p>
            <p className="mb-2 text-sm text-theme-text-muted">
              Returns <code className="rounded bg-theme-surface-strong px-1 text-xs">acceptedCount</code> and{" "}
              <code className="rounded bg-theme-surface-strong px-1 text-xs">vouchers[]</code> from RPC. Public GET;{" "}
              <code className="rounded bg-theme-surface-strong px-1 text-xs">Cache-Control</code> includes short CDN cache.
            </p>
          </div>
          <div className="max-w-full overflow-x-auto rounded-xl border border-theme-border bg-theme-surface p-4 font-mono text-sm text-theme-text">
            <p className="mb-1 break-all text-theme-text-muted">GET {appOrigin}/api/vouches?chainId=4201&amp;address=0x...</p>
            <p className="text-xs leading-relaxed text-theme-text-muted content-safe">
              Params: <code className="rounded bg-theme-surface-strong px-1">chainId</code> (optional, default 4201),{" "}
              <code className="rounded bg-theme-surface-strong px-1">address</code> (required). Only chain IDs listed in{" "}
              <code className="rounded bg-theme-surface-strong px-1">chainConfig</code> are supported.
            </p>
          </div>
          <div className="rounded-xl border border-theme-border bg-theme-surface p-4">
            <p className="mb-2 text-sm font-medium text-theme-text">GET /api/github-attestation</p>
            <p className="text-sm text-theme-text-muted content-safe">
              Optional Passport helper: <code className="rounded bg-theme-surface-strong px-1 text-xs">?address=0x...</code> →{" "}
              <code className="rounded bg-theme-surface-strong px-1 text-xs">{"{ hasGitHub: boolean }"}</code>. Set{" "}
              <code className="rounded bg-theme-surface-strong px-1 text-xs">PASSPORT_API_KEY</code> in Vercel env for live
              stamp checks; without it the handler returns <code className="rounded bg-theme-surface-strong px-1 text-xs">hasGitHub: false</code>.
            </p>
            <div className="mt-2 max-w-full overflow-x-auto font-mono text-xs text-theme-text">
              <code className="break-all">GET {appOrigin}/api/github-attestation?address=0x...</code>
            </div>
          </div>
          <p className="text-sm font-medium text-theme-text">Example response</p>
          <pre className="overflow-x-auto rounded-xl border border-theme-border bg-theme-surface p-4 font-mono text-xs text-theme-text">
{`{
  "acceptedCount": 3,
  "vouchers": ["0x...", "0x...", "0x..."]
}`}
          </pre>
          <p className="text-sm font-medium text-theme-text">Example request (curl)</p>
          <pre className="overflow-x-auto rounded-xl border border-theme-border bg-theme-surface p-4 font-mono text-xs text-theme-text">
            {`curl "${appOrigin}/api/vouches?chainId=4201&address=0xYourAddress"`}
          </pre>
        </motion.section>

        {/* Embed the badge */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          <h2 className="text-xl font-semibold text-theme-text">Embed the badge</h2>
          <p className="text-theme-text-muted">
            Embed a “Vouched by N on Ohana” widget with an iframe. The badge page reads from the Handshake contract (or from the API when available).
          </p>
          <div className="max-w-full overflow-x-auto rounded-xl border border-theme-border bg-theme-surface p-4 font-mono text-xs text-theme-text">
            <code className="break-all">&lt;iframe src="{appOrigin}/badge?address=0x...&amp;chainId=4201" width="280" height="48" title="Ohana vouch count" /&gt;</code>
          </div>
          <p className="text-sm text-theme-text-muted">
            Params: <code className="rounded bg-theme-surface-strong px-1">address</code> (required), <code className="rounded bg-theme-surface-strong px-1">chainId</code> (optional, default 4201). Include a “Powered by Ohana” link when embedding.
          </p>
        </motion.section>

        {/* Embed: vouches received & given */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32 }}
          className="space-y-4"
        >
          <h2 className="text-xl font-semibold text-theme-text">Embed: vouches received &amp; given</h2>
          <p className="text-theme-text-muted">
            Embed a small widget that shows both <strong>vouches received</strong> (accepted count) and <strong>vouches given</strong> for an address. Same query params as the badge. On the Dashboard you can copy your personal embed URL and iframe from the &quot;Display your vouches on your site&quot; card.
          </p>
          <div className="max-w-full overflow-x-auto rounded-xl border border-theme-border bg-theme-surface p-4 font-mono text-xs text-theme-text">
            <code className="break-all">&lt;iframe src="{appOrigin}/embed?address=0x...&amp;chainId=4201" width="240" height="72" title="Ohana vouches" /&gt;</code>
          </div>
          <p className="text-sm text-theme-text-muted">
            Params: <code className="rounded bg-theme-surface-strong px-1">address</code> (required), <code className="rounded bg-theme-surface-strong px-1">chainId</code> (optional, default 4201). The widget shows “X received · Y given” and a link to the full profile.
          </p>
        </motion.section>

        {/* Minidapp / Embed */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="space-y-4"
        >
          <h2 className="text-xl font-semibold text-theme-text">Minidapp / Embed</h2>
          <p className="text-theme-text-muted">
            Embed the full Handshake flow in an iframe (e.g. LUKSO Universal Profile miniapp or smart wallet “app” tab). Use a compact layout with optional address from the host.
          </p>
          <div className="max-w-full overflow-x-auto rounded-xl border border-theme-border bg-theme-surface p-4 font-mono text-sm text-theme-text">
            <p className="mb-1 break-all">{appOrigin}/miniapp?embed=1</p>
            <p className="mb-1 break-all">{appOrigin}/miniapp?address=0x...&amp;chainId=4201</p>
            <p className="text-xs text-theme-text-muted">
              Params: <code className="rounded bg-theme-surface-strong px-1">address</code> (optional, from host), <code className="rounded bg-theme-surface-strong px-1">chainId</code> (optional, default 4201), <code className="rounded bg-theme-surface-strong px-1">embed=1</code> (optional).
            </p>
          </div>
          <p className="text-sm leading-relaxed text-theme-text-muted content-safe">
            The host can pass the user address via postMessage:{" "}
            <code className="rounded bg-theme-surface-strong px-1">{"{ type: 'ohana-handshake-address', address: '0x...' }"}</code>
            . The app accepts same-origin messages and optional origins from{" "}
            <code className="rounded bg-theme-surface-strong px-1">VITE_ALLOWED_EMBED_ORIGINS</code> (see{" "}
            <code className="rounded bg-theme-surface-strong px-1">.env.example</code>). Allowlist your deployment URL (and{" "}
            <code className="rounded bg-theme-surface-strong px-1">VITE_MINIAPP_URL</code> / UP Grid) in the host wallet when required.
          </p>
        </motion.section>

        {/* Powered by Ohana */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-4 rounded-2xl border border-theme-border bg-theme-surface p-6"
        >
          <h2 className="flex items-center gap-2 text-xl font-semibold text-theme-text">
            <ExternalLink className="h-5 w-5" />
            For integrators
          </h2>
          <p className="text-theme-text-muted">
            If you use Handshake in your app or display vouch data, you can use the “Powered by Ohana Handshake” badge and link back to us.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={appOrigin}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-theme-border bg-theme-surface-strong px-4 py-2 text-sm font-medium text-theme-text transition-colors hover:border-theme-accent hover:text-theme-accent"
            >
              Powered by Ohana Handshake
            </a>
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-theme-accent hover:underline"
            >
              <Github className="h-4 w-4" />
              Source on GitHub
            </a>
          </div>
          <p className="text-sm text-theme-text-dim content-safe">
            Use the “Powered by Ohana Handshake” text with a link to this app or the repo. Do not misrepresent on-chain vouch data or modify contract semantics in your UI.
          </p>
        </motion.section>
      </div>
    </AppLayout>
  );
}
