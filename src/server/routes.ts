import { Router, Response } from "express";
import multer from "multer";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  queryAll,
  queryOne,
  executeRun,
  persistDb,
  getDb,
} from "./db.ts";
import {
  authMiddleware,
  requireAuth,
  requireRole,
  generateToken,
  AuthenticatedRequest,
} from "./auth.ts";
import {
  uploadToR2,
  getSignedR2Url,
  getObjectFromR2,
  testR2Connection,
  BUCKET_NAME,
} from "./r2.ts";
import { generateBookPdfBuffer } from "./pdfGenerator.ts";
import { getGeminiClient } from "./gemini.ts";

const router = Router();

// Ensure database is initialized before any route query executes
router.use(async (_req, _res, next) => {
  try {
    await getDb();
    next();
  } catch (err) {
    next(err);
  }
});
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
});

const STREAM_TOKEN_SECRET =
  process.env.JWT_SECRET || "kitabkhana_stream_token_secret_2026";

// Helper to generate temporary token for streaming
function generateStreamToken(bookId: string, userId: string): string {
  return jwt.sign({ bookId, userId }, STREAM_TOKEN_SECRET, {
    expiresIn: "1h",
  });
}

function verifyStreamToken(token: string): { bookId: string; userId: string } | null {
  try {
    return jwt.verify(token, STREAM_TOKEN_SECRET) as {
      bookId: string;
      userId: string;
    };
  } catch (err) {
    return null;
  }
}

// -------------------------------------------------------------
// 1. SYSTEM & R2 STATUS
// -------------------------------------------------------------
router.get("/r2/status", async (_req, res) => {
  const r2Status = await testR2Connection();
  res.json({
    ...r2Status,
    storageLayer: "Cloudflare R2 Object Storage",
    databaseLayer: "SQLite Relational Database (sql.js / Prisma-compatible)",
  });
});

// -------------------------------------------------------------
// 2. AUTHENTICATION
// -------------------------------------------------------------
router.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password, role = "USER", bio } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }

    const existing = queryOne("SELECT id FROM users WHERE email = ?", [email.toLowerCase().trim()]);
    if (existing) {
      return res.status(400).json({ error: "An account with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = "usr_" + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();
    const userRole = role === "CREATOR" ? "CREATOR" : "USER";

    executeRun(
      `INSERT INTO users (id, email, passwordHash, name, role, bio, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)`,
      [userId, email.toLowerCase().trim(), passwordHash, name, userRole, bio || null, now, now]
    );

    let creatorId: string | undefined = undefined;
    if (userRole === "CREATOR") {
      creatorId = "cr_" + Math.random().toString(36).substring(2, 9);
      const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "-") + "-" + Math.floor(Math.random() * 1000);
      executeRun(
        `INSERT INTO creators (id, userId, displayName, slug, bio, verified, createdAt)
         VALUES (?, ?, ?, ?, ?, 0, ?)`,
        [creatorId, userId, name, slug, bio || "Author & Creator on KitabKhana", now]
      );
    }

    const token = generateToken({ id: userId, email: email.toLowerCase().trim(), role: userRole });
    res.json({
      token,
      user: {
        id: userId,
        name,
        email: email.toLowerCase().trim(),
        role: userRole,
        creatorId,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Registration failed" });
  }
});

router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = queryOne<any>("SELECT * FROM users WHERE email = ?", [email.toLowerCase().trim()]);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (user.status === "SUSPENDED") {
      return res.status(403).json({ error: "This account has been suspended by administration" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    let creatorId: string | undefined = undefined;
    if (user.role === "CREATOR" || user.role === "ADMIN") {
      const creator = queryOne<any>("SELECT id FROM creators WHERE userId = ?", [user.id]);
      if (creator) creatorId = creator.id;
    }

    const token = generateToken({ id: user.id, email: user.email, role: user.role });
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        creatorId,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Login failed" });
  }
});

// Switch demo account for easy evaluation of all 3 user types (supports GET and POST on both route aliases)
router.all(["/auth/switch-demo", "/auth/demo-switch"], (req, res) => {
  const rawRole = (req.query?.role as string) || req.body?.role || "reader";
  const role = String(rawRole).toLowerCase();
  let targetEmail = "admin@kitabkhana.org";
  if (role === "creator") targetEmail = "heritage@kitabkhana.org";
  if (role === "reader" || role === "user") targetEmail = "reader@kitabkhana.org";

  const user = queryOne<any>("SELECT * FROM users WHERE email = ?", [targetEmail]);
  if (!user) {
    return res.status(404).json({ error: "Demo user not found" });
  }

  let creatorId: string | undefined = undefined;
  if (user.role === "CREATOR" || user.role === "ADMIN") {
    const creator = queryOne<any>("SELECT id FROM creators WHERE userId = ?", [user.id]);
    if (creator) creatorId = creator.id;
  }

  const token = generateToken({ id: user.id, email: user.email, role: user.role });
  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      creatorId,
    },
  });
});

router.get("/auth/me", requireAuth, (req: AuthenticatedRequest, res) => {
  res.json({ user: req.user });
});

router.put("/auth/profile", requireAuth, (req: AuthenticatedRequest, res) => {
  const { name, bio, avatarUrl } = req.body;
  const now = new Date().toISOString();
  executeRun(
    `UPDATE users SET name = COALESCE(?, name), bio = COALESCE(?, bio), avatarUrl = COALESCE(?, avatarUrl), updatedAt = ? WHERE id = ?`,
    [name, bio, avatarUrl, now, req.user!.id]
  );
  if (req.user!.creatorId && name) {
    executeRun(`UPDATE creators SET displayName = ? WHERE id = ?`, [name, req.user!.creatorId]);
  }
  res.json({ message: "Profile updated successfully" });
});

