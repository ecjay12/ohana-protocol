/**
 * LSP6: check whether the Handshake contract owner EOA is registered as a controller
 * on the given Universal Profile (AddressPermissions[]).
 * @see https://docs.lukso.tech/learn/universal-profile/key-manager/get-controller-permissions/
 */
import { ERC725, type ERC725JSONSchema } from "@erc725/erc725.js";
import LSP6Schema from "@erc725/erc725.js/schemas/LSP6KeyManager.json";
import { getAddress } from "ethers";

const SCHEMA = LSP6Schema as ERC725JSONSchema[];

export async function handshakeOwnerIsControllerOfUniversalProfile(
  rpcUrl: string,
  universalProfileAddress: string,
  handshakeOwnerAddress: string
): Promise<boolean> {
  const up = getAddress(universalProfileAddress.trim());
  const owner = getAddress(handshakeOwnerAddress.trim()).toLowerCase();
  const erc725 = new ERC725(SCHEMA, up, rpcUrl, {
    ipfsGateway: "https://ipfs.io/ipfs/",
  });
  const res = await erc725.getData("AddressPermissions[]");
  const list = res.value;
  if (!Array.isArray(list)) return false;
  return list.some((a) => {
    if (typeof a !== "string") return false;
    try {
      return getAddress(a).toLowerCase() === owner;
    } catch {
      return false;
    }
  });
}
