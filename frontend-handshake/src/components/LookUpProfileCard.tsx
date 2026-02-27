/**
 * Card: Look up a profile by address.
 */

import { GlassCard } from "./GlassCard";
import { ProfileSearch } from "./ProfileSearch";
import { Search } from "lucide-react";

interface LookUpProfileCardProps {
  /** Compact layout for sidebar (narrow width) */
  compact?: boolean;
}

export function LookUpProfileCard({ compact = false }: LookUpProfileCardProps) {
  return (
    <GlassCard className={compact ? "border-0 bg-transparent p-0 shadow-none" : ""}>
      <div className={`flex items-center gap-2 ${compact ? "mb-2" : "mb-4"}`}>
        <Search className={`text-theme-accent ${compact ? "h-4 w-4" : "h-5 w-5"}`} />
        <h3 className={`font-semibold text-theme-text ${compact ? "text-sm" : "text-base"}`}>Look up a profile</h3>
      </div>
      {!compact && (
        <p className="mb-4 text-sm text-theme-text-muted">
          Enter a Universal Profile address to view their vouches and profile.
        </p>
      )}
      <ProfileSearch compact={compact} />
    </GlassCard>
  );
}
