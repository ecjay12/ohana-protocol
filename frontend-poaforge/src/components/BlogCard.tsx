import { useTheme } from "../hooks/useTheme";
import { motion } from "framer-motion";

interface BlogCardProps {
  image?: string;
  title: string;
  description: string;
  date: string;
  author: string;
  index?: number;
}

export function BlogCard({ image, title, description, date, author, index = 0 }: BlogCardProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const cardBg = isDark ? "bg-[#2d2d44]" : "bg-white";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-white/70" : "text-slate-600";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <div
        className={`group cursor-pointer overflow-hidden rounded-xl ${cardBg} shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl`}
      >
        {/* Blog Image */}
        {image ? (
          <img src={image} alt={title} className="h-48 w-full object-cover" />
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
                d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
              />
            </svg>
          </div>
        )}

        {/* Card Content */}
        <div className="p-6">
          <h3 className={`mb-2 line-clamp-2 text-lg font-bold ${textPrimary} group-hover:text-purple-600`}>
            {title}
          </h3>
          <p className={`mb-4 line-clamp-3 text-sm ${textSecondary}`}>{description}</p>
          <div className={`text-xs ${textSecondary}`}>
            {date} - {author}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
