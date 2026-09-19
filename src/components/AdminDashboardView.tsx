import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  BookOpen,
  Users,
  DollarSign,
  TrendingUp,
  Database,
  Search,
  Flag,
  Sparkles,
  Settings,
  Filter,
} from "lucide-react";
import { AdminOverview, Book, User as UserType, R2Status } from "../types.ts";
import { apiRequest } from "../lib/api.ts";

interface AdminDashboardViewProps {
  currentUser: UserType;
  r2Status: R2Status | null;
  onOpenBookDetail: (bookId: string) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  currentUser,
  r2Status,
  onOpenBookDetail,
}) => {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [activeTab, setActiveTab] = useState<"pending" | "books" | "users" | "orders" | "storage">("pending");
  const [loading, setLoading] = useState(true);

  // Tab data
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]);

  // Action states
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectingBookId, setRejectingBookId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<AdminOverview>("/api/admin/overview");
      setOverview(res);

      // Also fetch books and users
      const [bRes, uRes, oRes] = await Promise.all([
        apiRequest<{ books: Book[] }>("/api/admin/books"),
        apiRequest<{ users: any[] }>("/api/admin/users"),
        apiRequest<{ orders: any[] }>("/api/admin/orders"),
      ]);

      setAllBooks(bRes.books || []);
      setAllUsers(uRes.users || []);
      setAllOrders(oRes.orders || []);
    } catch (err) {
      console.error("Admin fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveBook = async (bookId: string) => {
    setProcessingId(bookId);
    try {
      await apiRequest(`/api/admin/books/${bookId}/moderate`, {
        method: "POST",
        body: JSON.stringify({ action: "APPROVE" }),
      });
      await fetchAdminData();
    } catch (err: any) {
      alert(err.message || "Approval failed");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectBook = async (bookId: string) => {
    if (!rejectionReason.trim()) {
      alert("Please enter a rejection reason for the creator");
      return;
    }
    setProcessingId(bookId);
    try {
      await apiRequest(`/api/admin/books/${bookId}/moderate`, {
        method: "POST",
        body: JSON.stringify({
          action: "REJECT",
          rejectionReason: rejectionReason.trim(),
        }),
      });
      setRejectingBookId(null);
      setRejectionReason("");
      await fetchAdminData();
    } catch (err: any) {
      alert(err.message || "Rejection failed");
    } finally {
      setProcessingId(null);
    }
  };

  const handleToggleFeatured = async (bookId: string) => {
    try {
      const res = await apiRequest<{ featured: boolean }>(
        `/api/admin/books/${bookId}/toggle-featured`,
        { method: "POST" }
      );
      setAllBooks((prev) =>
        prev.map((b) => (b.id === bookId ? { ...b, featured: res.featured } : b))
      );
    } catch (err: any) {
      alert(err.message || "Toggle featured failed");
    }
  };

  const handleChangeUserRole = async (userId: string, newRole: string) => {
    try {
      await apiRequest(`/api/admin/users/${userId}/role`, {
        method: "POST",
        body: JSON.stringify({ role: newRole }),
      });
      setAllUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
    } catch (err: any) {
      alert(err.message || "Failed changing user role");
    }
  };

  if (loading || !overview) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-red-700 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-xs text-stone-500 font-medium">Accessing Super Admin Command Center...</p>
      </div>
    );
  }

  const { metrics, pendingBooks } = overview;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Super Admin Crest Header */}
      <div className="bg-stone-900 text-stone-100 rounded-2xl p-6 sm:p-8 border border-stone-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-red-950 text-red-400 border border-red-800/60 flex items-center justify-center">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white">
                Super Admin Moderation Portal
              </h1>
              <span className="bg-red-900/60 text-red-200 text-xs px-2.5 py-0.5 rounded-full border border-red-700/50 font-bold uppercase tracking-wider">
                Full Authority
              </span>
            </div>
            <p className="text-xs sm:text-sm text-stone-400 mt-1">
              Signed in as {currentUser.name} ({currentUser.email})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-stone-800/80 px-4 py-2 rounded-xl border border-stone-700 text-xs">
          <Database className="w-4 h-4 text-emerald-400" />
          <span className="text-stone-300">R2 Bucket:</span>
          <span className="font-mono text-amber-300 font-bold">{r2Status?.bucket || "library-books"}</span>
        </div>
      </div>

      {/* KPI Stats Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm space-y-1">
          <span className="text-[11px] font-semibold text-stone-500">Registered Users</span>
          <div className="text-xl font-serif font-bold text-stone-900">{metrics.usersCount}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm space-y-1">
          <span className="text-[11px] font-semibold text-stone-500">Verified Creators</span>
          <div className="text-xl font-serif font-bold text-stone-900">{metrics.creatorsCount}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm space-y-1">
          <span className="text-[11px] font-semibold text-stone-500">Pending Approvals</span>
          <div className="text-xl font-serif font-bold text-amber-600">
            {metrics.pendingApprovalsCount}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm space-y-1">
          <span className="text-[11px] font-semibold text-stone-500">Published Books</span>
          <div className="text-xl font-serif font-bold text-emerald-600">
            {metrics.publishedBooksCount}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm space-y-1">
          <span className="text-[11px] font-semibold text-stone-500">Total Orders</span>
          <div className="text-xl font-serif font-bold text-stone-900">{metrics.ordersCount}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm space-y-1">
          <span className="text-[11px] font-semibold text-stone-500">Gross Volume</span>
          <div className="text-xl font-serif font-bold text-stone-900">
            ${metrics.revenueTotal.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-3 overflow-x-auto text-xs font-semibold">
        <button
          id="admin-tab-pending"
          onClick={() => setActiveTab("pending")}
          className={`px-4 py-2 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === "pending"
              ? "bg-stone-900 text-amber-300 shadow"
              : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
          }`}
        >
          <span>Moderation Queue</span>
          {metrics.pendingApprovalsCount > 0 && (
            <span className="bg-amber-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {metrics.pendingApprovalsCount}
            </span>
          )}
        </button>

        <button
          id="admin-tab-books"
          onClick={() => setActiveTab("books")}
          className={`px-4 py-2 rounded-lg transition whitespace-nowrap ${
            activeTab === "books"
              ? "bg-stone-900 text-amber-300 shadow"
              : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
          }`}
        >
          All Catalog Books ({allBooks.length})
        </button>

        <button
          id="admin-tab-users"
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2 rounded-lg transition whitespace-nowrap ${
            activeTab === "users"
              ? "bg-stone-900 text-amber-300 shadow"
              : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
          }`}
        >
          User Accounts & Roles ({allUsers.length})
        </button>

        <button
          id="admin-tab-orders"
          onClick={() => setActiveTab("orders")}
          className={`px-4 py-2 rounded-lg transition whitespace-nowrap ${
            activeTab === "orders"
              ? "bg-stone-900 text-amber-300 shadow"
              : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
          }`}
        >
          Digital Orders Ledger ({allOrders.length})
        </button>

        <button
          id="admin-tab-storage"
          onClick={() => setActiveTab("storage")}
          className={`px-4 py-2 rounded-lg transition whitespace-nowrap ${
            activeTab === "storage"
              ? "bg-stone-900 text-amber-300 shadow"
              : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
          }`}
        >
          Storage & Cloudflare R2
        </button>
      </div>

      {/* 1. Pending Moderation Queue Tab */}
      {activeTab === "pending" && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden p-6 space-y-6">
          <div>
            <h3 className="font-serif text-xl font-bold text-stone-900">
              Pending Submissions Awaiting Approval
            </h3>
            <p className="text-xs text-stone-500">
              Review new manuscript uploads before publishing them to the public marketplace.
            </p>
          </div>

          {pendingBooks.length > 0 ? (
            <div className="space-y-4">
              {pendingBooks.map((b) => (
                <div
                  key={b.id}
                  className="bg-stone-50 rounded-xl p-5 border border-stone-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
                >
                  <div className="flex items-start gap-4">
                    <img
                      src={b.coverUrl}
                      alt={b.title}
                      className="w-16 h-22 object-cover rounded shadow"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                          {b.categoryName}
                        </span>
                        <span className="text-xs text-stone-500">• {b.language}</span>
                        <span className="text-xs text-stone-500">• {b.pages} pages</span>
                      </div>
                      <h4 className="font-serif font-bold text-base text-stone-900">{b.title}</h4>
                      <p className="text-xs text-stone-600">
                        by <span className="font-semibold">{b.authorName}</span> • Submitted by Creator:{" "}
                        <span className="font-semibold text-stone-900">{b.creatorName || "Heritage Press"}</span>
                      </p>
                      <p className="text-xs text-stone-500 font-mono text-[11px] pt-1">
                        R2 Object Key: {b.pdfKey}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                    <button
                      onClick={() => onOpenBookDetail(b.id)}
                      className="w-full sm:w-auto px-3.5 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-lg text-xs font-semibold transition"
                    >
                      Inspect Manuscript
                    </button>

                    <button
                      id={`approve-book-btn-${b.id}`}
                      disabled={processingId === b.id}
                      onClick={() => handleApproveBook(b.id)}
                      className="w-full sm:w-auto px-4 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve & Publish
                    </button>

                    <button
                      id={`reject-book-btn-${b.id}`}
                      disabled={processingId === b.id}
                      onClick={() => setRejectingBookId(b.id)}
                      className="w-full sm:w-auto px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-stone-500 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <p className="font-medium text-stone-800">All submissions have been reviewed!</p>
              <p className="text-stone-400">There are no pending manuscripts in the moderation queue.</p>
            </div>
          )}
        </div>
      )}

      {/* 2. All Books Catalog Management Tab */}
      {activeTab === "books" && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-xl font-bold text-stone-900">Catalog Registry</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-700">
              <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider font-semibold border-b border-stone-200">
                <tr>
                  <th className="py-3 px-4">Title & Author</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Curator Featured</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {allBooks.map((b) => (
                  <tr key={b.id} className="hover:bg-stone-50 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-stone-900 line-clamp-1">{b.title}</div>
                      <div className="text-[11px] text-stone-400">{b.authorName}</div>
                    </td>
                    <td className="py-3 px-4">{b.categoryName}</td>
                    <td className="py-3 px-4 font-bold">{b.isFree ? "FREE" : `$${b.price.toFixed(2)}`}</td>
                    <td className="py-3 px-4 font-bold">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] ${
                          b.status === "PUBLISHED"
                            ? "bg-emerald-50 text-emerald-700"
                            : b.status === "PENDING"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleFeatured(b.id)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition flex items-center gap-1 ${
                          b.featured
                            ? "bg-amber-100 text-amber-900 border border-amber-300"
                            : "bg-stone-100 text-stone-400 hover:bg-stone-200"
                        }`}
                      >
                        <Sparkles className="w-3 h-3 text-amber-600" />
                        {b.featured ? "Featured" : "Standard"}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onOpenBookDetail(b.id)}
                        className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded font-medium"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. User Accounts & Roles Tab */}
      {activeTab === "users" && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden p-6 space-y-4">
          <h3 className="font-serif text-xl font-bold text-stone-900">User Identity & Access Control</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-700">
              <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider font-semibold border-b border-stone-200">
                <tr>
                  <th className="py-3 px-4">Name & Email</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Joined Date</th>
                  <th className="py-3 px-4">System Role</th>
                  <th className="py-3 px-4 text-right">Role Assignment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {allUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-stone-50 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-stone-900">{u.name}</div>
                      <div className="text-[11px] text-stone-400">{u.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded text-[10px]">
                        {u.status || "ACTIVE"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-stone-500">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-amber-800">{u.role}</td>
                    <td className="py-3 px-4 text-right">
                      <select
                        value={u.role}
                        onChange={(e) => handleChangeUserRole(u.id, e.target.value)}
                        className="bg-stone-50 border border-stone-300 rounded px-2 py-1 text-xs focus:outline-none"
                      >
                        <option value="USER">USER (Reader)</option>
                        <option value="CREATOR">CREATOR (Publisher)</option>
                        <option value="ADMIN">ADMIN (Super Authority)</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Orders Ledger Tab */}
      {activeTab === "orders" && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden p-6 space-y-4">
          <h3 className="font-serif text-xl font-bold text-stone-900">Digital Marketplace Order Ledger</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-700">
              <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider font-semibold border-b border-stone-200">
                <tr>
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Book Title</th>
                  <th className="py-3 px-4">Customer Email</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {allOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-stone-50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-stone-900">{o.orderNumber}</td>
                    <td className="py-3 px-4 font-medium">{o.bookTitle}</td>
                    <td className="py-3 px-4 text-stone-500">{o.userEmail}</td>
                    <td className="py-3 px-4 font-bold text-emerald-700">${o.amount.toFixed(2)} USD</td>
                    <td className="py-3 px-4 text-stone-500">{o.paymentMethod}</td>
                    <td className="py-3 px-4 text-stone-400">
                      {new Date(o.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Storage & Cloudflare R2 Tab */}
      {activeTab === "storage" && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-6">
          <div>
            <h3 className="font-serif text-xl font-bold text-stone-900">
              Cloudflare R2 Object Storage Configuration
            </h3>
            <p className="text-xs text-stone-500">
              Secure digital document storage layer parameters verified with S3 API protocol.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-1">
              <span className="text-stone-500 font-semibold block">R2 Bucket Name</span>
              <span className="font-mono text-stone-900 font-bold text-sm">
                {r2Status?.bucket || "library-books"}
              </span>
            </div>

            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-1">
              <span className="text-stone-500 font-semibold block">S3 Compatible Endpoint</span>
              <span className="font-mono text-stone-900 text-[11px] truncate block">
                {r2Status?.endpoint}
              </span>
            </div>

            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-1">
              <span className="text-stone-500 font-semibold block">Relational Metadata Database</span>
              <span className="font-mono text-emerald-700 font-bold text-sm">
                SQLite (sql.js / Prisma-compatible relational schema)
              </span>
            </div>

            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-1">
              <span className="text-stone-500 font-semibold block">Platform Commission Policy</span>
              <span className="font-mono text-stone-900 font-bold text-sm">
                12% Platform Fee • 88% Author Royalty Share
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectingBookId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-300 space-y-4">
            <h4 className="font-serif font-bold text-lg text-stone-900">Reject Submission</h4>
            <p className="text-xs text-stone-500">
              Provide constructive feedback to the creator explaining why this submission cannot be published in its current state.
            </p>

            <textarea
              rows={3}
              placeholder="e.g. Scanned pages are misaligned or copyright clearance documents are missing..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full p-3 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:border-red-600"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectingBookId(null)}
                className="px-3 py-1.5 bg-stone-100 text-stone-700 text-xs rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRejectBook(rejectingBookId)}
                className="px-4 py-1.5 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-lg transition"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
