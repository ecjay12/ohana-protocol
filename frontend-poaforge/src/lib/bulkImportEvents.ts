/**
 * Parse CSV / JSON and build Supabase `events` rows for bulk directory imports.
 */
import type { Event } from "./supabase";

export type BulkFormat = "csv" | "json";

export interface BulkParseError {
  line: number;
  message: string;
}

export interface BulkImportResult {
  rows: Partial<Event>[];
  errors: BulkParseError[];
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && c === ",") {
      result.push(cur);
      cur = "";
      continue;
    }
    cur += c;
  }
  result.push(cur);
  return result.map((s) => s.trim().replace(/^"|"$/g, ""));
}

/** Parse CSV with header row; header names are normalized to snake_case. */
export function parseBulkCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map((h) =>
    h
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
  );
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.every((v) => !String(v).trim())) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, j) => {
      row[h] = values[j] ?? "";
    });
    rows.push(row);
  }
  return rows;
}

function normalizeRecordKey(key: string): string {
  return key
    .trim()
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase()
    .replace(/^\./, "")
    .replace(/\s+/g, "_")
    .replace(/__+/g, "_");
}

/** Lowercase keys: camelCase → snake_case */
export function normalizeRecordKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[normalizeRecordKey(k)] = v;
  }
  return out;
}

export function parseBulkJSON(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("JSON is empty");
  const parsed = JSON.parse(trimmed) as unknown;
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === "object" && "events" in parsed && Array.isArray((parsed as { events: unknown }).events)) {
    return (parsed as { events: unknown[] }).events;
  }
  throw new Error('JSON must be an array of events or { "events": [...] }');
}

function getStr(row: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const v = row[key];
    if (v === null || v === undefined) continue;
    const s = String(v).trim();
    if (s !== "") return s;
  }
  return undefined;
}

function parseBool(v: string | undefined): boolean {
  if (!v) return false;
  const x = v.toLowerCase();
  return x === "true" || x === "1" || x === "yes";
}

function parseTags(v: string | string[] | undefined): string[] | null {
  if (v === undefined || v === null) return null;
  if (Array.isArray(v)) {
    const t = v.map((x) => String(x).trim()).filter(Boolean);
    return t.length ? t : null;
  }
  const parts = v.split(/[,|]/).map((s) => s.trim()).filter(Boolean);
  return parts.length ? parts : null;
}

function normalizeCategory(raw: string | undefined): string | null {
  if (!raw) return null;
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function normalizeEventType(raw: string | undefined): "online" | "in-person" | "hybrid" {
  if (!raw) return "online";
  const x = raw.trim().toLowerCase().replace(/\s+/g, "-");
  if (x === "inperson" || x === "in_person" || x === "in-person" || x === "physical") return "in-person";
  if (x === "hybrid") return "hybrid";
  return "online";
}

function slugId(title: string, lineIndex: number): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const base = slug || "event";
  return `${base}-${Date.now()}-${lineIndex}`;
}

function toNumber(v: string | number | undefined): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

function coerceNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  return toNumber(String(v));
}

function toIso(v: string | undefined): string | null {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function toIsoFromCell(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return new Date(v).toISOString();
  return toIso(String(v).trim() || undefined);
}

/**
 * Map parsed key/value rows (CSV or normalized JSON objects) to Supabase insert payloads.
 */
export function buildBulkEventRows(
  records: Record<string, unknown>[],
  creatorEmail: string,
  creatorWallet: string | null
): BulkImportResult {
  const errors: BulkParseError[] = [];
  const rows: Partial<Event>[] = [];
  const seenIds = new Set<string>();

  records.forEach((raw, i) => {
    const line = i + 1;
    const row = normalizeRecordKeys(raw);

    const title = getStr(row, "title", "name");
    if (!title) {
      errors.push({ line, message: "Missing title" });
      return;
    }

    let eventId = getStr(row, "event_id", "eventid");
    if (eventId) {
      eventId = eventId.trim();
      if (seenIds.has(eventId)) {
        errors.push({ line, message: `Duplicate event_id in file: ${eventId}` });
        return;
      }
      seenIds.add(eventId);
    } else {
      eventId = slugId(title, i);
      while (seenIds.has(eventId)) eventId = `${eventId}-x`;
      seenIds.add(eventId);
    }

    const eventType = normalizeEventType(getStr(row, "event_type", "eventtype"));

    const tagsFromRow = row["tags"];
    const tags =
      typeof tagsFromRow === "string" || Array.isArray(tagsFromRow)
        ? parseTags(tagsFromRow as string | string[])
        : parseTags(getStr(row, "tags"));

    const start = toIsoFromCell(row["start_datetime"] ?? row["start"]);
    const end = toIsoFromCell(row["end_datetime"] ?? row["end"]);
    const lat = coerceNumber(row["location_lat"] ?? row["lat"]);
    const lng = coerceNumber(row["location_lng"] ?? row["lng"]);
    const radius = coerceNumber(row["location_radius"] ?? row["radius"]);

    const sourceUrl = getStr(row, "source_url", "sourceurl", "url", "link", "ticket_url");
    const reqRaw = row["requires_approval"];
    const reqApproval =
      typeof reqRaw === "boolean" ? reqRaw : parseBool(getStr(row, "requires_approval", "approval"));

    rows.push({
      event_id: eventId,
      title,
      description: getStr(row, "description", "desc", "summary") ?? undefined,
      category: normalizeCategory(getStr(row, "category")) || undefined,
      tags: tags ?? undefined,
      event_type: eventType,
      location_address: getStr(row, "location_address", "locationaddress", "venue", "address") ?? undefined,
      location_lat: lat ?? undefined,
      location_lng: lng ?? undefined,
      location_radius: radius ?? undefined,
      start_datetime: start ?? undefined,
      end_datetime: end ?? undefined,
      source_url: sourceUrl ?? undefined,
      creator_email: creatorEmail,
      creator_wallet: creatorWallet?.toLowerCase() ?? undefined,
      status: "active",
      requires_approval: reqApproval,
      is_poap: false,
      is_directory_listing: true,
    });
  });

  return { rows, errors };
}

export function eventsToInsertPayload(rows: Partial<Event>[]) {
  return rows.map((r) => ({
    event_id: r.event_id!,
    title: r.title!,
    description: r.description ?? null,
    category: r.category ?? null,
    tags: r.tags ?? null,
    event_type: r.event_type ?? "online",
    location_address: r.location_address ?? null,
    location_lat: r.location_lat ?? null,
    location_lng: r.location_lng ?? null,
    location_radius: r.location_radius ?? null,
    start_datetime: r.start_datetime ?? null,
    end_datetime: r.end_datetime ?? null,
    source_url: r.source_url ?? null,
    creator_email: r.creator_email!,
    creator_wallet: r.creator_wallet ?? null,
    status: r.status ?? "active",
    requires_approval: r.requires_approval ?? false,
    is_poap: false,
    is_directory_listing: true,
  }));
}

export const BULK_IMPORT_CSV_TEMPLATE = `title,description,category,tags,event_type,location_address,start_datetime,end_datetime,source_url
"Example Web3 Summit","Annual summit — speakers TBD",web3,"ethereum,l2",online,"",2026-06-01T18:00:00Z,2026-06-01T22:00:00Z,https://example.com/summit
"Local Meetup","Networking",meetup,networking,in-person,"123 Main St, NYC",2026-05-15T17:30:00Z,2026-05-15T20:00:00Z,https://meetup.com/example
`;