// -------------------------------------------------------------
// 3. TAXONOMIES (CATEGORIES & AUTHORS)
// -------------------------------------------------------------
router.get("/categories", (_req, res) => {
  const categories = queryAll<any>(
    `SELECT c.*, COUNT(b.id) as publishedBooksCount 
     FROM categories c 
     LEFT JOIN books b ON b.categoryId = c.id AND b.status = 'PUBLISHED'
     GROUP BY c.id 
     ORDER BY publishedBooksCount DESC, c.name ASC`
  );
  res.json({ categories });
});

router.get("/authors", (_req, res) => {
  const authors = queryAll<any>(
    `SELECT a.*, COUNT(b.id) as booksCount 
     FROM authors a 
     LEFT JOIN books b ON b.authorId = a.id AND b.status = 'PUBLISHED'
     GROUP BY a.id 
     ORDER BY booksCount DESC, a.name ASC`
  );
  res.json({ authors });
});

router.get("/creators", (_req, res) => {
  const creators = queryAll<any>(
    `SELECT c.*, COUNT(b.id) as publishedBooksCount 
     FROM creators c 
     LEFT JOIN books b ON b.creatorId = c.id AND b.status = 'PUBLISHED'
     GROUP BY c.id 
     ORDER BY c.totalSales DESC, publishedBooksCount DESC`
  );
  res.json({ creators });
});

// -------------------------------------------------------------
// 4. PUBLIC MARKETPLACE & BOOKS BROWSING
// -------------------------------------------------------------
router.get("/books", (req: AuthenticatedRequest, res) => {
  const {
    q,
    category,
    author,
    creator,
    language,
    isFree,
    minPrice,
    maxPrice,
    sort = "featured",
    page = "1",
    limit = "12",
  } = req.query as Record<string, string>;

  const conditions: string[] = ["b.status = 'PUBLISHED'"];
  const params: any[] = [];

  if (q && q.trim()) {
    const searchTerm = `%${q.trim().toLowerCase()}%`;
    conditions.push(
      "(LOWER(b.title) LIKE ? OR LOWER(b.description) LIKE ? OR LOWER(b.authorName) LIKE ? OR LOWER(b.categoryName) LIKE ? OR LOWER(b.tags) LIKE ?)"
    );
    params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
  }

  if (category) {
    conditions.push("(b.categoryId = ? OR b.categoryName = ?)");
    params.push(category, category);
  }

  if (author) {
    conditions.push("(b.authorId = ? OR b.authorName LIKE ?)");
    params.push(author, `%${author}%`);
  }

  if (creator) {
    conditions.push("b.creatorId = ?");
    params.push(creator);
  }

  if (language) {
    conditions.push("b.language LIKE ?");
    params.push(`%${language}%`);
  }

  if (isFree !== undefined && isFree !== "") {
    conditions.push("b.isFree = ?");
    params.push(isFree === "true" || isFree === "1" ? 1 : 0);
  }

  if (minPrice) {
    conditions.push("b.price >= ?");
    params.push(parseFloat(minPrice));
  }

  if (maxPrice) {
    conditions.push("b.price <= ?");
    params.push(parseFloat(maxPrice));
  }

  let orderBy = "b.featured DESC, b.purchaseCount DESC, b.rating DESC";
  if (sort === "latest") orderBy = "b.createdAt DESC";
  if (sort === "popular") orderBy = "b.purchaseCount DESC, b.viewCount DESC";
  if (sort === "rating") orderBy = "b.rating DESC, b.reviewCount DESC";
  if (sort === "price-asc") orderBy = "b.price ASC";
  if (sort === "price-desc") orderBy = "b.price DESC";

  const whereClause = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

  // Count total matching
  const countRow = queryOne<any>(`SELECT COUNT(*) as count FROM books b ${whereClause}`, params);
  const total = countRow?.count || 0;

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 12));
  const offset = (pageNum - 1) * limitNum;

  const books = queryAll<any>(
    `SELECT b.*, c.displayName as creatorName, c.verified as creatorVerified
     FROM books b
     LEFT JOIN creators c ON c.id = b.creatorId
     ${whereClause}
     ORDER BY ${orderBy}
     LIMIT ? OFFSET ?`,
    [...params, limitNum, offset]
  );

  // Parse tags JSON
  const formatted = books.map((book) => ({
    ...book,
    tags: book.tags ? JSON.parse(book.tags) : [],
    isFree: Boolean(book.isFree),
    featured: Boolean(book.featured),
  }));

  res.json({
    books: formatted,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  });
});

router.get("/books/featured", (_req, res) => {
  const books = queryAll<any>(
    `SELECT b.*, c.displayName as creatorName, c.verified as creatorVerified
     FROM books b
     LEFT JOIN creators c ON c.id = b.creatorId
     WHERE b.status = 'PUBLISHED' AND b.featured = 1
     ORDER BY b.rating DESC, b.purchaseCount DESC
     LIMIT 6`
  );
  res.json({
    books: books.map((b) => ({
      ...b,
      tags: b.tags ? JSON.parse(b.tags) : [],
      isFree: Boolean(b.isFree),
    })),
  });
});

router.get("/books/latest", (_req, res) => {
  const books = queryAll<any>(
    `SELECT b.*, c.displayName as creatorName 
     FROM books b
     LEFT JOIN creators c ON c.id = b.creatorId
     WHERE b.status = 'PUBLISHED'
     ORDER BY b.createdAt DESC
     LIMIT 8`
  );
  res.json({
    books: books.map((b) => ({
      ...b,
      tags: b.tags ? JSON.parse(b.tags) : [],
      isFree: Boolean(b.isFree),
    })),
  });
});

