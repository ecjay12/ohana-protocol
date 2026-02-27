/**
 * In embed/miniapp mode: address from URL (?address=0x...) or postMessage from host.
 * postMessage is only accepted from same origin or VITE_ALLOWED_EMBED_ORIGINS (comma-separated).
 */
import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { getAddress } from "ethers";

const POST_MESSAGE_TYPE = "ohana-handshake-address";

function getAllowedOrigins(): Set<string> {
  const same = typeof window !== "undefined" ? window.location.origin : "";
  const env = typeof import.meta !== "undefined" && import.meta.env?.VITE_ALLOWED_EMBED_ORIGINS;
  const list = env ? String(env).split(",").map((o: string) => o.trim()).filter(Boolean) : [];
  return new Set([same, ...list]);
}

export function useHostAddress(): string | null {
  const [searchParams] = useSearchParams();
  const urlAddress = searchParams.get("address")?.trim() ?? null;
  const [postMessageAddress, setPostMessageAddress] = useState<string | null>(null);
  const allowedOrigins = useMemo(() => getAllowedOrigins(), []);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (!allowedOrigins.has(event.origin)) return;
      try {
        const data = event.data;
        if (data?.type === POST_MESSAGE_TYPE && typeof data.address === "string") {
          getAddress(data.address);
          setPostMessageAddress(data.address);
        }
      } catch {
        // ignore invalid payload
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [allowedOrigins]);

  return postMessageAddress ?? urlAddress;
}
