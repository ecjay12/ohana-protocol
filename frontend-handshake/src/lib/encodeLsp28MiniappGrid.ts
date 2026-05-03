/**
 * Encode LSP28 The Grid value (VerifiableURI) for the Handshake miniapp iframe — same shape as frontend-miniapp AddToGridPage.
 */
import { ERC725 } from "@erc725/erc725.js";
import { keccak256, toUtf8Bytes } from "ethers";
import { LSP28_THE_GRID_KEY } from "@/config/lsp2Handshake";

const LSP28_SCHEMA = {
  name: "LSP28TheGrid",
  key: LSP28_THE_GRID_KEY,
  keyType: "Singleton" as const,
  valueType: "bytes" as const,
  valueContent: "VerifiableURI" as const,
};

export function buildMiniappGridJson(upAddress: string, miniappBaseUrl: string, handshakeChainId?: number): string {
  const base = miniappBaseUrl.replace(/\/$/, "");
  const chainQs =
    handshakeChainId != null && Number.isFinite(handshakeChainId) ? `&chainId=${handshakeChainId}` : "";
  const grid = {
    LSP28TheGrid: [
      {
        title: "Handshake",
        gridColumns: 2,
        visibility: "public",
        grid: [
          {
            width: 2,
            height: 2,
            type: "IFRAME",
            properties: {
              src: `${base}/?address=${encodeURIComponent(upAddress)}${chainQs}`,
              allow: "accelerometer; autoplay; clipboard-write",
              sandbox:
                "allow-forms allow-pointer-lock allow-popups allow-same-origin allow-scripts allow-top-navigation",
              allowfullscreen: true,
              referrerpolicy: "no-referrer",
            },
          },
        ],
      },
    ],
  };
  return JSON.stringify(grid);
}

/** ERC725Y-encoded bytes for LSP28TheGrid (single key). */
export function encodeLsp28MiniappGridValue(
  upAddress: string,
  miniappBaseUrl: string,
  handshakeChainId?: number
): string {
  const gridJson = buildMiniappGridJson(upAddress, miniappBaseUrl, handshakeChainId);
  const jsonHash = keccak256(toUtf8Bytes(gridJson));
  const base64 = btoa(unescape(encodeURIComponent(gridJson)));
  const dataUri = `data:application/json;base64,${base64}`;
  const erc725 = new ERC725([LSP28_SCHEMA]);
  const encoded = erc725.encodeData([
    {
      keyName: "LSP28TheGrid",
      value: {
        url: dataUri,
        verification: {
          data: jsonHash,
          method: "keccak256(utf8)",
        },
      },
    },
  ]);
  return encoded.values[0] as string;
}