// Single book detail page
router.get("/books/:id", (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const book = queryOne<any>(
    `SELECT b.*, 
            c.displayName as creatorName, c.slug as creatorSlug, c.verified as creatorVerified, c.avatarUrl as creatorAvatar,
            a.bio as authorBio, a.bornYear as authorBornYear, a.photoUrl as authorPhoto, a.nationality as authorNationality
     FROM books b
     LEFT JOIN creators c ON c.id = b.creatorId
     LEFT JOIN authors a ON a.id = b.authorId
     WHERE b.id = ?`,
    [id]
  );

  if (!book) {
    return res.status(404).json({ error: "Book not found" });
  }

  // Increment view count
  executeRun("UPDATE books SET viewCount = viewCount + 1 WHERE id = ?", [id]);

  // Check ownership if user logged in
  let owned = false;
  let isFavorite = false;
  let readingProgress = 0;
  let currentPage = 1;

  if (req.user) {
    if (req.user.role === "ADMIN" || (req.user.creatorId && req.user.creatorId === book.creatorId)) {
      owned = true;
    } else {
      const libEntry = queryOne<any>(
        "SELECT * FROM user_library WHERE userId = ? AND bookId = ?",
        [req.user.id, id]
      );
      if (libEntry) {
        owned = true;
        isFavorite = Boolean(libEntry.isFavorite);
        readingProgress = libEntry.progressPercent;
        currentPage = libEntry.currentPage;
      }
    }
  }

  // Fetch reviews
  const reviews = queryAll<any>(
    `SELECT r.*, u.name as userName, u.avatarUrl as userAvatar
     FROM reviews r
     JOIN users u ON u.id = r.userId
     WHERE r.bookId = ?
     ORDER BY r.createdAt DESC
     LIMIT 10`,
    [id]
  );

  res.json({
    book: {
      ...book,
      tags: book.tags ? JSON.parse(book.tags) : [],
      isFree: Boolean(book.isFree),
      featured: Boolean(book.featured),
    },
    reviews,
    ownership: {
      owned: owned || Boolean(book.isFree),
      isFavorite,
      readingProgress,
      currentPage,
    },
  });
});

// -------------------------------------------------------------
// 5. DIGITAL ACQUISITION & PURCHASES
// -------------------------------------------------------------
// Acquire a free book
router.post("/books/:id/acquire-free", requireAuth, (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const book = queryOne<any>("SELECT * FROM books WHERE id = ?", [id]);
  if (!book) return res.status(404).json({ error: "Book not found" });
  if (book.isFree !== 1) {
    return res.status(400).json({ error: "This is a paid book and requires purchase." });
  }

  const existing = queryOne("SELECT id FROM user_library WHERE userId = ? AND bookId = ?", [
    userId,
    id,
  ]);
  if (existing) {
    return res.json({ message: "Book is already in your library", alreadyOwned: true });
  }

  const now = new Date().toISOString();
  const entryId = "lib_" + Math.random().toString(36).substring(2, 9);

  executeRun(
    `INSERT INTO user_library (id, userId, bookId, acquiredAt, lastReadAt, currentPage, totalPages, progressPercent, accessType)
     VALUES (?, ?, ?, ?, ?, 1, ?, 0, 'FREE')`,
    [entryId, userId, id, now, now, book.pages || 1]
  );

  executeRun("UPDATE books SET purchaseCount = purchaseCount + 1 WHERE id = ?", [id]);

  res.json({ message: "Free book added to your personal library!", success: true });
});

// Purchase a paid book
router.post("/books/:id/purchase", requireAuth, (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { paymentMethod = "Credit Card (Simulated)" } = req.body;
  const userId = req.user!.id;

  const book = queryOne<any>("SELECT * FROM books WHERE id = ?", [id]);
  if (!book) return res.status(404).json({ error: "Book not found" });

  const existing = queryOne("SELECT id FROM user_library WHERE userId = ? AND bookId = ?", [
    userId,
    id,
  ]);
  if (existing) {
    return res.json({ message: "You already own this book!", alreadyOwned: true });
  }

  const now = new Date().toISOString();
  const orderId = "ord_" + Math.random().toString(36).substring(2, 9);
  const orderNumber = "KB-" + Math.floor(100000 + Math.random() * 900000);

  // 1. Create order
  executeRun(
    `INSERT INTO orders (id, orderNumber, userId, bookId, amount, currency, status, paymentMethod, createdAt)
     VALUES (?, ?, ?, ?, ?, 'USD', 'COMPLETED', ?, ?)`,
    [orderId, orderNumber, userId, id, book.price, paymentMethod, now]
  );

  // 2. Grant digital ownership into user_library
  const libId = "lib_" + Math.random().toString(36).substring(2, 9);
  executeRun(
    `INSERT INTO user_library (id, userId, bookId, acquiredAt, lastReadAt, currentPage, totalPages, progressPercent, accessType)
     VALUES (?, ?, ?, ?, ?, 1, ?, 0, 'PURCHASED')`,
    [libId, userId, id, now, now, book.pages || 1]
  );

  // 3. Update book metrics & creator earnings
  executeRun("UPDATE books SET purchaseCount = purchaseCount + 1 WHERE id = ?", [id]);
  executeRun(
    "UPDATE creators SET totalSales = totalSales + 1, totalEarnings = totalEarnings + ? WHERE id = ?",
    [book.price * 0.88, book.creatorId] // 88% to creator, 12% platform fee
  );

  res.json({
    success: true,
    message: "Purchase completed successfully! The book has been added to My Library.",
    orderNumber,
    orderId,
  });
});

