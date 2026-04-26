/**
 * Profile header: on-chain LSP3/LSP4 metadata (name, avatar, links, etc.).
 */

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  ExternalLink,
  User,
  Github,
  Youtube,
  Instagram,
  Linkedin,
  Twitter,
  Music2,
} from "lucide-react";
import type { ProfileData } from "@/lib/lsp4Profile";
import { isShortAddressLabel } from "@/lib/upDisplayLabel";

interface ProfileHeaderProps {
  profileData: ProfileData | null;
  address: string;
  isUP?: boolean;
  loading?: boolean;
  isOwnProfile?: boolean;
  hasGitHubVerified?: boolean;
  /** Vouch count from Handshake contract — shown as "X vouches via Handshake" when > 0 */
  acceptedCount?: number;
  /** When on-chain name is missing, LSP3 name from LUKSO indexer (sidebar / fast path). */
  indexerFallbackName?: string | null;
  /** When on-chain avatar is missing, LSP3 profile image from LUKSO indexer. */
  indexerFallbackAvatarUrl?: string | null;
}

function getLinkIcon(title: string, url: string) {
  const lower = (title + url).toLowerCase();
  if (lower.includes("youtube") || lower.includes("youtu.be")) return Youtube;
  if (lower.includes("twitter") || lower.includes("x.com")) return Twitter;
  if (lower.includes("instagram")) return Instagram;
  if (lower.includes("linkedin")) return Linkedin;
  if (lower.includes("github")) return Github;
  if (lower.includes("tiktok")) return Music2;
  if (lower.includes("spotify")) return Music2;
  return ExternalLink;
}

