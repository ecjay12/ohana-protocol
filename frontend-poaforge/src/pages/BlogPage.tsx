import { useTheme } from "../hooks/useTheme";
import { BlogCard } from "../components/BlogCard";

const blogPosts = [
  {
    image: undefined,
    title: "6 Strategies to Find Your Conference Keynote and Other Speakers",
    description:
      "Sekarang, kamu bisa produksi tiket fisik untuk eventmu bersama Bostiketbos. Hanya perlu mengikuti beberapa langkah mudah.",
    date: "12 Mar",
    author: "Jhon Doe",
  },
  {
    image: undefined,
    title: "How Successfully Used Paid Marketing to Drive Incremental Ticket Sales",
    description:
      "Sekarang, kamu bisa produksi tiket fisik untuk eventmu bersama Bostiketbos. Hanya perlu mengikuti beberapa langkah mudah.",
    date: "15 Mar",
    author: "Jane Smith",
  },
  {
    image: undefined,
    title: "Introducing Workspaces: Work smarter, not harder with new navigation",
    description:
      "Sekarang, kamu bisa produksi tiket fisik untuk eventmu bersama Bostiketbos. Hanya perlu mengikuti beberapa langkah mudah.",
    date: "20 Mar",
    author: "Mike Johnson",
  },
];

export function BlogPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const bgColor = isDark ? "bg-[#1a1a2e]" : "bg-[#E2E0FF]";
  const textColor = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-white/70" : "text-slate-600";

  return (
    <div className={`min-h-screen ${bgColor} transition-colors`}>
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className={`mb-4 text-4xl font-bold ${textColor} sm:text-5xl`}>Blog</h1>
          <p className={`text-lg ${textSecondary}`}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit.
          </p>
        </div>

        {/* Blog Grid */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {blogPosts.map((post, index) => (
            <BlogCard key={index} {...post} index={index} />
          ))}
        </div>

        {/* Load More Button */}
        <div className="mt-12 text-center">
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
      </div>
    </div>
  );
}