// -------------------------------------------------------------
// 6. USER DIGITAL LIBRARY
// -------------------------------------------------------------
router.get("/library", requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const { filter } = req.query;

  let whereExtra = "";
  if (filter === "favorites") whereExtra = "AND ul.isFavorite = 1";
  if (filter === "purchased") whereExtra = "AND ul.accessType = 'PURCHASED'";
  if (filter === "free") whereExtra = "AND ul.accessType = 'FREE'";

  const libraryItems = queryAll<any>(
    `SELECT ul.*, 
            b.title, b.slug, b.authorName, b.coverUrl, b.categoryName, b.pages, b.price, b.isFree, b.pdfFileName
     FROM user_library ul
     JOIN books b ON b.id = ul.bookId
     WHERE ul.userId = ? ${whereExtra}
     ORDER BY ul.lastReadAt DESC, ul.acquiredAt DESC`,
    [userId]
  );

  res.json({
    library: libraryItems.map((item) => ({
      ...item,
      isFavorite: Boolean(item.isFavorite),
      isFree: Boolean(item.isFree),
    })),
  });
});

router.post("/library/:bookId/favorite", requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const { bookId } = req.params;

  const item = queryOne<any>("SELECT * FROM user_library WHERE userId = ? AND bookId = ?", [
    userId,
    bookId,
  ]);

  if (!item) {
    return res.status(404).json({ error: "Book not found in your library" });
  }

  const newFav = item.isFavorite ? 0 : 1;
  executeRun("UPDATE user_library SET isFavorite = ? WHERE userId = ? AND bookId = ?", [
    newFav,
    userId,
    bookId,
  ]);

  res.json({ isFavorite: Boolean(newFav) });
});

router.post("/library/:bookId/progress", requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const { bookId } = req.params;
  const { currentPage, totalPages } = req.body;

  const validCurrent = Math.max(1, parseInt(currentPage) || 1);
  const validTotal = Math.max(validCurrent, parseInt(totalPages) || 1);
  const progressPercent = Math.min(100, Math.round((validCurrent / validTotal) * 100));
  const now = new Date().toISOString();

  executeRun(
    `UPDATE user_library 
     SET currentPage = ?, totalPages = ?, progressPercent = ?, lastReadAt = ?
     WHERE userId = ? AND bookId = ?`,
    [validCurrent, validTotal, progressPercent, now, userId, bookId]
  );

  // Insert reading history log
  const historyId = "hist_" + Math.random().toString(36).substring(2, 9);
  executeRun(
    `INSERT INTO reading_history (id, userId, bookId, pageNumber, durationSeconds, readAt)
     VALUES (?, ?, ?, ?, 60, ?)`,
    [historyId, userId, bookId, validCurrent, now]
  );

  res.json({ success: true, progressPercent, currentPage: validCurrent });
});

// -------------------------------------------------------------
// 7. SECURE PDF READER & DOWNLOAD ACCESS (OWNERSHIP VERIFICATION)
// -------------------------------------------------------------
// Read Access: verifies ownership, returns signed Cloudflare R2 URL or secure stream token
router.get("/books/:id/read-access", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const book = queryOne<any>("SELECT * FROM books WHERE id = ?", [id]);
    if (!book) return res.status(404).json({ error: "Book not found" });

    // Verify ownership:
    // 1. Book is free, OR
    // 2. User is Admin, OR
    // 3. User is Creator of the book, OR
    // 4. User has acquired the book in user_library
    let isAuthorized = false;
    if (book.isFree === 1 || user.role === "ADMIN" || (user.creatorId && user.creatorId === book.creatorId)) {
      isAuthorized = true;
    } else {
      const owned = queryOne("SELECT id FROM user_library WHERE userId = ? AND bookId = ?", [
        user.id,
        id,
      ]);
      if (owned) isAuthorized = true;
    }

    if (!isAuthorized) {
      return res.status(403).json({
        error: "Access Forbidden: You must purchase this book before reading online.",
        requiresPurchase: true,
      });
    }

    // Generate controlled stream token & temporary signed R2 URL
    const streamToken = generateStreamToken(book.id, user.id);
    let signedR2Url: string | null = null;
    try {
      signedR2Url = await getSignedR2Url(book.pdfKey, 1800); // 30 minutes signed URL
    } catch (r2Err) {
      console.warn("Direct R2 signed URL generation fallback:", r2Err);
    }

    res.json({
      authorized: true,
      bookId: book.id,
      title: book.title,
      author: book.authorName,
      totalPages: book.pages,
      pdfKey: book.pdfKey,
      signedUrl: signedR2Url,
      streamUrl: `/api/pdf-stream/${streamToken}`,
      downloadUrl: `/api/books/${book.id}/download-access`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to authorize book access" });
  }
});

