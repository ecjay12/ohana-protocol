import { Link } from "react-router-dom";
import { Event } from "../lib/supabase";
import { getGatewayURL } from "../lib/ipfs";
import { useTheme } from "../hooks/useTheme";
import { EVENT_CATEGORIES } from "./EventCategories";
import { motion } from "framer-motion";

interface EventCardProps {
  event: Event;
  index?: number;
}

export function EventCard({ event, index = 0 }: EventCardProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const cardBg = isDark ? "bg-[#2d2d44]" : "bg-white";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-white/70" : "text-slate-600";

  const eventDate = event.created_at ? new Date(event.created_at) : new Date();
  const month = eventDate.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  const day = eventDate.getDate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Link to={`/event/${event.event_id}`}>
        <div
          className={`group cursor-pointer overflow-hidden rounded-xl ${cardBg} shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl`}
        >
          {/* Event Image */}
          {event.image_cid ? (
            <img
              src={getGatewayURL(event.image_cid)}
              alt={`${event.title} - ${event.category || "Event"} - Join and claim your POAP NFT`}
              className="h-48 w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-48 w-full items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400">
              <svg
                className="h-16 w-16 text-white/50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}

          {/* Card Content */}
          <div className="p-6">
            {/* Date Badge */}
            <div className="mb-3 flex items-center gap-3">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-purple-600">{month}</span>
                <span className={`text-2xl font-bold ${textPrimary}`}>{day}</span>
              </div>
            </div>

            {/* Event Title */}
            <h3 className={`mb-2 line-clamp-2 text-lg font-bold ${textPrimary} group-hover:text-purple-600`}>
              {event.title}
            </h3>

            {/* Description */}
            <p className={`mb-4 line-clamp-2 text-sm ${textSecondary}`}>
              {event.description || "Join us for an amazing event experience."}
            </p>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2">
              {event.category && (
                <span className="flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                  {EVENT_CATEGORIES.find(c => c.id === event.category)?.icon || "📅"}
                  {EVENT_CATEGORIES.find(c => c.id === event.category)?.name || event.category}
                </span>
              )}
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  event.is_poap
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                }`}
              >
                {event.is_poap ? "POAP" : "Basic"}
              </span>
              {event.requires_approval && (
                <span className={`rounded-full bg-slate-100 px-3 py-1 text-xs font-medium ${isDark ? "bg-slate-800/30 text-slate-300" : "text-slate-600"}`}>
                  Requires Approval
                </span>
              )}
            </div>
            {event.tags && event.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {event.tags.slice(0, 3).map((tag, idx) => (
                  <span
                    key={idx}
                    className={`rounded-full px-2 py-0.5 text-xs ${isDark ? "bg-white/10 text-white/60" : "bg-slate-100 text-slate-600"}`}
                  >
                    #{tag}
                  </span>
                ))}
                {event.tags.length > 3 && (
                  <span className={`text-xs ${textSecondary}`}>+{event.tags.length - 3} more</span>
                )}
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
