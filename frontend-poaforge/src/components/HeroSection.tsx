import { Link } from "react-router-dom";
import { useTheme } from "../hooks/useTheme";
import { motion } from "framer-motion";

export function HeroSection() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <section
      className={`relative overflow-hidden ${
        isDark
          ? "bg-gradient-to-r from-purple-900 via-purple-800 to-pink-800"
          : "bg-gradient-to-r from-purple-500 via-purple-600 to-purple-800"
      }`}
    >
      <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-12 md:px-6 lg:grid-cols-2 lg:items-center lg:py-20">
        {/* Hero Image on Left */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="order-2 lg:order-1"
        >
          <div className="relative h-80 w-full overflow-hidden rounded-2xl lg:h-96">
            {/* Placeholder Image */}
            <img
              src="https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=600&fit=crop"
              alt="Discover and create amazing events with POAP Forge - conferences, sports, online meetups"
              className="h-full w-full object-cover"
              loading="lazy"
            />
            {/* Overlay gradient for better text readability if needed */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-transparent"></div>
          </div>
        </motion.div>

        {/* Content on Right */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="order-1 lg:order-2"
        >
          <h1 className="mb-4 text-4xl font-bold text-white sm:text-5xl lg:text-6xl">
            Find the event you care about
          </h1>
          <p className="mb-8 text-lg text-white/90 sm:text-xl">
            Discover amazing events, conferences, sports, and more. Get POAP NFTs to prove your attendance and build your reputation.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/create"
              className="rounded-full bg-[#FF4092] px-8 py-4 text-lg font-bold text-white shadow-lg shadow-pink-500/25 transition-all hover:bg-[#FF6B9D] hover:shadow-pink-500/40"
            >
              Create Events
            </Link>
            <Link
              to="/events"
              className="rounded-full border-2 border-white/30 bg-transparent px-8 py-4 text-lg font-medium text-white transition-all hover:bg-white/10"
            >
              Learn More
            </Link>
          </div>
          <div className="mt-4">
            <p className="mb-2 text-sm text-white/80">
              New to POAP Forge? Try creating a sample event to see how it works!
            </p>
            <Link
              to="/create?sample=true"
              className="inline-block rounded-full border border-white/30 bg-white/10 px-6 py-2 text-sm font-medium text-white backdrop-blur-sm transition-all hover:bg-white/20"
            >
              🚀 Create Sample Event
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/5 blur-3xl"></div>
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-pink-500/10 blur-3xl"></div>
      </div>
    </section>
  );
}
