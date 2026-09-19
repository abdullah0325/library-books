import React, { useState, useEffect } from "react";
import {
  Library,
  BookOpen,
  Heart,
  Download,
  Search,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRight,
  Flame,
} from "lucide-react";
import { LibraryItem, User } from "../types.ts";
import { apiRequest } from "../lib/api.ts";

interface MyLibraryViewProps {
  currentUser: User;
  onReadBook: (bookId: string) => void;
  onNavigate: (view: string, params?: any) => void;
  onOpenBookDetail: (bookId: string) => void;
  onLibraryUpdated: () => void;
}

export const MyLibraryView: React.FC<MyLibraryViewProps> = ({
  currentUser,
  onReadBook,
  onNavigate,
  onOpenBookDetail,
  onLibraryUpdated,
}) => {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<"all" | "favorites" | "purchased" | "free">("all");
  const [searchFilter, setSearchFilter] = useState("");

  useEffect(() => {
    fetchLibrary();
  }, []);

  const fetchLibrary = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ library: LibraryItem[] }>("/api/library");
      setItems(res.library || []);
    } catch (err) {
      console.error("Failed to load library:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async (bookId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await apiRequest<{ isFavorite: boolean }>(`/api/library/${bookId}/favorite`, {
        method: "POST",
      });
      setItems((prev) =>
        prev.map((item) =>
          item.bookId === bookId ? { ...item, isFavorite: res.isFavorite } : item
        )
      );
      onLibraryUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownload = async (bookId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await apiRequest<{ downloadUrl: string }>(`/api/books/${bookId}/download-access`);
      if (res.downloadUrl) {
        window.open(res.downloadUrl, "_blank");
      }
    } catch (err: any) {
      alert(err.message || "Failed to download");
    }
  };

  const filteredItems = items.filter((item) => {
    if (filterTab === "favorites" && !item.isFavorite) return false;
    if (filterTab === "purchased" && item.accessType !== "PURCHASED") return false;
    if (filterTab === "free" && item.accessType !== "FREE") return false;
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.authorName.toLowerCase().includes(q) ||
        item.categoryName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPagesRead = items.reduce((acc, curr) => acc + (curr.currentPage || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Header & Personal Reading Stats */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 text-stone-100 rounded-2xl p-6 sm:p-8 border border-stone-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider">
            <Library className="w-4 h-4" />
            <span>Personal Digital Archive</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold">
            {currentUser.name}'s Reading Shelf
          </h1>
          <p className="text-xs sm:text-sm text-stone-300">
            Permanently preserved in your account • Synchronized with Cloudflare R2
          </p>
        </div>

        {/* Stats Pills */}
        <div className="flex flex-wrap items-center gap-4 bg-stone-800/80 border border-stone-700 p-4 rounded-xl backdrop-blur-sm text-xs">
          <div>
            <span className="text-stone-400 block text-[11px]">Books in Shelf</span>
            <span className="font-bold text-lg text-amber-400">{items.length}</span>
          </div>
          <div className="h-8 w-px bg-stone-700"></div>
          <div>
            <span className="text-stone-400 block text-[11px]">Pages Read</span>
            <span className="font-bold text-lg text-emerald-400">{totalPagesRead}</span>
          </div>
          <div className="h-8 w-px bg-stone-700"></div>
          <div>
            <span className="text-stone-400 block text-[11px]">Favorites</span>
            <span className="font-bold text-lg text-rose-400">
              {items.filter((i) => i.isFavorite).length}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {[
            { id: "all", label: `All Books (${items.length})` },
            { id: "favorites", label: "Favorites" },
            { id: "purchased", label: "Purchased" },
            { id: "free", label: "Free Editions" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                filterTab === tab.id
                  ? "bg-amber-700 text-white shadow-sm"
                  : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search your library..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs focus:outline-none focus:border-amber-600"
          />
        </div>
      </div>

      {/* Book List Grid */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-stone-500 font-medium">Opening your reading shelf...</p>
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              id={`library-item-${item.bookId}`}
              onClick={() => onOpenBookDetail(item.bookId)}
              className="group cursor-pointer bg-white rounded-xl border border-stone-200 hover:border-amber-400 hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between"
            >
              <div>
                {/* Cover & Badges */}
                <div className="relative aspect-[3/4] bg-stone-100 p-3 overflow-hidden">
                  <div className="relative w-full h-full rounded shadow group-hover:scale-105 transition-transform duration-300 overflow-hidden">
                    <img
                      src={item.coverUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/40 to-transparent"></div>

                    {/* Badge */}
                    <div className="absolute top-2 left-2">
                      <span className="bg-stone-900/80 backdrop-blur-sm text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded">
                        {item.accessType}
                      </span>
                    </div>

                    {/* Favorite Button */}
                    <button
                      onClick={(e) => handleToggleFavorite(item.bookId, e)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/80 transition"
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          item.isFavorite ? "fill-rose-500 text-rose-500" : ""
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                    {item.categoryName}
                  </span>
                  <h3 className="font-serif font-bold text-stone-900 text-sm line-clamp-2 group-hover:text-amber-700 transition">
                    {item.title}
                  </h3>
                  <p className="text-xs text-stone-500">{item.authorName}</p>

                  {/* Reading Progress Indicator */}
                  <div className="pt-2 space-y-1">
                    <div className="flex justify-between text-[11px] text-stone-500">
                      <span>Progress</span>
                      <span className="font-medium text-stone-800">
                        {item.currentPage} / {item.pages || 50} p. ({item.progressPercent || 0}%)
                      </span>
                    </div>
                    <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-amber-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, item.progressPercent || 0)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 pt-0 flex items-center gap-2">
                <button
                  id={`continue-reading-btn-${item.bookId}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onReadBook(item.bookId);
                  }}
                  className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 text-stone-950 text-xs font-bold rounded-lg shadow-sm transition flex items-center justify-center gap-1.5"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  {item.currentPage > 1 ? "Resume Reading" : "Start Reading"}
                </button>

                <button
                  onClick={(e) => handleDownload(item.bookId, e)}
                  title="Download PDF"
                  className="p-2 rounded-lg border border-stone-300 text-stone-600 hover:bg-stone-100 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center max-w-md mx-auto space-y-4">
          <Library className="w-12 h-12 text-stone-300 mx-auto" />
          <h3 className="font-serif text-xl font-bold text-stone-800">Your Reading Shelf is Empty</h3>
          <p className="text-xs text-stone-500 leading-relaxed">
            Acquire classical literature from our open-access catalog or purchase collector editions from independent creators.
          </p>
          <button
            onClick={() => onNavigate("browse")}
            className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-amber-300 text-xs font-bold rounded-xl transition shadow"
          >
            Explore Marketplace & Catalog
          </button>
        </div>
      )}
    </div>
  );
};
