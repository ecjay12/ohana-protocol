/**
 * Integrate / Developers page: how to read Handshake, embed badge, deep-link.
 */

import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Code, Link2, ExternalLink } from "lucide-react";
import { HANDSHAKE_ADDRESSES, HANDSHAKE_CHAIN_IDS, getHandshakeAddress } from "@/config/contracts";
import { AppLayout } from "@/layout/AppLayout";
import { useInjectedWallet } from "@/hooks/useInjectedWallet";
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
  const { profileData: userProfileData, isUP: userIsUP } = useProfileData(
    wallet.provider,
    wallet.accounts[0] ?? null,
    wallet.chainId
  );
  const appOrigin = typeof window !== "undefined" ? window.location.origin : "https://yourapp.com";

  return (
    <AppLayout
      chainId={wallet.chainId}
      chains={wallet.chains as Record<number, { name: string; rpc: string }>}
      shortAddress={wallet.accounts[0] ? `${wallet.accounts[0].slice(0, 6)}…${wallet.accounts[0].slice(-4)}` : ""}
      account={wallet.accounts[0]}
      isConnected={wallet.isConnected}
      hasInjected={wallet.hasInjected}
      availableWallets={wallet.availableWallets}
      walletError={wallet.error}
      userProfileData={userProfileData}
      userIsUP={userIsUP}
      onConnect={wallet.connect}
      onConnectWith={wallet.connectWith}
      onSwitchChain={wallet.switchChain}
      onDisconnect={wallet.disconnect}
    >
      <div className="mx-auto max-w-4xl space-y-8 px-3 py-6 sm:space-y-10 sm:px-4 sm:py-8 md:px-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-theme-text-muted transition-colors hover:text-theme-text"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <h1 className="text-3xl font-bold text-theme-text">Integrate with Ohana Handshake</h1>
          <p className="text-theme-text-muted">
            Use the Handshake contract as the vouch layer for on-chain identity. Read vouch counts, embed a badge, or deep-link to vouch.
          </p>
        </motion.div>

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
          <p className="text-xs text-theme-text-muted">
            Addresses from <code className="rounded bg-theme-surface-strong px-1">shared/chainConfig.json</code>. Update after deploying.
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
          <div className="rounded-xl border border-theme-border bg-theme-surface p-4 font-mono text-sm text-theme-text">
            <code>{appOrigin}/vouch?address=0x...</code>
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
          <p className="text-theme-text-muted">
            When deployed with a serverless backend (e.g. Vercel), the <code className="rounded bg-theme-surface-strong px-1">api/vouches.js</code> handler serves vouch data. Same config as the frontend (<code className="rounded bg-theme-surface-strong px-1">shared/chainConfig.json</code>).
          </p>
          <div className="rounded-xl border border-theme-border bg-theme-surface p-4 font-mono text-sm text-theme-text">
            <p className="mb-1 text-theme-text-muted">GET {appOrigin}/api/vouches?chainId=4201&amp;address=0x...</p>
            <p className="text-xs text-theme-text-muted">Params: <code className="rounded bg-theme-surface-strong px-1">chainId</code> (optional, default 4201), <code className="rounded bg-theme-surface-strong px-1">address</code> (required). Supported chains: LUKSO (42), Base (8453), LUKSO Testnet (4201), Base Sepolia (84532).</p>
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
          <div className="rounded-xl border border-theme-border bg-theme-surface p-4 font-mono text-xs text-theme-text">
            <code>&lt;iframe src="{appOrigin}/badge?address=0x...&amp;chainId=4201" width="280" height="48" title="Ohana vouch count" /&gt;</code>
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
          <div className="rounded-xl border border-theme-border bg-theme-surface p-4 font-mono text-xs text-theme-text">
            <code>&lt;iframe src="{appOrigin}/embed?address=0x...&amp;chainId=4201" width="240" height="72" title="Ohana vouches" /&gt;</code>
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
          <div className="rounded-xl border border-theme-border bg-theme-surface p-4 font-mono text-sm text-theme-text">
            <p className="mb-1">{appOrigin}/miniapp?embed=1</p>
            <p className="mb-1">{appOrigin}/miniapp?address=0x...&amp;chainId=4201</p>
            <p className="text-xs text-theme-text-muted">
              Params: <code className="rounded bg-theme-surface-strong px-1">address</code> (optional, from host), <code className="rounded bg-theme-surface-strong px-1">chainId</code> (optional, default 4201), <code className="rounded bg-theme-surface-strong px-1">embed=1</code> (optional).
            </p>
          </div>
          <p className="text-sm text-theme-text-muted">
            The host can also pass the current user address via postMessage: <code className="rounded bg-theme-surface-strong px-1">{"{ type: 'ohana-handshake-address', address: '0x...' }"}</code>. In production, allowlist the miniapp origin in your wallet or embed config.
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
          <div className="flex flex-wrap items-center gap-4">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-theme-border bg-theme-surface-strong px-4 py-2 text-sm font-medium text-theme-text transition-colors hover:border-theme-accent hover:text-theme-accent"
            >
              Powered by Ohana Handshake
            </a>
          </div>
          <p className="text-sm text-theme-text-dim">
            Badge asset and guidelines: use the text “Powered by Ohana Handshake” with a link to this app. No modification of the Handshake contract or misrepresentation of vouch data.
          </p>
        </motion.section>
      </div>
    </AppLayout>
  );
}
