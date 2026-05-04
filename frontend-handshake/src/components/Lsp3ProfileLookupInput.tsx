/**
 * LUKSO Universal Profile lookup: type a name (debounced) or paste 0x address.
 * Picker list uses the same Hasura indexer as profile search in the sidebar.
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { getAddress } from "ethers";
import { Loader2, Search, User, X } from "lucide-react";
import { searchUniversalProfilesByLsp3Name, type ProfileNameSearchHit } from "@/lib/lspIndexerProfiles";
import { useIndexerLuksoFields } from "@/hooks/useIndexerDisplayNames";

const DEBOUNCE_MS = 360;

function shortAddr(a: string) {
  if (a.length < 12) return a;
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function looksLikePartialHex(s: string) {
  const t = s.trim();
  if (!t.startsWith("0x")) return false;
  return t.length < 42;
}

export interface Lsp3ProfileLookupInputProps {
  value: string;
  onValueChange: (v: string) => void;
  /** Set when the user picks a search hit; clear by setting null. */
  selectedAddress: string | null;
  onSelectedAddressChange: (addr: string | null) => void;
  disabled?: boolean;
  readOnly?: boolean;
  /** Larger styles to match Vouch card */
  size?: "default" | "lg";
  id?: string;
}

export function Lsp3ProfileLookupInput({
  value,
  onValueChange,
  selectedAddress,
  onSelectedAddressChange,
  disabled = false,
  readOnly = false,
  size = "lg",
  id: idProp,
}: Lsp3ProfileLookupInputProps) {
  const genId = useId();
  const listboxId = `${genId}-listbox`;
  const id = idProp ?? genId;

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<ProfileNameSearchHit[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef(value);
  valueRef.current = value;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showNoResults, setShowNoResults] = useState(false);

  const hitAddresses = useMemo(() => hits.map((h) => h.address), [hits]);
  const { avatarUrls: hitAvatars } = useIndexerLuksoFields(hitAddresses, {
    enabled: hits.length > 0,
  });

  const inputClass =
    size === "lg"
      ? "min-h-[3.25rem] w-full rounded-xl border border-theme-border bg-theme-surface pl-10 pr-10 font-mono text-base text-theme-text placeholder:text-theme-dim focus:border-theme-accent focus:outline-none focus:ring-2 focus:ring-theme-accent-soft sm:min-h-[3.5rem] sm:pl-11 sm:pr-11 sm:text-lg"
      : "w-full rounded-xl border border-theme-border bg-theme-surface py-2.5 pl-9 pr-9 font-mono text-sm text-theme-text placeholder:text-theme-dim focus:border-theme-accent focus:outline-none focus:ring-2 focus:ring-theme-accent-soft";

  const endSearch = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
  }, []);

  useEffect(() => {
    if (readOnly || disabled) {
      endSearch();
      return;
    }

    if (selectedAddress) {
      endSearch();
      setHits([]);
      setOpen(false);
      return;
    }

    const q = value.trim();

    if (q.length < 2) {
      endSearch();
      setHits([]);
      setOpen(false);
      setShowNoResults(false);
      return;
    }

    try {
      getAddress(q);
      endSearch();
      setHits([]);
      setOpen(false);
      return;
    } catch {
      /* not a full address */
    }

    if (looksLikePartialHex(q)) {
      endSearch();
      setHits([]);
      setOpen(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void (async () => {
        const q2 = valueRef.current.trim();
        if (q2.length < 2) return;
        const ac = new AbortController();
        abortRef.current?.abort();
        abortRef.current = ac;
        setLoading(true);
        setOpen(true);
        setShowNoResults(false);
        try {
          const out = await searchUniversalProfilesByLsp3Name(q2, {
            limit: 20,
            signal: ac.signal,
          });
          if (ac.signal.aborted) return;
          setHits(out);
          setShowNoResults(out.length === 0);
          setOpen(true);
        } catch (e) {
          if ((e as Error).name === "AbortError") return;
          setHits([]);
          setShowNoResults(false);
        } finally {
          if (!ac.signal.aborted) setLoading(false);
        }
      })();
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [value, readOnly, disabled, endSearch, selectedAddress]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = (h: ProfileNameSearchHit) => {
    endSearch();
    // Apply value first, then selected address. Parents often clear the pick when the
    // text changes (see VouchCard); that must run before we set the picked address
    // or the last batched update leaves selectedAddress null.
    onValueChange(h.name?.trim() || shortAddr(h.address));
    onSelectedAddressChange(h.address);
    setHits([]);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative z-10 w-full">
      <Search
        className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-dim ${
          size === "lg" ? "sm:left-4" : ""
        }`}
        aria-hidden
      />
      <input
        id={id}
        type="text"
        role="combobox"
        autoComplete="off"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-autocomplete="list"
        disabled={disabled}
        readOnly={readOnly}
        placeholder="Search by profile name or paste 0x address…"
        value={value}
        onChange={(e) => {
          onValueChange(e.target.value);
        }}
        onFocus={() => {
          if (hits.length > 0) setOpen(true);
        }}
        className={inputClass}
      />
      {value && !readOnly && !disabled && (
        <button
          type="button"
          className={`absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-theme-dim hover:text-theme-text ${
            size === "lg" ? "sm:right-3" : ""
          }`}
          onClick={() => {
            onValueChange("");
            onSelectedAddressChange(null);
            setHits([]);
            setOpen(false);
            setShowNoResults(false);
          }}
          aria-label="Clear"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {open && (loading || hits.length > 0 || showNoResults) && (
        <ul
          id={listboxId}
          role="listbox"
          className="profile-lookup-panel absolute left-0 right-0 z-[200] mt-1.5 max-h-64 w-full overflow-y-auto rounded-xl py-1.5"
        >
          {loading && (
            <li className="flex items-center gap-2 px-3 py-2.5 text-sm text-theme-text-muted">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              Searching…
            </li>
          )}
          {!loading && showNoResults && (
            <li className="px-3 py-2.5 text-sm text-theme-text-muted">No matching profiles in the indexer.</li>
          )}
          {!loading &&
            hits.map((h) => {
              const label = h.name?.trim() || shortAddr(h.address);
              const face = hitAvatars[h.address.toLowerCase()]?.trim();
              return (
                <li key={h.address} role="option" className="border-b border-theme-border/70 last:border-0">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors sm:px-3 hover:bg-theme-surface-strong"
                    onClick={() => pick(h)}
                  >
                    {face ? (
                      <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full ring-1 ring-theme-border/80">
                        <img src={face} alt="" className="h-full w-full object-cover" loading="lazy" />
                      </div>
                    ) : (
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-theme-surface-strong text-theme-dim ring-1 ring-theme-border/60"
                        aria-hidden
                      >
                        <User className="h-4 w-4" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1 text-left">
                      <div className="truncate text-sm font-medium text-theme-accent">{label}</div>
                      <div className="mt-0.5 truncate font-mono text-[10px] text-theme-dim sm:text-xs">{h.address}</div>
                    </div>
                  </button>
                </li>
              );
            })}
        </ul>
      )}
    </div>
  );
}

/** Resolve a vouch target: explicit pick, or valid checksummed address in the input. */
export function resolveVouchTargetAddress(
  input: string,
  selectedFromPicker: string | null
): string | null {
  if (selectedFromPicker) {
    try {
      return getAddress(selectedFromPicker);
    } catch {
      return null;
    }
  }
  const t = input.trim();
  if (t.length < 42) return null;
  try {
    return getAddress(t);
  } catch {
    return null;
  }
}
