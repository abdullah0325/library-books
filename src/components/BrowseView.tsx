import React, { useState, useEffect } from "react";
import {
  Search,
  Filter,
  X,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { Book, Category, Author } from "../types.ts";
import { BookCard } from "./BookCard.tsx";
import { apiRequest } from "../lib/api.ts";

interface BrowseViewProps {
  categories: Category[];
  authors: Author[];
  initialCategory?: string;
  initialAuthor?: string;
  initialQuery?: string;
  initialIsFree?: string;
  onSelectBook: (book: Book) => void;
  onQuickRead: (book: Book) => void;
}

export const BrowseView: React.FC<BrowseViewProps> = ({
  categories,
  authors,
  initialCategory = "",
  initialAuthor = "",
  initialQuery = "",
  initialIsFree = "",
  onSelectBook,
  onQuickRead,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedAuthor, setSelectedAuthor] = useState(initialAuthor);
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [priceType, setPriceType] = useState<"all" | "free" | "paid">(
    initialIsFree === "true" ? "free" : "all"
  );
  const [sortBy, setSortBy] = useState("featured");
  const [currentPage, setCurrentPage] = useState(1);

  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Sync prop changes
  useEffect(() => {
    if (initialCategory) setSelectedCategory(initialCategory);
    if (initialAuthor) setSelectedAuthor(initialAuthor);
    if (initialQuery) setQuery(initialQuery);
    if (initialIsFree === "true") setPriceType("free");
  }, [initialCategory, initialAuthor, initialQuery, initialIsFree]);

  // Fetch books on filter change
  useEffect(() => {
    fetchBooks();
  }, [query, selectedCategory, selectedAuthor, selectedLanguage, priceType, sortBy, currentPage]);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (selectedCategory) params.set("category", selectedCategory);
      if (selectedAuthor) params.set("author", selectedAuthor);
      if (selectedLanguage) params.set("language", selectedLanguage);
      if (priceType === "free") params.set("isFree", "true");
      if (priceType === "paid") params.set("isFree", "false");
      params.set("sort", sortBy);
      params.set("page", String(currentPage));
      params.set("limit", "12");

      const res = await apiRequest<{
        books: Book[];
        pagination: { total: number; page: number; totalPages: number };
      }>(`/api/books?${params.toString()}`);

      const rawBooks: Book[] = res.books || [];
      const seen = new Set<string>();
      const dedupedBooks = rawBooks.filter((b) => {
        if (!b?.id || seen.has(b.id)) return false;
        seen.add(b.id);
        return true;
      });

      setBooks(dedupedBooks);
      setTotalPages(res.pagination?.totalPages || 1);
      setTotalCount(res.pagination?.total || 0);
    } catch (err) {
      console.error("Failed loading books:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setQuery("");
    setSelectedCategory("");
    setSelectedAuthor("");
    setSelectedLanguage("");
    setPriceType("all");
    setSortBy("featured");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    query || selectedCategory || selectedAuthor || selectedLanguage || priceType !== "all";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Title & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900">
            Marketplace & Digital Catalog
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Browse through {totalCount} verified manuscripts, classical ghazals, and digital treatises.
          </p>
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-3">
          <label htmlFor="sort-select" className="text-xs font-medium text-stone-500 whitespace-nowrap">
            Sort by:
          </label>
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-white border border-stone-300 text-stone-800 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-amber-600 shadow-sm"
          >
            <option value="featured">Featured & Curated</option>
            <option value="popular">Most Popular</option>
            <option value="rating">Highest Rated</option>
            <option value="latest">Newly Published</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm space-y-4">
        {/* Search row */}
        <div className="relative">
          <Search className="w-5 h-5 text-stone-400 absolute left-3.5 top-3" />
          <input
            id="browse-search-input"
            type="text"
            placeholder="Search titles, authors, translators, themes, or tags..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-11 pr-10 py-2.5 bg-stone-50 text-stone-900 rounded-lg border border-stone-300 focus:outline-none focus:border-amber-600 text-sm transition"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3.5 top-3 text-stone-400 hover:text-stone-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Dropdown filters grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-stone-50 border border-stone-300 text-stone-800 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-amber-600"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Author */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">Author / Poet</label>
            <select
              value={selectedAuthor}
              onChange={(e) => {
                setSelectedAuthor(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-stone-50 border border-stone-300 text-stone-800 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-amber-600"
            >
              <option value="">All Authors</option>
              {authors.map((a) => (
                <option key={a.id} value={a.name}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* Language */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">Language</label>
            <select
              value={selectedLanguage}
              onChange={(e) => {
                setSelectedLanguage(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-stone-50 border border-stone-300 text-stone-800 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-amber-600"
            >
              <option value="">All Languages</option>
              <option value="Urdu">Urdu</option>
              <option value="English">English</option>
              <option value="Persian">Persian (Farsi)</option>
              <option value="Arabic">Arabic</option>
              <option value="Bengali">Bengali</option>
              <option value="Russian">Russian</option>
            </select>
          </div>

          {/* Price Type */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">Pricing Model</label>
            <select
              value={priceType}
              onChange={(e) => {
                setPriceType(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full bg-stone-50 border border-stone-300 text-stone-800 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-amber-600"
            >
              <option value="all">All Books (Free & Paid)</option>
              <option value="free">Free / Public Domain Only</option>
              <option value="paid">Paid Marketplace Editions</option>
            </select>
          </div>
        </div>

        {/* Active filter tags */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-100 text-xs">
            <span className="text-stone-500 font-medium">Active filters:</span>
            {selectedCategory && (
              <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 px-2.5 py-1 rounded-full font-medium">
                Category: {selectedCategory}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedCategory("")} />
              </span>
            )}
            {selectedAuthor && (
              <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 px-2.5 py-1 rounded-full font-medium">
                Author: {selectedAuthor}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedAuthor("")} />
              </span>
            )}
            {selectedLanguage && (
              <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 px-2.5 py-1 rounded-full font-medium">
                Lang: {selectedLanguage}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedLanguage("")} />
              </span>
            )}
            {priceType !== "all" && (
              <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 px-2.5 py-1 rounded-full font-medium">
                Price: {priceType === "free" ? "Free Books" : "Paid Books"}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setPriceType("all")} />
              </span>
            )}
            <button
              onClick={handleResetFilters}
              className="text-stone-500 hover:text-stone-900 underline font-medium ml-2"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Books Grid or Empty State */}
      {loading ? (
        <div className="py-24 text-center space-y-4">
          <div className="w-10 h-10 border-3 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-stone-500 font-medium">Querying digital library catalog...</p>
        </div>
      ) : books.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {books.map((book) => (
            <BookCard
              key={`browse-${book.id}`}
              book={book}
              onSelect={onSelectBook}
              onQuickRead={onQuickRead}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-2xl border border-stone-200 p-8 space-y-4 max-w-lg mx-auto">
          <BookOpen className="w-12 h-12 text-stone-300 mx-auto" />
          <h3 className="font-serif text-xl font-bold text-stone-800">No books found matching criteria</h3>
          <p className="text-xs text-stone-500">
            Try adjusting your search terms, changing the category, or clearing your active filters.
          </p>
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 bg-stone-900 text-amber-300 hover:bg-stone-800 rounded-lg text-xs font-semibold transition"
          >
            Reset All Filters
          </button>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-8">
          <button
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="p-2 rounded-lg border border-stone-300 text-stone-700 disabled:opacity-30 hover:bg-stone-100 transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-xs font-semibold text-stone-700 px-4">
            Page {currentPage} of {totalPages}
          </span>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="p-2 rounded-lg border border-stone-300 text-stone-700 disabled:opacity-30 hover:bg-stone-100 transition"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};
