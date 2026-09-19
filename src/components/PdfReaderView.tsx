import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Sun,
  Moon,
  Bookmark,
  Download,
  BookOpen,
  Sliders,
  Sparkles,
  Layers,
  CheckCircle2,
  Share2,
} from "lucide-react";
import { Book, User } from "../types.ts";
import { apiRequest } from "../lib/api.ts";

interface PdfReaderViewProps {
  bookId: string;
  currentUser: User | null;
  onBack: () => void;
  onLibraryUpdated: () => void;
}

export const PdfReaderView: React.FC<PdfReaderViewProps> = ({
  bookId,
  currentUser,
  onBack,
  onLibraryUpdated,
}) => {
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  // Reader state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(48);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [theme, setTheme] = useState<"sepia" | "night" | "day">("sepia");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showChapters, setShowChapters] = useState(false);
  const [spreadMode, setSpreadMode] = useState(false); // single vs two-page spread
  const [showAiCompanion, setShowAiCompanion] = useState(false);
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);

  const fetchAiInsights = async (customPrompt?: string) => {
    if (!book) return;
    setAiLoading(true);
    try {
      const res = await apiRequest<{ insights: string }>("/api/ai/reading-companion", {
        method: "POST",
        body: JSON.stringify({
          bookTitle: book.title,
          authorName: book.authorName,
          excerpt: book.excerpt,
          prompt: customPrompt || `Provide historical context, philosophical themes, and critical reflection for page ${currentPage} of ${book.title}.`,
        }),
      });
      setAiInsights(res.insights || "No commentary available.");
    } catch (err: any) {
      setAiInsights("Failed to fetch literary insights. Please verify server connection or API key.");
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    loadBookAndAccess();
  }, [bookId]);

  const loadBookAndAccess = async () => {
    setLoading(true);
    try {
      // 1. Fetch metadata & current progress
      const metaRes = await apiRequest<{
        book: Book;
        ownership: { currentPage: number };
      }>(`/api/books/${bookId}`);

      setBook(metaRes.book);
      setTotalPages(metaRes.book.pages || 48);
      if (metaRes.ownership?.currentPage) {
        setCurrentPage(metaRes.ownership.currentPage);
      }

      // 2. Fetch secure reading access URL from Cloudflare R2
      const accessRes = await apiRequest<{
        streamUrl: string;
        downloadUrl: string;
        filename: string;
      }>(`/api/books/${bookId}/read-access`);

      setStreamUrl(accessRes.streamUrl);
      setDownloadUrl(accessRes.downloadUrl);
    } catch (err: any) {
      console.error("Failed obtaining reading access:", err);
      alert(err.message || "Failed to load reader access");
    } finally {
      setLoading(false);
    }
  };

  // Auto-save reading progress to server
  const saveProgress = async (page: number) => {
    if (!currentUser) return;
    try {
      await apiRequest(`/api/library/${bookId}/progress`, {
        method: "POST",
        body: JSON.stringify({
          currentPage: page,
          totalPages: totalPages,
        }),
      });
      onLibraryUpdated();
    } catch (err) {
      console.error("Progress save failed:", err);
    }
  };

  const handlePageChange = (newPage: number) => {
    const clamped = Math.max(1, Math.min(totalPages, newPage));
    setCurrentPage(clamped);
    saveProgress(clamped);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "PageDown") {
        handlePageChange(currentPage + 1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        handlePageChange(currentPage - 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPage, totalPages]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Theme styling definitions
  const themeStyles = {
    sepia: {
      bg: "bg-[#F7F2E7]",
      paper: "bg-[#FFFDF9] text-[#2C2416] border-[#E8DFC8]",
      header: "bg-[#EFE8D6] text-[#2C2416] border-[#DFD5BE]",
      accent: "text-[#B45309]",
      divider: "border-[#E8DFC8]",
    },
    day: {
      bg: "bg-stone-100",
      paper: "bg-white text-stone-900 border-stone-200",
      header: "bg-white text-stone-900 border-stone-200",
      accent: "text-amber-700",
      divider: "border-stone-200",
    },
    night: {
      bg: "bg-stone-950",
      paper: "bg-stone-900 text-stone-200 border-stone-800",
      header: "bg-stone-900 text-stone-200 border-stone-800",
      accent: "text-amber-400",
      divider: "border-stone-800",
    },
  };

  const currentTheme = themeStyles[theme];

  // Chapters list for navigation
  const chapters = [
    { title: "Frontispiece & Title Page", page: 1 },
    { title: "Preface & Translator's Introduction", page: 3 },
    { title: "Historical Context & Calligraphy", page: 7 },
    { title: "Book I: The Awakening of Thought", page: 12 },
    { title: "Book II: Metaphysics & Ghazals", page: 24 },
    { title: "Book III: Sufi Parables & Discourse", page: 36 },
    { title: "Epilogue, Notes & Archival Index", page: 44 },
  ];

  if (loading || !book) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center space-y-4 text-stone-300">
        <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-serif">Opening Cloudflare R2 secure manuscript stream...</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`min-h-screen flex flex-col ${currentTheme.bg} transition-colors duration-300 select-none`}
    >
      {/* 1. Reader Navigation Top Bar */}
      <header
        className={`h-14 px-4 flex items-center justify-between border-b ${currentTheme.header} shadow-sm z-30`}
      >
        {/* Left: Back & Title */}
        <div className="flex items-center gap-3">
          <button
            id="reader-back-btn"
            onClick={onBack}
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition flex items-center gap-1 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </button>

          <div className="h-5 w-px bg-stone-300 dark:bg-stone-700"></div>

          <div>
            <h2 className="font-serif font-bold text-xs sm:text-sm line-clamp-1 max-w-xs sm:max-w-md">
              {book.title}
            </h2>
            <p className="text-[10px] opacity-70 hidden sm:block">
              {book.authorName} • {book.language} Edition
            </p>
          </div>
        </div>

        {/* Middle: Page navigation controls */}
        <div className="flex items-center gap-2">
          <button
            id="reader-prev-page-btn"
            disabled={currentPage <= 1}
            onClick={() => handlePageChange(currentPage - 1)}
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 transition"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center text-xs font-medium gap-1">
            <input
              type="number"
              min={1}
              max={totalPages}
              value={currentPage}
              onChange={(e) => handlePageChange(parseInt(e.target.value) || 1)}
              className="w-10 text-center py-0.5 bg-black/5 dark:bg-white/10 rounded font-bold text-xs focus:outline-none"
            />
            <span className="opacity-60">/ {totalPages}</span>
          </div>

          <button
            id="reader-next-page-btn"
            disabled={currentPage >= totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 transition"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Actions, Theme, Zoom, Fullscreen */}
        <div className="flex items-center gap-1.5">
          {/* AI Literary Companion Toggle */}
          <button
            id="reader-ai-companion-btn"
            onClick={() => {
              const nextState = !showAiCompanion;
              setShowAiCompanion(nextState);
              if (nextState && !aiInsights) {
                fetchAiInsights();
              }
            }}
            className={`p-2 rounded-lg transition text-xs flex items-center gap-1.5 ${
              showAiCompanion
                ? "bg-amber-600 text-white font-bold shadow-sm"
                : "hover:bg-black/5 dark:hover:bg-white/10 text-amber-700 dark:text-amber-400 font-semibold"
            }`}
            title="AI Reading Companion (Gemini)"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden md:inline">AI Companion</span>
          </button>

          {/* Chapters Menu Toggle */}
          <button
            onClick={() => setShowChapters(!showChapters)}
            className={`p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition text-xs flex items-center gap-1 ${
              showChapters ? "bg-black/10 dark:bg-white/20" : ""
            }`}
            title="Table of Contents"
          >
            <Layers className="w-4 h-4" />
            <span className="hidden md:inline">Index</span>
          </button>

          {/* Theme switcher */}
          <div className="flex items-center bg-black/5 dark:bg-white/10 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setTheme("sepia")}
              className={`px-2 py-1 rounded transition text-[11px] ${
                theme === "sepia" ? "bg-amber-600 text-white font-bold" : ""
              }`}
            >
              Sepia
            </button>
            <button
              onClick={() => setTheme("day")}
              className={`px-2 py-1 rounded transition text-[11px] ${
                theme === "day" ? "bg-stone-700 text-white font-bold" : ""
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setTheme("night")}
              className={`px-2 py-1 rounded transition text-[11px] ${
                theme === "night" ? "bg-stone-900 text-white font-bold" : ""
              }`}
            >
              Night
            </button>
          </div>

          {/* Zoom In/Out */}
          <div className="hidden lg:flex items-center gap-1 bg-black/5 dark:bg-white/10 rounded-lg p-0.5">
            <button
              onClick={() => setZoomLevel((z) => Math.max(75, z - 10))}
              className="p-1 hover:opacity-80"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-bold px-1">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}
              className="p-1 hover:opacity-80"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Download PDF */}
          {downloadUrl && (
            <a
              href={downloadUrl}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition"
              title="Download PDF Archive"
            >
              <Download className="w-4 h-4" />
            </a>
          )}

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Reading Stage */}
      <div className="flex-1 relative flex overflow-hidden">
        {/* Chapters Drawer (collapsible) */}
        {showChapters && (
          <aside
            className={`w-72 border-r ${currentTheme.header} p-4 overflow-y-auto z-20 space-y-3 transition-all animate-in slide-in-from-left duration-200`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-black/10 dark:border-white/10">
              <h3 className="font-serif font-bold text-xs uppercase tracking-wider">
                Table of Contents
              </h3>
              <button
                onClick={() => setShowChapters(false)}
                className="text-xs font-bold hover:opacity-70"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1">
              {chapters.map((ch, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    handlePageChange(ch.page);
                    setShowChapters(false);
                  }}
                  className={`w-full text-left p-2 rounded-lg text-xs transition flex items-center justify-between ${
                    currentPage >= ch.page && (idx === chapters.length - 1 || currentPage < chapters[idx + 1].page)
                      ? "bg-amber-600/20 font-bold"
                      : "hover:bg-black/5 dark:hover:bg-white/10"
                  }`}
                >
                  <span className="truncate">{ch.title}</span>
                  <span className="text-[10px] opacity-60 ml-2">p. {ch.page}</span>
                </button>
              ))}
            </div>
          </aside>
        )}

        {/* AI Reading Companion Drawer (collapsible) */}
        {showAiCompanion && (
          <aside
            className={`w-80 sm:w-96 border-r ${currentTheme.header} p-5 overflow-y-auto z-20 space-y-4 transition-all animate-in slide-in-from-left duration-200 flex flex-col`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-xs uppercase tracking-wider">
                    AI Literary Companion
                  </h3>
                  <span className="text-[10px] opacity-60">Powered by Gemini</span>
                </div>
              </div>
              <button
                onClick={() => setShowAiCompanion(false)}
                className="text-xs font-bold hover:opacity-70"
              >
                ✕
              </button>
            </div>

            {/* Inquiry Form */}
            <div className="space-y-2">
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="Ask about this chapter, theme, or author..."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && aiPrompt.trim()) {
                      fetchAiInsights(aiPrompt.trim());
                    }
                  }}
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <button
                  disabled={aiLoading}
                  onClick={() => fetchAiInsights(aiPrompt.trim() || undefined)}
                  className="px-3 py-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg disabled:opacity-50 transition"
                >
                  {aiLoading ? "..." : "Ask"}
                </button>
              </div>

              {/* Quick Prompt Suggestions */}
              <div className="flex flex-wrap gap-1">
                {[
                  "Thematic Summary",
                  "Historical Context",
                  "Symbolism & Motifs",
                ].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      setAiPrompt(tag);
                      fetchAiInsights(tag);
                    }}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 hover:bg-amber-500/20 hover:text-amber-700 dark:hover:text-amber-400 transition"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Commentary Output */}
            <div className="flex-1 bg-black/5 dark:bg-white/5 rounded-xl p-4 overflow-y-auto text-xs font-serif leading-relaxed">
              {aiLoading ? (
                <div className="py-12 text-center space-y-2">
                  <div className="w-5 h-5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-[11px] opacity-70">Synthesizing literary analysis...</p>
                </div>
              ) : aiInsights ? (
                <div className="space-y-3 whitespace-pre-wrap">
                  <div className="text-[11px] font-sans font-bold uppercase tracking-wider opacity-60 flex items-center justify-between border-b pb-1 border-current">
                    <span>Folio Context (Page {currentPage})</span>
                    <button
                      onClick={() => fetchAiInsights(aiPrompt || undefined)}
                      className="hover:underline text-amber-600"
                    >
                      Refresh
                    </button>
                  </div>
                  <p className="text-stone-800 dark:text-stone-200">{aiInsights}</p>
                </div>
              ) : (
                <div className="py-12 text-center opacity-60 space-y-2">
                  <Sparkles className="w-6 h-6 mx-auto opacity-40" />
                  <p>Click "Ask" or choose a prompt to generate insights for this book.</p>
                </div>
              )}
            </div>
          </aside>
        )}

        {/* Interactive Folio Page Display */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col items-center justify-center">
          <div
            className={`w-full max-w-3xl aspect-[1/1.414] rounded-2xl shadow-2xl border ${currentTheme.paper} p-8 sm:p-14 flex flex-col justify-between transition-all duration-300`}
            style={{
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: "top center",
            }}
          >
            {/* Header Motif */}
            <div className="flex items-center justify-between text-[11px] opacity-60 border-b pb-4 border-current">
              <span className="font-serif italic">{book.title}</span>
              <span className="font-sans font-bold">KitabKhana Digital Folio</span>
              <span className="font-serif italic">{book.authorName}</span>
            </div>

            {/* Page Body Content */}
            <div className="my-auto space-y-6 text-center max-w-xl mx-auto py-6">
              {currentPage === 1 ? (
                /* Title / Cover Folio Page */
                <div className="space-y-6">
                  <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <h1 className="font-serif text-3xl sm:text-4xl font-bold leading-tight">
                    {book.title}
                  </h1>
                  <p className="font-serif text-lg italic opacity-80">
                    by {book.authorName}
                  </p>
                  <div className="w-24 h-0.5 bg-amber-600/50 mx-auto"></div>
                  <p className="text-xs opacity-70 tracking-widest uppercase">
                    Digitized Archive Edition • Cloudflare R2 Storage
                  </p>
                </div>
              ) : (
                /* Reading Text & Literary Excerpts */
                <div className="space-y-6 text-left">
                  <div className="text-center font-serif text-xs uppercase tracking-widest text-amber-600 dark:text-amber-400 font-bold">
                    Chapter {Math.ceil(currentPage / 6)} • Folio {currentPage}
                  </div>

                  <p className="font-serif text-base sm:text-lg leading-relaxed first-letter:text-4xl first-letter:font-bold first-letter:mr-2 first-letter:float-left">
                    {currentPage % 2 === 0
                      ? `The ink of the scholar is more sacred than the blood of the martyr. In this manuscript, ${book.authorName} weaves classical insights concerning the nature of existence, poetry, and human reflection. As the pages turn in quiet reverence, each stanza invites the reader into deeper contemplations.`
                      : `"${book.excerpt || "O heart, why art thou a captive in the earth? Fly toward the sky of timeless love."}" The journey through these verses awakens the intellectual heritage of eastern and global philosophical traditions.`}
                  </p>

                  <p className="font-serif text-sm sm:text-base leading-relaxed opacity-90">
                    Preserved through meticulous archival scanning and OCR typography, this edition safeguards the pristine cadence of the original composition. Let the silence of the page reveal the enduring light of human thought.
                  </p>
                </div>
              )}
            </div>

            {/* Folio Footer with Page Number */}
            <div className="flex items-center justify-between text-[11px] opacity-60 border-t pt-4 border-current">
              <span>Section {Math.ceil(currentPage / 6)}</span>
              <span className="font-bold text-xs">— {currentPage} —</span>
              <span>{totalPages} Total Pages</span>
            </div>
          </div>
        </main>
      </div>

      {/* Reader Bottom Navigation Scrub Bar */}
      <footer
        className={`h-12 px-6 flex items-center justify-between border-t ${currentTheme.header} z-30`}
      >
        <span className="text-xs font-semibold opacity-70">
          Page {currentPage} of {totalPages} ({Math.round((currentPage / totalPages) * 100)}%)
        </span>

        {/* Slider */}
        <input
          type="range"
          min={1}
          max={totalPages}
          value={currentPage}
          onChange={(e) => handlePageChange(parseInt(e.target.value) || 1)}
          className="w-48 sm:w-96 accent-amber-600 cursor-pointer"
        />

        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="text-xs font-semibold hover:underline disabled:opacity-30"
          >
            Previous
          </button>
          <span>•</span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="text-xs font-semibold hover:underline disabled:opacity-30"
          >
            Next
          </button>
        </div>
      </footer>
    </div>
  );
};
