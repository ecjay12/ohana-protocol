import { useState } from "react";
import { supabase, ClaimRequest, Event } from "../../lib/supabase";
import { useTheme } from "../../hooks/useTheme";

interface ClaimRequestCardProps {
  request: ClaimRequest;
  event: Event;
  onUpdate: () => void;
  onMintPOAP?: (nftContractAddress: string, toAddress: string) => Promise<unknown>;
}

export function ClaimRequestCard({ request, event, onUpdate, onMintPOAP }: ClaimRequestCardProps) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);

  const isDark = theme === "dark";
  const cardBg = isDark ? "bg-white/5" : "bg-slate-50";
  const borderColor = isDark ? "border-white/20" : "border-slate-200";
  const textColor = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-white/70" : "text-slate-500";

  const handleApprove = async () => {
    setLoading(true);
    try {
      const walletAddress = request.wallet_address;
      const isRealWallet = walletAddress?.startsWith("0x") && walletAddress.length === 42;

      // For POAP events with real wallet, mint on-chain first
      if (event.is_poap && event.nft_contract_address && isRealWallet && walletAddress && onMintPOAP) {
        await onMintPOAP(event.nft_contract_address, walletAddress);
      }

      const signature = `0x${Math.random().toString(16).slice(2)}`;

      const { error } = await supabase
        .from("claim_requests")
        .update({
          status: "approved",
          signature,
        })
        .eq("id", request.id);

      if (error) throw error;
      onUpdate();
    } catch (error) {
      console.error("Error approving request:", error);
      alert("Failed to approve request. Check wallet connection and network.");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("claim_requests")
        .update({ status: "rejected" })
        .eq("id", request.id);

      if (error) throw error;
      onUpdate();
    } catch (error) {
      console.error("Error rejecting request:", error);
      alert("Failed to reject request");
    } finally {
      setLoading(false);
    }
  };

  const handleBan = async () => {
    if (!confirm("Are you sure you want to ban this user?")) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("claim_requests")
        .update({ status: "banned" })
        .eq("id", request.id);

      if (error) throw error;
      onUpdate();
    } catch (error) {
      console.error("Error banning user:", error);
      alert("Failed to ban user");
    } finally {
      setLoading(false);
    }
  };

  const [mintLoading, setMintLoading] = useState(false);
  const isRealWallet = request.wallet_address?.startsWith("0x") && request.wallet_address.length === 42;
  const canMint = request.status === "approved" && event.is_poap && event.nft_contract_address && isRealWallet && onMintPOAP;

  const handleMint = async () => {
    if (!canMint || !request.wallet_address) return;
    setMintLoading(true);
    try {
      await onMintPOAP!(event.nft_contract_address!, request.wallet_address);
      onUpdate();
    } catch (err) {
      console.error("Error minting:", err);
      alert("Failed to mint. Check wallet connection and network.");
    } finally {
      setMintLoading(false);
    }
  };

  const statusColors = {
    pending: isDark ? "bg-amber-900/30 text-amber-300" : "bg-amber-100 text-amber-800",
    approved: isDark ? "bg-green-900/30 text-green-300" : "bg-green-100 text-green-800",
    rejected: isDark ? "bg-red-900/30 text-red-300" : "bg-red-100 text-red-800",
    banned: isDark ? "bg-slate-900/30 text-slate-300" : "bg-slate-100 text-slate-800",
  };

  return (
    <div className={`rounded-xl border ${borderColor} ${cardBg} p-4 transition-colors`}>
      <div className="mb-2 flex items-center justify-between">
        <div>
          <div className={`font-medium ${textColor}`}>
            {request.user_email || request.wallet_address || "Anonymous"}
          </div>
          {request.wallet_address && (
            <div className={`font-mono text-xs ${textSecondary}`}>
              {request.wallet_address.slice(0, 10)}...{request.wallet_address.slice(-8)}
            </div>
          )}
        </div>
        <span
          className={`rounded-full px-2 py-1 text-xs font-medium ${
            statusColors[request.status]
          }`}
        >
          {request.status}
        </span>
      </div>

      <div className={`mb-3 text-xs ${textSecondary}`}>
        Requested: {new Date(request.created_at).toLocaleString()}
      </div>

      {canMint && (
        <button
          onClick={handleMint}
          disabled={mintLoading}
          className="w-full rounded-full bg-[#FF4092] px-4 py-2 text-sm font-bold text-white transition-all hover:bg-[#FF6B9D] disabled:opacity-50"
        >
          {mintLoading ? "Minting..." : "Mint POAP"}
        </button>
      )}

      {request.status === "pending" && (
        <div className="flex gap-2">
          <button
            onClick={handleApprove}
            disabled={loading}
            className="flex-1 rounded-full bg-[#FF4092] px-4 py-2 text-sm font-bold text-white transition-all hover:bg-[#FF6B9D] disabled:opacity-50"
          >
            Approve
          </button>
          <button
            onClick={handleReject}
            disabled={loading}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
              isDark
                ? "border-red-500/50 bg-red-900/30 text-red-300 hover:bg-red-900/50"
                : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
            }`}
          >
            Reject
          </button>
          <button
            onClick={handleBan}
            disabled={loading}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
              isDark
                ? "border-white/20 bg-white/10 text-white hover:bg-white/20"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            Ban
          </button>
        </div>
      )}
    </div>
  );
}
