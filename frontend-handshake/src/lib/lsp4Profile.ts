/**
 * Fetch and update LSP3 (profile), LSP4, LSP26, LSP27 metadata from Universal Profiles.
 * LSP3 is the primary profile metadata for UPs; LSP4 used for asset metadata; we also read LSP26/LSP27.
 */

import { Contract, type Provider, type Signer, getAddress, keccak256, toUtf8Bytes } from "ethers";

// ERC725Y: getData(bytes32) for single key; setData(bytes32[], bytes[])
const ERC725Y_ABI = [
  "function getData(bytes32 dataKey) external view returns (bytes memory dataValue)",
  "function setData(bytes32[] memory dataKeys, bytes[] memory dataValues) external payable",
  "function owner() external view returns (address)",
] as const;

// LSP3Profile: main profile metadata key (LIP-3 spec value for LUKSO compatibility)
const LSP3_PROFILE_KEY = "0x5ef83ad9559033e6e941db7d7c495acdce616347d28e90c7ce47cbfcfcad3bc5";
// Fallback: keccak256("LSP3Profile") for other implementations
const LSP3_PROFILE_KEY_ALT = keccak256(toUtf8Bytes("LSP3Profile"));
// LSP4Metadata: digital asset metadata (some UPs use for profile; we try LSP3 first)
const LSP4_METADATA_KEY = keccak256(toUtf8Bytes("LSP4Metadata"));
// LSP26Value: custom data key (LUKSO ecosystem)
const LSP26_VALUE_KEY = keccak256(toUtf8Bytes("LSP26Value"));
// LSP27: optional; some docs reference LSP27 - use same pattern if needed
const LSP27_VALUE_KEY = keccak256(toUtf8Bytes("LSP27Value"));

// IPFS gateway URLs (public gateways)
const IPFS_GATEWAYS = [
  "https://ipfs.io/ipfs/",
  "https://gateway.pinata.cloud/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
];

/** LSP3 Profile JSON (on-chain key LSP3Profile points to this). */
export interface LSP3ProfileJSON {
  LSP3Profile?: {
    name?: string;
    description?: string;
    profileImage?: Array<{ url: string } | string>;
    backgroundImage?: Array<{ url: string } | string>;
    tags?: string[];
    links?: Array<{ title: string; url: string }>;
  };
  name?: string;
  description?: string;
  profileImage?: Array<{ url: string } | string>;
  backgroundImage?: Array<{ url: string } | string>;
  links?: Array<{ title: string; url: string }>;
  tags?: string[];
}

export interface LSP4Metadata {
  name?: string;
  description?: string;
  profileImage?: string[] | Array<{ url: string }>;
  backgroundImage?: string[] | Array<{ url: string }>;
  links?: Array<{ title: string; url: string }>;
  tags?: string[];
}

export interface LSP26Data {
  // Structure depends on LSP26 specification - adjust as needed
  [key: string]: unknown;
}

export interface ProfileData {
  name?: string;
  description?: string;
  avatar?: string;
  background?: string;
  tags?: string[];
  links?: Array<{ title: string; url: string }>;
  lsp26Data?: LSP26Data;
  lsp27Data?: LSP26Data;
}

/**
 * Convert IPFS URL to HTTP gateway URL.
 * Security: Validates IPFS hash format to prevent SSRF attacks.
 */
