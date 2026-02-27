import { useTheme } from "../../hooks/useTheme";

interface StatusToggleProps {
  isActive: boolean;
  onToggle: (isActive: boolean) => void;
}

export function StatusToggle({ isActive, onToggle }: StatusToggleProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const textColor = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-white/70" : "text-slate-500";

  return (
    <div className="flex items-center justify-between">
      <div>
        <label className={`text-sm font-medium ${textColor}`}>Event Status</label>
        <p className={`text-xs ${textSecondary}`}>
          {isActive ? "Event is active and accepting claims" : "Event is paused"}
        </p>
      </div>
      <label className="toggle-switch">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => onToggle(e.target.checked)}
        />
        <span className="toggle-slider"></span>
      </label>
    </div>
  );
}
