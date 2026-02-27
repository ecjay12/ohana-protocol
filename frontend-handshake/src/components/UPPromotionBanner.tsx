/**
 * Banner promoting Universal Profile signup for EOA users.
 */

import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { GlowButton } from "./GlowButton";

const UP_SIGNUP_URL = "https://universalprofile.cloud/";

export function UPPromotionBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-theme-accent bg-theme-accent-soft p-4"
    >
      <p className="mb-3 text-sm text-theme-text">
        Don&apos;t have a Universal Profile? Sign up for one today!
      </p>
      <GlowButton
        variant="primary"
        onClick={() => window.open(UP_SIGNUP_URL, "_blank", "noopener,noreferrer")}
        className="w-full sm:w-auto"
      >
        <span className="flex items-center gap-2">
          Get Universal Profile
          <ExternalLink className="h-4 w-4" />
        </span>
      </GlowButton>
    </motion.div>
  );
}