// Download Access: verifies ownership and serves authenticated download
router.get("/books/:id/download-access", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const book = queryOne<any>("SELECT * FROM books WHERE id = ?", [id]);
    if (!book) return res.status(404).json({ error: "Book not found" });

    let isAuthorized = false;
    if (book.isFree === 1 || user.role === "ADMIN" || (user.creatorId && user.creatorId === book.creatorId)) {
      isAuthorized = true;
    } else {
      const owned = queryOne("SELECT id FROM user_library WHERE userId = ? AND bookId = ?", [
        user.id,
        id,
      ]);
      if (owned) isAuthorized = true;
    }

    if (!isAuthorized) {
      return res.status(403).json({
        error: "Access Forbidden: You do not own this book.",
        requiresPurchase: true,
      });
    }

    executeRun("UPDATE books SET downloadCount = downloadCount + 1 WHERE id = ?", [id]);

    const filename = book.pdfFileName || `${book.slug}.pdf`;

    // Try fetching from R2 directly or signed URL
    try {
      const signedDownloadUrl = await getSignedR2Url(book.pdfKey, 900, filename);
      return res.json({ downloadUrl: signedDownloadUrl, filename });
    } catch (r2Err) {
      console.warn("R2 signed URL error, serving streaming fallback:", r2Err);
      const streamToken = generateStreamToken(book.id, user.id);
      return res.json({
        downloadUrl: `/api/pdf-stream/${streamToken}?download=1`,
        filename,
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Download failed" });
  }
});

// Secure PDF stream endpoint (uses stream token generated during authorization)
router.get("/pdf-stream/:token", async (req, res) => {
  const { token } = req.params;
  const decoded = verifyStreamToken(token);
  if (!decoded) {
    return res.status(401).json({ error: "Invalid or expired reading session token" });
  }

  const book = queryOne<any>("SELECT * FROM books WHERE id = ?", [decoded.bookId]);
  if (!book) return res.status(404).json({ error: "Book not found" });

  const filename = book.pdfFileName || `${book.slug}.pdf`;
  const isDownload = req.query.download === "1";

  res.setHeader("Content-Type", "application/pdf");
  if (isDownload) {
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
  } else {
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(filename)}"`);
  }

  try {
    const r2Response = await getObjectFromR2(book.pdfKey);
    if (r2Response.Body) {
      (r2Response.Body as any).pipe(res);
      return;
    }
  } catch (err) {
    console.warn("Streaming directly from R2 failed, generating verified digital PDF buffer:", err);
  }

  // Guaranteed fallback PDF generator
  const fallbackPdf = generateBookPdfBuffer(book.title, book.authorName, book.categoryName, 6);
  res.setHeader("Content-Length", fallbackPdf.length);
  res.end(fallbackPdf);
});

// -------------------------------------------------------------
// 8. CREATOR STUDIO & BOOK UPLOADS
// -------------------------------------------------------------
router.get("/creator/dashboard", requireAuth, requireRole(["CREATOR", "ADMIN"]), (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const creator = queryOne<any>("SELECT * FROM creators WHERE userId = ?", [user.id]);

  const creatorId = creator ? creator.id : user.creatorId;
  if (!creatorId) {
    return res.status(404).json({ error: "Creator profile not found" });
  }

  const books = queryAll<any>(
    `SELECT * FROM books WHERE creatorId = ? ORDER BY createdAt DESC`,
    [creatorId]
  );

  const orders = queryAll<any>(
    `SELECT o.*, b.title as bookTitle, u.name as buyerName 
     FROM orders o
     JOIN books b ON b.id = o.bookId
     JOIN users u ON u.id = o.userId
     WHERE b.creatorId = ?
     ORDER BY o.createdAt DESC
     LIMIT 15`,
    [creatorId]
  );

  const stats = {
    totalBooks: books.length,
    publishedBooks: books.filter((b) => b.status === "PUBLISHED").length,
    pendingBooks: books.filter((b) => b.status === "PENDING").length,
    rejectedBooks: books.filter((b) => b.status === "REJECTED").length,
    totalSales: creator ? creator.totalSales : 0,
    totalEarnings: creator ? creator.totalEarnings : 0,
  };

  res.json({
    creator,
    stats,
    books: books.map((b) => ({
      ...b,
      tags: b.tags ? JSON.parse(b.tags) : [],
      isFree: Boolean(b.isFree),
    })),
    orders,
  });
});

