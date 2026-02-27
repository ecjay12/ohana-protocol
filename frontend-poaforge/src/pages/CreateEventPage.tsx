import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { pinFileToIPFS, pinJSONToIPFS } from "../lib/ipfs";
import { useSupabaseAuth } from "../hooks/useSupabaseAuth";
import { useInjectedWallet } from "../hooks/useInjectedWallet";
import { usePOAPForge } from "../hooks/usePOAPForge";
import { useTheme } from "../hooks/useTheme";
import { AuthModal } from "../components/AuthModal";
import { EVENT_CATEGORIES } from "../components/EventCategories";
import { motion } from "framer-motion";

export function CreateEventPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useSupabaseAuth();
  const { provider, chainId, accounts, isConnected, connect } = useInjectedWallet();
  const account = accounts[0];
  const { createEvent: createOnChainEvent, parseEventCreated, setMintSigner, txPending: onChainPending, error: onChainError } = usePOAPForge(
    provider,
    chainId,
    account
  );
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [createType, setCreateType] = useState<"basic" | "poap">("basic");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    eventId: "",
    requiresApproval: false,
    eventType: "online" as "online" | "in-person" | "hybrid",
    locationAddress: "",
    locationLat: undefined as number | undefined,
    locationLng: undefined as number | undefined,
    locationRadius: 100,
    category: "",
    tags: [] as string[],
    startDatetime: "",
    endDatetime: "",
    // On-chain POAP fields
    nftName: "",
    nftSymbol: "",
    tokenName: "",
    tokenSymbol: "",
    royaltyBps: 500,
    royaltyReceiver: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateSample = () => {
    const sampleData = {
      title: "Sample Tech Conference 2025",
      description: "Join us for an amazing tech conference featuring talks on Web3, AI, and decentralized systems. Network with industry leaders and get your POAP NFT!",
      eventId: `sample-event-${Date.now()}`,
      requiresApproval: false,
      eventType: "online" as const,
      locationAddress: "",
      locationLat: undefined,
      locationLng: undefined,
      locationRadius: 100,
      category: "conference",
      startDatetime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      endDatetime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString().slice(0, 16),
      tags: ["web3", "ai", "blockchain", "tech"],
      nftName: "Tech Conference 2025 POAP",
      nftSymbol: "TCP25",
      tokenName: "Tech Conference 2025 Token",
      tokenSymbol: "TCT25",
      royaltyBps: 500,
      royaltyReceiver: account || "",
    };

    setFormData({
      ...formData,
      ...sampleData,
    });

    // Set a sample image preview
    setImagePreview("https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop");
  };

  // Auto-fill sample data if ?sample=true in URL
  useEffect(() => {
    if (searchParams.get("sample") === "true") {
      handleCreateSample();
      // Remove the query param from URL
      window.history.replaceState({}, "", "/create");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (createType === "poap") {
      // Create on-chain POAP directly
      if (!isConnected) {
        connect();
        return;
      }

      setLoading(true);
      try {
        const eventId = formData.eventId || `event-${Date.now()}`;
        const receipt = await createOnChainEvent(
          eventId,
          formData.nftName || formData.title,
          formData.nftSymbol || "POAP",
          formData.tokenName || `${formData.title} Token`,
          formData.tokenSymbol || "TKN",
          formData.royaltyReceiver || account || "",
          formData.royaltyBps
        );

        if (receipt) {
          const contracts = parseEventCreated(receipt);
          // Enable auto-claim: set mint signer so backend can sign when attendees fulfill verification
          const claimSignerAddress = import.meta.env.VITE_POAP_CLAIM_SIGNER_ADDRESS;
          if (!formData.requiresApproval && contracts?.nftContract && claimSignerAddress && setMintSigner) {
            try {
              await setMintSigner(contracts.nftContract, claimSignerAddress);
            } catch (err) {
              console.warn("Could not set mint signer (auto-claim may not work):", err);
            }
          }
          const { error } = await supabase.from("events").insert({
            event_id: eventId,
            title: formData.title,
            description: formData.description,
            creator_wallet: account?.toLowerCase(),
            status: "active",
            requires_approval: formData.requiresApproval,
            is_poap: true,
            event_type: formData.eventType,
            location_address: formData.locationAddress || null,
            location_lat: formData.locationLat || null,
            location_lng: formData.locationLng || null,
            location_radius: formData.locationRadius || null,
            category: formData.category || null,
            tags: formData.tags.length > 0 ? formData.tags : null,
            start_datetime: formData.startDatetime ? new Date(formData.startDatetime).toISOString() : null,
            end_datetime: formData.endDatetime ? new Date(formData.endDatetime).toISOString() : null,
            nft_contract_address: contracts?.nftContract || null,
            token_contract_address: contracts?.tokenContract || null,
          });

          if (error) console.error("Error saving to Supabase:", error);
          navigate(`/manage/${eventId}`);
        }
      } catch (error) {
        console.error("Error creating POAP:", error);
        alert("Failed to create POAP. Please try again.");
      } finally {
        setLoading(false);
      }
      return;
    }

    // Create Basic Event (Supabase)
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    setLoading(true);
    try {
      let imageCid: string | undefined;
      let metadataCid: string | undefined;

      // Upload image to IPFS (optional - skip if Pinata not configured or fails)
      if (imageFile) {
        try {
          imageCid = await pinFileToIPFS(imageFile);
        } catch (ipfsErr) {
          console.warn("IPFS image upload skipped:", ipfsErr);
          // Continue without image - event will still be created
        }
      }

      // Create and upload metadata JSON (optional - skip if Pinata not configured or fails)
      try {
        const metadata = {
          name: formData.title,
          description: formData.description,
          image: imageCid ? `ipfs://${imageCid}` : undefined,
          created_at: new Date().toISOString(),
        };
        metadataCid = await pinJSONToIPFS(metadata);
      } catch (ipfsErr) {
        console.warn("IPFS metadata upload skipped:", ipfsErr);
        // Continue without metadata CID - event will still be created
      }

      // Generate event ID if not provided
      const eventId = formData.eventId || `event-${Date.now()}`;

      // Save to Supabase
      const { error } = await supabase.from("events").insert({
        event_id: eventId,
        title: formData.title,
        description: formData.description,
        image_cid: imageCid || null,
        metadata_cid: metadataCid || null,
        creator_email: user.email,
        creator_wallet: account?.toLowerCase() || null,
        status: "active",
        requires_approval: formData.requiresApproval,
        is_poap: false,
        event_type: formData.eventType,
        location_address: formData.locationAddress || null,
        location_lat: formData.locationLat ?? null,
        location_lng: formData.locationLng ?? null,
        location_radius: formData.locationRadius || null,
        category: formData.category || null,
        tags: formData.tags.length > 0 ? formData.tags : null,
        start_datetime: formData.startDatetime ? new Date(formData.startDatetime).toISOString() : null,
        end_datetime: formData.endDatetime ? new Date(formData.endDatetime).toISOString() : null,
      });

      if (error) {
        console.error("Supabase insert error:", error);
        throw new Error(error.message || "Database error. Check if Supabase schema is up to date.");
      }

      navigate(`/manage/${eventId}`);
    } catch (error) {
      console.error("Error creating event:", error);
      const message = error instanceof Error ? error.message : "Failed to create event. Please try again.";
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const { theme } = useTheme();
  const isDark = theme === "dark";
  const bgColor = isDark ? "bg-[#2d2d44]" : "bg-white";
  const cardBg = isDark ? "bg-[#2d2d44]" : "bg-white";
  const textColor = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-white/70" : "text-slate-600";
  const inputBg = isDark ? "bg-white/10" : "bg-white";
  const borderColor = isDark ? "border-white/20" : "border-slate-200";

  return (
    <div className={`min-h-screen ${isDark ? "bg-[#1a1a2e]" : "bg-[#E2E0FF]"} transition-colors`}>
      <div className="mx-auto max-w-2xl px-4 py-8 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-[32px] ${bgColor} p-8 shadow-lg transition-colors`}
        >
        <div className="mb-6 flex items-center justify-between">
          <h1 className={`text-3xl font-bold ${textColor}`}>Create Event</h1>
          <button
            type="button"
            onClick={handleCreateSample}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              isDark
                ? "border-purple-500/50 bg-purple-500/20 text-purple-300 hover:bg-purple-500/30"
                : "border-purple-600 bg-purple-50 text-purple-600 hover:bg-purple-100"
            }`}
          >
            📝 Create Sample Event
          </button>
        </div>

        {/* Event Type Toggle */}
        <div className={`mb-6 flex gap-4 rounded-2xl border ${borderColor} ${cardBg} p-1 transition-colors`}>
          <button
            type="button"
            onClick={() => setCreateType("basic")}
            className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              createType === "basic"
                ? isDark
                  ? "bg-purple-600 text-white"
                  : "bg-purple-600 text-white"
                : isDark
                ? `${textSecondary} hover:bg-white/10`
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Basic Event (No Wallet)
          </button>
          <button
            type="button"
            onClick={() => setCreateType("poap")}
            className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              createType === "poap"
                ? isDark
                  ? "bg-purple-600 text-white"
                  : "bg-purple-600 text-white"
                : isDark
                ? `${textSecondary} hover:bg-white/10`
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            POAP (On-Chain)
          </button>
        </div>

        {createType === "basic" && !user && (
          <div className={`mb-6 rounded-2xl p-4 ${isDark ? "bg-amber-900/30 text-amber-300" : "bg-amber-50 text-amber-800"}`}>
            <p className="text-sm">
              Sign in to create Basic Events. You can upgrade to POAP later by connecting your wallet.
            </p>
          </div>
        )}

        {createType === "poap" && !isConnected && (
          <div className={`mb-6 rounded-2xl p-4 ${isDark ? "bg-amber-900/30 text-amber-300" : "bg-amber-50 text-amber-800"}`}>
            <p className="mb-2 text-sm">Connect your wallet to create on-chain POAP events.</p>
            <button
              onClick={connect}
              className="rounded-full bg-[#FF4092] px-4 py-2 text-sm font-bold text-white"
            >
              Connect Wallet
            </button>
          </div>
        )}

        {onChainError && (
          <div className={`mb-6 rounded-2xl border p-4 ${isDark ? "border-red-500/50 bg-red-900/30 text-red-300" : "border-red-200 bg-red-50 text-red-800"}`}>
            <p className="text-sm">{onChainError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className={`mb-2 block text-sm font-medium ${textColor}`}>Event Title</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={`w-full rounded-full border ${borderColor} ${inputBg} px-6 py-3 ${textColor} placeholder-slate-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
              placeholder="My Awesome Event"
            />
          </div>

          <div>
            <label className={`mb-2 block text-sm font-medium ${textColor}`}>Description</label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className={`w-full rounded-2xl border ${borderColor} ${inputBg} px-6 py-3 ${textColor} placeholder-slate-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
              placeholder="Describe your event..."
            />
          </div>

          <div>
            <label className={`mb-2 block text-sm font-medium ${textColor}`}>Event ID (Optional)</label>
            <input
              type="text"
              value={formData.eventId}
              onChange={(e) => setFormData({ ...formData, eventId: e.target.value })}
              className={`w-full rounded-full border ${borderColor} ${inputBg} px-6 py-3 ${textColor} placeholder-slate-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
              placeholder="Auto-generated if left empty"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={`mb-2 block text-sm font-medium ${textColor}`}>Start Date & Time</label>
              <input
                type="datetime-local"
                value={formData.startDatetime}
                onChange={(e) => setFormData({ ...formData, startDatetime: e.target.value })}
                className={`w-full rounded-full border ${borderColor} ${inputBg} px-6 py-3 ${textColor} focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
              />
            </div>
            <div>
              <label className={`mb-2 block text-sm font-medium ${textColor}`}>End Date & Time</label>
              <input
                type="datetime-local"
                value={formData.endDatetime}
                onChange={(e) => setFormData({ ...formData, endDatetime: e.target.value })}
                className={`w-full rounded-full border ${borderColor} ${inputBg} px-6 py-3 ${textColor} focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
              />
            </div>
          </div>

          <div>
            <label className={`mb-2 block text-sm font-medium ${textColor}`}>Event Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className={`w-full rounded-full border ${borderColor} ${inputBg} px-6 py-3 ${textColor} file:mr-4 file:rounded-full file:border-0 file:bg-[#FF4092] file:px-4 file:py-2 file:font-bold file:text-white`}
            />
            {imagePreview && (
              <img
                src={imagePreview}
                alt="Preview"
                className="mt-4 h-48 w-full rounded-2xl object-cover"
              />
            )}
          </div>

          <div>
            <label className={`mb-2 block text-sm font-medium ${textColor}`}>Event Type</label>
            <div className="grid grid-cols-3 gap-3">
              {(["online", "in-person", "hybrid"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({ ...formData, eventType: type })}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    formData.eventType === type
                      ? isDark
                        ? "border-purple-500 bg-purple-600 text-white"
                        : "border-purple-600 bg-purple-600 text-white"
                      : isDark
                      ? `${borderColor} bg-white/5 text-white/80 hover:bg-white/10`
                      : `${borderColor} bg-white text-slate-700 hover:bg-slate-50`
                  }`}
                >
                  {type === "online" ? "🌐 Online" : type === "in-person" ? "📍 In-Person" : "🔀 Hybrid"}
                </button>
              ))}
            </div>
          </div>

          {(formData.eventType === "in-person" || formData.eventType === "hybrid") && (
            <>
              <div>
                <label className={`mb-2 block text-sm font-medium ${textColor}`}>Event Location</label>
                <input
                  type="text"
                  value={formData.locationAddress}
                  onChange={(e) => setFormData({ ...formData, locationAddress: e.target.value })}
                  placeholder="123 Main St, City, State, ZIP"
                  className={`w-full rounded-full border ${borderColor} ${inputBg} px-6 py-3 ${textColor} placeholder-slate-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className={`mb-2 block text-sm font-medium ${textColor}`}>Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.locationLat || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        locationLat: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    placeholder="40.7128"
                    className={`w-full rounded-full border ${borderColor} ${inputBg} px-6 py-3 ${textColor} placeholder-slate-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                  />
                </div>
                <div>
                  <label className={`mb-2 block text-sm font-medium ${textColor}`}>Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.locationLng || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        locationLng: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    placeholder="-74.0060"
                    className={`w-full rounded-full border ${borderColor} ${inputBg} px-6 py-3 ${textColor} placeholder-slate-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                  />
                </div>
                <div>
                  <label className={`mb-2 block text-sm font-medium ${textColor}`}>Radius (meters)</label>
                  <input
                    type="number"
                    value={formData.locationRadius}
                    onChange={(e) =>
                      setFormData({ ...formData, locationRadius: parseInt(e.target.value) || 100 })
                    }
                    placeholder="100"
                    className={`w-full rounded-full border ${borderColor} ${inputBg} px-6 py-3 ${textColor} placeholder-slate-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                  />
                </div>
              </div>

              <div className={`rounded-lg border p-4 ${isDark ? "border-blue-500/50 bg-blue-900/30" : "border-blue-200 bg-blue-50"}`}>
                <p className={`text-sm ${isDark ? "text-blue-300" : "text-blue-800"}`}>
                  💡 Tip: Use Google Maps to get coordinates. Right-click on the location → "What's here?" → Copy coordinates.
                </p>
              </div>
            </>
          )}

          <div>
            <label className={`mb-2 block text-sm font-medium ${textColor}`}>Category</label>
            <select
              value={
                formData.category && EVENT_CATEGORIES.some((c) => c.id === formData.category)
                  ? formData.category
                  : formData.category
                  ? "other"
                  : ""
              }
              onChange={(e) => {
                const val = e.target.value;
                setFormData({
                  ...formData,
                  category: val === "other" ? "" : val,
                });
              }}
              className={`w-full rounded-full border ${borderColor} ${inputBg} px-6 py-3 ${textColor} focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
            >
              <option value="">Select a category</option>
              {EVENT_CATEGORIES.filter((c) => c.id !== "all").map((category) => (
                <option key={category.id} value={category.id}>
                  {category.icon} {category.name}
                </option>
              ))}
              <option value="other">✏️ Other (type your own)</option>
            </select>
            {!EVENT_CATEGORIES.some((c) => c.id === formData.category) && (
              <input
                type="text"
                value={formData.category || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    category: e.target.value.trim().toLowerCase().replace(/\s+/g, "-"),
                  })
                }
                placeholder="Type your category (e.g. hackathon, networking, food)"
                className={`mt-3 w-full rounded-full border ${borderColor} ${inputBg} px-6 py-3 ${textColor} placeholder-slate-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
              />
            )}
          </div>

          <div>
            <label className={`mb-2 block text-sm font-medium ${textColor}`}>Tags (comma-separated)</label>
            <input
              type="text"
              value={formData.tags.join(", ")}
              onChange={(e) => {
                const tags = e.target.value.split(",").map(tag => tag.trim()).filter(tag => tag.length > 0);
                setFormData({ ...formData, tags });
              }}
              placeholder="web3, blockchain, nft, conference"
              className={`w-full rounded-full border ${borderColor} ${inputBg} px-6 py-3 ${textColor} placeholder-slate-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
            />
            <p className={`mt-1 text-xs ${textSecondary}`}>
              Add tags to help people discover your event (e.g., "super-bowl", "conference", "online")
            </p>
          </div>

          {createType === "poap" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={`mb-2 block text-sm font-medium ${textColor}`}>NFT Name</label>
                  <input
                    type="text"
                    required={createType === "poap"}
                    value={formData.nftName}
                    onChange={(e) => setFormData({ ...formData, nftName: e.target.value })}
                    className={`w-full rounded-full border ${borderColor} ${inputBg} px-6 py-3 ${textColor} placeholder-slate-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                    placeholder={formData.title || "My Event NFT"}
                  />
                </div>
                <div>
                  <label className={`mb-2 block text-sm font-medium ${textColor}`}>NFT Symbol</label>
                  <input
                    type="text"
                    required={createType === "poap"}
                    value={formData.nftSymbol}
                    onChange={(e) => setFormData({ ...formData, nftSymbol: e.target.value })}
                    className={`w-full rounded-full border ${borderColor} ${inputBg} px-6 py-3 ${textColor} placeholder-slate-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                    placeholder="MENFT"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={`mb-2 block text-sm font-medium ${textColor}`}>Token Name</label>
                  <input
                    type="text"
                    required={createType === "poap"}
                    value={formData.tokenName}
                    onChange={(e) => setFormData({ ...formData, tokenName: e.target.value })}
                    className={`w-full rounded-full border ${borderColor} ${inputBg} px-6 py-3 ${textColor} placeholder-slate-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                    placeholder={`${formData.title} Token`}
                  />
                </div>
                <div>
                  <label className={`mb-2 block text-sm font-medium ${textColor}`}>Token Symbol</label>
                  <input
                    type="text"
                    required={createType === "poap"}
                    value={formData.tokenSymbol}
                    onChange={(e) => setFormData({ ...formData, tokenSymbol: e.target.value })}
                    className={`w-full rounded-full border ${borderColor} ${inputBg} px-6 py-3 ${textColor} placeholder-slate-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                    placeholder="MET"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={`mb-2 block text-sm font-medium ${textColor}`}>
                    Royalty (bps, 100 = 1%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10000}
                    value={formData.royaltyBps}
                    onChange={(e) => setFormData({ ...formData, royaltyBps: Number(e.target.value) || 0 })}
                    className={`w-full rounded-full border ${borderColor} ${inputBg} px-6 py-3 ${textColor} focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                  />
                </div>
                <div>
                  <label className={`mb-2 block text-sm font-medium ${textColor}`}>
                    Royalty Receiver (optional)
                  </label>
                  <input
                    type="text"
                    value={formData.royaltyReceiver}
                    onChange={(e) => setFormData({ ...formData, royaltyReceiver: e.target.value })}
                    placeholder={account || "0x..."}
                    className={`w-full rounded-full border ${borderColor} ${inputBg} px-6 py-3 font-mono text-sm ${textColor} placeholder-slate-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                  />
                </div>
              </div>
            </>
          )}

          {createType === "basic" && (
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="requiresApproval"
                checked={formData.requiresApproval}
                onChange={(e) => setFormData({ ...formData, requiresApproval: e.target.checked })}
                className={`h-5 w-5 rounded ${isDark ? "border-white/30 text-purple-500" : "border-slate-300 text-purple-500"} focus:ring-purple-500`}
              />
              <label htmlFor="requiresApproval" className={`text-sm font-medium ${textColor}`}>
                Require approval for claims
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || onChainPending || (createType === "poap" && !isConnected)}
            className="w-full rounded-full bg-[#FF4092] px-6 py-4 font-bold text-white shadow-lg shadow-pink-500/25 transition-all hover:bg-[#FF6B9D] disabled:opacity-50"
          >
            {loading || onChainPending
              ? createType === "poap"
                ? "Deploying Contracts..."
                : "Creating..."
              : createType === "poap"
              ? "Create POAP (On-Chain)"
              : "Create Basic Event"}
          </button>
        </form>

        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </motion.div>
      </div>
    </div>
  );
}
