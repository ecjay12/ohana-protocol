import { ClaimRequest, Event } from "../../lib/supabase";
import { ClaimRequestCard } from "./ClaimRequestCard";
import { useTheme } from "../../hooks/useTheme";

interface ModerationQueueProps {
  event: Event;
  claimRequests: ClaimRequest[];
  onUpdate: () => void;
  onMintPOAP?: (nftContractAddress: string, toAddress: string) => Promise<unknown>;
}

export function ModerationQueue({ event, claimRequests, onUpdate, onMintPOAP }: ModerationQueueProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const cardBg = isDark ? "bg-[#2d2d44]" : "bg-white";
  const borderColor = isDark ? "border-white/20" : "border-slate-200";
  const textColor = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-white/70" : "text-slate-600";

  const pendingRequests = claimRequests.filter((r) => r.status === "pending");
  const otherRequests = claimRequests.filter((r) => r.status !== "pending");

  return (
    <div className={`rounded-2xl border ${borderColor} ${cardBg} p-6 transition-colors`}>
      <h3 className={`mb-4 text-lg font-semibold ${textColor}`}>Moderation Queue</h3>

      {pendingRequests.length === 0 && otherRequests.length === 0 ? (
        <div className={`py-8 text-center ${textSecondary}`}>No claim requests yet</div>
      ) : (
        <div className="space-y-4">
          {pendingRequests.length > 0 && (
            <div>
              <h4 className={`mb-2 text-sm font-medium ${isDark ? "text-amber-400" : "text-amber-600"}`}>
                Pending ({pendingRequests.length})
              </h4>
              <div className="space-y-2">
                {pendingRequests.map((request) => (
                  <ClaimRequestCard
                    key={request.id}
                    request={request}
                    event={event}
                    onUpdate={onUpdate}
                    onMintPOAP={onMintPOAP}
                  />
                ))}
              </div>
            </div>
          )}

          {otherRequests.length > 0 && (
            <div>
              <h4 className={`mb-2 text-sm font-medium ${textSecondary}`}>
                Other ({otherRequests.length})
              </h4>
              <div className="space-y-2">
                {otherRequests.map((request) => (
                  <ClaimRequestCard
                    key={request.id}
                    request={request}
                    event={event}
                    onUpdate={onUpdate}
                    onMintPOAP={onMintPOAP}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
