import { useState, useRef, useEffect } from "react";
import { useTheme } from "../hooks/useTheme";

interface QRCodeScannerProps {
  qrCode: string;
  onScanned: (scannedCode: string) => void;
  onError: (error: string) => void;
}

export function QRCodeScanner({ qrCode, onScanned, onError }: QRCodeScannerProps) {
  const { theme } = useTheme();
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const isDark = theme === "dark";
  const bgColor = isDark ? "bg-[#2d2d44]" : "bg-white";
  const textColor = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-white/70" : "text-slate-600";
  const borderColor = isDark ? "border-white/20" : "border-slate-200";

  useEffect(() => {
    return () => {
      // Cleanup: stop camera stream when component unmounts
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startScanning = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }, // Use back camera on mobile
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setScanning(true);
      }
    } catch (err) {
      onError("Camera access denied. Please enable camera permissions.");
    }
  };

  const stopScanning = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
  };

  const handleManualQR = () => {
    // For MVP, allow manual QR code entry
    const enteredCode = prompt("Enter the QR code from the event:");
    if (enteredCode === qrCode) {
      setScanned(true);
      onScanned(enteredCode);
    } else {
      onError("Invalid QR code. Please try again.");
    }
  };

  return (
    <div className={`rounded-2xl border ${borderColor} ${bgColor} p-6 transition-colors`}>
      <h3 className={`mb-4 text-lg font-semibold ${textColor}`}>QR Code Check-In</h3>
      <p className={`mb-4 text-sm ${textSecondary}`}>
        Scan the QR code at the event location to verify your attendance.
      </p>

      {scanning && videoRef.current && (
        <div className="mb-4">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="h-64 w-full rounded-lg object-cover"
          />
          <p className={`mt-2 text-center text-sm ${textSecondary}`}>
            Point your camera at the QR code
          </p>
        </div>
      )}

      {scanned && (
        <div className={`mb-4 rounded-lg border p-3 ${isDark ? "border-green-500/50 bg-green-900/30 text-green-300" : "border-green-200 bg-green-50 text-green-800"}`}>
          <p className="text-sm">✓ QR code verified successfully!</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {!scanning && !scanned && (
          <>
            <button
              onClick={startScanning}
              className="w-full rounded-full bg-[#FF4092] px-6 py-3 font-bold text-white shadow-lg shadow-pink-500/25 transition-all hover:bg-[#FF6B9D]"
            >
              📷 Scan QR Code
            </button>
            <button
              onClick={handleManualQR}
              className={`w-full rounded-full border ${borderColor} px-6 py-3 font-medium transition-colors ${
                isDark ? "bg-white/10 text-white hover:bg-white/20" : "bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              Enter QR Code Manually
            </button>
          </>
        )}

        {scanning && (
          <button
            onClick={stopScanning}
            className={`w-full rounded-full border ${borderColor} px-6 py-3 font-medium transition-colors ${
              isDark ? "bg-white/10 text-white hover:bg-white/20" : "bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            Stop Scanning
          </button>
        )}
      </div>
    </div>
  );
}
