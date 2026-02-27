import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase, Event } from "../lib/supabase";
import { useSupabaseAuth } from "../hooks/useSupabaseAuth";
import { useInjectedWallet } from "../hooks/useInjectedWallet";
import { usePOAPForge } from "../hooks/usePOAPForge";
import { useTheme } from "../hooks/useTheme";
import { getGatewayURL } from "../lib/ipfs";
import { LocationVerification } from "../components/LocationVerification";
import { QRCodeScanner } from "../components/QRCodeScanner";
import { SEO } from "../components/SEO";
import { StructuredData } from "../components/StructuredData";
import { motion } from "framer-motion";

export function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useSupabaseAuth();
  const { provider, chainId, accounts, isConnected, connect } = useInjectedWallet();
  const account = accounts[0];
  const { getClaimSignature, claimWithSignature } = usePOAPForge(provider, chainId, account);
  const { theme } = useTheme();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasRequested, setHasRequested] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [locationVerified, setLocationVerified] = useState(false);
  const [verifiedUserLocation, setVerifiedUserLocation] = useState<{ lat: number; lng: number } | null>(null); // Used for getClaimSignature
  const [qrScanned, setQrScanned] = useState(false);
  const [scannedClaimCode, setScannedClaimCode] = useState<string | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const isDark = theme === "dark";
  const heroBg = isDark
    ? "bg-gradient-to-br from-purple-900 via-purple-800 to-pink-800"
    : "bg-gradient-to-br from-purple-500 via-purple-400 to-pink-400";
  const cardBg = isDark ? "bg-[#2d2d44]" : "bg-white";
  const textColor = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-white/70" : "text-slate-600";

  useEffect(() => {
    if (eventId) {
      loadEvent();
      checkExistingRequest();
    }
  }, [eventId, account, user?.email]);

  async function loadEvent() {
    if (!eventId) return;
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("event_id", eventId)
        .single();

      if (error) throw error;
      setEvent(data);
    } catch (error) {
      console.error("Error loading event:", error);
    } finally {
      setLoading(false);
    }
  }

  async function checkExistingRequest() {
    if (!eventId) return;
    const walletToCheck = account?.toLowerCase() ?? (user?.email ? `email:${user.email}` : null);
    if (!walletToCheck) return;
    try {
      const { data } = await supabase
        .from("claim_requests")
        .select("id")
        .eq("event_id", eventId)
        .eq("wallet_address", walletToCheck)
        .maybeSingle();
      setHasRequested(!!data);
    } catch {
      setHasRequested(false);
    }
  }

  const handleRequestClaim = async () => {
    if (!eventId || !user) return;

    // POAP events need wallet for future minting
    if (event?.is_poap && !account) {
      connect();
      return;
    }

    // Check verification requirements based on event type
    if (event?.event_type === "in-person" || event?.event_type === "hybrid") {
      if (!locationVerified && event.location_lat && event.location_lng) {
        setVerificationError("Please verify your location first");
        return;
      }
    }

    setRequesting(true);
    try {
      const verificationData: Record<string, unknown> = {};
      if (locationVerified && event?.location_lat && event?.location_lng) {
        verificationData.lat = event.location_lat;
        verificationData.lng = event.location_lng;
      }
      if (qrScanned) {
        verificationData.qr_scanned = true;
      }

      // Use wallet if connected, otherwise use email-based placeholder for Basic Events
      const walletForClaim = account?.toLowerCase() ?? (user.email ? `email:${user.email}` : null);
      if (!walletForClaim) {
        alert("Please connect your wallet or sign in with email to claim.");
        setRequesting(false);
        return;
      }

      const { error } = await supabase.from("claim_requests").insert({
        event_id: eventId,
        user_email: user.email,
        wallet_address: walletForClaim,
        status: "pending",
        verification_method:
          event?.event_type === "online"
            ? "online"
            : locationVerified
            ? "location"
            : qrScanned
            ? "qr"
            : "manual",
        verification_data: Object.keys(verificationData).length > 0 ? verificationData : null,
        verified_at: locationVerified || qrScanned ? new Date().toISOString() : null,
      });

      if (error) {
        console.error("Claim request error:", error);
        throw new Error(error.message || "Failed to submit claim request.");
      }
      setHasRequested(true);
      alert("Claim request submitted!");
    } catch (error) {
      console.error("Error requesting claim:", error);
      const message = error instanceof Error ? error.message : "Failed to submit request.";
      alert(message);
    } finally {
      setRequesting(false);
    }
  };

  const handleLocationVerified = (location: { lat: number; lng: number }) => {
    setLocationVerified(true);
    setVerifiedUserLocation(location);
    setVerificationError(null);
  };

  const handleQRScanned = (code: string) => {
    setQrScanned(true);
    setScannedClaimCode(code);
    setVerificationError(null);
  };

  const handleClaimDirect = async () => {
    if (!event) return;

    // Basic Event (not POAP yet) - create approved claim record for attendance proof
    if (!event.is_poap) {
      if (!user) {
        alert("Please sign in to claim.");
        return;
      }
      setRequesting(true);
      try {
        const walletForClaim = account?.toLowerCase() ?? (user.email ? `email:${user.email}` : null);
        if (!walletForClaim) {
          alert("Please connect your wallet or sign in with email to claim.");
          setRequesting(false);
          return;
        }
        const { error } = await supabase.from("claim_requests").insert({
          event_id: event.event_id,
          user_email: user.email,
          wallet_address: walletForClaim,
          status: "approved",
          verification_method: "manual",
        });
        if (error) throw error;
        setHasRequested(true);
        alert("Attendance recorded! Upgrade to POAP to mint your NFT.");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to claim.";
        alert(msg);
      } finally {
        setRequesting(false);
      }
      return;
    }

    // POAP event with auto-claim - attendee mints via signature from backend
    if (!isConnected || !account) {
      connect();
      return;
    }

    const nftContract = event.nft_contract_address;
    if (!nftContract) {
      alert("POAP contract not ready. Contact the event creator.");
      setRequesting(false);
      return;
    }

    setRequesting(true);
    try {
      const sig = await getClaimSignature(event.event_id, nftContract, account, {
        lat: verifiedUserLocation?.lat,
        lng: verifiedUserLocation?.lng,
        claimCode: qrScanned ? scannedClaimCode ?? event.qr_code : undefined,
      });
      if (!sig) throw new Error("Could not get claim signature");

      await claimWithSignature(sig.nft_contract_address, account, sig.deadline, sig.signature);

      const verificationMethod =
        event.event_type === "online" ? "online" : locationVerified ? "location" : qrScanned ? "qr" : "manual";
      const { error } = await supabase.from("claim_requests").insert({
        event_id: event.event_id,
        user_email: user?.email,
        wallet_address: account.toLowerCase(),
        status: "approved",
        verification_method: verificationMethod,
      });
      if (error) console.error("Error saving claim:", error);
      setHasRequested(true);
      alert("POAP minted successfully! Check your wallet.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to claim.";
      alert(msg);
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex min-h-screen items-center justify-center ${isDark ? "bg-[#1a1a2e]" : "bg-[#E2E0FF]"}`}>
        <div className={textColor}>Loading...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className={`flex min-h-screen items-center justify-center ${isDark ? "bg-[#1a1a2e]" : "bg-[#E2E0FF]"}`}>
        <div className={textColor}>Event not found</div>
      </div>
    );
  }

  const isCreator =
    event.creator_email === user?.email ||
    event.creator_wallet?.toLowerCase() === account?.toLowerCase();

  return (
    <div className={`min-h-screen ${isDark ? "bg-[#1a1a2e]" : "bg-[#E2E0FF]"} transition-colors`}>
      <SEO
        title={event.title}
        description={event.description || `Join ${event.title} and claim your POAP NFT to prove your attendance.`}
        keywords={`${event.title}, ${event.category || ""}, POAP, NFT, event, ${event.tags?.join(", ") || ""}`}
        image={event.image_cid ? getGatewayURL(event.image_cid) : undefined}
        type="event"
        eventData={{
          name: event.title,
          location: event.location_address || (event.event_type === "online" ? "Online" : undefined),
          organizer: event.creator_email || event.creator_wallet || "Ohana Protocol",
        }}
      />
      <StructuredData type="Event" data={event} />
      <StructuredData
        type="BreadcrumbList"
        data={[
          { name: "Home", url: "https://poapforge.ohana.io/" },
          { name: "Events", url: "https://poapforge.ohana.io/events" },
          { name: event.title, url: `https://poapforge.ohana.io/event/${event.event_id}` },
        ]}
      />
      {/* Hero Section */}
      <div className={`${heroBg} py-16 transition-colors`}>
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-center"
          >
            {event.image_cid && (
              <img
                src={getGatewayURL(event.image_cid)}
                alt={`${event.title} - ${event.description || "Join this event and claim your POAP NFT"}`}
                className="h-80 w-full rounded-2xl object-cover lg:h-96"
                loading="eager"
              />
            )}
            <div>
              <h1 className={`mb-4 text-4xl font-bold ${textColor} sm:text-5xl lg:text-6xl`}>
                {event.title}
              </h1>
              <p className={`mb-6 text-lg ${textSecondary} sm:text-xl`}>{event.description}</p>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={event.requires_approval ? handleRequestClaim : handleClaimDirect}
                  disabled={
                    requesting ||
                    (event.requires_approval && hasRequested) ||
                    event.status !== "active" ||
                    ((event.requires_approval || !event.is_poap) && !user) ||
                    (!event.requires_approval && event.is_poap && !isConnected) ||
                    ((event.event_type === "in-person" || event.event_type === "hybrid") &&
                      event.location_lat != null &&
                      event.location_lng != null &&
                      !locationVerified &&
                      !qrScanned)
                  }
                  className="rounded-full bg-[#FF4092] px-8 py-4 text-lg font-bold text-white shadow-lg shadow-pink-500/25 transition-all hover:bg-[#FF6B9D] disabled:opacity-50"
                >
                  {event.requires_approval
                    ? hasRequested
                      ? "Request Pending"
                      : requesting
                      ? "Requesting..."
                      : (event.event_type === "in-person" || event.event_type === "hybrid") &&
                        event.location_lat &&
                        event.location_lng &&
                        !locationVerified &&
                        !qrScanned
                      ? "Verify Location First"
                      : "Request to Claim"
                    : isConnected
                    ? "Claim POAP"
                    : "Connect Wallet to Claim"}
                </button>
                <button
                  className={`rounded-full border-2 ${isDark ? "border-white/30 bg-white/10" : "border-white/30 bg-white/10"} px-8 py-4 text-lg font-medium text-white backdrop-blur-sm transition-all hover:bg-white/20`}
                >
                  Learn More
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Details Section */}
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-[32px] ${cardBg} p-8 shadow-lg transition-colors`}
        >
          <div className="mb-6 flex items-center justify-between">
            <span
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                event.status === "active"
                  ? isDark
                    ? "bg-green-900/30 text-green-300"
                    : "bg-green-100 text-green-800"
                  : event.status === "paused"
                  ? isDark
                    ? "bg-amber-900/30 text-amber-300"
                    : "bg-amber-100 text-amber-800"
                  : isDark
                  ? "bg-red-900/30 text-red-300"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {event.status}
            </span>
            {isCreator && (
              <Link
                to={`/manage/${event.event_id}`}
                className={`rounded-full border px-6 py-3 font-medium transition-colors ${
                  isDark
                    ? "border-white/20 bg-white/10 text-white hover:bg-white/20"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                Manage Event
              </Link>
            )}
          </div>

          <div className={`grid grid-cols-2 gap-4 rounded-2xl border p-6 ${
            isDark ? "border-white/20 bg-white/5" : "border-slate-200 bg-white"
          }`}>
            <div>
              <div className={`text-sm ${textSecondary}`}>Event Type</div>
              <div className={`text-lg font-semibold ${textColor}`}>
                {event.is_poap ? "POAP" : "Basic Event"}
              </div>
            </div>
            <div>
              <div className={`text-sm ${textSecondary}`}>Location Type</div>
              <div className={`text-lg font-semibold ${textColor}`}>
                {event.event_type === "online" ? "🌐 Online" : event.event_type === "in-person" ? "📍 In-Person" : "🔀 Hybrid"}
              </div>
            </div>
            <div>
              <div className={`text-sm ${textSecondary}`}>Requires Approval</div>
              <div className={`text-lg font-semibold ${textColor}`}>
                {event.requires_approval ? "Yes" : "No"}
              </div>
            </div>
            {event.location_address && (
              <div>
                <div className={`text-sm ${textSecondary}`}>Location</div>
                <div className={`text-lg font-semibold ${textColor}`}>
                  {event.location_address}
                </div>
              </div>
            )}
          </div>

          {/* Verification Section for In-Person/Hybrid Events */}
          {(event.event_type === "in-person" || event.event_type === "hybrid") &&
            event.location_lat &&
            event.location_lng &&
            !hasRequested && (
              <div className="mt-6">
                {verificationError && (
                  <div className={`mb-4 rounded-lg border p-3 ${isDark ? "border-red-500/50 bg-red-900/30 text-red-300" : "border-red-200 bg-red-50 text-red-800"}`}>
                    <p className="text-sm">{verificationError}</p>
                  </div>
                )}
                <LocationVerification
                  eventLat={event.location_lat}
                  eventLng={event.location_lng}
                  eventRadius={event.location_radius || 100}
                  onVerified={handleLocationVerified}
                  onError={(err) => setVerificationError(err)}
                />
              </div>
            )}

          {event.qr_code && !hasRequested && (
            <div className="mt-6">
              <QRCodeScanner qrCode={event.qr_code} onScanned={handleQRScanned} onError={(err) => setVerificationError(err)} />
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
