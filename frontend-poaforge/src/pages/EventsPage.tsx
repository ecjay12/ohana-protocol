import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase, Event } from "../lib/supabase";
import { useInjectedWallet } from "../hooks/useInjectedWallet";
import { usePOAPForge } from "../hooks/usePOAPForge";
import { EventCard } from "../components/EventCard";
import { EventCategories, EVENT_CATEGORIES } from "../components/EventCategories";
import { FilterDropdown } from "../components/FilterDropdown";
import { SearchBar } from "../components/SearchBar";
import { SEO } from "../components/SEO";
import { useTheme } from "../hooks/useTheme";

export function EventsPage() {
  const [searchParams] = useSearchParams();
  const { provider, chainId, accounts } = useInjectedWallet();
  const account = accounts[0];
  const { getAllEvents: getOnChainEvents, isSupported } = usePOAPForge(provider, chainId, account);
  const { theme } = useTheme();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchEvent, setSearchEvent] = useState("");
  const [place, setPlace] = useState("");
  const [time, setTime] = useState("");
  const [weekdayFilter, setWeekdayFilter] = useState("Weekdays");
  const [eventTypeFilter, setEventTypeFilter] = useState("Event Type");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "all");

  const isDark = theme === "dark";
  const bgColor = isDark ? "bg-[#1a1a2e]" : "bg-[#E2E0FF]";
  const textColor = isDark ? "text-white" : "text-slate-900";

  useEffect(() => {
    loadEvents();
    if (isSupported && provider) {
      loadOnChainEvents();
    }
  }, [isSupported, provider, selectedCategory]);

  async function loadEvents() {
    try {
      let query = supabase
        .from("events")
        .select("*")
        .eq("status", "active");

      // Filter by category if selected
      if (selectedCategory && selectedCategory !== "all") {
        query = query.eq("category", selectedCategory);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Error loading events:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadOnChainEvents() {
    try {
      const chainEvents = await getOnChainEvents();

      // Merge on-chain events into Supabase if they don't exist
      for (const chainEvent of chainEvents) {
        const { data: existing } = await supabase
          .from("events")
          .select("*")
          .eq("event_id", chainEvent.eventId)
          .single();

        if (!existing) {
          await supabase.from("events").insert({
            event_id: chainEvent.eventId,
            title: chainEvent.eventId,
            creator_wallet: chainEvent.creator.toLowerCase(),
            nft_contract_address: chainEvent.nftContract,
            token_contract_address: chainEvent.tokenContract,
            status: "active",
            is_poap: true,
            requires_approval: false,
          });
        }
      }

      loadEvents();
    } catch (error) {
      console.error("Error loading on-chain events:", error);
    }
  }

  const filteredEvents = events.filter((event) => {
    const matchesSearch = !searchEvent || event.title.toLowerCase().includes(searchEvent.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchEvent.toLowerCase()) ||
      event.event_id.toLowerCase().includes(searchEvent.toLowerCase()) ||
      event.category?.toLowerCase().includes(searchEvent.toLowerCase()) ||
      event.tags?.some(tag => tag.toLowerCase().includes(searchEvent.toLowerCase()));
    
    // Additional filtering by event type if needed
    if (eventTypeFilter !== "Event Type" && eventTypeFilter !== "All") {
      if (eventTypeFilter === "POAP" && !event.is_poap) return false;
      if (eventTypeFilter === "Basic" && event.is_poap) return false;
    }
    
    return matchesSearch;
  });

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    // Update URL without page reload
    const newSearchParams = new URLSearchParams(searchParams);
    if (categoryId === "all") {
      newSearchParams.delete("category");
    } else {
      newSearchParams.set("category", categoryId);
    }
    window.history.replaceState({}, "", `/events?${newSearchParams.toString()}`);
  };

  return (
    <div className={`min-h-screen ${bgColor} transition-colors`}>
      <SEO
        title={selectedCategory && selectedCategory !== "all" ? `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Events` : "Discover Events"}
        description={`Browse and discover amazing events${selectedCategory && selectedCategory !== "all" ? ` in the ${selectedCategory} category` : ""}. Find conferences, sports events, online meetups, and more. Claim POAP NFTs to prove your attendance.`}
        keywords={`events, ${selectedCategory || ""}, POAP, NFT, conferences, sports, online events, blockchain`}
      />
      {/* Search Bar */}
      <div className="px-4 pt-8 md:px-6">
        <SearchBar
          searchEvent={searchEvent}
          place={place}
          time={time}
          onSearchEventChange={setSearchEvent}
          onPlaceChange={setPlace}
          onTimeChange={setTime}
        />
      </div>

      {/* Event Categories */}
      <EventCategories selectedCategory={selectedCategory} onCategorySelect={handleCategorySelect} />

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        {/* Header with Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className={`text-3xl font-bold ${textColor} sm:text-4xl`}>Upcoming Events</h1>
            {selectedCategory !== "all" && (
              <p className={`mt-2 text-sm ${isDark ? "text-white/70" : "text-slate-600"}`}>
                Showing {EVENT_CATEGORIES.find(c => c.id === selectedCategory)?.name || selectedCategory} events
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <FilterDropdown
              label="Weekdays"
              options={["Weekdays", "Weekends", "Any"]}
              value={weekdayFilter}
              onChange={setWeekdayFilter}
            />
            <FilterDropdown
              label="Event Type"
              options={["Event Type", "POAP", "Basic", "All"]}
              value={eventTypeFilter}
              onChange={setEventTypeFilter}
            />
          </div>
        </div>

        {/* Events Grid */}
        {loading ? (
          <div className={`text-center ${textColor}`}>Loading events...</div>
        ) : filteredEvents.length === 0 ? (
          <div className={`rounded-2xl p-12 text-center ${isDark ? "bg-[#2d2d44]" : "bg-white"}`}>
            <p className={textColor}>No events found. Be the first to create one!</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredEvents.map((event, index) => (
                <EventCard key={event.id} event={event} index={index} />
              ))}
            </div>

            {/* Load More Button */}
            <div className="mt-8 text-center">
              <button
                className={`rounded-full border-2 px-8 py-3 font-medium transition-colors ${
                  isDark
                    ? "border-purple-500 bg-purple-500/20 text-purple-300 hover:bg-purple-500/30"
                    : "border-purple-600 bg-white text-purple-600 hover:bg-purple-50"
                }`}
              >
                Load More
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