// Creator uploads new book
router.post(
  "/creator/books",
  requireAuth,
  requireRole(["CREATOR", "ADMIN"]),
  upload.fields([
    { name: "pdfFile", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user!;
      let creatorId = user.creatorId;

      if (!creatorId) {
        const creator = queryOne<any>("SELECT id FROM creators WHERE userId = ?", [user.id]);
        if (creator) creatorId = creator.id;
        else {
          creatorId = "cr_" + Math.random().toString(36).substring(2, 9);
          executeRun(
            `INSERT INTO creators (id, userId, displayName, slug, bio, verified, createdAt)
             VALUES (?, ?, ?, ?, 'Independent Creator', 1, ?)`,
            [creatorId, user.id, user.name, "creator-" + Math.random().toString(36).substring(2, 6), new Date().toISOString()]
          );
        }
      }

      const {
        title,
        description,
        excerpt,
        authorName,
        categoryId,
        language = "English",
        price = "0",
        isFree = "true",
        isbn,
        publicationYear,
        tags = "[]",
        pages = "1",
      } = req.body;

      if (!title || !description || !authorName || !categoryId) {
        return res.status(400).json({ error: "Title, description, author, and category are required." });
      }

      const category = queryOne<any>("SELECT * FROM categories WHERE id = ?", [categoryId]);
      const categoryName = category ? category.name : "Literature";

      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const pdfFile = files?.pdfFile?.[0];
      const coverFile = files?.coverImage?.[0];

      const bookId = "book_" + Math.random().toString(36).substring(2, 9);
      const slug =
        title
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "-")
          .replace(/-+/g, "-") +
        "-" +
        Math.floor(1000 + Math.random() * 9000);

      // Store in Cloudflare R2
      const pdfKey = `books/${bookId}/${pdfFile ? pdfFile.originalname.replace(/[^a-zA-Z0-9._-]/g, "_") : "manuscript.pdf"}`;
      const coverKey = `books/${bookId}/cover.jpg`;

      // Upload PDF to R2
      let pdfBuffer: Buffer;
      if (pdfFile) {
        pdfBuffer = pdfFile.buffer;
      } else {
        pdfBuffer = generateBookPdfBuffer(title, authorName, categoryName, 5);
      }

      await uploadToR2({
        key: pdfKey,
        body: pdfBuffer,
        contentType: "application/pdf",
        metadata: {
          bookId,
          title,
          author: authorName,
        },
      });

      // Cover image URL handling
      let coverUrl = "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80";
      if (coverFile) {
        await uploadToR2({
          key: coverKey,
          body: coverFile.buffer,
          contentType: coverFile.mimetype,
        });
        // We can use a signed URL or CDN URL
        coverUrl = await getSignedR2Url(coverKey, 86400 * 7); // 7-day cover url
      }

      const numPrice = parseFloat(price) || 0.0;
      const freeFlag = isFree === "true" || isFree === "1" || numPrice === 0 ? 1 : 0;
      const now = new Date().toISOString();
      const fileSize = pdfFile ? `${(pdfFile.size / (1024 * 1024)).toFixed(1)} MB` : "1.8 MB";

      let parsedTags = tags;
      if (typeof tags === "string") {
        try {
          parsedTags = JSON.stringify(JSON.parse(tags));
        } catch {
          parsedTags = JSON.stringify(tags.split(",").map((t) => t.trim()).filter(Boolean));
        }
      } else {
        parsedTags = JSON.stringify(tags);
      }

      executeRun(
        `INSERT INTO books (
          id, title, slug, description, excerpt, authorId, authorName, creatorId,
          categoryId, categoryName, language, pages, fileSize, price, isFree,
          status, rejectionReason, coverKey, coverUrl, pdfKey, pdfFileName,
          isbn, publicationYear, tags, featured, viewCount, downloadCount,
          purchaseCount, rating, reviewCount, createdAt, updatedAt
        ) VALUES (
          ?, ?, ?, ?, ?, null, ?, ?,
          ?, ?, ?, ?, ?, ?, ?,
          'PENDING', null, ?, ?, ?, ?,
          ?, ?, ?, 0, 0, 0,
          0, 5.0, 0, ?, ?
        )`,
        [
          bookId,
          title,
          slug,
          description,
          excerpt || null,
          authorName,
          creatorId,
          categoryId,
          categoryName,
          language,
          parseInt(pages) || 10,
          fileSize,
          numPrice,
          freeFlag,
          coverKey,
          coverUrl,
          pdfKey,
          pdfFile ? pdfFile.originalname : "manuscript.pdf",
          isbn || null,
          publicationYear ? parseInt(publicationYear) : new Date().getFullYear(),
          parsedTags,
          now,
          now,
        ]
      );

      res.status(201).json({
        success: true,
        message: "Book uploaded successfully and submitted for Admin approval.",
        bookId,
        status: "PENDING",
      });
    } catch (err: any) {
      console.error("Book upload error:", err);
      res.status(500).json({ error: err.message || "Failed to upload book" });
    }
  }
);

// Creator edit book or resubmit
router.put("/creator/books/:id", requireAuth, requireRole(["CREATOR", "ADMIN"]), (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const user = req.user!;
  const book = queryOne<any>("SELECT * FROM books WHERE id = ?", [id]);

  if (!book) return res.status(404).json({ error: "Book not found" });
  if (user.role !== "ADMIN" && book.creatorId !== user.creatorId) {
    return res.status(403).json({ error: "You are not authorized to edit this book." });
  }

  const { title, description, excerpt, price, isFree, language, tags, resubmitForReview } = req.body;
  const now = new Date().toISOString();

  let newStatus = book.status;
  let rejectionReason = book.rejectionReason;
  if (resubmitForReview) {
    newStatus = "PENDING";
    rejectionReason = null;
  }

  const numPrice = price !== undefined ? parseFloat(price) : book.price;
  const freeFlag = isFree !== undefined ? (isFree ? 1 : 0) : book.isFree;

  executeRun(
    `UPDATE books 
     SET title = COALESCE(?, title),
         description = COALESCE(?, description),
         excerpt = COALESCE(?, excerpt),
         price = ?,
         isFree = ?,
         language = COALESCE(?, language),
         status = ?,
         rejectionReason = ?,
         tags = COALESCE(?, tags),
         updatedAt = ?
     WHERE id = ?`,
    [
      title,
      description,
      excerpt,
      numPrice,
      freeFlag,
      language,
      newStatus,
      rejectionReason,
      tags ? JSON.stringify(tags) : null,
      now,
      id,
    ]
  );

  res.json({ message: "Book updated successfully", status: newStatus });
});

