import { useState } from "react";
import { useTheme } from "../hooks/useTheme";

interface LocationVerificationProps {
  eventLat?: number;
  eventLng?: number;
  eventRadius?: number;
  onVerified: (location: { lat: number; lng: number }) => void;
  onError: (error: string) => void;
}

export function LocationVerification({
  eventLat,
  eventLng,
  eventRadius = 100,
  onVerified,
  onError,
}: LocationVerificationProps) {
  const { theme } = useTheme();
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDark = theme === "dark";
  const bgColor = isDark ? "bg-[#2d2d44]" : "bg-white";
  const textColor = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-white/70" : "text-slate-600";
  const borderColor = isDark ? "border-white/20" : "border-slate-200";

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  const handleVerifyLocation = async () => {
    if (!eventLat || !eventLng) {
      onError("Event location not configured");
      return;
    }

    setVerifying(true);
    setError(null);

    try {
      if (!navigator.geolocation) {
        throw new Error("Geolocation is not supported by your browser");
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;
          const distance = calculateDistance(eventLat, eventLng, userLat, userLng);

          if (distance <= eventRadius) {
            onVerified({ lat: userLat, lng: userLng });
          } else {
            const errorMsg = `You are ${Math.round(distance)}m away from the event location. Please be within ${eventRadius}m to claim.`;
            setError(errorMsg);
            onError(errorMsg);
          }
          setVerifying(false);
        },
        (err) => {
          const errorMsg = `Location access denied: ${err.message}`;
          setError(errorMsg);
          onError(errorMsg);
          setVerifying(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to verify location";
      setError(errorMsg);
      onError(errorMsg);
      setVerifying(false);
    }
  };

  return (
    <div className={`rounded-2xl border ${borderColor} ${bgColor} p-6 transition-colors`}>
      <h3 className={`mb-4 text-lg font-semibold ${textColor}`}>Location Verification</h3>
      <p className={`mb-4 text-sm ${textSecondary}`}>
        This is an in-person event. Please enable location access to verify you're at the event
        location.
      </p>

      {error && (
        <div className={`mb-4 rounded-lg border p-3 ${isDark ? "border-red-500/50 bg-red-900/30 text-red-300" : "border-red-200 bg-red-50 text-red-800"}`}>
          <p className="text-sm">{error}</p>
        </div>
      )}

      <button
        onClick={handleVerifyLocation}
        disabled={verifying}
        className="w-full rounded-full bg-[#FF4092] px-6 py-3 font-bold text-white shadow-lg shadow-pink-500/25 transition-all hover:bg-[#FF6B9D] disabled:opacity-50"
      >
        {verifying ? "Verifying Location..." : "Verify My Location"}
      </button>

      <p className={`mt-3 text-xs ${textSecondary}`}>
        We'll check if you're within {eventRadius}m of the event location.
      </p>
    </div>
  );
}
