import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-700 to-teal-900">
          <div className="glass-card rounded-[32px] p-8 shadow-glass">
            <h1 className="mb-4 text-2xl font-bold text-slate-900">Something went wrong</h1>
            <p className="mb-4 text-slate-600">{this.state.error?.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-full bg-lime-400 px-6 py-3 font-bold text-slate-900"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
