import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useTheme } from "../hooks/useTheme";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { theme } = useTheme();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const isDark = theme === "dark";
  const cardBg = isDark ? "bg-[#2d2d44]" : "bg-white";
  const textColor = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-white/70" : "text-slate-600";
  const inputBg = isDark ? "bg-white/10" : "bg-white";
  const borderColor = isDark ? "border-white/20" : "border-slate-200";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        alert("Check your email for the confirmation link!");
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        alert("Check your email for the magic link!");
      }
      onClose();
    } catch (error: any) {
      alert(error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className={`w-full max-w-md rounded-[32px] ${cardBg} p-8 shadow-lg transition-colors`}>
        <h2 className={`mb-4 text-2xl font-bold ${textColor}`}>
          {isSignUp ? "Sign Up" : "Sign In"}
        </h2>
        <p className={`mb-6 text-sm ${textSecondary}`}>
          {isSignUp
            ? "Create an account to start creating events"
            : "Sign in to create and manage events"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className={`w-full rounded-full border ${borderColor} ${inputBg} px-6 py-3 ${textColor} placeholder-slate-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[#FF4092] px-6 py-3 font-bold text-white shadow-lg shadow-pink-500/25 transition-all hover:bg-[#FF6B9D] disabled:opacity-50"
          >
            {loading ? "Sending..." : isSignUp ? "Sign Up" : "Send Magic Link"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className={`text-sm ${textSecondary} hover:${textColor}`}
          >
            {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
          </button>
        </div>

        <button
          onClick={onClose}
          className={`mt-4 w-full rounded-full border ${borderColor} ${isDark ? "bg-white/10 text-white hover:bg-white/20" : "bg-white text-slate-700 hover:bg-slate-50"} px-6 py-3 text-sm font-medium transition-colors`}
        >
          Close
        </button>
      </div>
    </div>
  );
}