function ipfsToHttp(ipfsUrl: string): string {
  const hash = ipfsUrl.replace(/^ipfs:\/\//i, "").trim();
  if (!/^Qm[1-9A-HJ-NP-Za-km-z]{44}$|^b[a-z2-7]{58,}$/i.test(hash)) {
    throw new Error("Invalid IPFS hash format");
  }
  return `${IPFS_GATEWAYS[0]}${hash}`;
}

/**
 * Fetch JSON from URL with security checks.
 * Prevents SSRF by validating URL scheme and domain.
 */
async function fetchJSON(url: string): Promise<unknown> {
  // Normalize common typo in LSP metadata (ifps -> ipfs)
  const normalizedUrl = url.replace(/^ifps:\/\//i, "ipfs://");
  // Validate URL scheme (only http/https/ipfs allowed)
  if (!/^https?:\/\//i.test(normalizedUrl) && !/^ipfs:\/\//i.test(normalizedUrl)) {
    throw new Error("Invalid URL scheme");
  }

  // Convert IPFS to HTTP if needed
  const httpUrl = /^ipfs:\/\//i.test(normalizedUrl) ? ipfsToHttp(normalizedUrl) : normalizedUrl;

  // Additional security: validate URL is not localhost/private IP
  try {
    const urlObj = new URL(httpUrl);
    if (urlObj.hostname === "localhost" || urlObj.hostname === "127.0.0.1" || urlObj.hostname.startsWith("192.168.") || urlObj.hostname.startsWith("10.")) {
      throw new Error("Local URLs not allowed");
    }
  } catch {
    // Invalid URL, reject
    throw new Error("Invalid URL format");
  }

  const response = await fetch(httpUrl, {
    method: "GET",
    headers: { Accept: "application/json" },
    // Timeout after 10 seconds
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Decode ERC725Y value (URL) from hex. Handles plain URL bytes or LSP2 JSONURL (0x0003 + hash + url).
 */
function decodeURLOrPlain(hexValue: string): string | null {
  if (!hexValue || hexValue === "0x" || hexValue.length <= 2) return null;
  try {
    let stripped = hexValue.startsWith("0x") ? hexValue.slice(2) : hexValue;
    if (stripped.length % 2 !== 0) stripped = "0" + stripped;
    const bytes = new Uint8Array(stripped.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(stripped.slice(i * 2, i * 2 + 2), 16);
    }
    // LUKSO VerifiableURI: bytes2(method) + bytes4(hashFn) + bytes2(dataLen) + bytes[dataLen](hash) + bytes(url)
    if (bytes.length > 8 && bytes[2] === 0x6f && bytes[3] === 0x35 && bytes[4] === 0x7c && bytes[5] === 0x6a) {
      const dataLen = (bytes[6] << 8) | bytes[7];
      const urlOffset = 8 + dataLen;
      if (urlOffset < bytes.length) {
        const urlBytes = bytes.slice(urlOffset);
        const url = new TextDecoder().decode(urlBytes).replace(/\0/g, "").trim();
        if (url && (url.startsWith("http") || url.startsWith("ipfs:") || url.startsWith("ifps:"))) return url;
      }
    }

    // Legacy JSONURL (LSP2 v0): bytes4(0x00000003) + bytes32(hash) + bytes(url)
    if (bytes.length > 36 && bytes[0] === 0 && bytes[1] === 0 && bytes[2] === 0 && bytes[3] === 3) {
      const urlBytes = bytes.slice(36);
      const url = new TextDecoder().decode(urlBytes).replace(/\0/g, "").trim();
      if (url && (url.startsWith("http") || url.startsWith("ipfs:") || url.startsWith("ifps:"))) return url;
    }

    // Plain URL bytes (UTF-8 fallback)
    const url = new TextDecoder().decode(bytes).replace(/\0/g, "").trim();
    if (url && (url.startsWith("http") || url.startsWith("ipfs:") || url.startsWith("ifps:"))) return url;
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch LSP3 profile metadata from Universal Profile (primary for UP profile display).
 */
export async function getLSP3Metadata(
  provider: Provider,
  upAddress: string
): Promise<LSP3ProfileJSON | null> {
  try {
    const normalized = getAddress(upAddress.trim());
    const up = new Contract(normalized, ERC725Y_ABI, provider);
    let hexValue = await up.getData(LSP3_PROFILE_KEY);
    if (hexValue === "0x" || !hexValue || hexValue.length <= 2) {
      hexValue = await up.getData(LSP3_PROFILE_KEY_ALT);
    }
    if (!hexValue || hexValue === "0x" || hexValue.length <= 2) return null;
    const url = decodeURLOrPlain(hexValue);
    if (!url) return null;
    const data = await fetchJSON(url);
    return data as LSP3ProfileJSON;
  } catch {
    return null;
  }
}

/**
 * Fetch LSP4 metadata from Universal Profile (some UPs use for profile or assets).
 */
export async function getLSP4Metadata(
  provider: Provider,
  upAddress: string
): Promise<LSP4Metadata | null> {
  try {
    const normalized = getAddress(upAddress.trim());
    const up = new Contract(normalized, ERC725Y_ABI, provider);
    const hexValue = await up.getData(LSP4_METADATA_KEY);
    const url = decodeURLOrPlain(hexValue);
    if (!url) return null;
    const metadata = await fetchJSON(url);
    return metadata as LSP4Metadata;
  } catch {
    return null;
  }
}

/**
 * Fetch LSP26 data from Universal Profile.
 */
export async function getLSP26Data(
  provider: Provider,
  upAddress: string
): Promise<LSP26Data | null> {
  try {
    const normalized = getAddress(upAddress.trim());
    const up = new Contract(normalized, ERC725Y_ABI, provider);
    const hexValue = await up.getData(LSP26_VALUE_KEY);
    if (!hexValue || hexValue === "0x" || hexValue.length <= 2) return null;
    const url = decodeURLOrPlain(hexValue);
    if (url) {
      const data = await fetchJSON(url);
      return data as LSP26Data;
    }
    try {
      let stripped = hexValue.startsWith("0x") ? hexValue.slice(2) : hexValue;
      if (stripped.length % 2 !== 0) stripped = "0" + stripped;
      const bytes = new Uint8Array(stripped.length / 2);
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(stripped.slice(i * 2, i * 2 + 2), 16);
      }
      const json = new TextDecoder().decode(bytes).replace(/\0/g, "").trim();
      return JSON.parse(json) as LSP26Data;
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

/**
 * Fetch LSP27 data from Universal Profile (when present).
 */
export async function getLSP27Data(
  provider: Provider,
  upAddress: string
): Promise<LSP26Data | null> {
  try {
    const normalized = getAddress(upAddress.trim());
    const up = new Contract(normalized, ERC725Y_ABI, provider);
    const hexValue = await up.getData(LSP27_VALUE_KEY);
    if (!hexValue || hexValue === "0x" || hexValue.length <= 2) return null;
    const url = decodeURLOrPlain(hexValue);
    if (url) {
      const data = await fetchJSON(url);
      return data as LSP26Data;
    }
    try {
      let stripped = hexValue.startsWith("0x") ? hexValue.slice(2) : hexValue;
      if (stripped.length % 2 !== 0) stripped = "0" + stripped;
      const bytes = new Uint8Array(stripped.length / 2);
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(stripped.slice(i * 2, i * 2 + 2), 16);
      }
      const json = new TextDecoder().decode(bytes).replace(/\0/g, "").trim();
      return JSON.parse(json) as LSP26Data;
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

function firstImageUrl(
  value: string[] | Array<{ url?: string; width?: number; height?: number } | string> | undefined
): string | undefined {
  if (!value || value.length === 0) return undefined;
  const first = value[0];
  let url: string | undefined;
  if (typeof first === "string") {
    url = first.startsWith("http") || first.startsWith("ipfs:") || first.startsWith("ifps:") ? first : undefined;
  } else {
    const obj = first as { url?: string };
    url = obj?.url && (obj.url.startsWith("http") || obj.url.startsWith("ipfs:") || obj.url.startsWith("ifps:")) ? obj.url : undefined;
  }
  if (!url) return undefined;
  const normalized = url.replace(/^ifps:\/\//i, "ipfs://");
  if (normalized.startsWith("ipfs://")) {
    try {
      return ipfsToHttp(normalized);
    } catch {
      return url;
    }
  }
  return url;
}

/**
 * Map LSP3 profile JSON to our ProfileData shape.
 */
function lsp3ToProfileData(lsp3: LSP3ProfileJSON | null): Partial<ProfileData> {
  if (!lsp3) return {};
  const inner = lsp3.LSP3Profile ?? lsp3;
  const profileImage = inner.profileImage ?? (lsp3 as LSP3ProfileJSON & { profileImage?: unknown }).profileImage;
  const backgroundImage = inner.backgroundImage ?? (lsp3 as LSP3ProfileJSON & { backgroundImage?: unknown }).backgroundImage;
  const linkList = inner.links ?? (lsp3 as LSP3ProfileJSON & { links?: ProfileData["links"] }).links;
  const tagsList = inner.tags ?? (lsp3 as LSP3ProfileJSON & { tags?: string[] }).tags;
  return {
    name: inner.name ?? lsp3.name,
    description: inner.description ?? lsp3.description,
    avatar: firstImageUrl(profileImage),
    background: firstImageUrl(backgroundImage),
    tags: Array.isArray(tagsList) ? tagsList : undefined,
    links: linkList,
  };
}

/**
 * Fetch combined profile data (LSP3 first, then LSP4, plus LSP26/LSP27).
 * LSP3 is the primary profile metadata for Universal Profiles on LUKSO.
 */
export async function getProfileData(
  provider: Provider,
  address: string
): Promise<ProfileData | null> {
  try {
    const normalized = getAddress(address.trim());
    const [lsp3, lsp4, lsp26, lsp27] = await Promise.all([
      getLSP3Metadata(provider, normalized),
      getLSP4Metadata(provider, normalized),
      getLSP26Data(provider, normalized),
      getLSP27Data(provider, normalized),
    ]);

    const fromLsp3 = lsp3ToProfileData(lsp3);
    const fromLsp4 = lsp4
      ? {
          name: lsp4.name,
          description: lsp4.description,
          avatar: firstImageUrl(lsp4.profileImage),
          background: firstImageUrl(lsp4.backgroundImage),
          tags: Array.isArray(lsp4.tags) ? lsp4.tags : undefined,
          links: lsp4.links,
        }
      : {};

    const name = fromLsp3.name ?? fromLsp4.name;
    const description = fromLsp3.description ?? fromLsp4.description;
    const avatar = fromLsp3.avatar ?? fromLsp4.avatar;
    const background = fromLsp3.background ?? fromLsp4.background;
    const tags = fromLsp3.tags?.length ? fromLsp3.tags : fromLsp4.tags;
    const links = fromLsp3.links?.length ? fromLsp3.links : fromLsp4.links;
    const lsp26Data = lsp26 ?? undefined;
    const lsp27Data = lsp27 ?? undefined;

    if (!name && !description && !avatar && !background && !tags?.length && !links?.length && !lsp26Data && !lsp27Data) {
      return null;
    }

    return {
      name,
      description,
      avatar,
      background,
      tags,
      links,
      lsp26Data: lsp26Data ?? undefined,
      lsp27Data,
    };
  } catch {
    return null;
  }
}

/**
 * Update LSP4 description on Universal Profile.
 * Note: Requires IPFS pinning service or HTTP endpoint for metadata storage.
 * This is a placeholder - actual implementation depends on metadata storage solution.
 */
export async function updateLSP4Description(
  _signer: Signer,
  _upAddress: string,
  newDescription: string
): Promise<void> {
  // Security: Sanitize description (max length, no script tags)
  void newDescription
    .slice(0, 1000) // Max length
    .replace(/<script[^>]*>.*?<\/script>/gi, "") // Remove script tags
    .trim();

  void _signer;
  void _upAddress;
  // TODO: Implement actual metadata update:
  // 1. Fetch current LSP4 metadata
  // 2. Update description field
  // 3. Upload to IPFS (via Pinata, NFT.Storage, etc.)
  // 4. Update LSP4 key to point to new URL via setData()
  
  throw new Error("LSP4 description update not yet implemented - requires IPFS pinning service");
}
