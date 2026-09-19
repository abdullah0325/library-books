import React, { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar.tsx";
import { Footer } from "./components/Footer.tsx";
import { HomeView } from "./components/HomeView.tsx";
import { BrowseView } from "./components/BrowseView.tsx";
import { BookDetailView } from "./components/BookDetailView.tsx";
import { MyLibraryView } from "./components/MyLibraryView.tsx";
import { PdfReaderView } from "./components/PdfReaderView.tsx";
import { CreatorStudioView } from "./components/CreatorStudioView.tsx";
import { AdminDashboardView } from "./components/AdminDashboardView.tsx";
import { AuthModal } from "./components/AuthModal.tsx";
import { Book, Category, Author, User, R2Status } from "./types.ts";
import {
  apiRequest,
  getStoredUser,
  getStoredToken,
  setStoredAuth,
  clearStoredAuth,
} from "./lib/api.ts";

export default function App() {
  // Navigation & View State
  const [currentView, setCurrentView] = useState<string>("home");
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [browseParams, setBrowseParams] = useState<any>({});

  // Global Data
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [featuredBooks, setFeaturedBooks] = useState<Book[]>([]);
  const [latestBooks, setLatestBooks] = useState<Book[]>([]);
  const [libraryCount, setLibraryCount] = useState<number>(0);
  const [r2Status, setR2Status] = useState<R2Status | null>(null);

  // Modals
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"login" | "register">("login");

  // Initial App Mount
  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    // 1. Check current logged-in user or initialize with Reader Demo if none
    const token = getStoredToken();
    const storedUser = getStoredUser();

    if (token && storedUser) {
      setCurrentUser(storedUser);
      fetchLibraryCount();
    } else {
      // Auto-login as reader demo initially so user experiences working features out of the box
      await handleSwitchDemo("reader");
    }

    // 2. Fetch categories, authors, featured books, and R2 storage health
    try {
      const [catRes, authRes, featRes, latestRes, r2Res] = await Promise.all([
        apiRequest<{ categories: Category[] }>("/api/categories"),
        apiRequest<{ authors: Author[] }>("/api/authors"),
        apiRequest<{ books: Book[] }>("/api/books/featured"),
        apiRequest<{ books: Book[] }>("/api/books?limit=8&sort=latest"),
        apiRequest<R2Status>("/api/r2/status").catch(() => null),
      ]);

      setCategories(catRes.categories || []);
      setAuthors(authRes.authors || []);
      setFeaturedBooks(featRes.books || []);
      setLatestBooks(latestRes.books || []);
      if (r2Res) setR2Status(r2Res);
    } catch (err) {
      console.error("Initialization error:", err);
    }
  };

  const fetchLibraryCount = async () => {
    try {
      const res = await apiRequest<{ library: any[] }>("/api/library");
      setLibraryCount(res.library?.length || 0);
    } catch {
      setLibraryCount(0);
    }
  };

  // Demo Persona Switcher (instant, frictionless)
  const handleSwitchDemo = async (role: "admin" | "creator" | "reader") => {
    try {
      const res = await apiRequest<{ token: string; user: User }>(
        `/api/auth/demo-switch?role=${role}`,
        { method: "POST" }
      );
      if (res && res.token && res.user) {
        setStoredAuth(res.token, res.user);
        setCurrentUser(res.user);

        // Refresh library count for the switched persona
        try {
          const libRes = await apiRequest<{ library: any[] }>("/api/library");
          setLibraryCount(libRes.library?.length || 0);
        } catch {
          setLibraryCount(0);
        }

        // Context-aware view redirection
        if (role === "admin") {
          setCurrentView("admin");
        } else if (role === "creator") {
          setCurrentView("creator");
        } else if (currentView === "admin" || currentView === "creator") {
          setCurrentView("home");
        }
      }
    } catch (err) {
      console.error("Demo persona switch failed:", err);
    }
  };

  const handleLogout = () => {
    clearStoredAuth();
    setCurrentUser(null);
    setLibraryCount(0);
    setCurrentView("home");
  };

  const handleNavigate = (view: string, params: any = {}) => {
    setBrowseParams(params);
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSelectBook = (book: Book) => {
    setSelectedBookId(book.id);
    setCurrentView("book-detail");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleOpenBookDetailById = (bookId: string) => {
    setSelectedBookId(bookId);
    setCurrentView("book-detail");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleReadBook = (bookId: string) => {
    setSelectedBookId(bookId);
    setCurrentView("pdf-reader");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-stone-900 font-sans selection:bg-amber-200 selection:text-amber-900">
      {/* Navbar (hidden during fullscreen distraction-free reading) */}
      {currentView !== "pdf-reader" && (
        <Navbar
          currentView={currentView}
          onNavigate={handleNavigate}
          currentUser={currentUser}
          onOpenAuth={(tab) => {
            setAuthModalTab(tab || "login");
            setAuthModalOpen(true);
          }}
          onLogout={handleLogout}
          onSwitchDemo={handleSwitchDemo}
          r2Status={r2Status}
          libraryCount={libraryCount}
        />
      )}

      {/* Main Content Router */}
      <main className="flex-1">
        {currentView === "home" && (
          <HomeView
            featuredBooks={featuredBooks}
            latestBooks={latestBooks}
            categories={categories}
            authors={authors}
            onSelectBook={handleSelectBook}
            onNavigate={handleNavigate}
            onQuickRead={handleSelectBook}
          />
        )}

        {currentView === "browse" && (
          <BrowseView
            categories={categories}
            authors={authors}
            initialCategory={browseParams.category}
            initialAuthor={browseParams.author}
            initialQuery={browseParams.q}
            initialIsFree={browseParams.isFree}
            onSelectBook={handleSelectBook}
            onQuickRead={handleSelectBook}
          />
        )}

        {currentView === "book-detail" && selectedBookId && (
          <BookDetailView
            bookId={selectedBookId}
            currentUser={currentUser}
            onBack={() => setCurrentView("browse")}
            onReadBook={handleReadBook}
            onOpenAuth={() => {
              setAuthModalTab("login");
              setAuthModalOpen(true);
            }}
            onLibraryUpdated={fetchLibraryCount}
          />
        )}

        {currentView === "library" && currentUser && (
          <MyLibraryView
            currentUser={currentUser}
            onReadBook={handleReadBook}
            onNavigate={handleNavigate}
            onOpenBookDetail={handleOpenBookDetailById}
            onLibraryUpdated={fetchLibraryCount}
          />
        )}

        {currentView === "pdf-reader" && selectedBookId && (
          <PdfReaderView
            bookId={selectedBookId}
            currentUser={currentUser}
            onBack={() => setCurrentView("book-detail")}
            onLibraryUpdated={fetchLibraryCount}
          />
        )}

        {currentView === "creator" && currentUser && (
          <CreatorStudioView
            currentUser={currentUser}
            categories={categories}
            onOpenBookDetail={handleOpenBookDetailById}
          />
        )}

        {currentView === "admin" && currentUser && (
          <AdminDashboardView
            currentUser={currentUser}
            r2Status={r2Status}
            onOpenBookDetail={handleOpenBookDetailById}
          />
        )}
      </main>

      {/* Footer (hidden during distraction-free reading) */}
      {currentView !== "pdf-reader" && <Footer onNavigate={handleNavigate} />}

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        defaultTab={authModalTab}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
          fetchLibraryCount();
        }}
        onSwitchDemo={handleSwitchDemo}
      />
    </div>
  );
}
