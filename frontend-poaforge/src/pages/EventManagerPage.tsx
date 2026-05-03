import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase, Event, ClaimRequest } from "../lib/supabase";
import { useSupabaseAuth } from "../hooks/useSupabaseAuth";
import { useInjectedWallet } from "../hooks/useInjectedWallet";
import { usePOAPForge, submitForgeCreateEvent, parseEventCreatedFromReceipt, submitSetMintSignerOnNft } from "../hooks/usePOAPForge";
import { getPOAPForgeAddress } from "../config/contracts";
import { useTheme } from "../hooks/useTheme";
import { getGatewayURL } from "../lib/ipfs";
import { StatsCard } from "../components/EventManager/StatsCard";
import { StatusToggle } from "../components/EventManager/StatusToggle";
import { ModerationQueue } from "../components/EventManager/ModerationQueue";
import { DirectAirdropForm } from "../components/EventManager/DirectAirdropForm";
import { motion } from "framer-motion";

export function EventManagerPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user } = useSupabaseAuth();
  const { provider, chainId, accounts, connect, chains } = useInjectedWallet();
  const account = accounts[0];
  const { mintPOAP } = usePOAPForge(provider, chainId, account);
  const { theme } = useTheme();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimRequests, setClaimRequests] = useState<ClaimRequest[]>([]);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [upgradePending, setUpgradePending] = useState(false);

  const isDark = theme === "dark";
  const bgColor = isDark ? "bg-[#1a1a2e]" : "bg-[#E2E0FF]";
  const cardBg = isDark ? "bg-[#2d2d44]" : "bg-white";
  const textColor = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-white/70" : "text-slate-600";

  useEffect(() => {
    if (eventId) {
      loadEvent();
      loadClaimRequests();
      
      // Subscribe to claim requests updates
      const subscription = supabase
        .channel(`claim_requests:${eventId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "claim_requests", filter: `event_id=eq.${eventId}` },
          () => {
            loadClaimRequests();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [eventId]);

  async function loadEvent() {
    if (!eventId) return;
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("event_id", eventId)
        .single();

      if (error) throw error;

      // Check if user is creator
      if (
        data.creator_email !== user?.email &&
        data.creator_wallet?.toLowerCase() !== account?.toLowerCase()
      ) {
        navigate("/");
        return;
      }

      setEvent(data);
    } catch (error) {
      console.error("Error loading event:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadClaimRequests() {
    if (!eventId) return;
    try {
      const { data, error } = await supabase
        .from("claim_requests")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setClaimRequests(data || []);
    } catch (error) {
      console.error("Error loading claim requests:", error);
    }
  }

  const handleToggleStatus = async (isActive: boolean) => {
    if (!eventId || !event) return;
    try {
      const { error } = await supabase
        .from("events")
        .update({ status: isActive ? "active" : "paused" })
        .eq("event_id", eventId);

      if (error) throw error;
      setEvent({ ...event, status: isActive ? "active" : "paused" });
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status");
    }
  };

  const handleUpgradeToPOAP = async () => {
    setUpgradeError(null);
    if (!eventId || !event || event.is_poap) return;

    let prov = provider;
    let cid = chainId;
    let acc = account;

    if (!prov || !acc) {
      const connected = await connect();
      if (!connected?.accounts[0]) {
        setUpgradeError("Connect a browser wallet (e.g. MetaMask) to upgrade.");
        return;
      }
      prov = connected.provider;
      cid = connected.chainId;
      acc = connected.accounts[0];
    }

    if (!getPOAPForgeAddress(cid)) {
      const wrongLabel = (chains as Record<number, { name: string }>)[cid]?.name ?? `chain ${cid}`;
      const supported = Object.entries(chains as Record<number, { name: string }>)
        .map(([id, c]) => `${c.name} (${id})`)
        .join(", ");
      setUpgradeError(`POAP Forge is not deployed on ${wrongLabel}. Switch your wallet to: ${supported}.`);
      return;
    }

    const base = event.event_id.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6) || "POAP";
    const nftSymbol = `${base}P`.slice(0, 10);
    const tokenSymbol = `${base}T`.slice(0, 10);

    setUpgradePending(true);
    try {
      const receipt = await submitForgeCreateEvent(
        prov,
        cid,
        acc,
        event.event_id,
        `${event.title} POAP`,
        nftSymbol,
        `${event.title} Token`,
        tokenSymbol,
        acc,
        500
      );

      const contracts = parseEventCreatedFromReceipt(receipt);
      const claimSignerAddress = import.meta.env.VITE_POAP_CLAIM_SIGNER_ADDRESS;
      if (!event.requires_approval && contracts?.nftContract && claimSignerAddress) {
        try {
          await submitSetMintSignerOnNft(prov, contracts.nftContract, claimSignerAddress);
        } catch (err) {
          console.warn("Could not set mint signer (auto-claim may not work):", err);
        }
      }

      const { error: upErr } = await supabase
        .from("events")
        .update({
          is_poap: true,
          nft_contract_address: contracts?.nftContract ?? null,
          token_contract_address: contracts?.tokenContract ?? null,
          creator_wallet: acc.toLowerCase(),
        })
        .eq("event_id", eventId);

      if (upErr) throw upErr;
      setEvent({
        ...event,
        is_poap: true,
        nft_contract_address: contracts?.nftContract,
        token_contract_address: contracts?.tokenContract,
        creator_wallet: acc.toLowerCase(),
      });
    } catch (err) {
      console.error("Upgrade to POAP failed:", err);
      const raw =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err && "message" in err
            ? String((err as { message: unknown }).message)
            : "Upgrade failed.";
      const lower = raw.toLowerCase();
      const friendly =
        lower.includes("user rejected") || lower.includes("user denied")
          ? "Transaction was cancelled."
          : lower.includes("event exists") || lower.includes("event already exists")
            ? "This event ID is already on-chain. Use a new event or contact support."
            : raw.length > 200
              ? "Upgrade failed. Check the console or try again."
              : raw;
      setUpgradeError(friendly);
    } finally {
      setUpgradePending(false);
    }
  };

  const exportCSV = () => {
    if (!event) return;
    
    const rows = [
      ["Email", "Wallet Address", "Status", "Requested At"],
      ...claimRequests.map((req) => [
        req.user_email || "",
        req.wallet_address || "",
        req.status,
        new Date(req.created_at).toLocaleString(),
      ]),
    ];

    const csv = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${event.event_id}-attendees.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className={`flex min-h-screen items-center justify-center ${bgColor}`}>
        <div className={textColor}>Loading...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className={`flex min-h-screen items-center justify-center ${bgColor}`}>
        <div className={textColor}>Event not found</div>
      </div>
    );
  }

  const pendingCount = claimRequests.filter((r) => r.status === "pending").length;
  const approvedCount = claimRequests.filter((r) => r.status === "approved").length;
  const borderColor = isDark ? "border-white/20" : "border-slate-200";

  return (
    <div className={`min-h-screen ${bgColor} transition-colors`}>
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-[32px] ${cardBg} p-8 shadow-lg transition-colors`}
        >
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className={`text-3xl font-bold ${textColor}`}>{event.title}</h1>
              <p className={`mt-2 ${textSecondary}`}>{event.description}</p>
            </div>
            {event.image_cid && (
              <img
                src={getGatewayURL(event.image_cid)}
                alt={event.title}
                className="h-24 w-24 rounded-2xl object-cover"
              />
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Left Panel: Stats and Controls */}
            <div className="space-y-6">
              <StatsCard
                totalMints={approvedCount}
                pendingRequests={pendingCount}
                views={0} // TODO: Implement views tracking
              />

              <div className={`rounded-2xl border ${borderColor} ${cardBg} p-6 transition-colors`}>
                <h3 className={`mb-4 text-lg font-semibold ${textColor}`}>Control Panel</h3>
                
                <div className="mb-4">
                  <StatusToggle
                    isActive={event.status === "active"}
                    onToggle={handleToggleStatus}
                  />
                </div>

                {!event.is_poap && (
                  <div className="space-y-2">
                    {upgradeError && (
                      <p className={`rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm ${isDark ? "text-red-200" : "text-red-800"}`}>
                        {upgradeError}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={handleUpgradeToPOAP}
                      disabled={upgradePending}
                      className="w-full rounded-full bg-[#FF4092] px-6 py-3 font-bold text-white shadow-lg shadow-pink-500/25 transition-all hover:bg-[#FF6B9D] disabled:opacity-50"
                    >
                      {upgradePending ? "Upgrading…" : "Upgrade to POAP"}
                    </button>
                  </div>
                )}

                <button
                  onClick={exportCSV}
                  className={`mt-4 w-full rounded-full border ${borderColor} ${isDark ? "bg-white/10 text-white hover:bg-white/20" : "bg-white text-slate-700 hover:bg-slate-50"} px-6 py-3 font-medium transition-colors`}
                >
                  Export CSV
                </button>
              </div>

              <DirectAirdropForm eventId={eventId!} event={event} onMintPOAP={mintPOAP} />
            </div>

            {/* Right Panel: Moderation Queue */}
            <div>
              <ModerationQueue
                event={event}
                claimRequests={claimRequests}
                onUpdate={loadClaimRequests}
                onMintPOAP={mintPOAP}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
