import { useState, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import type { Theme } from "@/contexts/ThemeContext";

const WORDS = ["Humanity", "Agent", "Work", "Vouch", "DAO", "Social Proof!"] as const;

/** Reference hero (light UI): navy prefix, vivid blue center, pale blue stack. */
const REF_PREFIX = "#1A1C22";
const REF_ACTIVE = "#2D68E5";
const REF_MUTED_NEAR = "#C5D4F5";
const REF_MUTED = "#D0DBF8";
const REF_MUTED_FAR = "#E8EEFC";

/**
 * Row grid — MUST match the actual rendered font + line-height of each word.
 * We use `leading-none` (line-height = 1) and cap text at `text-5xl` (3rem).
 * LINE_HEIGHT_REM is a touch larger than font-size so glyphs breathe.
 */
const LINE_HEIGHT_REM = 3.6;
/** Rows visible in the ticker viewport (center + 2 above + 2 below). Must be odd. */
const VISIBLE_ROWS = 5;
const VIEWPORT_REM = LINE_HEIGHT_REM * VISIBLE_ROWS;
const CENTER_OFFSET_REM = (VIEWPORT_REM - LINE_HEIGHT_REM) / 2;
const PREFIX_OPTICAL_NUDGE_REM = 0.12;
const INTERVAL_MS = 3600;

function wordOpacity(active: number, index: number): number {
  const d = Math.abs(index - active);
  if (d === 0) return 1;
  if (d === 1) return 0.55;
  if (d === 2) return 0.28;
  return 0.14;
}

function wordScale(active: number, index: number): number {
  const d = Math.abs(index - active);
  if (d === 0) return 1;
  if (d === 1) return 0.96;
  return 0.92;
}

function lineColor(theme: Theme, active: number, index: number): string {
  const d = Math.abs(index - active);
  if (theme === "lyx" || theme === "light") {
    if (d === 0) return REF_ACTIVE;
    if (d === 1) return REF_MUTED_NEAR;
    if (d === 2) return REF_MUTED;
    return REF_MUTED_FAR;
  }
  if (d === 0) return "var(--theme-accent)";
  if (d === 1) return "color-mix(in srgb, var(--theme-accent) 52%, var(--theme-bg))";
  if (d === 2) return "color-mix(in srgb, var(--theme-accent) 32%, var(--theme-bg))";
  return "color-mix(in srgb, var(--theme-accent) 18%, var(--theme-bg))";
}

function prefixColor(theme: Theme): string {
  if (theme === "lyx" || theme === "light") return REF_PREFIX;
  return "var(--theme-text)";
}

const springScroll = {
  type: "spring" as const,
  stiffness: 168,
  damping: 22,
  mass: 0.72,
};

const springWords = {
  type: "spring" as const,
  stiffness: 220,
  damping: 26,
  mass: 0.55,
};

const reduceTransition = { type: "tween" as const, duration: 0.15, ease: "easeOut" as const };

interface ProofOfWordScrollProps {
  id?: string;
}

/**
 * “Proof of …” + vertical ticker — multi-row viewport so the ghost stack reads like the reference.
 */
export function ProofOfWordScroll({ id = "hero-heading" }: ProofOfWordScrollProps) {
  const { theme } = useTheme();
  const reduceMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;
    const idTimer = window.setInterval(() => {
      setActiveIndex((i) => (i + 1) % WORDS.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(idTimer);
  }, [reduceMotion]);

  useEffect(() => {
    if (reduceMotion) setActiveIndex(0);
  }, [reduceMotion]);

  /** Center the active word at the viewport midpoint. */
  const yRem = -activeIndex * LINE_HEIGHT_REM + CENTER_OFFSET_REM;
  const a11yLabel = `Proof of ${WORDS.slice(0, -1).join(", ")}, and ${WORDS[WORDS.length - 1]}`;

  const slideTransition = reduceMotion ? reduceTransition : springScroll;
  const colorTween = { type: "tween" as const, duration: 0.48, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <h1
      id={id}
      aria-label={a11yLabel}
      className="flex w-full min-w-0 flex-nowrap items-start justify-start gap-x-2 sm:gap-x-3"
      style={{ height: `${VIEWPORT_REM}rem` }}
    >
      <span
        className="relative shrink-0"
        style={{
          height: `${VIEWPORT_REM}rem`,
          paddingTop: `${CENTER_OFFSET_REM + PREFIX_OPTICAL_NUDGE_REM}rem`,
        }}
      >
        <span
          className="block whitespace-nowrap text-3xl font-bold leading-none tracking-tight sm:text-4xl md:text-5xl"
          style={{
            height: `${LINE_HEIGHT_REM}rem`,
            lineHeight: `${LINE_HEIGHT_REM}rem`,
            color: prefixColor(theme),
          }}
        >
          Proof of&nbsp;
        </span>
      </span>
      <span
        className="relative shrink-0 overflow-x-visible overflow-y-hidden"
        style={{
          height: `${VIEWPORT_REM}rem`,
          maskImage:
            "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.25) 10%, black 32%, black 68%, rgba(0,0,0,0.25) 90%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.25) 10%, black 32%, black 68%, rgba(0,0,0,0.25) 90%, transparent 100%)",
        }}
        aria-hidden
      >
        <motion.span
          className="flex flex-col will-change-transform"
          initial={false}
          animate={{ y: `${yRem}rem` }}
          transition={slideTransition}
        >
          {WORDS.map((word, i) => (
            <motion.span
              key={word}
              className="flex items-center whitespace-nowrap font-bold will-change-[opacity,transform,color]"
              style={{
                height: `${LINE_HEIGHT_REM}rem`,
                lineHeight: `${LINE_HEIGHT_REM}rem`,
                transformOrigin: "left center",
              }}
              initial={false}
              animate={{
                color: lineColor(theme, activeIndex, i),
                opacity: reduceMotion ? (i === 0 ? 1 : 0.2) : wordOpacity(activeIndex, i),
                scale: reduceMotion ? 1 : wordScale(activeIndex, i),
              }}
              transition={
                reduceMotion
                  ? reduceTransition
                  : {
                      opacity: springWords,
                      scale: springWords,
                      color: colorTween,
                    }
              }
            >
              <span className="text-3xl leading-none sm:text-4xl md:text-5xl">
                {word}
              </span>
            </motion.span>
          ))}
        </motion.span>
      </span>
    </h1>
  );
}
