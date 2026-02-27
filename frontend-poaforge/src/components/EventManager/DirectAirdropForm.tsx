import { useState } from "react";
import { supabase, Event } from "../../lib/supabase";
import { useTheme } from "../../hooks/useTheme";

interface DirectAirdropFormProps {
  eventId: string;
  event: Event;
  onMintPOAP?: (nftContractAddress: string, toAddress: string) => Promise<unknown>;
}

export function DirectAirdropForm({ eventId, event, onMintPOAP }: DirectAirdropFormProps) {
  const { theme } = useTheme();
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);

  const isDark = theme === "dark";
  const cardBg = isDark ? "bg-[#2d2d44]" : "bg-white";
  const borderColor = isDark ? "border-white/20" : "border-slate-200";
  const textColor = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-white/70" : "text-slate-600";
  const inputBg = isDark ? "bg-white/10" : "bg-white";
  const mutedBg = isDark ? "bg-white/5" : "bg-slate-50";

  const handleAirdrop = async () => {
    if (!address || !event.is_poap) {
      alert("Event must be upgraded to POAP first");
      return;
    }

    const nftContract = event.nft_contract_address;
    if (!nftContract || !onMintPOAP) {
      alert("POAP contract not ready. Make sure the event was created on-chain.");
      return;
    }

    const toAddress = address.trim();
    if (!toAddress.startsWith("0x") || toAddress.length !== 42) {
      alert("Please enter a valid Ethereum address (0x...)");
      return;
    }

    setLoading(true);
    try {
      await onMintPOAP(nftContract, toAddress);

      const { error } = await supabase.from("claim_requests").insert({
        event_id: eventId,
        wallet_address: toAddress.toLowerCase(),
        status: "approved",
      });

      if (error) console.error("Error saving claim record:", error);
      alert("POAP minted and airdropped successfully!");
      setAddress("");
    } catch (error) {
      console.error("Error airdropping:", error);
      alert("Failed to mint POAP. Check wallet connection and network.");
    } finally {
      setLoading(false);
    }
  };

  if (!event.is_poap) {
    return (
      <div className={`rounded-2xl border ${borderColor} ${mutedBg} p-6 transition-colors`}>
        <p className={`text-sm ${textSecondary}`}>
          Upgrade to POAP to enable direct airdrops
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border ${borderColor} ${cardBg} p-6 transition-colors`}>
      <h3 className={`mb-4 text-lg font-semibold ${textColor}`}>Direct Airdrop</h3>
      <p className={`mb-4 text-sm ${textSecondary}`}>
        Mint a POAP directly to an address
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="0x..."
          className={`flex-1 rounded-full border ${borderColor} ${inputBg} px-4 py-2 text-sm ${textColor} placeholder-slate-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
        />
        <button
          onClick={handleAirdrop}
          disabled={loading || !address}
          className="rounded-full bg-[#FF4092] px-6 py-2 text-sm font-bold text-white transition-all hover:bg-[#FF6B9D] disabled:opacity-50"
        >
          {loading ? "Minting..." : "Airdrop"}
        </button>
      </div>
    </div>
  );
}
