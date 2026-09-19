import React from "react";
import { Star, BookOpen, Download, CheckCircle2 } from "lucide-react";
import { Book } from "../types.ts";

interface BookCardProps {
  book: Book;
  onSelect: (book: Book) => void;
  onQuickRead?: (book: Book) => void;
  isOwned?: boolean;
}

export const BookCard: React.FC<BookCardProps> = ({
  book,
  onSelect,
  onQuickRead,
  isOwned = false,
}) => {
  return (
    <div
      id={`book-card-${book.id}`}
      onClick={() => onSelect(book)}
      className="group cursor-pointer flex flex-col bg-white rounded-xl border border-stone-200 hover:border-amber-500/50 hover:shadow-xl transition-all duration-300 overflow-hidden"
    >
      {/* Cover Image Container */}
      <div className="relative aspect-[3/4] bg-stone-100 overflow-hidden flex items-center justify-center p-3">
        {/* Book spine simulation effect */}
        <div className="relative w-full h-full rounded-md overflow-hidden shadow-md group-hover:shadow-lg transition">
          <img
            src={book.coverUrl}
            alt={book.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          {/* Subtle spine gradient on the left */}
          <div className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/40 via-black/10 to-transparent pointer-events-none"></div>

          {/* Badges overlay */}
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 items-start">
            {book.isFree ? (
              <span className="bg-emerald-700/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                FREE
              </span>
            ) : (
              <span className="bg-stone-900/90 backdrop-blur-sm text-amber-300 text-[11px] font-bold px-2 py-0.5 rounded shadow border border-amber-500/30">
                ${book.price.toFixed(2)}
              </span>
            )}

            {isOwned && (
              <span className="bg-amber-600/90 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-0.5 rounded shadow flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5" />
                Owned
              </span>
            )}
          </div>

          <div className="absolute top-2.5 right-2.5">
            <span className="bg-black/60 backdrop-blur-sm text-white text-[10px] px-1.5 py-0.5 rounded">
              {book.language}
            </span>
          </div>

          {/* Hover Quick Read overlay */}
          <div className="absolute inset-0 bg-stone-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onQuickRead) onQuickRead(book);
                else onSelect(book);
              }}
              className="bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 transition transform translate-y-2 group-hover:translate-y-0"
            >
              <BookOpen className="w-3.5 h-3.5" />
              {isOwned || book.isFree ? "Read Now" : "Details & Buy"}
            </button>
          </div>
        </div>
      </div>

      {/* Book Metadata */}
      <div className="p-4 flex flex-col flex-1 justify-between gap-3">
        <div>
          {/* Category Tag */}
          <span className="text-[11px] font-medium text-amber-800 uppercase tracking-wider">
            {book.categoryName}
          </span>

          {/* Title */}
          <h3 className="font-serif font-bold text-stone-900 text-base leading-snug line-clamp-2 mt-1 group-hover:text-amber-700 transition">
            {book.title}
          </h3>

          {/* Author */}
          <p className="text-xs text-stone-600 mt-1 line-clamp-1">
            by <span className="font-medium text-stone-800">{book.authorName}</span>
          </p>
        </div>

        {/* Footer info: Ratings and Pages */}
        <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
          <div className="flex items-center gap-1 text-amber-600 font-semibold">
            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            <span>{book.rating.toFixed(1)}</span>
            <span className="text-stone-400 font-normal">({book.reviewCount})</span>
          </div>

          <span className="text-stone-400">{book.pages} pages</span>
        </div>
      </div>
    </div>
  );
};
