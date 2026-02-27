import { type ReactNode, useRef } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

const MAGNETIC_STRENGTH = 8;
const GLOW_TRANSITION = { type: "spring", stiffness: 400, damping: 25 };

interface GlowButtonProps {
  children: ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
}

export function GlowButton({
  children,
  variant = "primary",
  className = "",
  disabled,
  type = "button",
  onClick,
}: GlowButtonProps) {
  const isPrimary = variant === "primary";
  const ref = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, GLOW_TRANSITION);
  const springY = useSpring(y, GLOW_TRANSITION);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = (e.clientX - centerX) / rect.width;
    const deltaY = (e.clientY - centerY) / rect.height;
    x.set(deltaX * MAGNETIC_STRENGTH);
    y.set(deltaY * MAGNETIC_STRENGTH);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.button
      ref={ref}
      type={type}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseOut={handleMouseLeave}
      style={{ x: springX, y: springY }}
      whileHover={disabled ? undefined : { scale: 1.03 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={{ duration: 0.2 }}
      disabled={disabled}
      className={
        isPrimary
          ? `rounded-xl border-2 border-theme-accent bg-theme-accent-soft px-5 py-2.5 font-medium text-theme-accent transition-shadow duration-200 shadow-theme-glow hover:shadow-theme-hover active:[box-shadow:var(--theme-shadow-active)] disabled:opacity-50 disabled:hover:shadow-theme-glow disabled:active:shadow-theme-glow ${className}`
          : `rounded-xl border-2 border-theme-border bg-theme-surface px-5 py-2.5 font-medium text-theme-text transition-all duration-200 hover:bg-theme-surface-strong hover:border-theme-border-strong hover:shadow-theme-glow active:[box-shadow:var(--theme-shadow-active)] disabled:opacity-50 ${className}`
      }
    >
      {children}
    </motion.button>
  );
}
