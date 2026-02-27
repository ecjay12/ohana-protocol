import { useTheme } from "../../hooks/useTheme";

interface StatsCardProps {
  totalMints: number;
  pendingRequests: number;
  views: number;
}

export function StatsCard({ totalMints, pendingRequests, views }: StatsCardProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const cardBg = isDark ? "bg-[#2d2d44]" : "bg-white";
  const borderColor = isDark ? "border-white/20" : "border-slate-200";
  const textColor = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-white/70" : "text-slate-600";

  return (
    <div className={`rounded-2xl border ${borderColor} ${cardBg} p-6 transition-colors`}>
      <h3 className={`mb-4 text-lg font-semibold ${textColor}`}>Event Statistics</h3>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <div className={`text-2xl font-bold ${textColor}`}>{totalMints}</div>
          <div className={`text-sm ${textSecondary}`}>Total Mints</div>
        </div>
        <div>
          <div className={`text-2xl font-bold ${isDark ? "text-amber-400" : "text-amber-600"}`}>{pendingRequests}</div>
          <div className={`text-sm ${textSecondary}`}>Pending</div>
        </div>
        <div>
          <div className={`text-2xl font-bold ${textColor}`}>{views}</div>
          <div className={`text-sm ${textSecondary}`}>Views</div>
        </div>
      </div>
    </div>
  );
}
