/**
 * Add Handshake to your LUKSO Grid — one-click setData flow.
 * Bypasses universaleverything.io; calls setData directly on your UP.
 * @see https://docs.lukso.tech/learn/mini-apps/setting-your-grid/
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ERC725 } from "@erc725/erc725.js";
import LSP0 from "@lukso/lsp-smart-contracts/artifacts/LSP0ERC725Account.json";
import { Contract, keccak256, toUtf8Bytes } from "ethers";
import { useInjectedWallet } from "@/hooks/useInjectedWallet";
import { MINIAPP_PRODUCTION_URL } from "@/config/contracts";

const LSP28_KEY = "0x724141d9918ce69e6b8afcf53a91748466086ba2c74b94cab43c649ae2ac23ff";

const LSP28_SCHEMA = {
  name: "LSP28TheGrid",
  key: LSP28_KEY,
  keyType: "Singleton" as const,
  valueType: "bytes" as const,
  valueContent: "VerifiableURI" as const,
};

function buildGridJson(upAddress: string): string {
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
              src: `${MINIAPP_PRODUCTION_URL}/?address=${upAddress}`,
              allow: "accelerometer; autoplay; clipboard-write",
              sandbox: "allow-forms;allow-pointer-lock;allow-popups;allow-same-origin;allow-scripts;allow-top-navigation",
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

export function AddToGridPage() {
  const navigate = useNavigate();
  const { isConnected, accounts, provider, chainId, connect, connectWith, availableWallets, error: walletError } = useInjectedWallet();
  const [status, setStatus] = useState<"idle" | "encoding" | "signing" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const account = accounts[0];
  const isLUKSO = chainId === 42 || chainId === 4201;

  const handleSetGrid = async () => {
    if (!account || !provider || !isLUKSO) {
      setError("Connect your LUKSO wallet first.");
      return;
    }
    setError(null);
    setStatus("encoding");
    try {
      const gridJson = buildGridJson(account);
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

      setStatus("signing");
      const signer = await provider.getSigner();
      const abi = (LSP0 as { abi: unknown }).abi;
      const contract = new Contract(account, abi as import("ethers").InterfaceAbi, signer);
      const tx = await contract.setData(encoded.keys[0], encoded.values[0]);
      await tx.wait();
      setStatus("success");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="glass-card max-w-md rounded-2xl p-8">
        <h1 className="mb-2 text-xl font-semibold text-theme-text">Add Handshake to your Grid</h1>
        <p className="mb-6 text-sm text-theme-text-muted">
          This adds Handshake to your Grid on your Universal Profile so visitors can vouch for you.
        </p>

        {!isConnected ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-theme-text-muted">Connect your LUKSO wallet:</p>
            {availableWallets.length > 1 ? (
              <div className="flex flex-col gap-2">
                {availableWallets.map((w) => (
                  <button
                    key={w.label}
                    type="button"
                    onClick={() => connectWith(w)}
                    className="miniapp-btn-primary rounded-lg px-4 py-2.5 font-medium"
                  >
                    Connect with {w.label}
                  </button>
                ))}
              </div>
            ) : (
              <button
                type="button"
                onClick={connect}
                className="miniapp-btn-primary w-full rounded-lg px-4 py-2.5 font-medium"
              >
                Connect
              </button>
            )}
          </div>
        ) : !isLUKSO ? (
          <p className="text-sm text-theme-text-muted">
            Switch to LUKSO or LUKSO Testnet in your wallet, then try again.
          </p>
        ) : status === "success" ? (
          <div className="space-y-4">
            <p className="text-center text-green-600">Grid set successfully.</p>
            <button
              type="button"
              onClick={() => navigate(`/?address=${account}`)}
              className="miniapp-btn-primary w-full rounded-lg px-4 py-2.5 font-medium"
            >
              View your profile
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-theme-text-dim">
              Connected: {account.slice(0, 6)}…{account.slice(-4)}
            </p>
            <button
              type="button"
              onClick={handleSetGrid}
              disabled={status === "encoding" || status === "signing"}
              className="miniapp-btn-primary w-full rounded-lg px-4 py-2.5 font-medium disabled:opacity-50"
            >
              {status === "encoding" && "Preparing…"}
              {status === "signing" && "Confirm in wallet…"}
              {status === "idle" && "Set Grid (sign transaction)"}
              {status === "error" && "Try again"}
            </button>
          </div>
        )}

        {(error || walletError) && (
          <p className="mt-4 text-sm text-red-500">{error ?? walletError}</p>
        )}

        <button
          type="button"
          onClick={() => navigate("/")}
          className="mt-6 w-full text-center text-sm text-theme-text-muted hover:text-theme-accent"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
