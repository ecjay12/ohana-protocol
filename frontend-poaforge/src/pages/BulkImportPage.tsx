import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useSupabaseAuth } from "../hooks/useSupabaseAuth";
import { useInjectedWallet } from "../hooks/useInjectedWallet";
import { useTheme } from "../hooks/useTheme";
import { SEO } from "../components/SEO";
import {
  BULK_IMPORT_CSV_TEMPLATE,
  buildBulkEventRows,
  eventsToInsertPayload,
  normalizeRecordKeys,
  parseBulkCSV,
  parseBulkJSON,
  type BulkFormat,
} from "../lib/bulkImportEvents";
import { motion } from "framer-motion";

const CHUNK = 40;

export function BulkImportPage() {
  const { user, loading: authLoading } = useSupabaseAuth();
  const { accounts } = useInjectedWallet();
  const account = accounts[0]?.toLowerCase() ?? null;
  const { theme } = useTheme();
  const [format, setFormat] = useState<BulkFormat>("csv");
  const [text, setText] = useState("");
  const [previewErrors, setPreviewErrors] = useState<{ line: number; message: string }[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [importing, setImporting] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const isDark = theme === "dark";
  const bg = isDark ? "bg-[#1a1a2e]" : "bg-[#E2E0FF]";
  const card = isDark ? "bg-[#2d2d44]" : "bg-white";
  const border = isDark ? "border-white/15" : "border-slate-200";
  const textColor = isDark ? "text-white" : "text-slate-900";
  const muted = isDark ? "text-white/70" : "text-slate-600";

  const runPreview = () => {
    setParseError(null);
    setResultMessage(null);
    const email = user?.email;
    if (!email) return;

    try {
      let records: Record<string, unknown>[] = [];
      if (format === "csv") {
        records = parseBulkCSV(text);
      } else {
        const parsed = parseBulkJSON(text);
        if (!Array.isArray(parsed)) {
          setParseError("JSON must be an array of objects.");
          return;
        }
        records = parsed.map((item) =>
          item && typeof item === "object" ? normalizeRecordKeys(item as Record<string, unknown>) : {}
        );
      }

      if (records.length === 0) {
        setPreviewErrors([]);
        setRowCount(0);
        setParseError("No rows found. Add a CSV with a header row plus data, or a non-empty JSON array.");
        return;
      }

      const built = buildBulkEventRows(records, email, account);
      setPreviewErrors(built.errors);
      setRowCount(built.rows.length);
    } catch (e) {
      setParseError(e instanceof Error ? e.message : "Could not parse input.");
      setPreviewErrors([]);
      setRowCount(0);
    }
  };

  const runImport = async () => {
    setResultMessage(null);
    const email = user?.email;
    if (!email) return;

    let records: Record<string, unknown>[] = [];
    try {
      if (format === "csv") {
        records = parseBulkCSV(text);
      } else {
        const parsed = parseBulkJSON(text);
        if (!Array.isArray(parsed)) {
          setResultMessage("Invalid JSON.");
          return;
        }
        records = parsed.map((item) =>
          item && typeof item === "object" ? normalizeRecordKeys(item as Record<string, unknown>) : {}
        );
      }
    } catch (e) {
      setResultMessage(e instanceof Error ? e.message : "Parse failed.");
      return;
    }

    const built = buildBulkEventRows(records, email, account);
    if (built.errors.length > 0 || built.rows.length === 0) {
      setPreviewErrors(built.errors);
      setResultMessage(
        built.errors.length > 0
          ? "Fix validation errors before importing."
          : "No valid rows to import."
      );
      return;
    }

    const payloads = eventsToInsertPayload(built.rows);
    setImporting(true);
    let inserted = 0;
    const failures: string[] = [];

    try {
      for (let i = 0; i < payloads.length; i += CHUNK) {
        const slice = payloads.slice(i, i + CHUNK);
        const { error } = await supabase.from("events").insert(slice);
        if (error) {
          for (const row of slice) {
            const { error: oneErr } = await supabase.from("events").insert(row);
            if (oneErr) failures.push(`${row.event_id}: ${oneErr.message}`);
            else inserted += 1;
          }
        } else {
          inserted += slice.length;
        }
      }

      setResultMessage(
        failures.length
          ? `Imported ${inserted} events. ${failures.length} row(s) failed (e.g. duplicate event_id). First error: ${failures[0]}`
          : `Successfully imported ${inserted} directory events.`
      );
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([BULK_IMPORT_CSV_TEMPLATE], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "poap-forge-bulk-events-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (authLoading) {
    return (
      <div className={`flex min-h-screen items-center justify-center ${bg}`}>
        <p className={textColor}>Loading…</p>
      </div>
    );
  }

  if (!user?.email) {
    return (
      <div className={`min-h-screen ${bg} px-4 py-12`}>
        <div className={`mx-auto max-w-lg rounded-3xl border ${border} ${card} p-8 shadow-lg`}>
          <h1 className={`mb-2 text-2xl font-bold ${textColor}`}>Bulk import</h1>
          <p className={muted}>
            Sign in with email to import curated events. Your address is set as <code className="text-sm">creator_email</code> for Supabase
            policies.
          </p>
          <Link
            to="/create"
            className="mt-6 inline-block rounded-full bg-purple-600 px-6 py-3 text-sm font-semibold text-white hover:bg-purple-700"
          >
            Go to Create (login)
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bg} transition-colors`}>
      <SEO
        title="Bulk import events — POAP Forge"
        description="Import many directory listings from CSV or JSON. Curate events from the web and publish them for the community."
        keywords="events, bulk import, CSV, directory, POAP Forge"
      />
      <div className="mx-auto max-w-4xl px-4 py-10 md:px-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={`rounded-[32px] border ${border} ${card} p-8 shadow-lg`}>
          <h1 className={`text-3xl font-bold ${textColor}`}>Bulk import directory events</h1>
          <p className={`mt-2 ${muted}`}>
            Paste a CSV (with header row) or JSON array. Rows become <strong>Basic</strong> listings marked as directory imports
            (<code className="text-xs">is_directory_listing</code>). Optional <code className="text-xs">source_url</code> should point to the
            official event or ticket page. Respect copyrights and terms of sources you index.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setFormat("csv")}
              className={`rounded-full px-5 py-2 text-sm font-medium ${
                format === "csv"
                  ? "bg-purple-600 text-white"
                  : isDark
                    ? "bg-white/10 text-white hover:bg-white/15"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              CSV
            </button>
            <button
              type="button"
              onClick={() => setFormat("json")}
              className={`rounded-full px-5 py-2 text-sm font-medium ${
                format === "json"
                  ? "bg-purple-600 text-white"
                  : isDark
                    ? "bg-white/10 text-white hover:bg-white/15"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              JSON
            </button>
            <button
              type="button"
              onClick={downloadTemplate}
              className={`rounded-full border px-5 py-2 text-sm font-medium ${border} ${isDark ? "text-white" : "text-slate-700"}`}
            >
              Download CSV template
            </button>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              format === "csv"
                ? BULK_IMPORT_CSV_TEMPLATE
                : '[\n  { "title": "Summit", "category": "web3", "event_type": "online", "source_url": "https://..." }\n]'
            }
            rows={14}
            className={`mt-4 w-full rounded-2xl border ${border} ${isDark ? "bg-[#1a1a2e] text-white" : "bg-slate-50 text-slate-900"} p-4 font-mono text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/25`}
          />

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={runPreview}
              className="rounded-full bg-purple-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-purple-700"
            >
              Validate & preview
            </button>
            <button
              type="button"
              onClick={runImport}
              disabled={importing || !text.trim()}
              className="rounded-full bg-[#FF4092] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-pink-500/20 hover:bg-[#FF6B9D] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {importing ? "Importing…" : "Import to directory"}
            </button>
            <Link to="/events" className={`self-center text-sm font-medium ${isDark ? "text-purple-400" : "text-purple-600"}`}>
              View events →
            </Link>
          </div>

          {parseError && (
            <p className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-800 dark:text-amber-200">
              {parseError}
            </p>
          )}

          {previewErrors.length > 0 && (
            <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-4">
              <p className={`text-sm font-semibold ${isDark ? "text-red-200" : "text-red-800"}`}>Validation issues</p>
              <ul className={`mt-2 max-h-40 list-inside list-disc overflow-y-auto text-sm ${isDark ? "text-red-100/90" : "text-red-900"}`}>
                {previewErrors.map((e, i) => (
                  <li key={i}>
                    Row {e.line}: {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {previewErrors.length === 0 && rowCount > 0 && !parseError && (
            <p className={`mt-4 text-sm ${muted}`}>
              Ready to import <strong className={textColor}>{rowCount}</strong> events as{" "}
              <strong className={textColor}>{user.email}</strong>
              {account ? (
                <>
                  {" "}
                  (wallet <span className="font-mono text-xs">{account.slice(0, 10)}…</span> attached)
                </>
              ) : null}
              .
            </p>
          )}

          {resultMessage && (
            <p className={`mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm ${isDark ? "text-emerald-200" : "text-emerald-900"}`}>
              {resultMessage}
            </p>
          )}

          <div className={`mt-8 border-t ${border} pt-6`}>
            <h2 className={`text-lg font-semibold ${textColor}`}>Column reference (CSV header / JSON keys)</h2>
            <ul className={`mt-2 list-inside list-disc space-y-1 text-sm ${muted}`}>
              <li>
                <strong className={textColor}>title</strong> (required) — <strong className={textColor}>event_id</strong> optional (unique); auto
                if omitted
              </li>
              <li>
                <strong className={textColor}>description</strong>, <strong className={textColor}>category</strong> (e.g. conference, web3,
                meetup), <strong className={textColor}>tags</strong> (comma-separated in CSV)
              </li>
              <li>
                <strong className={textColor}>event_type</strong>: online | in-person | hybrid
              </li>
              <li>
                <strong className={textColor}>location_address</strong>, <strong className={textColor}>location_lat</strong>,{" "}
                <strong className={textColor}>location_lng</strong>, <strong className={textColor}>location_radius</strong>
              </li>
              <li>
                <strong className={textColor}>start_datetime</strong>, <strong className={textColor}>end_datetime</strong> (ISO 8601)
              </li>
              <li>
                <strong className={textColor}>source_url</strong> — link to official listing / tickets
              </li>
              <li>
                <strong className={textColor}>requires_approval</strong> — true/false
              </li>
            </ul>
            <p className={`mt-4 text-sm ${muted}`}>
              Run <code className="rounded bg-black/10 px-1 text-xs">supabase-migration-directory-bulk.sql</code> in the Supabase SQL editor if
              inserts fail on unknown columns.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
