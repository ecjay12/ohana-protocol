// Supabase Edge Function: sign-claim
// Verifies location/claim code and returns EIP-191 signature for POAP claimWithSignature
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ethers } from "npm:ethers@6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      event_id,
      wallet_address,
      chain_id,
      lat,
      lng,
      claim_code,
    } = await req.json();

    if (!event_id || !wallet_address || !chain_id) {
      return new Response(
        JSON.stringify({ error: "Missing event_id, wallet_address, or chain_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const signerKey = Deno.env.get("POAP_CLAIM_SIGNER_PRIVATE_KEY");

    if (!signerKey) {
      console.error("POAP_CLAIM_SIGNER_PRIVATE_KEY not set");
      return new Response(
        JSON.stringify({ error: "Claim signing not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("event_id, nft_contract_address, requires_approval, is_poap, location_lat, location_lng, location_radius, qr_code, event_type")
      .eq("event_id", event_id)
      .single();

    if (eventError || !event) {
      return new Response(
        JSON.stringify({ error: "Event not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!event.is_poap || !event.nft_contract_address) {
      return new Response(
        JSON.stringify({ error: "Event does not support POAP claims" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (event.requires_approval) {
      return new Response(
        JSON.stringify({ error: "Event requires manual approval" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify location if required
    if (event.location_lat != null && event.location_lng != null) {
      if (lat == null || lng == null) {
        return new Response(
          JSON.stringify({ error: "Location verification required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const radius = event.location_radius ?? 100;
      const dist = haversineDistance(
        Number(event.location_lat),
        Number(event.location_lng),
        Number(lat),
        Number(lng)
      );
      if (dist > radius) {
        return new Response(
          JSON.stringify({ error: "Location not within event area" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Verify claim code if required
    if (event.qr_code) {
      if (!claim_code || claim_code !== event.qr_code) {
        return new Response(
          JSON.stringify({ error: "Invalid claim code" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // For online events with no location/qr, no extra verification
    const deadline = Math.floor(Date.now() / 1000) + 300; // 5 min
    const wallet = wallet_address.toLowerCase();
    if (!wallet.startsWith("0x") || wallet.length !== 42) {
      return new Response(
        JSON.stringify({ error: "Invalid wallet address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const packed = ethers.solidityPacked(
      ["string", "address", "uint256", "address", "uint256"],
      ["POAPClaim", event.nft_contract_address, BigInt(chain_id), wallet_address, BigInt(deadline)]
    );
    const digest = ethers.keccak256(packed);
    const signer = new ethers.Wallet(signerKey);
    const signature = await signer.signMessage(ethers.getBytes(digest));

    return new Response(
      JSON.stringify({
        signature,
        deadline,
        nft_contract_address: event.nft_contract_address,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
