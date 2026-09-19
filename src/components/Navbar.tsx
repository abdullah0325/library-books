import React, { useState } from "react";
import {
  BookOpen,
  Search,
  Library,
  Layers,
  Users,
  ShieldCheck,
  PenTool,
  LogOut,
  User,
  Database,
  CheckCircle2,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { User as UserType, R2Status } from "../types.ts";

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string, params?: any) => void;
  currentUser: UserType | null;
  onOpenAuth: (defaultTab?: "login" | "register") => void;
  onLogout: () => void;
  onSwitchDemo: (role: "admin" | "creator" | "reader") => void;
  r2Status: R2Status | null;
  libraryCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  currentUser,
  onOpenAuth,
  onLogout,
  onSwitchDemo,
  r2Status,
  libraryCount,
}) => {
  const [showDemoMenu, setShowDemoMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [quickSearch, setQuickSearch] = useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickSearch.trim()) {
      onNavigate("browse", { q: quickSearch.trim() });
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FAF8F5]/95 backdrop-blur-md border-b border-stone-200">
      {/* Top Banner with Architecture & Role Quick-Switch */}
      <div className="bg-stone-900 text-stone-300 text-xs py-1.5 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          {/* Cloudflare R2 Storage Status Pill */}
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-amber-400 font-medium">
              <Database className="w-3.5 h-3.5" />
              Cloudflare R2:
            </span>
            <span className="inline-flex items-center gap-1 bg-stone-800 text-stone-300 px-2 py-0.5 rounded-full border border-stone-700">
              <span className={`w-1.5 h-1.5 rounded-full ${r2Status?.connected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`}></span>
              bucket: {r2Status?.bucket || "library-books"}
            </span>
            <span className="hidden md:inline text-stone-400">• SQLite Relational Core</span>
          </div>

          {/* Quick Demo Persona Switcher */}
          <div className="flex items-center gap-2">
            <span className="text-stone-400 hidden sm:inline">Active Persona:</span>
            <div className="relative">
              <button
                id="persona-switcher-btn"
                onClick={() => setShowDemoMenu(!showDemoMenu)}
                className="flex items-center gap-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 px-2.5 py-1 rounded text-xs border border-stone-700 transition"
              >
                <span className="font-semibold text-amber-300">
                  {currentUser ? `${currentUser.role}: ${currentUser.name.split(" ")[0]}` : "Guest / Visitor"}
                </span>
                <ChevronDown className="w-3 h-3 text-stone-400" />
              </button>

              {showDemoMenu && (
                <div
                  className="absolute right-0 mt-1 w-64 bg-stone-900 border border-stone-700 rounded-lg shadow-2xl p-2 z-50 text-xs"
                  onClick={() => setShowDemoMenu(false)}
                >
                  <p className="text-stone-400 px-2 py-1 text-[11px] uppercase tracking-wider font-semibold">
                    Instant Persona Switch
                  </p>
                  <button
                    id="switch-to-reader-btn"
                    onClick={() => onSwitchDemo("reader")}
                    className="w-full text-left px-2.5 py-2 rounded hover:bg-stone-800 flex items-center justify-between text-stone-200"
                  >
                    <div>
                      <div className="font-medium">Reader (Fatima)</div>
                      <div className="text-[11px] text-stone-400">Owns free & paid books in My Library</div>
                    </div>
                    {currentUser?.role === "USER" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  </button>

                  <button
                    id="switch-to-creator-btn"
                    onClick={() => onSwitchDemo("creator")}
                    className="w-full text-left px-2.5 py-2 rounded hover:bg-stone-800 flex items-center justify-between text-stone-200"
                  >
                    <div>
                      <div className="font-medium">Creator (Heritage Archive)</div>
                      <div className="text-[11px] text-stone-400">Upload books & view sales royalties</div>
                    </div>
                    {currentUser?.role === "CREATOR" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  </button>

                  <button
                    id="switch-to-admin-btn"
                    onClick={() => onSwitchDemo("admin")}
                    className="w-full text-left px-2.5 py-2 rounded hover:bg-stone-800 flex items-center justify-between text-stone-200"
                  >
                    <div>
                      <div className="font-medium">Super Admin (Maulana Azam)</div>
                      <div className="text-[11px] text-stone-400">Approve uploads, moderate, platform metrics</div>
                    </div>
                    {currentUser?.role === "ADMIN" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate("home")}>
          <div className="w-10 h-10 rounded-lg bg-stone-900 text-amber-400 flex items-center justify-center shadow-md border border-stone-700">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif text-xl font-bold tracking-tight text-stone-900">KitabKhana</span>
              <span className="text-xs font-serif text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200">
                کتاب خانہ
              </span>
            </div>
            <p className="text-[10px] text-stone-500 uppercase tracking-widest font-medium">Digital Library & Marketplace</p>
          </div>
        </div>

        {/* Global Search */}
        <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-md relative">
          <input
            id="global-search-input"
            type="text"
            placeholder="Search books, authors, ghazals, categories, tags..."
            value={quickSearch}
            onChange={(e) => setQuickSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-stone-100/90 hover:bg-stone-100 focus:bg-white text-stone-800 text-sm rounded-full border border-stone-300 focus:border-amber-600 focus:outline-none transition shadow-inner"
          />
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
        </form>

        {/* Navigation Links */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            id="nav-marketplace-btn"
            onClick={() => onNavigate("browse")}
            className={`px-3 py-1.5 text-sm rounded-lg transition font-medium ${
              currentView === "browse" ? "bg-stone-200 text-stone-900 font-semibold" : "text-stone-700 hover:text-stone-900 hover:bg-stone-100"
            }`}
          >
            Marketplace
          </button>

          <button
            id="nav-categories-btn"
            onClick={() => onNavigate("browse", { tab: "categories" })}
            className={`hidden sm:inline-flex px-3 py-1.5 text-sm rounded-lg transition font-medium ${
              currentView === "categories" ? "bg-stone-200 text-stone-900 font-semibold" : "text-stone-700 hover:text-stone-900 hover:bg-stone-100"
            }`}
          >
            Categories
          </button>

          <button
            id="nav-authors-btn"
            onClick={() => onNavigate("browse", { tab: "authors" })}
            className={`hidden sm:inline-flex px-3 py-1.5 text-sm rounded-lg transition font-medium ${
              currentView === "authors" ? "bg-stone-200 text-stone-900 font-semibold" : "text-stone-700 hover:text-stone-900 hover:bg-stone-100"
            }`}
          >
            Authors
          </button>

          {/* My Library Button */}
          <button
            id="nav-my-library-btn"
            onClick={() => {
              if (currentUser) onNavigate("library");
              else onOpenAuth("login");
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition font-medium ${
              currentView === "library"
                ? "bg-amber-100 text-amber-900 border border-amber-300 font-semibold"
                : "text-stone-700 hover:text-stone-900 hover:bg-stone-100"
            }`}
          >
            <Library className="w-4 h-4 text-amber-700" />
            <span>My Library</span>
            {libraryCount > 0 && (
              <span className="ml-0.5 bg-amber-700 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                {libraryCount}
              </span>
            )}
          </button>

          {/* Creator Studio Shortcut (if Creator or Admin) */}
          {currentUser && (currentUser.role === "CREATOR" || currentUser.role === "ADMIN") && (
            <button
              id="nav-creator-studio-btn"
              onClick={() => onNavigate("creator")}
              className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition font-medium ${
                currentView === "creator"
                  ? "bg-stone-800 text-stone-100"
                  : "bg-stone-100 text-stone-800 hover:bg-stone-200 border border-stone-300"
              }`}
            >
              <PenTool className="w-3.5 h-3.5 text-amber-600" />
              <span>Creator Studio</span>
            </button>
          )}

          {/* Super Admin Dashboard Shortcut */}
          {currentUser && currentUser.role === "ADMIN" && (
            <button
              id="nav-admin-dashboard-btn"
              onClick={() => onNavigate("admin")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition font-medium ${
                currentView === "admin"
                  ? "bg-red-900 text-white"
                  : "bg-red-50 text-red-800 hover:bg-red-100 border border-red-200"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-red-700" />
              <span className="hidden sm:inline">Admin</span>
            </button>
          )}

          {/* User Profile / Auth Actions */}
          {currentUser ? (
            <div className="relative ml-2">
              <button
                id="user-menu-btn"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1 pl-2 bg-stone-100 hover:bg-stone-200 rounded-full border border-stone-300 transition"
              >
                <span className="text-xs font-semibold text-stone-800 max-w-[100px] truncate hidden sm:inline">
                  {currentUser.name}
                </span>
                <img
                  src={currentUser.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"}
                  alt={currentUser.name}
                  className="w-7 h-7 rounded-full object-cover border border-stone-300"
                />
              </button>

              {showUserMenu && (
                <div
                  className="absolute right-0 mt-2 w-56 bg-white border border-stone-200 rounded-xl shadow-xl py-2 z-50 text-sm"
                  onClick={() => setShowUserMenu(false)}
                >
                  <div className="px-4 py-2 border-b border-stone-100">
                    <p className="font-semibold text-stone-900 truncate">{currentUser.name}</p>
                    <p className="text-xs text-stone-500 truncate">{currentUser.email}</p>
                    <span className="inline-block mt-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                      Role: {currentUser.role}
                    </span>
                  </div>

                  <button
                    onClick={() => onNavigate("library")}
                    className="w-full text-left px-4 py-2 hover:bg-stone-50 flex items-center gap-2 text-stone-700"
                  >
                    <Library className="w-4 h-4 text-stone-500" />
                    My Digital Library
                  </button>

                  {(currentUser.role === "CREATOR" || currentUser.role === "ADMIN") && (
                    <button
                      onClick={() => onNavigate("creator")}
                      className="w-full text-left px-4 py-2 hover:bg-stone-50 flex items-center gap-2 text-stone-700"
                    >
                      <PenTool className="w-4 h-4 text-stone-500" />
                      Creator Studio & Uploads
                    </button>
                  )}

                  {currentUser.role === "ADMIN" && (
                    <button
                      onClick={() => onNavigate("admin")}
                      className="w-full text-left px-4 py-2 hover:bg-stone-50 flex items-center gap-2 text-stone-700"
                    >
                      <ShieldCheck className="w-4 h-4 text-red-600" />
                      Super Admin Portal
                    </button>
                  )}

                  <div className="border-t border-stone-100 my-1"></div>

                  <button
                    id="logout-btn"
                    onClick={onLogout}
                    className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2 font-medium"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 ml-2">
              <button
                id="login-btn"
                onClick={() => onOpenAuth("login")}
                className="px-3.5 py-1.5 text-sm font-medium text-stone-800 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition"
              >
                Sign In
              </button>
              <button
                id="register-btn"
                onClick={() => onOpenAuth("register")}
                className="px-3.5 py-1.5 text-sm font-medium bg-stone-900 text-amber-300 hover:bg-stone-800 rounded-lg shadow-sm transition"
              >
                Join Library
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};
