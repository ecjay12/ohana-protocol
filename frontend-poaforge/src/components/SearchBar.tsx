import { useTheme } from "../hooks/useTheme";

interface SearchBarProps {
  searchEvent: string;
  place: string;
  time: string;
  onSearchEventChange: (value: string) => void;
  onPlaceChange: (value: string) => void;
  onTimeChange: (value: string) => void;
}

export function SearchBar({
  searchEvent,
  place,
  time,
  onSearchEventChange,
  onPlaceChange,
  onTimeChange,
}: SearchBarProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const bgColor = isDark ? "bg-[#1e293b]" : "bg-[#4C1D95]";
  const inputBg = isDark ? "bg-white/10" : "bg-white/20";
  const textColor = isDark ? "text-white" : "text-white";
  const placeholderColor = isDark ? "placeholder-white/60" : "placeholder-white/70";

  return (
    <div className={`${bgColor} rounded-2xl p-6 transition-colors`}>
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="relative">
          <input
            type="text"
            value={searchEvent}
            onChange={(e) => onSearchEventChange(e.target.value)}
            placeholder="Search Event"
            className={`w-full rounded-lg ${inputBg} border-0 px-4 py-3 ${textColor} ${placeholderColor} focus:outline-none focus:ring-2 focus:ring-white/30`}
          />
          <svg
            className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        <div className="relative">
          <input
            type="text"
            value={place}
            onChange={(e) => onPlaceChange(e.target.value)}
            placeholder="Place"
            className={`w-full rounded-lg ${inputBg} border-0 px-4 py-3 ${textColor} ${placeholderColor} focus:outline-none focus:ring-2 focus:ring-white/30`}
          />
          <svg
            className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </div>

        <div className="relative">
          <input
            type="text"
            value={time}
            onChange={(e) => onTimeChange(e.target.value)}
            placeholder="Any date"
            className={`w-full rounded-lg ${inputBg} border-0 px-4 py-3 ${textColor} ${placeholderColor} focus:outline-none focus:ring-2 focus:ring-white/30`}
          />
          <svg
            className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60"
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
      </div>
    </div>
  );
}
