import type { ReactNode } from "react";
import { Mountain, Play, Clock } from "lucide-react";

/**
 * Reference UI for the Handshake light (clay) theme — browser chrome, chunky controls, icon row.
 * View at /theme-demo with theme set to Light.
 */
export function ClayThemeDemo() {
  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-10">
      <header className="text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-clay-coral">Clay light</p>
        <h1 className="mt-2 font-sans text-3xl font-bold tracking-tight text-clay-ink md:text-4xl">
          Soft &amp; floating
        </h1>
        <p className="mt-2 text-balance text-clay-ink/70">
          Warm pink field, coral accents, teal and mint highlights — playground for the Handshake light theme.
        </p>
      </header>

      <div className="overflow-hidden rounded-clay border border-clay-coral/15 bg-clay-surface shadow-clay">
        <div className="flex items-center gap-2 border-b border-clay-coral/10 bg-gradient-to-r from-clay-surface-soft to-clay-bg px-4 py-3">
          <span className="size-3 rounded-full bg-[#FF9F6B] shadow-sm" aria-hidden />
          <span className="size-3 rounded-full bg-[#FFD93D] shadow-sm" aria-hidden />
          <span className="size-3 rounded-full bg-[#7AE582] shadow-sm" aria-hidden />
          <div className="ml-2 flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-clay-coral/12 bg-white/90 px-3 py-2 shadow-clay-sm">
            <span className="text-xs text-clay-ink/40">🔒</span>
            <span className="truncate font-mono text-xs text-clay-ink/65">ohana.xyz/handshake</span>
          </div>
        </div>
        <div className="space-y-5 bg-gradient-to-b from-white to-clay-bg/80 p-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <IconTile label="Scene" color="bg-clay-peach/90" icon={<Mountain className="size-7 text-white drop-shadow-sm" />} />
            <IconTile label="Type" color="bg-clay-lavender/90" icon={<span className="text-2xl font-black text-white drop-shadow-sm">A</span>} frame />
            <IconTile label="Play" color="bg-clay-coral/90" icon={<Play className="size-7 fill-white text-white drop-shadow-sm" />} />
            <IconTile label="Time" color="bg-clay-teal/90" icon={<Clock className="size-7 text-white drop-shadow-sm" />} />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="rounded-2xl bg-clay-coral px-6 py-3 text-sm font-semibold text-white shadow-clay-sm transition hover:shadow-clay active:translate-y-0.5 active:shadow-clay-sm"
            >
              Primary
            </button>
            <button
              type="button"
              className="rounded-2xl border-2 border-clay-teal bg-white/90 px-6 py-3 text-sm font-semibold text-clay-ink shadow-clay-sm transition hover:bg-clay-teal/10 active:translate-y-0.5"
            >
              Secondary
            </button>
            <button
              type="button"
              className="rounded-2xl bg-clay-surface-soft px-6 py-3 text-sm font-semibold text-clay-ink/80 shadow-clay-inset"
            >
              Inset
            </button>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-clay-ink/45">
        Tokens: <code className="rounded bg-white/60 px-1.5 py-0.5">bg-clay-bg</code>{" "}
        <code className="rounded bg-white/60 px-1.5 py-0.5">shadow-clay</code> · Inter + rounded UI
      </p>
    </div>
  );
}

function IconTile({
  label,
  color,
  icon,
  frame,
}: {
  label: string;
  color: string;
  icon: ReactNode;
  frame?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`flex size-[4.5rem] items-center justify-center rounded-3xl ${color} shadow-clay-sm ${frame ? "ring-4 ring-white/50" : ""}`}
      >
        {frame ? (
          <div className="flex size-12 items-center justify-center rounded-2xl border-4 border-white/40 bg-white/20 backdrop-blur-sm">
            {icon}
          </div>
        ) : (
          icon
        )}
      </div>
      <span className="text-xs font-medium text-clay-ink/55">{label}</span>
    </div>
  );
}
