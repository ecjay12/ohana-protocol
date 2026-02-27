/**
 * x402 – HTTP 402 Payment Required integration for agent payments.
 * @see https://x402.org, https://x402.gitbook.io/x402
 *
 * Flow: request → 402 + payment details → client pays → retry with PAYMENT-SIGNATURE → 200 + PAYMENT-RESPONSE.
 */

export const X402_HEADER_PAYMENT_SIGNATURE = "PAYMENT-SIGNATURE";
export const X402_HEADER_PAYMENT_RESPONSE = "PAYMENT-RESPONSE";

/** Payment authorization (EVM EIP-712 style). */
export interface X402Authorization {
  from: string;
  to: string;
  value: string;
  validAfter: string;
  validBefore: string;
  nonce: string;
}

/** V2 payment payload sent in PAYMENT-SIGNATURE (client → server). */
export interface X402V2PaymentPayload {
  x402Version: number;
  scheme: string;
  network: string;
  payload: {
    authorization: X402Authorization;
    signature: string;
  };
}

/** Server returns this in 402 body so client can build payment. */
export interface X402PaymentRequired {
  amount: string;
  currency?: string;
  to: string;
  network: string;
  validAfter?: number;
  validBefore?: number;
  [key: string]: unknown;
}

/**
 * Fetch a URL; if response is 402, return the 402 body and headers so the client can pay and retry.
 * Does not perform payment – caller must sign payment and retry with PAYMENT-SIGNATURE.
 */
export async function fetchWith402(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status !== 402) return res;
  return res;
}

/**
 * Parse 402 response body as payment requirements (content-type application/json).
 */
export async function parse402PaymentRequired(res: Response): Promise<X402PaymentRequired | null> {
  if (res.status !== 402) return null;
  const contentType = res.headers.get("Content-Type") ?? "";
  if (!contentType.includes("application/json")) return null;
  try {
    const body = await res.json();
    return body as X402PaymentRequired;
  } catch {
    return null;
  }
}

/**
 * Retry a request with PAYMENT-SIGNATURE header (Base64-encoded payment payload).
 * Use after receiving 402 and submitting payment; payload is the signed payment object.
 */
export function requestWithPaymentSignature(
  payload: X402V2PaymentPayload,
  init?: RequestInit
): RequestInit {
  const base64 = typeof btoa !== "undefined"
    ? btoa(JSON.stringify(payload))
    : Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
  return {
    ...init,
    headers: {
      ...init?.headers,
      [X402_HEADER_PAYMENT_SIGNATURE]: base64,
    },
  };
}

/**
 * Full flow: fetch; if 402, call onPaymentRequired with body; caller pays and returns payload; retry with payload.
 * Example:
 *   const result = await fetchWith402Flow(url, async (req) => {
 *     const payload = await signPaymentWithWallet(signer, req);
 *     return payload;
 *   });
 */
export async function fetchWith402Flow(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  signPayment: (paymentRequired: X402PaymentRequired) => Promise<X402V2PaymentPayload | null>
): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status !== 402) return res;
  const paymentRequired = await parse402PaymentRequired(res);
  if (!paymentRequired) return res;
  const payload = await signPayment(paymentRequired);
  if (!payload) return res;
  const retryInit = requestWithPaymentSignature(payload, init);
  return fetch(input, retryInit);
}
