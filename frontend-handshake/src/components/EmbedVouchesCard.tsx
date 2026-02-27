/**
 * Card: "Display your vouches on your site"
 * Shows embed URL and iframe snippet when connected; placeholder when not.
 */

import { useState, useCallback } from "react";
import { GlassCard } from "./GlassCard";
import { GlowButton } from "./GlowButton";
import { Copy, Check, Code } from "lucide-react";

interface EmbedVouchesCardProps {
  account: string | undefined;
  chainId: number;
  origin?: string;
}

export function EmbedVouchesCard({
  account,
  chainId,
  origin = typeof window !== "undefined" ? window.location.origin : "",
}: EmbedVouchesCardProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedIframe, setCopiedIframe] = useState(false);

  const embedUrl =
    account && origin
      ? `${origin}/embed?address=${encodeURIComponent(account)}&chainId=${chainId}`
      : "";

  const iframeSnippet = embedUrl
    ? `<iframe
  src="${embedUrl}"
  width="280"
  height="120"
  frameborder="0"
  title="Ohana vouches"
></iframe>`
    : "";

  const copyUrl = useCallback(() => {
    if (!embedUrl) return;
    navigator.clipboard.writeText(embedUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  }, [embedUrl]);

  const copyIframe = useCallback(() => {
    if (!iframeSnippet) return;
    navigator.clipboard.writeText(iframeSnippet);
    setCopiedIframe(true);
    setTimeout(() => setCopiedIframe(false), 2000);
  }, [iframeSnippet]);

  return (
    <GlassCard>
      <div className="mb-2 flex items-center gap-2">
        <Code className="h-5 w-5 text-theme-accent" />
        <h3 className="text-base font-semibold text-theme-text">
          Display your vouches on your site
        </h3>
      </div>
      <p className="mb-4 text-sm text-theme-text-muted">
        Embed your vouch count (received and given) on your own site. When connected,
        use the link and iframe below.
      </p>
      {!account ? (
        <p className="rounded-xl border border-theme-border bg-theme-surface px-4 py-3 text-sm text-theme-dim">
          Connect wallet to get your embed link.
        </p>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-theme-text-muted">
              Embed URL
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                readOnly
                value={embedUrl}
                className="min-w-0 flex-1 rounded-xl border border-theme-border bg-theme-surface px-4 py-2.5 font-mono text-xs text-theme-text"
              />
              <GlowButton
                variant="secondary"
                onClick={copyUrl}
                className="shrink-0"
              >
                {copiedUrl ? (
                  <Check className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </GlowButton>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-theme-text-muted">
              Copy-paste iframe
            </label>
            <pre className="overflow-x-auto rounded-xl border border-theme-border bg-theme-surface p-3 font-mono text-xs text-theme-text">
              {iframeSnippet}
            </pre>
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-xs text-theme-dim">
                Adjust width/height as needed. Consider linking to Ohana (“Powered by Ohana”).
              </p>
              <GlowButton variant="secondary" onClick={copyIframe}>
                {copiedIframe ? (
                  <Check className="h-4 w-4 text-emerald-400 mr-1" />
                ) : (
                  <Copy className="h-4 w-4 mr-1" />
                )}
                Copy
              </GlowButton>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-theme-text-muted">
              Preview
            </label>
            <div className="rounded-xl border border-theme-border bg-theme-bg p-4">
              <iframe
                src={embedUrl}
                width="280"
                height="120"
                title="Ohana vouches preview"
                className="rounded-lg border border-theme-border"
              />
            </div>
          </div>
        </div>
      )}
    </GlassCard>
  );
}
