import React, { useState } from "react";
import { BookOpen, ShieldCheck, PenTool, CheckCircle2, User, Lock, Mail } from "lucide-react";
import { apiRequest, setStoredAuth } from "../lib/api.ts";
import { User as UserType } from "../types.ts";

interface AuthModalProps {
  isOpen: boolean;
  defaultTab?: "login" | "register";
  onClose: () => void;
  onSuccess: (user: UserType) => void;
  onSwitchDemo: (role: "admin" | "creator" | "reader") => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  defaultTab = "login",
  onClose,
  onSuccess,
  onSwitchDemo,
}) => {
  const [activeTab, setActiveTab] = useState<"login" | "register">(defaultTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"USER" | "CREATOR">("USER");
  const [creatorName, setCreatorName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (activeTab === "login") {
        const res = await apiRequest<{ token: string; user: UserType }>("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        setStoredAuth(res.token, res.user);
        onSuccess(res.user);
        onClose();
      } else {
        const res = await apiRequest<{ token: string; user: UserType }>("/api/auth/register", {
          method: "POST",
          body: JSON.stringify({
            email,
            password,
            name,
            role,
            creatorName: role === "CREATOR" ? creatorName || name : undefined,
          }),
        });
        setStoredAuth(res.token, res.user);
        onSuccess(res.user);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-stone-300 space-y-6 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-stone-900 text-amber-400 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-stone-900">KitabKhana</h3>
              <p className="text-[10px] text-stone-500 uppercase tracking-wider">Digital Library</p>
            </div>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700 font-bold">
            ✕
          </button>
        </div>

        {/* Quick Demo Switcher Section for Evaluation */}
        <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-2 text-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-stone-600">
            One-Click Demo Personas:
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              id="auth-demo-reader-btn"
              onClick={() => {
                onSwitchDemo("reader");
                onClose();
              }}
              className="px-2 py-1.5 bg-white hover:bg-stone-100 text-stone-800 rounded border border-stone-200 font-medium text-center"
            >
              Reader (Fatima)
            </button>
            <button
              type="button"
              id="auth-demo-creator-btn"
              onClick={() => {
                onSwitchDemo("creator");
                onClose();
              }}
              className="px-2 py-1.5 bg-white hover:bg-stone-100 text-stone-800 rounded border border-stone-200 font-medium text-center"
            >
              Creator (Press)
            </button>
            <button
              type="button"
              id="auth-demo-admin-btn"
              onClick={() => {
                onSwitchDemo("admin");
                onClose();
              }}
              className="px-2 py-1.5 bg-red-50 hover:bg-red-100 text-red-800 rounded border border-red-200 font-semibold text-center"
            >
              Super Admin
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-stone-200">
          <button
            onClick={() => {
              setActiveTab("login");
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-bold border-b-2 transition ${
              activeTab === "login"
                ? "border-amber-600 text-amber-800"
                : "border-transparent text-stone-400 hover:text-stone-700"
            }`}
          >
            Sign In to Account
          </button>
          <button
            onClick={() => {
              setActiveTab("register");
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-bold border-b-2 transition ${
              activeTab === "register"
                ? "border-amber-600 text-amber-800"
                : "border-transparent text-stone-400 hover:text-stone-700"
            }`}
          >
            Create New Account
          </button>
        </div>

        {error && (
          <div className="bg-rose-50 text-rose-700 p-3 rounded-lg text-xs border border-rose-200">
            {error}
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {activeTab === "register" && (
            <>
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Your Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tariq Mansoor"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:border-amber-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Account Role</label>
                <div className="grid grid-cols-2 gap-2">
                  <label
                    className={`p-2.5 rounded-lg border cursor-pointer flex items-center gap-2 ${
                      role === "USER"
                        ? "border-amber-600 bg-amber-50 text-amber-900 font-bold"
                        : "border-stone-200 text-stone-600 hover:bg-stone-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      checked={role === "USER"}
                      onChange={() => setRole("USER")}
                      className="hidden"
                    />
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Reader</span>
                  </label>

                  <label
                    className={`p-2.5 rounded-lg border cursor-pointer flex items-center gap-2 ${
                      role === "CREATOR"
                        ? "border-amber-600 bg-amber-50 text-amber-900 font-bold"
                        : "border-stone-200 text-stone-600 hover:bg-stone-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      checked={role === "CREATOR"}
                      onChange={() => setRole("CREATOR")}
                      className="hidden"
                    />
                    <PenTool className="w-3.5 h-3.5" />
                    <span>Author / Creator</span>
                  </label>
                </div>
              </div>

              {role === "CREATOR" && (
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Publisher / Atelier Display Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mansoor Rare Texts"
                    value={creatorName}
                    onChange={(e) => setCreatorName(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:border-amber-600"
                  />
                </div>
              )}
            </>
          )}

          <div>
            <label className="block font-semibold text-stone-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:border-amber-600"
            />
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1">Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:border-amber-600"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-amber-300 font-bold rounded-lg transition shadow"
          >
            {loading ? "Verifying..." : activeTab === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
};
