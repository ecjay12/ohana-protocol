import { type ReactNode } from "react";
import { Link } from "react-router-dom";

interface MiniappLayoutProps {
  children: ReactNode;
  chainName: string;
}

export function MiniappLayout({ children, chainName }: MiniappLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-theme-background">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-theme-border bg-theme-surface px-3 py-2">
        <Link
          to="/"
          className="text-sm font-semibold text-theme-text hover:text-theme-accent"
        >
          Ohana
        </Link>
        <span className="text-xs text-theme-text-muted">{chainName}</span>
      </header>
      <main className="flex-1 overflow-auto p-4">
        {children}
      </main>
    </div>
  );
}
