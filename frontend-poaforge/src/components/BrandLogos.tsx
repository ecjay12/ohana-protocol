import { useTheme } from "../hooks/useTheme";

const brands = [
  { name: "Spotify", color: "#1DB954" },
  { name: "Google", color: "#4285F4" },
  { name: "Stripe", color: "#635BFF" },
  { name: "YouTube", color: "#FF0000" },
  { name: "Microsoft", color: "#0078D4" },
  { name: "Medium", color: "#000000" },
  { name: "Zoom", color: "#2D8CFF" },
  { name: "Uber", color: "#000000" },
  { name: "Grab", color: "#00B14F" },
];

export function BrandLogos() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const bgColor = isDark ? "bg-[#2d2d44]" : "bg-white";

  return (
    <section className={`py-12 ${bgColor} transition-colors`}>
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="text-center">
          <h2 className={`mb-2 text-2xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
            Join these brands
          </h2>
          <p className={`mb-8 text-sm ${isDark ? "text-white/70" : "text-slate-600"}`}>
            We've had the pleasure of working with industry-defining brands. These are just some of
            them.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-8 sm:grid-cols-5 lg:grid-cols-9">
          {brands.map((brand) => (
            <div
              key={brand.name}
              className="flex items-center justify-center"
              style={{ color: brand.color }}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100/50 text-2xl font-bold transition-all hover:scale-110">
                {brand.name[0]}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
