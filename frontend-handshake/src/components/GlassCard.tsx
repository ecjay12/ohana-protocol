import { type ReactNode } from "react";
import { motion } from "framer-motion";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  initial?: { opacity?: number; y?: number };
  animate?: { opacity?: number; y?: number };
  transition?: { duration?: number; delay?: number };
}

export function GlassCard({
  children,
  className = "",
  initial = { opacity: 0, y: 12 },
  animate = { opacity: 1, y: 0 },
  transition = { duration: 0.3 },
}: GlassCardProps) {
  return (
    <motion.div
      initial={initial as React.ComponentProps<typeof motion.div>["initial"]}
      animate={animate as React.ComponentProps<typeof motion.div>["animate"]}
      transition={transition}
      className={`glass-card p-6 ${className}`}
    >
      {children}
    </motion.div>
  );
}
