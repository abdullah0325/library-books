import React, { useState, useEffect } from "react";
import {
  Star,
  BookOpen,
  Download,
  CheckCircle2,
  Lock,
  ArrowLeft,
  Share2,
  Heart,
  Flag,
  Calendar,
  FileText,
  Layers,
  Globe,
  DollarSign,
  ShieldCheck,
  Send,
  Sparkles,
} from "lucide-react";
import { Book, Review, User as UserType } from "../types.ts";
import { apiRequest } from "../lib/api.ts";

interface BookDetailViewProps {
  bookId: string;
  currentUser: UserType | null;
  onBack: () => void;
  onReadBook: (bookId: string) => void;
  onOpenAuth: () => void;
  onLibraryUpdated: () => void;
}

export const BookDetailView: React.FC<BookDetailViewProps> = ({
  bookId,
  currentUser,
  onBack,
  onReadBook,
  onOpenAuth,
  onLibraryUpdated,
}) => {
  const [book, setBook] = useState<Book | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [ownership, setOwnership] = useState<{
    owned: boolean;
    isFavorite: boolean;
    readingProgress: number;
    currentPage: number;
  }>({
    owned: false,
    isFavorite: false,
    readingProgress: 0,
    currentPage: 1,
  });

  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("Visa •••• 4242");
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);

  // Review form
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Report form
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("Copyright / IP Concern");
  const [reportDetails, setReportDetails] = useState("");
  const [reportSuccess, setReportSuccess] = useState(false);

  useEffect(() => {
    fetchBookDetails();
  }, [bookId]);

  const fetchBookDetails = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{
        book: Book;
        reviews: Review[];
        ownership: {
          owned: boolean;
          isFavorite: boolean;
          readingProgress: number;
          currentPage: number;
        };
      }>(`/api/books/${bookId}`);

      setBook(res.book);
      setReviews(res.reviews || []);
      setOwnership(res.ownership);
    } catch (err) {
      console.error("Failed fetching book details:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcquireFree = async () => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }

    try {
      await apiRequest(`/api/books/${bookId}/acquire-free`, {
        method: "POST",
      });
      setOwnership((prev) => ({ ...prev, owned: true }));
      onLibraryUpdated();
    } catch (err: any) {
      alert(err.message || "Failed to add to library");
    }
  };

  const handleExecutePurchase = async () => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }

    setPurchasing(true);
    try {
      await apiRequest(`/api/books/${bookId}/purchase`, {
        method: "POST",
        body: JSON.stringify({ paymentMethod }),
      });
      setPurchaseSuccess(true);
      setOwnership((prev) => ({ ...prev, owned: true }));
      onLibraryUpdated();
      setTimeout(() => {
        setShowPurchaseModal(false);
        setPurchaseSuccess(false);
      }, 1800);
    } catch (err: any) {
      alert(err.message || "Purchase failed");
    } finally {
      setPurchasing(false);
    }
  };

  const handleDownload = async () => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    try {
      const res = await apiRequest<{ downloadUrl: string; filename: string }>(
        `/api/books/${bookId}/download-access`
      );
      if (res.downloadUrl) {
        window.open(res.downloadUrl, "_blank");
      }
    } catch (err: any) {
      alert(err.message || "Failed to get download access");
    }
  };

  const handleToggleFavorite = async () => {
    if (!currentUser || !ownership.owned) return;
    try {
      const res = await apiRequest<{ isFavorite: boolean }>(
        `/api/library/${bookId}/favorite`,
        { method: "POST" }
      );
      setOwnership((prev) => ({ ...prev, isFavorite: res.isFavorite }));
      onLibraryUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    if (!newComment.trim()) return;

    setSubmittingReview(true);
    try {
      await apiRequest(`/api/books/${bookId}/reviews`, {
        method: "POST",
        body: JSON.stringify({ rating: newRating, comment: newComment.trim() }),
      });
      setNewComment("");
      await fetchBookDetails();
    } catch (err: any) {
      alert(err.message || "Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setReportSuccess(true);
    setTimeout(() => {
      setShowReportModal(false);
      setReportSuccess(false);
      setReportDetails("");
    }, 1500);
  };

  if (loading || !book) {
    return (
      <div className="py-28 text-center space-y-4">
        <div className="w-10 h-10 border-3 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-sm text-stone-500 font-medium">Retrieving manuscript information...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-12">
      {/* Navigation Breadcrumb */}
      <button
        id="book-detail-back-btn"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-900 font-medium text-sm transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Catalog
      </button>

      {/* Main Book Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Book Cover & Quick Action Buttons */}
        <div className="lg:col-span-4 flex flex-col items-center">
          <div className="w-full max-w-sm">
            {/* Realistic 3D Book Cover Presentation */}
            <div className="relative aspect-[3/4] rounded-xl overflow-hidden shadow-2xl border border-stone-300 bg-stone-100">
              <img
                src={book.coverUrl}
                alt={book.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-black/40 via-black/15 to-transparent pointer-events-none"></div>

              {/* Status Badge */}
              <div className="absolute top-3 left-3">
                {book.isFree ? (
                  <span className="bg-emerald-700 text-white font-bold text-xs px-2.5 py-1 rounded shadow">
                    OPEN ACCESS • FREE
                  </span>
                ) : (
                  <span className="bg-stone-900 text-amber-300 font-bold text-xs px-2.5 py-1 rounded shadow border border-amber-500/30">
                    DIGITAL EDITION • ${book.price.toFixed(2)}
                  </span>
                )}
              </div>
            </div>

            {/* Reading & Ownership Actions Box */}
            <div className="mt-6 bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-3">
              {ownership.owned ? (
                <>
                  <div className="bg-emerald-50 text-emerald-800 p-3 rounded-xl border border-emerald-200 flex items-center gap-2 text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>In Your Digital Library</span>
                    {ownership.readingProgress > 0 && (
                      <span className="ml-auto text-emerald-700">
                        {ownership.readingProgress}% read
                      </span>
                    )}
                  </div>

                  <button
                    id="read-online-btn"
                    onClick={() => onReadBook(book.id)}
                    className="w-full py-3.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-xl shadow transition flex items-center justify-center gap-2 text-sm"
                  >
                    <BookOpen className="w-4 h-4" />
                    {ownership.readingProgress > 0
                      ? `Continue Reading (Page ${ownership.currentPage})`
                      : "Read Online Now"}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      id="download-pdf-btn"
                      onClick={handleDownload}
                      className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-medium rounded-xl transition text-xs flex items-center justify-center gap-1.5 border border-stone-300"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download PDF
                    </button>

                    <button
                      onClick={handleToggleFavorite}
                      className={`p-2.5 rounded-xl border transition ${
                        ownership.isFavorite
                          ? "bg-rose-50 border-rose-300 text-rose-600"
                          : "bg-stone-100 border-stone-300 text-stone-600 hover:bg-stone-200"
                      }`}
                      title={ownership.isFavorite ? "Remove favorite" : "Add to favorites"}
                    >
                      <Heart
                        className={`w-4 h-4 ${ownership.isFavorite ? "fill-rose-500 text-rose-500" : ""}`}
                      />
                    </button>
                  </div>
                </>
              ) : book.isFree ? (
                <>
                  <button
                    id="acquire-free-btn"
                    onClick={handleAcquireFree}
                    className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-xl shadow transition flex items-center justify-center gap-2 text-sm"
                  >
                    <BookOpen className="w-4 h-4" />
                    Add to My Library & Read Free
                  </button>
                  <button
                    onClick={() => onReadBook(book.id)}
                    className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-medium rounded-xl transition text-xs flex items-center justify-center gap-1.5 border border-stone-300"
                  >
                    Direct In-Browser Preview
                  </button>
                </>
              ) : (
                <>
                  <div className="text-center py-1">
                    <div className="text-2xl font-serif font-bold text-stone-900">
                      ${book.price.toFixed(2)}{" "}
                      <span className="text-xs text-stone-500 font-sans font-normal">USD</span>
                    </div>
                    <p className="text-[11px] text-stone-500">Lifetime access • Read & Download PDF</p>
                  </div>

                  <button
                    id="purchase-book-btn"
                    onClick={() => {
                      if (!currentUser) onOpenAuth();
                      else setShowPurchaseModal(true);
                    }}
                    className="w-full py-3.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-sm"
                  >
                    <DollarSign className="w-4 h-4" />
                    Purchase Digital Edition
                  </button>

                  <p className="text-[11px] text-center text-stone-400">
                    Secured by Cloudflare R2 • Instant Delivery
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Information, Metadata, Excerpts */}
        <div className="lg:col-span-8 space-y-8">
          {/* Title & Author */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200">
                {book.categoryName}
              </span>
              <span className="text-xs text-stone-500">• {book.language}</span>
              <span className="text-xs text-stone-500">• {book.pages} Pages</span>
              <span className="text-xs text-stone-500">• {book.fileSize}</span>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 leading-tight">
              {book.title}
            </h1>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-1 border-b border-stone-200 pb-4">
              <div>
                <span className="text-xs text-stone-500">Authored by </span>
                <span className="text-sm font-semibold text-stone-800">{book.authorName}</span>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-1.5">
                <div className="flex items-center text-amber-500">
                  <Star className="w-4 h-4 fill-amber-500" />
                </div>
                <span className="text-sm font-bold text-stone-900">{book.rating.toFixed(2)}</span>
                <span className="text-xs text-stone-500">({book.reviewCount} customer reviews)</span>
              </div>
            </div>
          </div>

          {/* Detailed Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-white border border-stone-200 text-xs">
            <div>
              <span className="text-stone-400 block mb-0.5">Publication Year</span>
              <span className="font-semibold text-stone-800">{book.publicationYear || "Historical"}</span>
            </div>
            <div>
              <span className="text-stone-400 block mb-0.5">Format</span>
              <span className="font-semibold text-stone-800">Digital PDF Book</span>
            </div>
            <div>
              <span className="text-stone-400 block mb-0.5">ISBN / Identifier</span>
              <span className="font-semibold text-stone-800">{book.isbn || "KH-ARCHIVE-DOC"}</span>
            </div>
            <div>
              <span className="text-stone-400 block mb-0.5">Storage Layer</span>
              <span className="font-semibold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Cloudflare R2
              </span>
            </div>
          </div>

          {/* Description & Overview */}
          <div className="space-y-3">
            <h3 className="font-serif text-lg font-bold text-stone-900">About this Digital Edition</h3>
            <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-line">
              {book.description}
            </p>
          </div>

          {/* Excerpt Block */}
          {book.excerpt && (
            <div className="bg-amber-50/60 border-l-4 border-amber-600 p-5 rounded-r-xl space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-amber-900">
                Opening Couplet / Excerpt
              </span>
              <p className="font-serif italic text-sm text-stone-800 leading-relaxed">
                "{book.excerpt}"
              </p>
            </div>
          )}

          {/* Tags */}
          {book.tags && book.tags.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-stone-500">Keywords & Tags:</span>
              <div className="flex flex-wrap gap-2">
                {book.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs bg-stone-100 text-stone-700 px-3 py-1 rounded-full border border-stone-200"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Creator & Publisher Card */}
          <div className="p-5 rounded-xl bg-white border border-stone-200 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-stone-900 text-amber-400 flex items-center justify-center font-serif font-bold text-base">
                {book.creatorName ? book.creatorName[0] : "K"}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-sm text-stone-900">{book.creatorName || "Heritage Press"}</span>
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-amber-700" />
                    Verified Creator
                  </span>
                </div>
                <p className="text-xs text-stone-500">Independent Digital Publisher on KitabKhana</p>
              </div>
            </div>

            <button
              onClick={() => setShowReportModal(true)}
              className="text-xs text-stone-400 hover:text-stone-600 flex items-center gap-1"
            >
              <Flag className="w-3.5 h-3.5" />
              Report
            </button>
          </div>

          {/* Reviews & Ratings Section */}
          <div className="pt-6 border-t border-stone-200 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-xl font-bold text-stone-900">
                  Reader Reviews ({reviews.length})
                </h3>
                <p className="text-xs text-stone-500">Authentic reviews from registered digital readers.</p>
              </div>
            </div>

            {/* Write Review Form (Available if owned) */}
            {ownership.owned && (
              <form
                onSubmit={handleSubmitReview}
                className="bg-white p-5 rounded-xl border border-stone-200 space-y-4"
              >
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  Write Your Review
                </h4>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">Your Rating</label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewRating(star)}
                        className="p-1 hover:scale-110 transition"
                      >
                        <Star
                          className={`w-5 h-5 ${
                            star <= newRating
                              ? "fill-amber-500 text-amber-500"
                              : "text-stone-300"
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-xs font-semibold text-stone-600 ml-2">
                      {newRating} / 5 Stars
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">
                    Commentary / Insights
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Share your thoughts on the text, translation, or typography..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="w-full p-3 text-xs bg-stone-50 rounded-lg border border-stone-300 focus:outline-none focus:border-amber-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingReview || !newComment.trim()}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-amber-300 text-xs font-bold rounded-lg transition flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  {submittingReview ? "Submitting..." : "Submit Review"}
                </button>
              </form>
            )}

            {/* Reviews List */}
            {reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="bg-white p-4 rounded-xl border border-stone-200 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img
                          src={
                            rev.userAvatar ||
                            "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80"
                          }
                          alt={rev.userName}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                        <span className="text-xs font-bold text-stone-900">{rev.userName}</span>
                      </div>
                      <div className="flex items-center gap-1 text-amber-500">
                        {Array.from({ length: rev.rating }).map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-amber-500" />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-stone-700 leading-relaxed">{rev.comment}</p>
                    <span className="text-[10px] text-stone-400 block">
                      Reviewed on {new Date(rev.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-stone-500 italic">No reviews yet for this edition.</p>
            )}
          </div>
        </div>
      </div>

      {/* Simulated Purchase Modal */}
      {showPurchaseModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-300 space-y-6 animate-in fade-in zoom-in duration-200">
            {purchaseSuccess ? (
              <div className="text-center py-6 space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="font-serif text-xl font-bold text-stone-900">Purchase Completed!</h3>
                <p className="text-xs text-stone-600">
                  "{book.title}" has been authorized and added to your personal digital library.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                  <h3 className="font-serif text-lg font-bold text-stone-900">Digital Book Checkout</h3>
                  <button
                    onClick={() => setShowPurchaseModal(false)}
                    className="text-stone-400 hover:text-stone-600 font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex items-center gap-3 bg-stone-50 p-3 rounded-xl border border-stone-200">
                  <img src={book.coverUrl} alt={book.title} className="w-12 h-16 object-cover rounded shadow" />
                  <div>
                    <h4 className="font-serif font-bold text-xs text-stone-900 line-clamp-1">{book.title}</h4>
                    <p className="text-[11px] text-stone-500">by {book.authorName}</p>
                    <span className="text-sm font-bold text-amber-700">${book.price.toFixed(2)} USD</span>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <label className="block font-semibold text-stone-700">Select Payment Method</label>
                  <div className="space-y-2">
                    {["Visa •••• 4242", "Mastercard •••• 8819", "International Apple Pay / Card"].map((method) => (
                      <label
                        key={method}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                          paymentMethod === method
                            ? "border-amber-600 bg-amber-50/50 text-stone-900 font-medium"
                            : "border-stone-200 hover:bg-stone-50 text-stone-700"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="payment"
                            checked={paymentMethod === method}
                            onChange={() => setPaymentMethod(method)}
                            className="text-amber-600 focus:ring-amber-500"
                          />
                          <span>{method}</span>
                        </div>
                        <span className="text-[10px] text-stone-400">Encrypted</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="border-t border-stone-200 pt-3 flex justify-between text-xs font-semibold text-stone-800">
                  <span>Total Amount:</span>
                  <span className="text-sm font-bold text-amber-800">${book.price.toFixed(2)} USD</span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPurchaseModal(false)}
                    className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-medium rounded-xl text-xs transition"
                  >
                    Cancel
                  </button>
                  <button
                    id="confirm-purchase-btn"
                    type="button"
                    disabled={purchasing}
                    onClick={handleExecutePurchase}
                    className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-stone-950 font-bold rounded-xl text-xs transition shadow"
                  >
                    {purchasing ? "Processing..." : `Pay $${book.price.toFixed(2)}`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Content / DMCA Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-300 space-y-4">
            {reportSuccess ? (
              <div className="text-center py-6 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h4 className="font-serif font-bold text-base text-stone-900">Report Submitted</h4>
                <p className="text-xs text-stone-500">Super Admin will audit the content within 24 hours.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReport} className="space-y-4">
                <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                  <h4 className="font-serif font-bold text-base text-stone-900">Report Manuscript Content</h4>
                  <button type="button" onClick={() => setShowReportModal(false)} className="text-stone-400">
                    ✕
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">Reason</label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg text-xs"
                  >
                    <option value="Copyright / IP Concern">Copyright / Intellectual Property Violation</option>
                    <option value="Inappropriate Content">Inappropriate Content</option>
                    <option value="Poor Quality / Corrupted PDF">Corrupted or Unreadable PDF</option>
                    <option value="Misleading Metadata">Misleading Metadata / Wrong Author</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">Details</label>
                  <textarea
                    rows={3}
                    placeholder="Provide specific notes for the moderation review..."
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="px-3 py-1.5 bg-stone-100 text-stone-700 text-xs rounded-lg font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-lg"
                  >
                    Submit Report
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
