import { useState } from "react";
import { useTheme } from "../hooks/useTheme";
import { motion } from "framer-motion";

export const EVENT_CATEGORIES = [
  { id: "all", name: "All Events", icon: "🎯" },
  { id: "conference", name: "Conference", icon: "💼" },
  { id: "sports", name: "Sports", icon: "⚽" },
  { id: "super-bowl", name: "Super Bowl", icon: "🏈" },
  { id: "music", name: "Music", icon: "🎵" },
  { id: "online", name: "Online Event", icon: "💻" },
  { id: "workshop", name: "Workshop", icon: "🔧" },
  { id: "meetup", name: "Meetup", icon: "👥" },
  { id: "festival", name: "Festival", icon: "🎪" },
  { id: "web3", name: "Web3", icon: "🌐" },
  { id: "gaming", name: "Gaming", icon: "🎮" },
  { id: "art", name: "Art & Culture", icon: "🎨" },
] as const;

interface EventCategoriesProps {
  selectedCategory: string;
  onCategorySelect: (categoryId: string) => void;
}

export function EventCategories({ selectedCategory, onCategorySelect }: EventCategoriesProps) {
  const { theme } = useTheme();
  const [customCategory, setCustomCategory] = useState("");
  const isDark = theme === "dark";
  const bgColor = isDark ? "bg-[#1a1a2e]" : "bg-[#E2E0FF]";
  const inputBg = isDark ? "bg-[#2d2d44]" : "bg-white";
  const borderColor = isDark ? "border-white/20" : "border-slate-200";
  const textColor = isDark ? "text-white" : "text-slate-900";
  const isCustomSelected = selectedCategory && !EVENT_CATEGORIES.some((c) => c.id === selectedCategory);

  const handleCustomSubmit = () => {
    const trimmed = customCategory.trim().toLowerCase().replace(/\s+/g, "-");
    if (trimmed) {
      onCategorySelect(trimmed);
    }
  };

  return (
    <div className={`${bgColor} py-8 transition-colors`}>
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <h2 className={`mb-6 text-2xl font-bold ${textColor}`}>Browse by Category</h2>
        <div className="flex flex-wrap gap-3">
          {EVENT_CATEGORIES.map((category, index) => {
            const isSelected = selectedCategory === category.id;
            return (
              <motion.button
                key={category.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => onCategorySelect(category.id)}
                className={`flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-all ${
                  isSelected
                    ? "bg-purple-600 text-white shadow-lg shadow-purple-500/25"
                    : isDark
                    ? "bg-[#2d2d44] text-white/80 hover:bg-[#3d3d54] hover:text-white"
                    : "bg-white text-slate-700 shadow-md hover:bg-purple-50 hover:text-purple-700"
                }`}
              >
                <span className="text-lg">{category.icon}</span>
                <span>{category.name}</span>
              </motion.button>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCustomSubmit()}
            placeholder="Or type a category (e.g. hackathon, networking)"
            className={`flex-1 min-w-[200px] rounded-full border ${borderColor} ${inputBg} px-4 py-2.5 text-sm ${textColor} placeholder-slate-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
          />
          <button
            type="button"
            onClick={handleCustomSubmit}
            className={`rounded-full px-5 py-2.5 text-sm font-medium ${
              isCustomSelected
                ? "bg-purple-600 text-white"
                : isDark
                ? "bg-[#2d2d44] text-white/80 hover:bg-[#3d3d54]"
                : "bg-white text-slate-700 shadow hover:bg-purple-50"
            }`}
          >
            Search
          </button>
        </div>
      </div>
    </div>
  );
}
