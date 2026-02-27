import type { BrowserProvider } from "ethers";

export type VouchStatus = 0 | 1 | 2 | 3;

export interface VouchData {
  status: VouchStatus;
  category: number;
  timestamp: bigint;
  updatedAt: bigint;
  hidden: boolean;
}

export type FeedItemType = "vouch" | "accept" | "deny" | "cancel";

export interface FeedItem {
  id: string;
  type: FeedItemType;
  label: string;
  timestamp: number;
}

export interface HandshakeUIProps {
  provider: BrowserProvider | null;
  chainId: number;
  account: string;
}
