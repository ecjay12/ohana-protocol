/**
 * Profile search component - search for and navigate to any profile.
 */

import { useState } from "react";
import { Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getAddress } from "ethers";
import { GlowButton } from "./GlowButton";

interface ProfileSearchProps {
  compact?: boolean;
}

export function ProfileSearch({ compact = false }: ProfileSearchProps) {
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSearch = () => {
    const trimmed = query.trim();
    if (!trimmed) {
      setError("Please enter an address");
      return;
    }

    try {
      // Validate address format
      const normalized = getAddress(trimmed);
      setError(null);
      navigate(`/profile/${normalized}`);
      setQuery("");
    } catch {
      setError("Invalid address format");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="space-y-2">
      <div className={`flex gap-2 ${compact ? "flex-col" : ""}`}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-dim" />
          <input
            type="text"
            placeholder="Search profile by address..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setError(null);
            }}
            onKeyPress={handleKeyPress}
            className="w-full rounded-xl border border-theme-border bg-theme-surface pl-10 pr-10 py-2.5 font-mono text-sm text-theme-text placeholder:text-theme-dim focus:border-theme-accent focus:outline-none focus:ring-2 focus:ring-theme-accent-soft"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setError(null);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-dim hover:text-theme-text"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <GlowButton variant="secondary" onClick={handleSearch} disabled={!query.trim()}>
          View Profile
        </GlowButton>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
