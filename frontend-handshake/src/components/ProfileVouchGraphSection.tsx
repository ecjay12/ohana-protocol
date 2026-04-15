/**
 * Ego vouch graph for /profile/:address — same data model as the app, centered on this profile.
 */
import { useProfileVouches } from "@/hooks/useProfileVouches";
import { useVouchGraphData } from "@/hooks/useVouchGraphData";
import {
  getGraphProfileNameLookupChainIds,
  useProfileNamesForAddresses,
} from "@/hooks/useProfileNamesForAddresses";
import { VouchGraph3D } from "@/components/VouchGraph3D";

interface ProfileVouchGraphSectionProps {
  profileAddress: string;
  chainId: number;
  isUP: boolean;
}

export function ProfileVouchGraphSection({
  profileAddress,
  chainId,
  isUP,
}: ProfileVouchGraphSectionProps) {
  const { vouchersForTarget, targetsVouchedBy, loading } = useProfileVouches(
    profileAddress,
    chainId,
    isUP
  );
  const graphData = useVouchGraphData(
    profileAddress,
    vouchersForTarget,
    targetsVouchedBy
  );
  const nodeLabels = useProfileNamesForAddresses(graphData.nodes, chainId, {
    chainIdsForLookup: getGraphProfileNameLookupChainIds(chainId),
  });

  return (
    <div className="glass-card overflow-hidden rounded-2xl border border-theme-border bg-theme-surface">
      <div className="border-b border-theme-border px-4 py-3 sm:px-6">
        <h2 className="text-lg font-semibold text-theme-text">Vouch network</h2>
        <p className="mt-1 text-sm text-theme-text-muted">
          Who endorsed this person and who they endorsed. If they use more than one wallet tied to the same
          profile, this map matches the totals you see elsewhere — including activity on Base and LUKSO.
        </p>
      </div>
      <div className="relative min-h-[380px] w-full">
        {loading ? (
          <div className="flex min-h-[380px] items-center justify-center">
            <p className="text-sm text-theme-text-muted">Loading graph…</p>
          </div>
        ) : (
          <VouchGraph3D
            data={graphData}
            nodeLabels={nodeLabels}
            className="min-h-[380px] w-full"
          />
        )}
      </div>
    </div>
  );
}
