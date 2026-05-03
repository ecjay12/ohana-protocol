/** Session-scoped debug telemetry (desktop ingest + in-page buffer for mobile). */
const ENDPOINT = "http://127.0.0.1:7244/ingest/4aaad17b-fb4a-43ca-a302-29af5bb8ad81";
const SESSION_ID = "62aee8";

type AgentPayload = {
  sessionId: string;
  runId: string;
  hypothesisId: string;
  location: string;
  message: string;
  data: Record<string, unknown>;
  timestamp: number;
};

export function agentDebugLog(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string,
  runId = "pre-fix"
): void {
  const payload: AgentPayload = {
    sessionId: SESSION_ID,
    runId,
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
  };

  if (typeof window !== "undefined") {
    const w = window as Window & { __OHANA_MINIAPP_DBG__?: AgentPayload[] };
    w.__OHANA_MINIAPP_DBG__ = w.__OHANA_MINIAPP_DBG__ ?? [];
    w.__OHANA_MINIAPP_DBG__.push(payload);
    if (w.__OHANA_MINIAPP_DBG__.length > 40) w.__OHANA_MINIAPP_DBG__.splice(0, w.__OHANA_MINIAPP_DBG__.length - 40);
  }

  fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": SESSION_ID },
    body: JSON.stringify(payload),
  }).catch(() => {});
}