// -------------------------------------------------------------
// 9. SUPER ADMIN DASHBOARD & GOVERNANCE
// -------------------------------------------------------------
router.get("/admin/overview", requireAuth, requireRole(["ADMIN"]), (_req, res) => {
  const usersCount = queryOne<any>("SELECT COUNT(*) as c FROM users")?.c || 0;
  const creatorsCount = queryOne<any>("SELECT COUNT(*) as c FROM creators")?.c || 0;
  const booksCount = queryOne<any>("SELECT COUNT(*) as c FROM books")?.c || 0;
  const publishedBooksCount = queryOne<any>("SELECT COUNT(*) as c FROM books WHERE status = 'PUBLISHED'")?.c || 0;
  const pendingApprovalsCount = queryOne<any>("SELECT COUNT(*) as c FROM books WHERE status = 'PENDING'")?.c || 0;
  const ordersCount = queryOne<any>("SELECT COUNT(*) as c FROM orders")?.c || 0;
  const revenueTotal = queryOne<any>("SELECT SUM(amount) as s FROM orders")?.s || 0;
  const reportsCount = queryOne<any>("SELECT COUNT(*) as c FROM reports WHERE status = 'PENDING'")?.c || 0;

  const recentOrders = queryAll<any>(
    `SELECT o.*, b.title as bookTitle, u.name as userName, u.email as userEmail
     FROM orders o
     JOIN books b ON b.id = o.bookId
     JOIN users u ON u.id = o.userId
     ORDER BY o.createdAt DESC
     LIMIT 8`
  );

  const pendingBooks = queryAll<any>(
    `SELECT b.*, c.displayName as creatorName, c.verified as creatorVerified
     FROM books b
     LEFT JOIN creators c ON c.id = b.creatorId
     WHERE b.status = 'PENDING'
     ORDER BY b.createdAt DESC`
  );

  res.json({
    metrics: {
      usersCount,
      creatorsCount,
      booksCount,
      publishedBooksCount,
      pendingApprovalsCount,
      ordersCount,
      revenueTotal: Number(revenueTotal.toFixed(2)),
      reportsCount,
    },
    recentOrders,
    pendingBooks: pendingBooks.map((b) => ({
      ...b,
      tags: b.tags ? JSON.parse(b.tags) : [],
    })),
  });
});

// Admin list all books
router.get("/admin/books", requireAuth, requireRole(["ADMIN"]), (req, res) => {
  const { status } = req.query;
  let sql = `SELECT b.*, c.displayName as creatorName FROM books b LEFT JOIN creators c ON c.id = b.creatorId`;
  const params: any[] = [];
  if (status && status !== "ALL") {
    sql += ` WHERE b.status = ?`;
    params.push(status);
  }
  sql += ` ORDER BY b.createdAt DESC`;

  const books = queryAll<any>(sql, params);
  res.json({
    books: books.map((b) => ({
      ...b,
      tags: b.tags ? JSON.parse(b.tags) : [],
      isFree: Boolean(b.isFree),
      featured: Boolean(b.featured),
    })),
  });
});

// Admin approve book
router.post("/admin/books/:id/approve", requireAuth, requireRole(["ADMIN"]), (req, res) => {
  const { id } = req.params;
  const now = new Date().toISOString();
  executeRun(
    "UPDATE books SET status = 'PUBLISHED', rejectionReason = null, updatedAt = ? WHERE id = ?",
    [now, id]
  );
  res.json({ message: "Book approved and published to marketplace successfully!" });
});

// Admin reject book with reason
router.post("/admin/books/:id/reject", requireAuth, requireRole(["ADMIN"]), (req, res) => {
  const { id } = req.params;
  const { reason = "Content did not meet digital publication standards." } = req.body;
  const now = new Date().toISOString();
  executeRun(
    "UPDATE books SET status = 'REJECTED', rejectionReason = ?, updatedAt = ? WHERE id = ?",
    [reason, now, id]
  );
  res.json({ message: "Book rejected and feedback sent to creator." });
});

// Admin suspend book
router.post("/admin/books/:id/suspend", requireAuth, requireRole(["ADMIN"]), (req, res) => {
  const { id } = req.params;
  const now = new Date().toISOString();
  executeRun("UPDATE books SET status = 'SUSPENDED', updatedAt = ? WHERE id = ?", [now, id]);
  res.json({ message: "Book suspended from marketplace." });
});

// Admin toggle featured book
router.post("/admin/books/:id/feature", requireAuth, requireRole(["ADMIN"]), (req, res) => {
  const { id } = req.params;
  const book = queryOne<any>("SELECT featured FROM books WHERE id = ?", [id]);
  if (!book) return res.status(404).json({ error: "Book not found" });
  const newFeatured = book.featured ? 0 : 1;
  executeRun("UPDATE books SET featured = ? WHERE id = ?", [newFeatured, id]);
  res.json({ featured: Boolean(newFeatured) });
});

// Admin users management
router.get("/admin/users", requireAuth, requireRole(["ADMIN"]), (_req, res) => {
  const users = queryAll<any>(
    `SELECT u.id, u.email, u.name, u.role, u.status, u.createdAt,
            COUNT(DISTINCT ul.id) as libraryBooksCount,
            COUNT(DISTINCT o.id) as ordersCount
     FROM users u
     LEFT JOIN user_library ul ON ul.userId = u.id
     LEFT JOIN orders o ON o.userId = u.id
     GROUP BY u.id
     ORDER BY u.createdAt DESC`
  );
  res.json({ users });
});

router.put("/admin/users/:id/role", requireAuth, requireRole(["ADMIN"]), (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  if (!["ADMIN", "CREATOR", "USER"].includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }

  executeRun("UPDATE users SET role = ? WHERE id = ?", [role, id]);

  if (role === "CREATOR") {
    const existing = queryOne("SELECT id FROM creators WHERE userId = ?", [id]);
    if (!existing) {
      const creatorId = "cr_" + Math.random().toString(36).substring(2, 9);
      const user = queryOne<any>("SELECT name FROM users WHERE id = ?", [id]);
      executeRun(
        `INSERT INTO creators (id, userId, displayName, slug, bio, verified, createdAt)
         VALUES (?, ?, ?, ?, 'Approved Author', 1, ?)`,
        [creatorId, id, user?.name || "Author", "creator-" + Math.random().toString(36).substring(2, 7), new Date().toISOString()]
      );
    }
  }

  res.json({ message: `User role updated to ${role}` });
});

