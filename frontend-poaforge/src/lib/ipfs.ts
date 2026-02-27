// Use Pinata REST API directly instead of SDK (SDK has browser compatibility issues)
const pinataJWT = import.meta.env.VITE_PINATA_JWT;
const PINATA_API_URL = "https://api.pinata.cloud";

async function pinataRequest(endpoint: string, method: string, body?: any): Promise<any> {
  if (!pinataJWT) {
    throw new Error("Pinata JWT not configured");
  }

  const response = await fetch(`${PINATA_API_URL}${endpoint}`, {
    method,
    headers: {
      "Authorization": `Bearer ${pinataJWT}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Pinata API error: ${error}`);
  }

  return response.json();
}

export async function pinFileToIPFS(file: File): Promise<string> {
  if (!pinataJWT) {
    throw new Error("Pinata JWT not configured");
  }

  const formData = new FormData();
  formData.append("file", file);
  
  const metadata = JSON.stringify({
    name: file.name,
  });
  formData.append("pinataMetadata", metadata);

  const options = JSON.stringify({
    cidVersion: 0,
  });
  formData.append("pinataOptions", options);

  const response = await fetch(`${PINATA_API_URL}/pinning/pinFileToIPFS`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${pinataJWT}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Pinata API error: ${error}`);
  }

  const result = await response.json();
  return result.IpfsHash;
}

export async function pinJSONToIPFS(data: object): Promise<string> {
  if (!pinataJWT) {
    throw new Error("Pinata JWT not configured");
  }

  const body = {
    pinataContent: data,
    pinataMetadata: {
      name: "metadata.json",
    },
    pinataOptions: {
      cidVersion: 0,
    },
  };

  const result = await pinataRequest("/pinning/pinJSONToIPFS", "POST", body);
  return result.IpfsHash;
}

export function getGatewayURL(cid: string): string {
  return `https://gateway.pinata.cloud/ipfs/${cid}`;
}
