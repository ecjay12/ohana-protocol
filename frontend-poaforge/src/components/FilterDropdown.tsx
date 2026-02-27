import { useState } from "react";
import { useTheme } from "../hooks/useTheme";

interface FilterDropdownProps {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}

export function FilterDropdown({ label, options, value, onChange }: FilterDropdownProps) {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const isDark = theme === "dark";
  const bgColor = isDark ? "bg-[#2d2d44]" : "bg-white";
  const textColor = isDark ? "text-white" : "text-slate-900";
  const borderColor = isDark ? "border-white/20" : "border-slate-200";

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex w-full items-center justify-between rounded-lg border ${borderColor} ${bgColor} px-4 py-2.5 text-sm font-medium ${textColor} transition-colors hover:bg-opacity-80`}
      >
        <span>{value || label}</span>
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          ></div>
          <div className={`absolute top-full z-20 mt-2 w-full rounded-lg border ${borderColor} ${bgColor} shadow-lg`}>
            {options.map((option) => (
              <button
                key={option}
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2 text-left text-sm ${textColor} transition-colors hover:bg-purple-500/10 ${
                  value === option ? "bg-purple-500/20" : ""
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
