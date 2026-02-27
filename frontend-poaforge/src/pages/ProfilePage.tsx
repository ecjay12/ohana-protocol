import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase, Event } from "../lib/supabase";
import { useSupabaseAuth } from "../hooks/useSupabaseAuth";
import { useInjectedWallet } from "../hooks/useInjectedWallet";
import { useTheme } from "../hooks/useTheme";
import { getGatewayURL } from "../lib/ipfs";
import { motion } from "framer-motion";

export function ProfilePage() {
  const { user } = useSupabaseAuth();
  const { accounts } = useInjectedWallet();
  const { theme } = useTheme();
  const account = accounts[0];
  const [activeTab, setActiveTab] = useState<"events" | "collection">("events");
  const [myEvents, setMyEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const isDark = theme === "dark";
  const bgColor = isDark ? "bg-[#1a1a2e]" : "bg-[#E2E0FF]";
  const cardBg = isDark ? "bg-[#2d2d44]" : "bg-white";
  const textColor = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-white/70" : "text-slate-600";
  const borderColor = isDark ? "border-white/20" : "border-slate-200";

  useEffect(() => {
    if (user || account) {
      loadMyEvents();
    }
  }, [user, account]);

  async function loadMyEvents() {
    try {
      let query = supabase.from("events").select("*");

      if (user?.email) {
        query = query.eq("creator_email", user.email);
      } else if (account) {
        query = query.eq("creator_wallet", account.toLowerCase());
      } else {
        setLoading(false);
        return;
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      setMyEvents(data || []);
    } catch (error) {
      console.error("Error loading events:", error);
    } finally {
      setLoading(false);
    }
  }

  if (!user && !account) {
    return (
      <div className={`flex min-h-screen items-center justify-center ${bgColor}`}>
        <div className={`rounded-[32px] ${cardBg} p-8 text-center shadow-lg`}>
          <p className={`mb-4 ${textSecondary}`}>Please sign in or connect wallet to view your profile</p>
          <Link
            to="/create"
            className="inline-block rounded-full bg-[#FF4092] px-6 py-3 font-bold text-white"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bgColor} transition-colors`}>
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-[32px] ${cardBg} p-8 shadow-lg transition-colors`}
        >
          <h1 className={`mb-6 text-3xl font-bold ${textColor}`}>My Profile</h1>

          <div className={`mb-6 flex gap-2 border-b ${borderColor}`}>
            <button
              onClick={() => setActiveTab("events")}
              className={`rounded-t-lg px-6 py-3 font-medium transition-colors ${
                activeTab === "events"
                  ? isDark
                    ? "border-b-2 border-purple-500 text-white"
                    : "border-b-2 border-purple-600 text-slate-900"
                  : textSecondary
              }`}
            >
              My Events ({myEvents.length})
            </button>
            <button
              onClick={() => setActiveTab("collection")}
              className={`rounded-t-lg px-6 py-3 font-medium transition-colors ${
                activeTab === "collection"
                  ? isDark
                    ? "border-b-2 border-purple-500 text-white"
                    : "border-b-2 border-purple-600 text-slate-900"
                  : textSecondary
              }`}
            >
              My Collection
            </button>
          </div>

          {activeTab === "events" && (
            <div>
              {loading ? (
                <div className={`py-8 text-center ${textSecondary}`}>Loading...</div>
              ) : myEvents.length === 0 ? (
                <div className={`py-8 text-center ${textSecondary}`}>
                  <p className="mb-4">You haven't created any events yet</p>
                  <Link
                    to="/create"
                    className="inline-block rounded-full bg-[#FF4092] px-6 py-3 font-bold text-white"
                  >
                    Create Your First Event
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {myEvents.map((event) => (
                    <Link
                      key={event.id}
                      to={`/event/${event.event_id}`}
                      className={`rounded-2xl border ${borderColor} ${cardBg} p-6 transition-all hover:shadow-lg`}
                    >
                      {event.image_cid && (
                        <img
                          src={getGatewayURL(event.image_cid)}
                          alt={event.title}
                          className="mb-4 h-32 w-full rounded-xl object-cover"
                        />
                      )}
                      <h3 className={`mb-2 font-semibold ${textColor}`}>{event.title}</h3>
                      <div className="flex items-center justify-between">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${
                            event.status === "active"
                              ? isDark
                                ? "bg-green-900/30 text-green-300"
                                : "bg-green-100 text-green-800"
                              : isDark
                              ? "bg-amber-900/30 text-amber-300"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {event.status}
                        </span>
                        <Link
                          to={`/manage/${event.event_id}`}
                          className={`text-sm font-medium ${isDark ? "text-purple-400 hover:text-purple-300" : "text-purple-600 hover:text-purple-700"}`}
                        >
                          Manage →
                        </Link>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "collection" && (
            <div className={`py-8 text-center ${textSecondary}`}>
              <p>Collection view coming soon!</p>
              <p className="mt-2 text-sm">View your claimed POAPs here</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
