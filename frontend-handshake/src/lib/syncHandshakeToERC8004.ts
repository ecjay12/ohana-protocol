/**
 * Sync Handshake accepted vouches to ERC-8004 Reputation registry.
 * The voucher (signer) calls giveFeedback for the target agent.
 * @see https://eips.ethereum.org/EIPS/eip-8004
 */

import { Contract, type Signer } from "ethers";
import { getERC8004ReputationAddress } from "@/config/contracts";
import { hasERC8004Support } from "@/lib/erc8004";

const REPUTATION_ABI = [
  "function giveFeedback(uint256 agentId, int128 value, uint8 valueDecimals, string calldata tag1, string calldata tag2, string calldata endpoint, string calldata feedbackURI, bytes32 feedbackHash) external",
] as const;

const CATEGORY_TAG: Record<number, string> = {
  0: "bot",
  1: "human",
};

export interface SubmitVouchAsFeedbackParams {
  signer: Signer;
  chainId: number;
  targetAgentId: bigint | number;
  category: number;
  reputationRegistryAddress?: string;
}

/**
 * Submit a Handshake accepted vouch as ERC-8004 feedback.
 * Caller (signer) must be the voucher; targetAgentId is the agent who received the vouch.
 */
export async function submitVouchAsFeedback(params: SubmitVouchAsFeedbackParams): Promise<void> {
  const { signer, chainId, targetAgentId, category, reputationRegistryAddress } = params;
  if (!hasERC8004Support(chainId)) {
    throw new Error("ERC-8004 is not configured for this chain");
  }
  const address = reputationRegistryAddress ?? getERC8004ReputationAddress(chainId);
  if (!address) {
    throw new Error("ERC-8004 Reputation registry address not set");
  }
  const tag2 = CATEGORY_TAG[category] ?? "skill";
  const contract = new Contract(address, REPUTATION_ABI, signer);
  await contract.giveFeedback(
    BigInt(targetAgentId),
    100, // value = 100 (positive vouch)
    0, // valueDecimals
    "handshake",
    tag2,
    "",
    "",
    "0x0000000000000000000000000000000000000000000000000000000000000000"
  );
}
