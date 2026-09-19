import React, { useState } from "react";
import {
  Search,
  BookOpen,
  Feather,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Download,
  Star,
  CheckCircle2,
  Database,
  Layers,
  Heart,
  Globe2,
} from "lucide-react";
import { Book, Category, Author } from "../types.ts";
import { BookCard } from "./BookCard.tsx";

interface HomeViewProps {
  featuredBooks: Book[];
  latestBooks: Book[];
  categories: Category[];
  authors: Author[];
  onSelectBook: (book: Book) => void;
  onNavigate: (view: string, params?: any) => void;
  onQuickRead: (book: Book) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  featuredBooks,
  latestBooks,
  categories,
  authors,
  onSelectBook,
  onNavigate,
  onQuickRead,
}) => {
  const [heroSearch, setHeroSearch] = useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (heroSearch.trim()) {
      onNavigate("browse", { q: heroSearch.trim() });
    }
  };

  // Deduplicate books helper
  const dedupeBooks = (books: Book[]): Book[] => {
    const seen = new Set<string>();
    return (books || []).filter((b) => {
      if (!b || !b.id || seen.has(b.id)) return false;
      seen.add(b.id);
      return true;
    });
  };

  const uniqueFeatured = dedupeBooks(featuredBooks);
  const allCombined = dedupeBooks([...featuredBooks, ...latestBooks]);
  const freeBooks = allCombined.filter((b) => b.isFree).slice(0, 4);
  const paidBooks = allCombined.filter((b) => !b.isFree).slice(0, 4);

  return (
    <div className="space-y-16 pb-16">
      {/* 1. Hero Section inspired by Rekhta and Classical Archives */}
      <section className="relative overflow-hidden bg-stone-900 text-stone-100 py-20 px-4 sm:px-6 lg:px-8 border-b border-stone-800">
        {/* Subtle patterned background overlay */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#d97706_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>

        <div className="relative max-w-5xl mx-auto text-center space-y-8">
          {/* Classical Literary Crest */}
          <div className="inline-flex items-center gap-2 bg-stone-800/80 border border-amber-500/30 text-amber-300 px-4 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Digital Library & Rare PDF Manuscript Marketplace</span>
          </div>

          {/* Urdu / Arabic Calligraphic Subheading */}
          <div className="font-serif text-amber-200/90 text-xl tracking-widest italic">
            علم وہ چراغ ہے جو تیرگی کو شکست دیتا ہے
          </div>

          {/* Main Title */}
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight">
            Preserving World Literature, <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-200 to-amber-400">
              Ghazals & Metaphysics
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-stone-300 font-normal leading-relaxed">
            Discover thousands of digitized classical manuscripts, modern philosophical treatises, and collector PDF editions. Powered by Cloudflare R2 object storage with full ownership verification.
          </p>

          {/* Hero Search Box */}
          <form
            onSubmit={handleSearchSubmit}
            className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center gap-2 bg-white/95 p-2 rounded-2xl shadow-2xl border border-stone-300 backdrop-blur-md"
          >
            <div className="relative flex-1 w-full">
              <Search className="w-5 h-5 text-stone-400 absolute left-4 top-3.5" />
              <input
                id="hero-search-input"
                type="text"
                value={heroSearch}
                onChange={(e) => setHeroSearch(e.target.value)}
                placeholder="Search by book title, Mirza Ghalib, Rumi, Urdu poetry..."
                className="w-full pl-12 pr-4 py-3 text-stone-900 placeholder-stone-400 text-sm sm:text-base focus:outline-none bg-transparent"
              />
            </div>
            <button
              id="hero-search-btn"
              type="submit"
              className="w-full sm:w-auto px-6 py-3 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-xl transition shadow flex items-center justify-center gap-2 text-sm"
            >
              <span>Explore Library</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick discovery tags */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-stone-400 pt-2">
            <span className="text-stone-400">Trending searches:</span>
            {["Diwan-e-Ghalib", "Rumi Masnavi", "The Prophet", "Allama Iqbal", "Free Books"].map((chip) => (
              <button
                key={chip}
                onClick={() => onNavigate("browse", chip === "Free Books" ? { isFree: "true" } : { q: chip })}
                className="bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white px-3 py-1 rounded-full border border-stone-700 transition"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 2. Curated Categories Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-700 text-xs uppercase tracking-widest font-bold mb-1">
              <Layers className="w-4 h-4" />
              <span>Explore Collections</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
              Browse by Literary Genre
            </h2>
          </div>
          <button
            id="see-all-categories-btn"
            onClick={() => onNavigate("browse")}
            className="text-amber-800 hover:text-amber-900 font-semibold text-sm flex items-center gap-1 group"
          >
            View all categories
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((cat) => (
            <div
              key={cat.id}
              id={`cat-card-${cat.id}`}
              onClick={() => onNavigate("browse", { category: cat.name })}
              className="group cursor-pointer bg-white rounded-xl p-5 border border-stone-200 hover:border-amber-400 hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
            >
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 group-hover:bg-amber-600 group-hover:text-white flex items-center justify-center mb-3 transition">
                <Feather className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-stone-900 text-sm group-hover:text-amber-700 transition line-clamp-1">
                  {cat.name}
                </h3>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  {cat.publishedBooksCount || cat.bookCount || 4} manuscripts
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Featured Masterpieces */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-700 text-xs uppercase tracking-widest font-bold mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Curator's Choice</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
              Featured Literary Works
            </h2>
          </div>
          <button
            onClick={() => onNavigate("browse", { sort: "popular" })}
            className="text-amber-800 hover:text-amber-900 font-semibold text-sm flex items-center gap-1 group"
          >
            Explore marketplace
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {uniqueFeatured.slice(0, 4).map((book) => (
            <BookCard
              key={`featured-${book.id}`}
              book={book}
              onSelect={onSelectBook}
              onQuickRead={onQuickRead}
            />
          ))}
        </div>
      </section>

      {/* 4. Free Public Domain Row */}
      <section className="bg-stone-100/80 border-y border-stone-200 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
            <div>
              <div className="flex items-center gap-2 text-emerald-700 text-xs uppercase tracking-widest font-bold mb-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Open Access</span>
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
                Free Digital Books & Ghazals
              </h2>
              <p className="text-sm text-stone-600 mt-1">
                Acquire into your personal library or read directly in the browser at no cost.
              </p>
            </div>
            <button
              onClick={() => onNavigate("browse", { isFree: "true" })}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs px-4 py-2 rounded-lg transition shadow-sm"
            >
              Browse All Free Books
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {freeBooks.map((book) => (
              <BookCard
                key={`free-${book.id}`}
                book={book}
                onSelect={onSelectBook}
                onQuickRead={onQuickRead}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 5. Featured Authors / Poets */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-700 text-xs uppercase tracking-widest font-bold mb-1">
              <Feather className="w-4 h-4" />
              <span>Great Minds</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
              Celebrated Authors & Poets
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
          {authors.map((auth) => (
            <div
              key={auth.id}
              onClick={() => onNavigate("browse", { author: auth.name })}
              className="cursor-pointer group text-center space-y-3 p-4 rounded-xl hover:bg-stone-100 transition"
            >
              <div className="relative w-24 h-24 mx-auto rounded-full overflow-hidden border-2 border-amber-600/30 group-hover:border-amber-600 shadow-md transition">
                <img
                  src={auth.photoUrl || "https://images.unsplash.com/photo-1544717305-2782549b5136?w=200&auto=format&fit=crop&q=80"}
                  alt={auth.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                />
              </div>
              <div>
                <h4 className="font-serif font-bold text-stone-900 text-sm group-hover:text-amber-700 transition">
                  {auth.name}
                </h4>
                <p className="text-xs text-stone-500 mt-0.5">
                  {auth.nationality} • {auth.bornYear}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Marketplace Paid Digital Editions */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-700 text-xs uppercase tracking-widest font-bold mb-1">
              <Globe2 className="w-4 h-4" />
              <span>Independent Creators & Presses</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
              Collector & Premium Editions
            </h2>
            <p className="text-sm text-stone-600 mt-1">
              Directly support digital archivists, translators, and independent presses.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {paidBooks.map((book) => (
            <BookCard
              key={`paid-${book.id}`}
              book={book}
              onSelect={onSelectBook}
              onQuickRead={onQuickRead}
            />
          ))}
        </div>
      </section>

      {/* 7. Architecture & Cloudflare R2 Trust Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="bg-stone-900 text-stone-100 rounded-2xl p-8 sm:p-12 border border-stone-800 shadow-xl flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-300 text-xs px-3 py-1 rounded-full border border-amber-500/30">
              <Database className="w-3.5 h-3.5" />
              <span>Cloudflare R2 Object Storage Core</span>
            </div>
            <h3 className="font-serif text-2xl sm:text-3xl font-bold">
              Built for Infinite Global Scale & Document Security
            </h3>
            <p className="text-sm text-stone-300 leading-relaxed">
              PDF binaries are streamed via Cloudflare R2 object storage bucket <code className="bg-stone-800 text-amber-400 px-1.5 py-0.5 rounded text-xs">library-books</code>. Paid titles are protected by temporary time-limited cryptographically signed URLs and server-side digital ownership verification.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
            <button
              onClick={() => onNavigate("creator")}
              className="w-full sm:w-auto px-6 py-3.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-xl transition text-sm text-center shadow-lg"
            >
              Publish as Creator / Author
            </button>
            <button
              onClick={() => onNavigate("browse")}
              className="w-full sm:w-auto px-6 py-3.5 bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium rounded-xl transition text-sm text-center border border-stone-700"
            >
              Explore Full Library
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
