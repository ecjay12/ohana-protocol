import { Link } from "react-router-dom";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="shrink-0 border-t border-theme-border bg-theme-surface/50 px-4 py-6 backdrop-blur-sm md:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm">
          <Link
            to="/integrate"
            className="text-theme-text-muted transition-colors hover:text-theme-accent"
          >
            Integrate
          </Link>
          <Link
            to="/about"
            className="text-theme-text-muted transition-colors hover:text-theme-accent"
          >
            About
          </Link>
          <Link
            to="/terms"
            className="text-theme-text-muted transition-colors hover:text-theme-accent"
          >
            Terms
          </Link>
        </nav>
        <p className="text-center text-sm text-theme-text-dim">
          Powered by{" "}
          <span className="font-medium text-theme-text-muted">
            Ohana Handshake
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
