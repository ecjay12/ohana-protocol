import { Link } from "react-router-dom";
import { HeroSection } from "../components/HeroSection";
import { SearchBar } from "../components/SearchBar";
import { EventCategories } from "../components/EventCategories";
import { SEO } from "../components/SEO";
import { useTheme } from "../hooks/useTheme";
import { useState } from "react";

export function HomePage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const bgColor = isDark ? "bg-[#1a1a2e]" : "bg-[#E2E0FF]";
  const textColor = isDark ? "text-white" : "text-slate-900";

  const [searchEvent, setSearchEvent] = useState("");
  const [place, setPlace] = useState("");
  const [time, setTime] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    // Navigate to events page with category filter
    if (categoryId !== "all") {
      window.location.href = `/events?category=${categoryId}`;
    } else {
      window.location.href = `/events`;
    }
  };

  return (
    <div className={`min-h-screen ${bgColor} transition-colors`}>
      <SEO
        title="Discover Amazing Events & Claim POAP NFTs"
        description="Find events you care about - conferences, sports, online meetups, and more. Get POAP NFTs to prove your attendance and build your reputation on the blockchain."
        keywords="events, POAP, NFT, conferences, sports events, online events, attendance proof, blockchain, Web3"
      />
      {/* Hero Section */}
      <HeroSection />

      {/* Search Bar Section */}
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <SearchBar
          searchEvent={searchEvent}
          place={place}
          time={time}
          onSearchEventChange={setSearchEvent}
          onPlaceChange={setPlace}
          onTimeChange={setTime}
        />
      </div>

      {/* Event Categories Section */}
      <EventCategories selectedCategory={selectedCategory} onCategorySelect={handleCategorySelect} />

      {/* Upcoming Events Section Header */}
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className={`text-3xl font-bold ${textColor} sm:text-4xl`}>Upcoming Events</h2>
          <Link
            to="/events"
            className={`text-sm font-medium transition-colors ${
              isDark ? "text-purple-400 hover:text-purple-300" : "text-purple-600 hover:text-purple-700"
            }`}
          >
            View All →
          </Link>
        </div>
      </div>
    </div>
  );
}
