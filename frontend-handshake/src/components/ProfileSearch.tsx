/**
 * Profile search — navigate by checksummed address or LSP3 name (LUKSO indexer).
 */

import { useState, useRef } from "react";
import { Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getAddress } from "ethers";
import { GlowButton } from "./GlowButton";
import { searchUniversalProfilesByLsp3Name } from "@/lib/lspIndexerProfiles";

interface ProfileSearchProps {
  compact?: boolean;
}

function shortAddr(a: string) {
  if (a.length < 12) return a;
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function ProfileSearch({ compact = false }: ProfileSearchProps) {
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [nameHits, setNameHits] = useState<{ address: string; name: string | null }[] | null>(null);
  const navigate = useNavigate();
  const abortRef = useRef<AbortController | null>(null);

  const goToProfile = (address: string) => {
    setQuery("");
    setError(null);
    setNameHits(null);
    navigate(`/profile/${address}`);
  };

  const handleSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed) {
      setError("Please enter an address or name");
      return;
    }

    setNameHits(null);
    abortRef.current?.abort();
    abortRef.current = null;

    try {
      const normalized = getAddress(trimmed);
      setError(null);
      goToProfile(normalized);
      return;
    } catch {
      /* not a valid address — try name search */
    }

    if (trimmed.length < 2) {
      setError("Use at least 2 characters to search by name");
      return;
    }

    setLoading(true);
    setError(null);
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const hits = await searchUniversalProfilesByLsp3Name(trimmed, {
        limit: compact ? 12 : 20,
        signal: ac.signal,
      });
      if (ac.signal.aborted) return;

      if (hits.length === 0) {
        setError("No indexed profile matches that name");
        return;
      }
      if (hits.length === 1) {
        goToProfile(hits[0].address);
        return;
      }
      setNameHits(hits);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError("Name search failed. Try again.");
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void handleSearch();
    }
  };

  return (
    <div className="space-y-2">
      <div className={`flex gap-2 ${compact ? "flex-col" : ""}`}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-dim" />
          <input
            type="text"
            placeholder="Address or profile name…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setError(null);
              setNameHits(null);
            }}
            onKeyDown={handleKeyDown}
            disabled={loading}
            className="w-full rounded-xl border border-theme-border bg-theme-surface py-2.5 pl-10 pr-10 text-sm text-theme-text placeholder:text-theme-dim focus:border-theme-accent focus:outline-none focus:ring-2 focus:ring-theme-accent-soft disabled:opacity-60"
            autoComplete="off"
          />
          {query && !loading && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setError(null);
                setNameHits(null);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-dim hover:text-theme-text"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <GlowButton variant="secondary" onClick={() => void handleSearch()} disabled={!query.trim() || loading}>
          {loading ? "Searching…" : "View Profile"}
        </GlowButton>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {nameHits && nameHits.length > 0 && (
        <div
          className={`rounded-xl border border-theme-border bg-theme-surface/80 ${compact ? "max-h-48" : "max-h-64"} overflow-y-auto`}
          role="listbox"
          aria-label="Matching profiles"
        >
          <p className="border-b border-theme-border px-3 py-2 text-xs text-theme-text-muted">
            {nameHits.length} matches — pick one
          </p>
          <ul className="divide-y divide-theme-border">
            {nameHits.map((h) => (
              <li key={h.address}>
                <button
                  type="button"
                  className="flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-theme-accent-soft"
                  onClick={() => goToProfile(h.address)}
                >
                  <span className="font-medium text-theme-text">{h.name ?? shortAddr(h.address)}</span>
                  <span className="font-mono text-xs text-theme-dim">{h.address}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
