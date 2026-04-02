import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="shrink-0 border-t border-theme-border bg-theme-surface/50 px-3 py-6 backdrop-blur-sm sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row sm:items-start">
        <nav className="flex max-w-full flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm content-safe">
          <Link
            to="/"
            className="text-theme-text-muted transition-colors duration-200 hover:text-theme-accent"
          >
            Home
          </Link>
          <Link
            to="/app"
            className="text-theme-text-muted transition-colors duration-200 hover:text-theme-accent"
          >
            App
          </Link>
          <Link
            to="/leaderboard"
            className="text-theme-text-muted transition-colors duration-200 hover:text-theme-accent"
          >
            Leaderboard
          </Link>
          <Link
            to="/vouch-graph"
            className="text-theme-text-muted transition-colors duration-200 hover:text-theme-accent"
          >
            Network graph
          </Link>
          <Link
            to="/integrate"
            className="text-theme-text-muted transition-colors duration-200 hover:text-theme-accent"
          >
            Integrate
          </Link>
          <Link
            to="/about"
            className="text-theme-text-muted transition-colors duration-200 hover:text-theme-accent"
          >
            About
          </Link>
          <Link
            to="/help"
            className="text-theme-text-muted transition-colors duration-200 hover:text-theme-accent"
          >
            Help
          </Link>
          <Link
            to="/terms"
            className="text-theme-text-muted transition-colors duration-200 hover:text-theme-accent"
          >
            Terms
          </Link>
          <a
            href="https://app.cg/c/OhanaDao/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-theme-text-muted transition-colors duration-200 hover:text-theme-accent"
          >
            Join our community
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </nav>
        <p className="max-w-full text-center text-sm leading-relaxed text-theme-text-dim content-safe sm:text-right">
          Powered by{" "}
          <span className="font-medium text-theme-text-muted">
            Ohana Protocol
          </span>
          {" · "}
          <a
            href="https://theohanaprotocol.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-theme-text-muted transition-colors hover:text-theme-accent"
          >
            theohanaprotocol.com
          </a>
          {" · "}
          © {year}
        </p>
      </div>
    </footer>
  );
}