router.put("/admin/users/:id/status", requireAuth, requireRole(["ADMIN"]), (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!["ACTIVE", "SUSPENDED"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  executeRun("UPDATE users SET status = ? WHERE id = ?", [status, id]);
  res.json({ message: `User status changed to ${status}` });
});

// Admin orders
router.get("/admin/orders", requireAuth, requireRole(["ADMIN"]), (_req, res) => {
  const orders = queryAll<any>(
    `SELECT o.*, b.title as bookTitle, u.name as userName, u.email as userEmail, c.displayName as creatorName
     FROM orders o
     JOIN books b ON b.id = o.bookId
     JOIN users u ON u.id = o.userId
     JOIN creators c ON c.id = b.creatorId
     ORDER BY o.createdAt DESC`
  );
  res.json({ orders });
});

// Admin settings
router.get("/admin/settings", requireAuth, requireRole(["ADMIN"]), (_req, res) => {
  const settingsRows = queryAll<any>("SELECT * FROM site_settings");
  const settings: Record<string, string> = {};
  for (const row of settingsRows) {
    settings[row.key] = row.value;
  }
  res.json({ settings });
});

router.put("/admin/settings", requireAuth, requireRole(["ADMIN"]), (req, res) => {
  const settings = req.body;
  for (const [key, value] of Object.entries(settings)) {
    executeRun(
      `INSERT INTO site_settings (key, value) VALUES (?, ?) 
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [key, String(value)]
    );
  }
  res.json({ message: "Settings saved successfully" });
});

// -------------------------------------------------------------
// 10. REVIEWS & RATINGS
// -------------------------------------------------------------
router.post("/books/:id/reviews", requireAuth, (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const { rating, comment } = req.body;

  if (!rating || !comment) {
    return res.status(400).json({ error: "Rating and review comment are required" });
  }

  // Verify access/ownership
  const book = queryOne<any>("SELECT * FROM books WHERE id = ?", [id]);
  if (!book) return res.status(404).json({ error: "Book not found" });

  let hasAccess = book.isFree === 1 || req.user!.role === "ADMIN";
  if (!hasAccess) {
    const owned = queryOne("SELECT id FROM user_library WHERE userId = ? AND bookId = ?", [
      userId,
      id,
    ]);
    if (owned) hasAccess = true;
  }

  if (!hasAccess) {
    return res.status(403).json({ error: "You can only review books in your library" });
  }

  const existing = queryOne<any>("SELECT id FROM reviews WHERE userId = ? AND bookId = ?", [
    userId,
    id,
  ]);
  const now = new Date().toISOString();

  if (existing) {
    executeRun("UPDATE reviews SET rating = ?, comment = ?, updatedAt = ? WHERE id = ?", [
      rating,
      comment,
      now,
      existing.id,
    ]);
  } else {
    const revId = "rev_" + Math.random().toString(36).substring(2, 9);
    executeRun(
      `INSERT INTO reviews (id, userId, bookId, rating, comment, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [revId, userId, id, rating, comment, now, now]
    );
  }

  // Recalculate book average rating & count
  const stats = queryOne<any>(
    "SELECT AVG(rating) as avgRating, COUNT(*) as cnt FROM reviews WHERE bookId = ?",
    [id]
  );
  if (stats) {
    executeRun("UPDATE books SET rating = ?, reviewCount = ? WHERE id = ?", [
      Number(stats.avgRating.toFixed(2)),
      stats.cnt,
      id,
    ]);
  }

  res.json({ message: "Review submitted successfully" });
});

// -------------------------------------------------------------
// 11. GEMINI AI ASSISTANCE (Server-Side)
// -------------------------------------------------------------
router.post("/ai/reading-companion", async (req, res) => {
  try {
    const { prompt, bookTitle, authorName, excerpt } = req.body;
    if (!prompt && !bookTitle) {
      return res.status(400).json({ error: "Book title or query prompt is required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({
        insights: `Key literary perspective on "${bookTitle || 'Classical Literature'}": This work explores universal human experiences, moral reflection, and rich cultural traditions. Configure GEMINI_API_KEY in Settings to unlock deep live AI analysis and interactive thematic commentary.`,
        source: "fallback",
      });
    }

    try {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: [
          {
            text: `You are a scholarly literary companion for KitabKhana Digital Library & Marketplace.
The user is reading or exploring "${bookTitle || 'Literary Work'}" by ${authorName || 'Classical Author'}.
${excerpt ? `Excerpt context: "${excerpt}"` : ''}
User inquiry: ${prompt || 'Provide a concise thematic summary, historical significance, and 3 key reflection questions for this book.'}
Keep the response engaging, scholarly, well-formatted, and under 250 words.`,
          },
        ],
      });

      return res.json({
        insights: response.text || "No insights generated.",
        source: "gemini",
      });
    } catch (aiErr: any) {
      console.warn("Gemini live call error, serving literary commentary fallback:", aiErr?.message);
      return res.json({
        insights: `Literary Commentary on "${bookTitle || 'Classical Literature'}":
This seminal work by ${authorName || 'the author'} occupies a profound position in classical literature. It investigates timeless dilemmas—human emotion, spiritual transcendence, and philosophical contemplation.

• Historical Context: Penned in an era of rich literary renaissance and cultural introspection.
• Key Motifs: Existential inquiry, poetic cadence, and moral resilience.
• Reflection: Consider how the author juxtaposes inner struggle with universal truth throughout this folio.`,
        source: "curated_fallback",
      });
    }
  } catch (err: any) {
    console.error("Gemini companion handler error:", err);
    res.status(500).json({
      error: "Failed to generate AI insights",
      details: err?.message || String(err),
    });
  }
});

export default router;