export function ProfileHeader({
  profileData,
  address,
  loading = false,
  isOwnProfile: _isOwnProfile = false,
  hasGitHubVerified = false,
  acceptedCount,
  indexerFallbackName = null,
  indexerFallbackAvatarUrl = null,
}: ProfileHeaderProps) {
  const formatAddress = (addr: string) => `${addr.slice(0, 10)}…${addr.slice(-8)}`;

  const displayName = useMemo(() => {
    const n = profileData?.name?.trim();
    if (n) return n;
    const fb = indexerFallbackName?.trim();
    if (fb && !isShortAddressLabel(fb)) return fb;
    return formatAddress(address);
  }, [profileData, address, indexerFallbackName]);

  const displayAvatar = profileData?.avatar ?? indexerFallbackAvatarUrl ?? null;
  const displayBackground = profileData?.background ?? null;

  const displayDescription = useMemo(() => profileData?.description?.trim() ?? "", [profileData]);

  const mergedTags = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const t of profileData?.tags ?? []) {
      const s = t.trim();
      if (!s || seen.has(s)) continue;
      seen.add(s);
      out.push(s);
    }
    return out;
  }, [profileData]);

  const mergedLinks = profileData?.links ?? [];

  const hasIndexerLsp3 =
    (indexerFallbackName?.trim() && !isShortAddressLabel(indexerFallbackName)) ||
    Boolean(indexerFallbackAvatarUrl?.trim());

  const showNoMetadataHint = !loading && !profileData && !hasIndexerLsp3;

  if (loading) {
    return (
      <div className="glass-card overflow-hidden rounded-2xl border border-theme-border bg-theme-surface">
        <div className="h-32 animate-pulse bg-theme-surface-strong" />
        <div className="flex gap-4 p-6">
          <div className="h-20 w-20 -mt-10 shrink-0 animate-pulse rounded-full border-4 border-theme-bg bg-theme-surface-strong" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-40 animate-pulse rounded bg-theme-surface-strong" />
            <div className="h-3 w-56 animate-pulse rounded bg-theme-surface-strong" />
            <div className="h-3 w-32 animate-pulse rounded bg-theme-surface-strong" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card overflow-hidden rounded-2xl border border-theme-border bg-theme-surface"
    >
      {displayBackground ? (
        <div className="relative h-32 w-full overflow-hidden bg-theme-surface-strong sm:h-40">
          <img
            src={displayBackground}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        </div>
      ) : (
        <div className="h-20 w-full bg-gradient-to-br from-theme-accent/20 to-theme-accent/5 sm:h-24" />
      )}

      <div className="relative px-4 pb-6 pt-2 sm:px-6">
        <div className="-mt-12 sm:-mt-14">
          <div className="inline-block rounded-full border-4 border-theme-bg bg-theme-bg">
            {displayAvatar ? (
              <img
                src={displayAvatar}
                alt={displayName}
                className="h-20 w-20 rounded-full object-cover sm:h-24 sm:w-24"
                decoding="async"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = "flex";
                }}
              />
            ) : null}
            <div
              className="flex h-20 w-20 items-center justify-center rounded-full bg-theme-surface-strong sm:h-24 sm:w-24"
              style={{ display: displayAvatar ? "none" : "flex" }}
            >
              <User className="h-10 w-10 text-theme-text-dim sm:h-12 sm:w-12" />
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <h2
            className={`text-xl font-semibold text-theme-text sm:text-2xl ${isShortAddressLabel(displayName) ? "font-mono tracking-tight" : ""}`}
          >
            {displayName}
          </h2>
          {hasGitHubVerified && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-theme-surface-strong px-2 py-0.5 text-xs font-medium text-theme-text"
              title="GitHub linked (verified via Passport)"
            >
              <Github className="h-3.5 w-3.5" />
              GitHub verified
            </span>
          )}
        </div>
        <p className="mt-1 font-mono text-sm text-theme-text-muted">{address}</p>

        {showNoMetadataHint && (
          <p className="mt-2 text-xs text-theme-text-muted">
            No profile metadata (LSP3/LSP4) found for this address.
          </p>
        )}

        {mergedTags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {mergedTags.map((tag, i) => (
              <span
                key={`${tag}-${i}`}
                className="rounded-full bg-theme-accent-soft px-3 py-1 text-xs font-medium text-theme-accent"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {displayDescription ? (
          <p className="mt-3 text-sm text-theme-text">{displayDescription}</p>
        ) : null}

        {acceptedCount != null && acceptedCount > 0 && (
          <p className="mt-2 text-sm text-theme-text-muted">
            {acceptedCount} {acceptedCount === 1 ? "vouch" : "vouches"} via Handshake
          </p>
        )}

        {mergedLinks.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {mergedLinks.map((link, i) => {
              const Icon = getLinkIcon(link.title, link.url);
              return (
                <a
                  key={`${link.url}-${i}`}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-theme-surface px-3 py-2 text-sm text-theme-text transition-colors hover:bg-theme-surface-strong"
                  title={link.title}
                >
                  <Icon className="h-4 w-4 text-theme-text-muted" />
                  <span className="max-w-[120px] truncate sm:max-w-[180px]">{link.title}</span>
                  <ExternalLink className="h-3 w-3 shrink-0 text-theme-text-dim" />
                </a>
              );
            })}
          </div>
        )}

        {(profileData?.lsp26Data && Object.keys(profileData.lsp26Data).length > 0) ||
        (profileData?.lsp27Data && Object.keys(profileData.lsp27Data).length > 0) ? (
          <details className="mt-4">
            <summary className="cursor-pointer text-xs font-medium text-theme-text-muted hover:text-theme-text">
              Raw LSP26/LSP27 data
            </summary>
            <div className="mt-2 space-y-2">
              {profileData?.lsp26Data && Object.keys(profileData.lsp26Data).length > 0 && (
                <div className="rounded-lg border border-theme-border bg-theme-surface p-3">
                  <p className="mb-1 text-xs font-medium text-theme-text-muted">LSP26</p>
                  <pre className="max-h-32 overflow-auto text-xs text-theme-text-dim">
                    {JSON.stringify(profileData.lsp26Data, null, 2)}
                  </pre>
                </div>
              )}
              {profileData?.lsp27Data && Object.keys(profileData.lsp27Data).length > 0 && (
                <div className="rounded-lg border border-theme-border bg-theme-surface p-3">
                  <p className="mb-1 text-xs font-medium text-theme-text-muted">LSP27</p>
                  <pre className="max-h-32 overflow-auto text-xs text-theme-text-dim">
                    {JSON.stringify(profileData.lsp27Data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </details>
        ) : null}
      </div>
    </motion.div>
  );
}
