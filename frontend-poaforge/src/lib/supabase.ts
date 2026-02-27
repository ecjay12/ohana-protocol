import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase environment variables:", {
    url: supabaseUrl ? "✓" : "✗",
    key: supabaseAnonKey ? "✓" : "✗",
  });
  // Don't throw - allow app to load but Supabase operations will fail gracefully
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient("https://placeholder.supabase.co", "placeholder-key");

// Database types
export interface Event {
  id: string;
  event_id: string;
  title: string;
  description?: string;
  image_cid?: string;
  metadata_cid?: string;
  creator_email?: string;
  creator_wallet?: string;
  status: "active" | "paused" | "ended";
  requires_approval: boolean;
  is_poap: boolean;
  event_type?: "online" | "in-person" | "hybrid"; // Event location type
  location_address?: string; // Physical address
  location_lat?: number; // Latitude
  location_lng?: number; // Longitude
  location_radius?: number; // Radius in meters for verification
  qr_code?: string; // QR code for check-in
  category?: string; // Event category (conference, sports, super-bowl, online, etc.)
  tags?: string[]; // Additional tags for filtering
  start_datetime?: string; // Event start (ISO 8601)
  end_datetime?: string; // Event end (ISO 8601)
  nft_contract_address?: string;
  token_contract_address?: string;
  created_at: string;
  updated_at: string;
}

export interface ClaimRequest {
  id: string;
  event_id: string;
  user_email?: string;
  wallet_address?: string;
  status: "pending" | "approved" | "rejected" | "banned";
  signature?: string;
  verification_method?: "location" | "qr" | "manual" | "online";
  verification_data?: {
    lat?: number;
    lng?: number;
    qr_scanned?: boolean;
    verified_by?: string;
  };
  verified_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  wallet_address: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}
