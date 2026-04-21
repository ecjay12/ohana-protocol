import { Link } from "react-router-dom";
import { ClayThemeDemo } from "../components/theme/ClayThemeDemo";

export function ThemeDemoPage() {
  return (
    <div className="min-h-screen bg-theme-background">
      <div className="px-4 pt-6 text-center">
        <Link
          to="/"
          className="text-sm font-medium text-theme-accent underline-offset-4 hover:underline"
        >
          ← Back home
        </Link>
      </div>
      <ClayThemeDemo />
    </div>
  );
}
