import React, { useState, useEffect } from "react";
import {
  Upload,
  BookOpen,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  FileText,
  Image as ImageIcon,
  ShieldCheck,
  Send,
  Database,
  ExternalLink,
} from "lucide-react";
import { Book, Category, User } from "../types.ts";
import { apiRequest } from "../lib/api.ts";

interface CreatorStudioViewProps {
  currentUser: User;
  categories: Category[];
  onOpenBookDetail: (bookId: string) => void;
}

export const CreatorStudioView: React.FC<CreatorStudioViewProps> = ({
  currentUser,
  categories,
  onOpenBookDetail,
}) => {
  const [stats, setStats] = useState({
    totalBooks: 0,
    publishedBooks: 0,
    pendingBooks: 0,
    totalSales: 0,
    totalEarnings: 0,
  });
  const [books, setBooks] = useState<Book[]>([]);
  const [creatorProfile, setCreatorProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Form fields
  const [title, setTitle] = useState("");
  const [authorName, setAuthorName] = useState(currentUser.name);
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [language, setLanguage] = useState("Urdu");
  const [isFree, setIsFree] = useState(false);
  const [price, setPrice] = useState("4.99");
  const [pages, setPages] = useState("120");
  const [publicationYear, setPublicationYear] = useState(new Date().getFullYear().toString());
  const [isbn, setIsbn] = useState("");
  const [description, setDescription] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [tags, setTags] = useState("literature, poetry, heritage");

  // File objects
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  useEffect(() => {
    fetchCreatorData();
  }, []);

  const fetchCreatorData = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{
        creator: any;
        stats: any;
        books: Book[];
      }>("/api/creator/dashboard");

      setStats(res.stats);
      setBooks(res.books || []);
      setCreatorProfile(res.creator);
    } catch (err) {
      console.error("Failed to load creator data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert("Please provide a book title");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("authorName", authorName.trim());
      formData.append("categoryId", categoryId || categories[0]?.id || "");
      formData.append("language", language);
      formData.append("isFree", String(isFree));
      formData.append("price", isFree ? "0" : price);
      formData.append("pages", pages);
      formData.append("publicationYear", publicationYear);
      formData.append("isbn", isbn);
      formData.append("description", description.trim());
      formData.append("excerpt", excerpt.trim());
      formData.append("tags", tags);

      if (pdfFile) {
        formData.append("pdfFile", pdfFile);
      }
      if (coverFile) {
        formData.append("coverImage", coverFile);
      }

      await apiRequest("/api/creator/books", {
        method: "POST",
        body: formData,
      });

      setUploadSuccess(true);
      await fetchCreatorData();

      setTimeout(() => {
        setUploadSuccess(false);
        setShowUploadModal(false);
        resetForm();
      }, 1500);
    } catch (err: any) {
      alert(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setExcerpt("");
    setPdfFile(null);
    setCoverFile(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Header & Verification Profile */}
      <div className="bg-stone-900 text-stone-100 rounded-2xl p-6 sm:p-8 border border-stone-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-600/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-serif text-2xl font-bold">
            {creatorProfile?.displayName ? creatorProfile.displayName[0] : "C"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white">
                {creatorProfile?.displayName || currentUser.name}
              </h1>
              <span className="bg-amber-500/20 text-amber-300 text-xs px-2.5 py-0.5 rounded-full border border-amber-500/30 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Verified Creator
              </span>
            </div>
            <p className="text-xs sm:text-sm text-stone-400 mt-1">
              Independent Digital Publisher • Cloudflare R2 Uploads
            </p>
          </div>
        </div>

        <button
          id="upload-new-book-modal-btn"
          onClick={() => setShowUploadModal(true)}
          className="w-full md:w-auto px-5 py-3 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          Upload New Book
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-stone-500 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-stone-400" />
            Total Published Works
          </span>
          <div className="text-2xl font-serif font-bold text-stone-900">{stats.publishedBooks}</div>
          <span className="text-[11px] text-emerald-600 font-medium">Live on Marketplace</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-stone-500 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-500" />
            Pending Editorial Review
          </span>
          <div className="text-2xl font-serif font-bold text-stone-900">{stats.pendingBooks}</div>
          <span className="text-[11px] text-stone-400">Awaiting Super Admin Approval</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-stone-500 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            Total Digital Copies Sold
          </span>
          <div className="text-2xl font-serif font-bold text-stone-900">{stats.totalSales}</div>
          <span className="text-[11px] text-stone-400">Unique digital library deliveries</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-stone-500 flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            Net Royalty Earnings
          </span>
          <div className="text-2xl font-serif font-bold text-stone-900">
            ${stats.totalEarnings.toFixed(2)}
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">88% Creator Share (12% Platform)</span>
        </div>
      </div>

      {/* Publications Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden space-y-4 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif text-xl font-bold text-stone-900">Manuscript Catalog</h3>
            <p className="text-xs text-stone-500">
              Manage your uploaded titles, track editorial moderation status, and review reader feedback.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-stone-400">Loading catalog...</div>
        ) : books.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-700">
              <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider font-semibold border-b border-stone-200">
                <tr>
                  <th className="py-3 px-4">Book Title</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Pricing</th>
                  <th className="py-3 px-4">Pages</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Storage Key</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {books.map((b) => (
                  <tr key={b.id} className="hover:bg-stone-50/80 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={b.coverUrl}
                          alt={b.title}
                          className="w-8 h-11 object-cover rounded shadow-sm"
                        />
                        <div>
                          <div className="font-bold text-stone-900 line-clamp-1">{b.title}</div>
                          <div className="text-[11px] text-stone-400">{b.authorName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-medium">{b.categoryName}</td>
                    <td className="py-3.5 px-4 font-bold text-stone-900">
                      {b.isFree ? (
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">FREE</span>
                      ) : (
                        `$${b.price.toFixed(2)}`
                      )}
                    </td>
                    <td className="py-3.5 px-4">{b.pages} p.</td>
                    <td className="py-3.5 px-4">
                      {b.status === "PUBLISHED" && (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded text-[10px] border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          PUBLISHED
                        </span>
                      )}
                      {b.status === "PENDING" && (
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded text-[10px] border border-amber-200">
                          <Clock className="w-3 h-3" />
                          PENDING APPROVAL
                        </span>
                      )}
                      {b.status === "REJECTED" && (
                        <div>
                          <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 font-bold px-2 py-0.5 rounded text-[10px] border border-rose-200">
                            <AlertCircle className="w-3 h-3" />
                            REJECTED
                          </span>
                          {b.rejectionReason && (
                            <p className="text-[10px] text-rose-600 mt-1 max-w-xs">
                              Reason: {b.rejectionReason}
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[10px] text-stone-400">
                      {b.pdfKey.split("/").pop()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => onOpenBookDetail(b.id)}
                        className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded font-medium transition"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-stone-500">
            No publications yet. Click "Upload New Book" to submit your first PDF manuscript!
          </div>
        )}
      </div>

      {/* Upload New Book Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-stone-300 space-y-6 animate-in fade-in zoom-in duration-200 my-8">
            {uploadSuccess ? (
              <div className="text-center py-10 space-y-3">
                <CheckCircle2 className="w-14 h-14 text-emerald-600 mx-auto" />
                <h3 className="font-serif text-2xl font-bold text-stone-900">
                  Manuscript Uploaded to Cloudflare R2!
                </h3>
                <p className="text-xs text-stone-600 max-w-md mx-auto">
                  Your book has been securely uploaded to bucket <code className="bg-stone-100 px-1 py-0.5 rounded text-amber-800">library-books</code> and submitted to the Super Admin queue for editorial and copyright verification.
                </p>
              </div>
            ) : (
              <form onSubmit={handleUploadSubmit} className="space-y-6">
                <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                  <div>
                    <h3 className="font-serif text-xl font-bold text-stone-900">
                      Upload Digital Manuscript
                    </h3>
                    <p className="text-xs text-stone-500">
                      Uploaded directly to Cloudflare R2 storage and indexed into SQLite.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="text-stone-400 hover:text-stone-700 font-bold"
                  >
                    ✕
                  </button>
                </div>

                {/* Dropzones */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* PDF Dropzone */}
                  <div className="border-2 border-dashed border-stone-300 rounded-xl p-4 text-center hover:border-amber-500 transition cursor-pointer bg-stone-50 relative">
                    <input
                      id="pdf-file-input"
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <FileText className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                    <div className="text-xs font-bold text-stone-800">
                      {pdfFile ? pdfFile.name : "Select PDF Document"}
                    </div>
                    <p className="text-[10px] text-stone-500 mt-1">
                      {pdfFile ? `${(pdfFile.size / 1024 / 1024).toFixed(1)} MB` : "PDF file up to 50MB"}
                    </p>
                  </div>

                  {/* Cover Image Dropzone */}
                  <div className="border-2 border-dashed border-stone-300 rounded-xl p-4 text-center hover:border-amber-500 transition cursor-pointer bg-stone-50 relative">
                    <input
                      id="cover-file-input"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <ImageIcon className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                    <div className="text-xs font-bold text-stone-800">
                      {coverFile ? coverFile.name : "Select Book Cover"}
                    </div>
                    <p className="text-[10px] text-stone-500 mt-1">
                      {coverFile ? "Cover image ready" : "PNG, JPG or WebP"}
                    </p>
                  </div>
                </div>

                {/* Basic Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Book Title *</label>
                    <input
                      id="upload-title-input"
                      type="text"
                      required
                      placeholder="e.g. Kulliyat-e-Iqbal or The Art of Wisdom"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:border-amber-600"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Author / Poet *</label>
                    <input
                      type="text"
                      required
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:border-amber-600"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Category *</label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:border-amber-600"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Language *</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:border-amber-600"
                    >
                      <option value="Urdu">Urdu</option>
                      <option value="English">English</option>
                      <option value="Persian">Persian (Farsi)</option>
                      <option value="Arabic">Arabic</option>
                      <option value="Bengali">Bengali</option>
                      <option value="Russian">Russian</option>
                    </select>
                  </div>
                </div>

                {/* Pricing & Free Toggle */}
                <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-stone-800">Publish as Free Open-Access Edition?</span>
                      <p className="text-[11px] text-stone-500">
                        Free books can be read online and acquired by anyone without payment.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={isFree}
                      onChange={(e) => setIsFree(e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded"
                    />
                  </div>

                  {!isFree && (
                    <div className="pt-2 flex items-center gap-3">
                      <label className="font-semibold text-stone-700">Digital Edition Price (USD):</label>
                      <div className="relative w-36">
                        <span className="absolute left-3 top-2 text-stone-400 font-bold">$</span>
                        <input
                          type="number"
                          step="0.50"
                          min="0.99"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          className="w-full pl-7 pr-3 py-1.5 bg-white border border-stone-300 rounded-lg font-bold text-stone-900"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Excerpt & Description */}
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      Opening Couplet or Excerpt (Rekhta style)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ہوس کو ہے نشاط کار کیا کیا / نہ ہو مرنا تو جینے کا مزا کیا"
                      value={excerpt}
                      onChange={(e) => setExcerpt(e.target.value)}
                      className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Synopsis / Description</label>
                    <textarea
                      rows={3}
                      placeholder="Describe the historical context, translation notes, and literary significance..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-lg"
                    />
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    id="submit-manuscript-btn"
                    type="submit"
                    disabled={uploading}
                    className="px-6 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-stone-950 font-bold rounded-lg text-xs transition shadow"
                  >
                    {uploading ? "Uploading to Cloudflare R2..." : "Submit for Moderation"}
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
