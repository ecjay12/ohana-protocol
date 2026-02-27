/**
 * POAP Forge contract hook — create event, get events, mint POAPs.
 */
import { useCallback, useState, useEffect } from "react";
import { Contract, BrowserProvider, Interface } from "ethers";
// @ts-expect-error - JSON artifact from repo root via Vite alias
import POAPForgeArtifact from "@contracts-poaforge";
// @ts-expect-error - JSON artifact from repo root via Vite alias
import POAPEventNFTArtifact from "@contracts-poap-nft";
import { getPOAPForgeAddress } from "@/config/contracts";

function toFriendlyError(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("user rejected") || lower.includes("user denied")) return "Transaction was cancelled.";
  if (lower.includes("event already exists")) return "An event with this ID already exists.";
  return raw.length > 80 ? "Couldn't create event. Please try again." : raw;
}

const FORGE_IFACE = new Interface(POAPForgeArtifact.abi);

export interface ForgeEvent {
  nftContract: string;
  tokenContract: string;
  creator: string;
  eventId: string;
  createdAt: bigint;
}

export function usePOAPForge(provider: BrowserProvider | null, chainId: number, account: string | null) {
  const [contract, setContract] = useState<Contract | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txPending, setTxPending] = useState(false);

  const address = getPOAPForgeAddress(chainId);

  useEffect(() => {
    if (!provider || !address || !account) {
      setContract(null);
      return;
    }
    setContract(new Contract(address, POAPForgeArtifact.abi, provider));
  }, [provider, address, account]);

  const getSignerContract = useCallback(async () => {
    if (!provider || !address) return null;
    const signer = await provider.getSigner();
    return new Contract(address, POAPForgeArtifact.abi, signer);
  }, [provider, address]);

  const createEvent = useCallback(
    async (
      eventId: string,
      nftName: string,
      nftSymbol: string,
      tokenName: string,
      tokenSymbol: string,
      royaltyReceiver: string,
      royaltyPercentBps: number
    ) => {
      const c = await getSignerContract();
      if (!c) {
        setError("Wallet or contract not ready");
        return null;
      }
      setError(null);
      setTxPending(true);
      try {
        const rcvr = royaltyReceiver || account || "0x0000000000000000000000000000000000000000";
        const tx = await c.createEvent(
          eventId,
          nftName,
          nftSymbol,
          tokenName,
          tokenSymbol,
          rcvr,
          royaltyPercentBps
        );
        const receipt = await tx.wait();
        setTxPending(false);
        return receipt;
      } catch (e: unknown) {
        const raw = e instanceof Error ? e.message : "Create event failed";
        setError(toFriendlyError(raw));
        setTxPending(false);
        throw e;
      }
    },
    [getSignerContract, account]
  );

  const getEventCount = useCallback(async (): Promise<bigint> => {
    if (!contract) return 0n;
    try {
      return await contract.getEventCount();
    } catch {
      return 0n;
    }
  }, [contract]);

  const getEvent = useCallback(
    async (index: number): Promise<ForgeEvent | null> => {
      if (!contract || index < 1) return null;
      try {
        const fn = contract.getFunction("getEvent");
        const e = await fn(index);
        return {
          nftContract: e[0],
          tokenContract: e[1],
          creator: e[2],
          eventId: e[3],
          createdAt: e[4],
        };
      } catch {
        return null;
      }
    },
    [contract]
  );

  const getAllEvents = useCallback(async (): Promise<ForgeEvent[]> => {
    const count = await getEventCount();
    const n = Number(count);
    if (n === 0) return [];
    const list: ForgeEvent[] = [];
    for (let i = 1; i <= n; i++) {
      const e = await getEvent(i);
      if (e) list.push(e);
    }
    return list.reverse();
  }, [getEventCount, getEvent]);

  /** Parse EventCreated from receipt to get NFT and token contract addresses */
  const parseEventCreated = useCallback((receipt: { logs?: Array<{ topics: string[]; data: string }> }) => {
    for (const log of receipt.logs ?? []) {
      try {
        const parsed = FORGE_IFACE.parseLog({ topics: log.topics as string[], data: log.data });
        if (parsed?.name === "EventCreated") {
          return {
            nftContract: parsed.args[2] as string,
            tokenContract: parsed.args[3] as string,
          };
        }
      } catch {
        // Skip logs that don't match
      }
    }
    return null;
  }, []);

  /** Set the mint signer on the NFT contract (for auto-claim). Only owner can call. */
  const setMintSigner = useCallback(
    async (nftContractAddress: string, signerAddress: string) => {
      if (!provider || !nftContractAddress || !signerAddress) return null;
      const signer = await provider.getSigner();
      const nftContract = new Contract(
        nftContractAddress,
        POAPEventNFTArtifact.abi,
        signer
      );
      setTxPending(true);
      setError(null);
      try {
        const tx = await nftContract.setMintSigner(signerAddress);
        await tx.wait();
        setTxPending(false);
        return true;
      } catch (e: unknown) {
        const raw = e instanceof Error ? e.message : "Set signer failed";
        setError(toFriendlyError(raw));
        setTxPending(false);
        throw e;
      }
    },
    [provider]
  );

  /** Get claim signature from backend (for auto-claim when attendee fulfills verification) */
  const getClaimSignature = useCallback(
    async (
      eventId: string,
      _nftContractAddress: string,
      walletAddress: string,
      options?: { lat?: number; lng?: number; claimCode?: string }
    ): Promise<{ signature: string; deadline: number; nft_contract_address: string } | null> => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) return null;
      const url = `${supabaseUrl}/functions/v1/sign-claim`;
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event_id: eventId,
            wallet_address: walletAddress,
            chain_id: chainId,
            lat: options?.lat,
            lng: options?.lng,
            claim_code: options?.claimCode,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Sign failed: ${res.status}`);
        }
        return res.json();
      } catch (e) {
        console.error("getClaimSignature error:", e);
        throw e;
      }
    },
    [chainId]
  );

  /** Claim POAP with signature (attendee mints themselves for auto-claim) */
  const claimWithSignature = useCallback(
    async (nftContractAddress: string, toAddress: string, deadline: number, signature: string) => {
      if (!provider || !nftContractAddress || !toAddress) return null;
      const signer = await provider.getSigner();
      const nftContract = new Contract(
        nftContractAddress,
        POAPEventNFTArtifact.abi,
        signer
      );
      setTxPending(true);
      setError(null);
      try {
        const tx = await nftContract.claimWithSignature(toAddress, deadline, signature);
        const receipt = await tx.wait();
        setTxPending(false);
        return receipt;
      } catch (e: unknown) {
        const raw = e instanceof Error ? e.message : "Claim failed";
        setError(toFriendlyError(raw));
        setTxPending(false);
        throw e;
      }
    },
    [provider]
  );

  /** Mint a POAP NFT to an address (caller must be NFT owner/event creator) */
  const mintPOAP = useCallback(
    async (nftContractAddress: string, toAddress: string) => {
      if (!provider || !nftContractAddress || !toAddress) return null;
      const signer = await provider.getSigner();
      const nftContract = new Contract(
        nftContractAddress,
        POAPEventNFTArtifact.abi,
        signer
      );
      setTxPending(true);
      setError(null);
      try {
        const tx = await nftContract.mint(toAddress);
        const receipt = await tx.wait();
        setTxPending(false);
        return receipt;
      } catch (e: unknown) {
        const raw = e instanceof Error ? e.message : "Mint failed";
        setError(toFriendlyError(raw));
        setTxPending(false);
        throw e;
      }
    },
    [provider]
  );

  return {
    contract,
    address,
    error,
    txPending,
    createEvent,
    getEventCount,
    getEvent,
    getAllEvents,
    parseEventCreated,
    mintPOAP,
    setMintSigner,
    getClaimSignature,
    claimWithSignature,
    isSupported: !!address,
  };
}
