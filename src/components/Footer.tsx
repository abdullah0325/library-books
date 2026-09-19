import React from "react";
import { BookOpen, ShieldCheck, Database, Globe, Feather, Heart } from "lucide-react";

interface FooterProps {
  onNavigate: (view: string, params?: any) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-stone-900 text-stone-300 border-t border-stone-800 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-stone-800">
          {/* Brand & Purpose */}
          <div className="md:col-span-1 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-stone-800 text-amber-400 flex items-center justify-center border border-stone-700">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-xl font-bold text-stone-100 tracking-wide">KitabKhana</h3>
                <p className="text-[11px] text-amber-400 font-serif">کتاب خانہ • Digital Library</p>
              </div>
            </div>
            <p className="text-xs text-stone-400 leading-relaxed">
              An international digital library and marketplace dedicated to preserving world literature, Urdu & Persian poetry, philosophy, and scholarly PDF manuscripts.
            </p>
            <div className="pt-2 flex items-center gap-3 text-xs text-stone-400">
              <span className="flex items-center gap-1 text-emerald-400">
                <Database className="w-3.5 h-3.5" />
                Cloudflare R2 Storage
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-amber-400">
                <Globe className="w-3.5 h-3.5" />
                Open Access & Marketplace
              </span>
            </div>
          </div>

          {/* Quick Categories */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-200 mb-4">
              Curated Collections
            </h4>
            <ul className="space-y-2.5 text-xs text-stone-400">
              <li>
                <button
                  onClick={() => onNavigate("browse", { category: "Poetry & Ghazals" })}
                  className="hover:text-amber-300 transition"
                >
                  Poetry & Ghazals (Rekhta Heritage)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("browse", { category: "Philosophy & Sufism" })}
                  className="hover:text-amber-300 transition"
                >
                  Philosophy & Sufism (Rumi & Gibran)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("browse", { category: "World Literature & Fiction" })}
                  className="hover:text-amber-300 transition"
                >
                  World Literature & Fiction
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("browse", { category: "Rare Manuscripts & Arts" })}
                  className="hover:text-amber-300 transition"
                >
                  Rare Manuscripts & Ateliers
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("browse", { isFree: "true" })}
                  className="text-amber-400 hover:text-amber-300 transition font-medium"
                >
                  Public Domain & Free Books
                </button>
              </li>
            </ul>
          </div>

          {/* Authors & Masters */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-200 mb-4">
              Featured Masters
            </h4>
            <ul className="space-y-2.5 text-xs text-stone-400">
              <li>
                <button onClick={() => onNavigate("browse", { author: "Ghalib" })} className="hover:text-amber-300 transition">
                  Mirza Asadullah Khan Ghalib
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate("browse", { author: "Rumi" })} className="hover:text-amber-300 transition">
                  Jalal al-Din Muhammad Rumi
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate("browse", { author: "Gibran" })} className="hover:text-amber-300 transition">
                  Kahlil Gibran
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate("browse", { author: "Tagore" })} className="hover:text-amber-300 transition">
                  Rabindranath Tagore
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate("browse", { author: "Iqbal" })} className="hover:text-amber-300 transition">
                  Allama Muhammad Iqbal
                </button>
              </li>
            </ul>
          </div>

          {/* Architecture & Governance */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-200 mb-4">
              Governance & Creators
            </h4>
            <p className="text-xs text-stone-400 mb-4 leading-relaxed">
              Every book submitted by independent creators undergoes human editorial and copyright verification before publishing.
            </p>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-stone-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Super Admin Verification Standard</span>
              </div>
              <div className="flex items-center gap-2 text-stone-400">
                <Feather className="w-4 h-4 text-amber-400" />
                <span>Author Royalties & Ownership Ledger</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-400">
          <p>© {new Date().getFullYear()} KitabKhana Digital Library & PDF Marketplace. Preserving human thought.</p>
          <div className="flex items-center gap-6">
            <span>Privacy Policy</span>
            <span>Digital Rights & DMCA</span>
            <span>Cloudflare R2 Bucket: library-books</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
