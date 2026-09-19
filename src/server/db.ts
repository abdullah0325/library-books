import initSqlJs, { Database } from "sql.js";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { uploadToR2, isR2Configured } from "./r2.ts";
import { generateBookPdfBuffer } from "./pdfGenerator.ts";

function getStoragePaths(): { dataDir: string; dbFile: string } {
  let dataDir = path.join(process.cwd(), "data");
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    // Test write
    const testFile = path.join(dataDir, ".write_test");
    fs.writeFileSync(testFile, "ok");
    fs.unlinkSync(testFile);
  } catch {
    dataDir = path.join("/tmp", "kitabkhana_data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }
  return {
    dataDir,
    dbFile: path.join(dataDir, "library.sqlite"),
  };
}

let dbInstance: Database | null = null;
let dbInitPromise: Promise<Database> | null = null;

export async function getDb(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  if (dbInitPromise) {
    return dbInitPromise;
  }

  dbInitPromise = (async () => {
    const { dbFile } = getStoragePaths();

    const SQL = await initSqlJs({
      locateFile: (file) => {
        // Look in node_modules or local dist or standard require resolution
        try {
          return require.resolve(`sql.js/dist/${file}`);
        } catch {
          return path.join(process.cwd(), "node_modules", "sql.js", "dist", file);
        }
      },
    });

    if (fs.existsSync(dbFile)) {
      try {
        const fileBuffer = fs.readFileSync(dbFile);
        dbInstance = new SQL.Database(fileBuffer);
      } catch {
        dbInstance = new SQL.Database();
      }
    } else {
      dbInstance = new SQL.Database();
    }

    initSchema(dbInstance);
    await seedInitialData(dbInstance);
    persistDb();

    return dbInstance;
  })();

  return dbInitPromise;
}

export function persistDb() {
  if (!dbInstance) return;
  try {
    const { dbFile } = getStoragePaths();
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbFile, buffer);
  } catch (err) {
    console.warn("Notice: Could not persist DB to disk, kept in-memory:", err);
  }
}

function initSchema(db: Database) {
  db.run(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'USER', -- 'ADMIN', 'CREATOR', 'USER'
      avatarUrl TEXT,
      bio TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'SUSPENDED'
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS creators (
      id TEXT PRIMARY KEY,
      userId TEXT UNIQUE NOT NULL,
      displayName TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      bio TEXT,
      website TEXT,
      avatarUrl TEXT,
      verified INTEGER NOT NULL DEFAULT 0,
      totalSales INTEGER NOT NULL DEFAULT 0,
      totalEarnings REAL NOT NULL DEFAULT 0.0,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      icon TEXT,
      bookCount INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS authors (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      bio TEXT,
      photoUrl TEXT,
      bornYear INTEGER,
      nationality TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT NOT NULL,
      excerpt TEXT,
      authorId TEXT,
      authorName TEXT NOT NULL,
      creatorId TEXT NOT NULL,
      categoryId TEXT NOT NULL,
      categoryName TEXT NOT NULL,
      language TEXT NOT NULL DEFAULT 'English',
      pages INTEGER NOT NULL DEFAULT 1,
      fileSize TEXT NOT NULL DEFAULT '1.2 MB',
      price REAL NOT NULL DEFAULT 0.0,
      isFree INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'PENDING', -- 'DRAFT', 'PENDING', 'APPROVED', 'PUBLISHED', 'REJECTED', 'SUSPENDED'
      rejectionReason TEXT,
      coverKey TEXT,
      coverUrl TEXT NOT NULL,
      pdfKey TEXT NOT NULL,
      pdfFileName TEXT NOT NULL,
      isbn TEXT,
      publicationYear INTEGER,
      tags TEXT, -- JSON array of string tags
      featured INTEGER NOT NULL DEFAULT 0,
      viewCount INTEGER NOT NULL DEFAULT 0,
      downloadCount INTEGER NOT NULL DEFAULT 0,
      purchaseCount INTEGER NOT NULL DEFAULT 0,
      rating REAL NOT NULL DEFAULT 5.0,
      reviewCount INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (creatorId) REFERENCES creators(id),
      FOREIGN KEY (categoryId) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      orderNumber TEXT UNIQUE NOT NULL,
      userId TEXT NOT NULL,
      bookId TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      status TEXT NOT NULL DEFAULT 'COMPLETED', -- 'COMPLETED', 'PENDING', 'REFUNDED'
      paymentMethod TEXT NOT NULL DEFAULT 'Card',
      createdAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (bookId) REFERENCES books(id)
    );

    CREATE TABLE IF NOT EXISTS user_library (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      bookId TEXT NOT NULL,
      acquiredAt TEXT NOT NULL,
      lastReadAt TEXT,
      currentPage INTEGER NOT NULL DEFAULT 1,
      totalPages INTEGER NOT NULL DEFAULT 1,
      progressPercent INTEGER NOT NULL DEFAULT 0,
      isFavorite INTEGER NOT NULL DEFAULT 0,
      accessType TEXT NOT NULL DEFAULT 'PURCHASED', -- 'PURCHASED', 'FREE', 'GIFT'
      UNIQUE(userId, bookId),
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (bookId) REFERENCES books(id)
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      bookId TEXT NOT NULL,
      rating INTEGER NOT NULL,
      comment TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      UNIQUE(userId, bookId),
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (bookId) REFERENCES books(id)
    );

    CREATE TABLE IF NOT EXISTS reading_history (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      bookId TEXT NOT NULL,
      pageNumber INTEGER NOT NULL,
      durationSeconds INTEGER NOT NULL DEFAULT 60,
      readAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (bookId) REFERENCES books(id)
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      reporterUserId TEXT NOT NULL,
      bookId TEXT NOT NULL,
      reason TEXT NOT NULL,
      details TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'RESOLVED', 'DISMISSED'
      createdAt TEXT NOT NULL,
      FOREIGN KEY (reporterUserId) REFERENCES users(id),
      FOREIGN KEY (bookId) REFERENCES books(id)
    );

    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_books_status ON books(status);
    CREATE INDEX IF NOT EXISTS idx_books_category ON books(categoryId);
    CREATE INDEX IF NOT EXISTS idx_books_creator ON books(creatorId);
    CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(userId);
    CREATE INDEX IF NOT EXISTS idx_user_library ON user_library(userId);
  `);
}

async function seedInitialData(db: Database) {
  // Check if users exist
  const res = db.exec("SELECT COUNT(*) as count FROM users;");
  const count = res[0]?.values[0]?.[0] as number;
  if (count > 0) return;

  console.log("Seeding initial database with Admin, Creators, and Curated Books...");

  const now = new Date().toISOString();
  const passwordHash = await bcrypt.hash("password123", 10);

  // 1. Super Admin
  const adminId = "user_admin_01";
  db.run(
    `INSERT INTO users (id, email, passwordHash, name, role, avatarUrl, bio, status, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      adminId,
      "admin@kitabkhana.org",
      passwordHash,
      "Maulana Azam (Super Admin)",
      "ADMIN",
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      "Head of Global Preservation & Marketplace Governance at KitabKhana.",
      "ACTIVE",
      now,
      now,
    ]
  );

  // 2. Verified Creators
  const creatorUserId1 = "user_creator_01";
  const creatorId1 = "creator_rekhta_heritage";
  db.run(
    `INSERT INTO users (id, email, passwordHash, name, role, avatarUrl, bio, status, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      creatorUserId1,
      "heritage@kitabkhana.org",
      passwordHash,
      "Heritage Text Archive",
      "CREATOR",
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      "Dedicated to the preservation and digital typography of classical eastern literature, Persian manuscripts, and Urdu poetry.",
      "ACTIVE",
      now,
      now,
    ]
  );
  db.run(
    `INSERT INTO creators (id, userId, displayName, slug, bio, website, avatarUrl, verified, totalSales, totalEarnings, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, 142, 640.50, ?)`,
    [
      creatorId1,
      creatorUserId1,
      "Heritage Text Archive",
      "heritage-text-archive",
      "Preserving world manuscripts and poetry in high-resolution PDF editions.",
      "https://kitabkhana.org/c/heritage",
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      now,
    ]
  );

  const creatorUserId2 = "user_creator_02";
  const creatorId2 = "creator_oriental_press";
  db.run(
    `INSERT INTO users (id, email, passwordHash, name, role, avatarUrl, bio, status, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      creatorUserId2,
      "press@orientalliterary.com",
      passwordHash,
      "Oriental & Classical Press",
      "CREATOR",
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
      "Independent publisher specializing in philosophy, comparative poetry, and critical academic treatises.",
      "ACTIVE",
      now,
      now,
    ]
  );
  db.run(
    `INSERT INTO creators (id, userId, displayName, slug, bio, website, avatarUrl, verified, totalSales, totalEarnings, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, 89, 412.00, ?)`,
    [
      creatorId2,
      creatorUserId2,
      "Oriental & Classical Press",
      "oriental-classical-press",
      "Critical editions of timeless world literature and poetic anthologies.",
      "https://orientalliterary.com",
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
      now,
    ]
  );

  // 3. Regular Reader User
  const readerId = "user_reader_01";
  db.run(
    `INSERT INTO users (id, email, passwordHash, name, role, avatarUrl, bio, status, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      readerId,
      "reader@kitabkhana.org",
      passwordHash,
      "Fatima Al-Zahra",
      "USER",
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
      "Avid bibliophile, student of classical metaphysics and Urdu poetry.",
      "ACTIVE",
      now,
      now,
    ]
  );

  // 4. Categories
  const categories = [
    {
      id: "cat_poetry",
      name: "Poetry & Ghazals",
      slug: "poetry-ghazals",
      description: "Classical and modern diwans, rubaiyat, and poetic anthologies.",
      icon: "Feather",
    },
    {
      id: "cat_philosophy",
      name: "Philosophy & Sufism",
      slug: "philosophy-sufism",
      description: "Metaphysical dialogues, mystic treatises, and existential ethics.",
      icon: "Compass",
    },
    {
      id: "cat_literature",
      name: "World Literature & Fiction",
      slug: "world-literature",
      description: "Timeless novels, prose masterpieces, and international translations.",
      icon: "BookOpen",
    },
    {
      id: "cat_history",
      name: "History & Heritage",
      slug: "history-heritage",
      description: "Chronicles of empires, archaeological records, and social historiographies.",
      icon: "Landmark",
    },
    {
      id: "cat_manuscripts",
      name: "Rare Manuscripts & Arts",
      slug: "rare-manuscripts",
      description: "Archival scans, calligraphic treatises, and illuminated folios.",
      icon: "Scroll",
    },
    {
      id: "cat_science",
      name: "Science & Discovery",
      slug: "science-discovery",
      description: "Foundational treatises on astronomy, medicine, and mathematics.",
      icon: "Sparkles",
    },
  ];

  for (const cat of categories) {
    db.run(
      `INSERT INTO categories (id, name, slug, description, icon, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
      [cat.id, cat.name, cat.slug, cat.description, cat.icon, now]
    );
  }

  // 5. Authors
  const authors = [
    {
      id: "auth_ghalib",
      name: "Mirza Asadullah Khan Ghalib",
      slug: "mirza-ghalib",
      bio: "The preeminent Urdu and Persian poet of the late Mughal era, famed for philosophical wit and deep introspection.",
      photoUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=200&auto=format&fit=crop&q=80",
      bornYear: 1797,
      nationality: "Mughal Empire / India",
    },
    {
      id: "auth_gibran",
      name: "Kahlil Gibran",
      slug: "kahlil-gibran",
      bio: "Lebanese-American poet, philosopher, and visual artist, author of The Prophet.",
      photoUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80",
      bornYear: 1883,
      nationality: "Lebanon",
    },
    {
      id: "auth_rumi",
      name: "Jalal al-Din Muhammad Rumi",
      slug: "jalal-al-din-rumi",
      bio: "13th-century Persian poet, Islamic jurist, theologian, and Sufi mystic whose verses transcend eras.",
      photoUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80",
      bornYear: 1207,
      nationality: "Balkh / Konya",
    },
    {
      id: "auth_tagore",
      name: "Rabindranath Tagore",
      slug: "rabindranath-tagore",
      bio: "Polymath, poet, and artist who reshaped Bengali literature and music; Nobel laureate in Literature (1913).",
      photoUrl: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80",
      bornYear: 1861,
      nationality: "India / Bengal",
    },
    {
      id: "auth_iqbal",
      name: "Allama Muhammad Iqbal",
      slug: "allama-iqbal",
      bio: "Philosopher, poet, and barrister known as 'Mufakkir-e-Pakistan' and 'Shair-e-Mashriq' (Poet of the East).",
      photoUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80",
      bornYear: 1877,
      nationality: "Punjab / Sialkot",
    },
    {
      id: "auth_tolstoy",
      name: "Leo Tolstoy",
      slug: "leo-tolstoy",
      bio: "Russian master of realistic fiction and moral philosophy, author of War and Peace and Anna Karenina.",
      photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80",
      bornYear: 1828,
      nationality: "Russia",
    },
  ];

  for (const auth of authors) {
    db.run(
      `INSERT INTO authors (id, name, slug, bio, photoUrl, bornYear, nationality, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [auth.id, auth.name, auth.slug, auth.bio, auth.photoUrl, auth.bornYear, auth.nationality, now]
    );
  }

  // 6. Curated Initial Books
  const booksData = [
    {
      id: "book_diwan_ghalib",
      title: "Diwan-e-Ghalib: The Complete Centennial Edition",
      slug: "diwan-e-ghalib-complete-edition",
      description: "The definitive collector's edition of Mirza Asadullah Khan Ghalib's Urdu ghazals, accompanied by classical commentary, annotations on delicate idioms, and critical apparatus.",
      excerpt: "Dil-e-nadaan tujhe hua kya hai? Aakhir is dard ki dawa kya hai...",
      authorId: "auth_ghalib",
      authorName: "Mirza Asadullah Khan Ghalib",
      creatorId: creatorId1,
      categoryId: "cat_poetry",
      categoryName: "Poetry & Ghazals",
      language: "Urdu & English",
      pages: 148,
      fileSize: "3.8 MB",
      price: 0.0,
      isFree: 1,
      status: "PUBLISHED",
      coverUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80",
      pdfKey: "books/book_diwan_ghalib/manuscript.pdf",
      pdfFileName: "Diwan_e_Ghalib_Centennial.pdf",
      isbn: "978-0-19-567890-1",
      publicationYear: 1869,
      tags: JSON.stringify(["Urdu", "Classical Poetry", "Ghazal", "Rekhta Heritage", "Public Domain"]),
      featured: 1,
      rating: 4.95,
      reviewCount: 38,
      purchaseCount: 412,
    },
    {
      id: "book_the_prophet",
      title: "The Prophet: Illustrated Philosophical Edition",
      slug: "the-prophet-illustrated-edition",
      description: "Kahlil Gibran's timeless book of 28 poetic fables and philosophical essays covering love, marriage, children, giving, eating and drinking, work, joy and sorrow, houses, clothes, buying and selling, crime and punishment, laws, and freedom.",
      excerpt: "Your children are not your children. They are the sons and daughters of Life's longing for itself...",
      authorId: "auth_gibran",
      authorName: "Kahlil Gibran",
      creatorId: creatorId2,
      categoryId: "cat_philosophy",
      categoryName: "Philosophy & Sufism",
      language: "English",
      pages: 96,
      fileSize: "2.4 MB",
      price: 4.99,
      isFree: 0,
      status: "PUBLISHED",
      coverUrl: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop&q=80",
      pdfKey: "books/book_the_prophet/manuscript.pdf",
      pdfFileName: "The_Prophet_Illustrated.pdf",
      isbn: "978-0-394-40428-8",
      publicationYear: 1923,
      tags: JSON.stringify(["Philosophy", "Poetry", "Classics", "Spiritual", "Illustrated"]),
      featured: 1,
      rating: 4.92,
      reviewCount: 54,
      purchaseCount: 280,
    },
    {
      id: "book_masnavi_rumi",
      title: "The Masnavi: Book I & II (Spiritual Couplets)",
      slug: "the-masnavi-spiritual-couplets",
      description: "The epic Persian poem composed in six books by Jalal al-Din Muhammad Rumi, renowned as the 'Quran in Persian'. An ocean of allegories, mystical wisdom, and spiritual journeys.",
      excerpt: "Listen to the reed flute how it complains, telling a tale of separations...",
      authorId: "auth_rumi",
      authorName: "Jalal al-Din Muhammad Rumi",
      creatorId: creatorId1,
      categoryId: "cat_philosophy",
      categoryName: "Philosophy & Sufism",
      language: "Persian & English",
      pages: 210,
      fileSize: "5.1 MB",
      price: 7.50,
      isFree: 0,
      status: "PUBLISHED",
      coverUrl: "https://images.unsplash.com/photo-1463320726281-696a485928c7?w=600&auto=format&fit=crop&q=80",
      pdfKey: "books/book_masnavi_rumi/manuscript.pdf",
      pdfFileName: "Rumi_The_Masnavi_Book_1.pdf",
      isbn: "978-0-19-955231-3",
      publicationYear: 1260,
      tags: JSON.stringify(["Persian", "Sufism", "Rumi", "Mysticism", "Couplets"]),
      featured: 1,
      rating: 4.98,
      reviewCount: 62,
      purchaseCount: 345,
    },
    {
      id: "book_gitanjali_tagore",
      title: "Gitanjali (Song Offerings): Nobel Centenary Edition",
      slug: "gitanjali-song-offerings",
      description: "Rabindranath Tagore's Nobel-winning collection of 103 prose poems, celebrating divine presence, mystical nature, and the rhythm of the cosmos, introduced by W.B. Yeats.",
      excerpt: "Where the mind is without fear and the head is held high; where knowledge is free...",
      authorId: "auth_tagore",
      authorName: "Rabindranath Tagore",
      creatorId: creatorId1,
      categoryId: "cat_poetry",
      categoryName: "Poetry & Ghazals",
      language: "English & Bengali",
      pages: 82,
      fileSize: "1.9 MB",
      price: 0.0,
      isFree: 1,
      status: "PUBLISHED",
      coverUrl: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=600&auto=format&fit=crop&q=80",
      pdfKey: "books/book_gitanjali_tagore/manuscript.pdf",
      pdfFileName: "Tagore_Gitanjali_Centenary.pdf",
      isbn: "978-1-59420-112-7",
      publicationYear: 1912,
      tags: JSON.stringify(["Bengali", "Nobel Prize", "Poetry", "Gitanjali", "Free"]),
      featured: 1,
      rating: 4.88,
      reviewCount: 29,
      purchaseCount: 512,
    },
    {
      id: "book_bang_e_dara",
      title: "Bang-e-Dara (The Call of the Marching Bell)",
      slug: "bang-e-dara-call-of-the-marching-bell",
      description: "Allama Iqbal's celebrated first philosophical Urdu poetry book, featuring masterpieces such as Shikwa, Jawab-e-Shikwa, and Tarana-e-Milli with detailed vocabulary footnotes.",
      excerpt: "Khudi ko kar buland itna ke har taqdeer se pehle, Khuda bande se khud pooche bata teri raza kya hai...",
      authorId: "auth_iqbal",
      authorName: "Allama Muhammad Iqbal",
      creatorId: creatorId1,
      categoryId: "cat_poetry",
      categoryName: "Poetry & Ghazals",
      language: "Urdu",
      pages: 180,
      fileSize: "4.2 MB",
      price: 3.50,
      isFree: 0,
      status: "PUBLISHED",
      coverUrl: "https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=600&auto=format&fit=crop&q=80",
      pdfKey: "books/book_bang_e_dara/manuscript.pdf",
      pdfFileName: "Allama_Iqbal_BangeDara.pdf",
      isbn: "978-969-416-001-6",
      publicationYear: 1924,
      tags: JSON.stringify(["Urdu", "Iqbal", "Khudi", "Philosophy", "Shikwa"]),
      featured: 0,
      rating: 4.96,
      reviewCount: 44,
      purchaseCount: 198,
    },
    {
      id: "book_war_and_peace",
      title: "War and Peace: The Critical Volume I & II",
      slug: "war-and-peace-critical-volume",
      description: "Tolstoy's monumental epic intertwining the lives of the Bezukhov, Bolkonsky, and Rostov families amidst the Napoleonic invasion of Russia.",
      excerpt: "Well, Prince, so Genoa and Lucca are now just family estates of the Buonapartes...",
      authorId: "auth_tolstoy",
      authorName: "Leo Tolstoy",
      creatorId: creatorId2,
      categoryId: "cat_literature",
      categoryName: "World Literature & Fiction",
      language: "English",
      pages: 580,
      fileSize: "8.5 MB",
      price: 5.99,
      isFree: 0,
      status: "PUBLISHED",
      coverUrl: "https://images.unsplash.com/photo-1476275466078-4007374efbbe?w=600&auto=format&fit=crop&q=80",
      pdfKey: "books/book_war_and_peace/manuscript.pdf",
      pdfFileName: "Tolstoy_War_and_Peace_Vol1.pdf",
      isbn: "978-0-14-044793-4",
      publicationYear: 1869,
      tags: JSON.stringify(["Russian Literature", "Classic", "Epic Fiction", "History"]),
      featured: 0,
      rating: 4.85,
      reviewCount: 22,
      purchaseCount: 140,
    },
    {
      id: "book_mughal_calligraphy",
      title: "Archival Folios of Nasta'liq: Imperial Mughal Scripts",
      slug: "archival-folios-of-nastaliq",
      description: "A rare digitized compendium of royal farmans, illuminated gold-leaf borders, and calligraphic specimens from the court ateliers of Shah Jahan and Dara Shikoh.",
      excerpt: "Preserved from the high court manuscripts of the 17th-century Delhi and Lahore ateliers.",
      authorId: "auth_ghalib",
      authorName: "Imperial Court Ateliers",
      creatorId: creatorId1,
      categoryId: "cat_manuscripts",
      categoryName: "Rare Manuscripts & Arts",
      language: "Persian & Arabic",
      pages: 64,
      fileSize: "12.4 MB",
      price: 9.99,
      isFree: 0,
      status: "PUBLISHED",
      coverUrl: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&auto=format&fit=crop&q=80",
      pdfKey: "books/book_mughal_calligraphy/manuscript.pdf",
      pdfFileName: "Nastaliq_Imperial_Folios.pdf",
      isbn: "978-0-89236-840-2",
      publicationYear: 1650,
      tags: JSON.stringify(["Calligraphy", "Manuscript", "Art", "Nastaliq", "Mughal"]),
      featured: 1,
      rating: 4.97,
      reviewCount: 18,
      purchaseCount: 88,
    },
    {
      id: "book_pending_submission",
      title: "The Alchemy of Solitude: Modern Reflections",
      slug: "the-alchemy-of-solitude",
      description: "A newly submitted collection of introspective essays by an emerging independent writer exploring quietude in a connected world. Awaiting administrative review.",
      excerpt: "To sit alone with paper and ink is to invite the truest mirror into one's chamber...",
      authorId: "auth_gibran",
      authorName: "Siddharth Verma",
      creatorId: creatorId2,
      categoryId: "cat_philosophy",
      categoryName: "Philosophy & Sufism",
      language: "English",
      pages: 112,
      fileSize: "2.1 MB",
      price: 3.99,
      isFree: 0,
      status: "PENDING", // Visible to creator and admin for approval testing!
      rejectionReason: null,
      coverUrl: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&auto=format&fit=crop&q=80",
      pdfKey: "books/book_pending_submission/manuscript.pdf",
      pdfFileName: "Alchemy_Of_Solitude_Review.pdf",
      isbn: "978-1-23456-789-0",
      publicationYear: 2026,
      tags: JSON.stringify(["Essays", "Modern", "Mindfulness", "Pending Review"]),
      featured: 0,
      rating: 5.0,
      reviewCount: 0,
      purchaseCount: 0,
    }
  ];

  for (const b of booksData) {
    db.run(
      `INSERT INTO books (
        id, title, slug, description, excerpt, authorId, authorName, creatorId,
        categoryId, categoryName, language, pages, fileSize, price, isFree,
        status, rejectionReason, coverKey, coverUrl, pdfKey, pdfFileName,
        isbn, publicationYear, tags, featured, viewCount, downloadCount,
        purchaseCount, rating, reviewCount, createdAt, updatedAt
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?
      )`,
      [
        b.id,
        b.title,
        b.slug,
        b.description,
        b.excerpt,
        b.authorId,
        b.authorName,
        b.creatorId,
        b.categoryId,
        b.categoryName,
        b.language,
        b.pages,
        b.fileSize,
        b.price,
        b.isFree,
        b.status,
        b.rejectionReason || null,
        b.id + "/cover.jpg",
        b.coverUrl,
        b.pdfKey,
        b.pdfFileName,
        b.isbn,
        b.publicationYear,
        b.tags,
        b.featured,
        250,
        140,
        b.purchaseCount,
        b.rating,
        b.reviewCount,
        now,
        now,
      ]
    );

    // Save verified digital PDF to storage
    try {
      const pdfBuf = generateBookPdfBuffer(b.title, b.authorName, b.categoryName, 6);
      if (isR2Configured()) {
        uploadToR2({
          key: b.pdfKey,
          body: pdfBuf,
          contentType: "application/pdf",
          metadata: {
            bookId: b.id,
            title: b.title,
            author: b.authorName,
          },
        }).catch((e) => {
          console.warn(`Seed R2 upload notice for ${b.pdfKey}:`, e.message);
        });
      } else {
        // Save to local storage cache synchronously for instant offline reading
        uploadToR2({
          key: b.pdfKey,
          body: pdfBuf,
          contentType: "application/pdf",
        }).catch(() => {});
      }
    } catch (e) {
      console.warn("Failed generating PDF seed buffer:", e);
    }
  }

  // 7. Add Free Books & One Purchase to Reader's Library
  // Free book 1: Diwan-e-Ghalib
  db.run(
    `INSERT INTO user_library (id, userId, bookId, acquiredAt, lastReadAt, currentPage, totalPages, progressPercent, isFavorite, accessType)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "lib_entry_01",
      readerId,
      "book_diwan_ghalib",
      now,
      now,
      12,
      148,
      8,
      1,
      "FREE",
    ]
  );

  // Free book 2: Gitanjali
  db.run(
    `INSERT INTO user_library (id, userId, bookId, acquiredAt, lastReadAt, currentPage, totalPages, progressPercent, isFavorite, accessType)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "lib_entry_02",
      readerId,
      "book_gitanjali_tagore",
      now,
      now,
      5,
      82,
      6,
      0,
      "FREE",
    ]
  );

  // Purchased book: The Prophet
  const orderId = "ord_" + Math.random().toString(36).substring(2, 9);
  db.run(
    `INSERT INTO orders (id, orderNumber, userId, bookId, amount, currency, status, paymentMethod, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      orderId,
      "KB-" + Math.floor(100000 + Math.random() * 900000),
      readerId,
      "book_the_prophet",
      4.99,
      "USD",
      "COMPLETED",
      "Visa •••• 4242",
      now,
    ]
  );

  db.run(
    `INSERT INTO user_library (id, userId, bookId, acquiredAt, lastReadAt, currentPage, totalPages, progressPercent, isFavorite, accessType)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "lib_entry_03",
      readerId,
      "book_the_prophet",
      now,
      now,
      24,
      96,
      25,
      1,
      "PURCHASED",
    ]
  );

  // 8. Reviews
  db.run(
    `INSERT INTO reviews (id, userId, bookId, rating, comment, createdAt, updatedAt)
     VALUES (?, ?, ?, 5, ?, ?, ?)`,
    [
      "rev_01",
      readerId,
      "book_diwan_ghalib",
      "An extraordinary digital edition. The typography and footnotes make Ghalib's intricate metaphors immediately accessible.",
      now,
      now,
    ]
  );
  db.run(
    `INSERT INTO reviews (id, userId, bookId, rating, comment, createdAt, updatedAt)
     VALUES (?, ?, ?, 5, ?, ?, ?)`,
    [
      "rev_02",
      readerId,
      "book_the_prophet",
      "Magnificent philosophical prose. Having access to the PDF reader both in browser and as an authenticated download is wonderful.",
      now,
      now,
    ]
  );

  // 9. Site Settings
  db.run(
    `INSERT INTO site_settings (key, value) VALUES ('platformName', 'KitabKhana International Digital Library')`
  );
  db.run(
    `INSERT INTO site_settings (key, value) VALUES ('supportEmail', 'curator@kitabkhana.org')`
  );
  db.run(
    `INSERT INTO site_settings (key, value) VALUES ('marketplaceFeePercent', '12')`
  );
  db.run(
    `INSERT INTO site_settings (key, value) VALUES ('currency', 'USD')`
  );

  console.log("Database seeded successfully with users, creators, categories, authors, and books.");
}

// Query helper for SELECT returning array of objects
export function queryAll<T = any>(sql: string, params: any[] = []): T[] {
  if (!dbInstance) throw new Error("Database not initialized");
  const stmt = dbInstance.prepare(sql);
  stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return rows;
}

// Query helper for SELECT returning single object or null
export function queryOne<T = any>(sql: string, params: any[] = []): T | null {
  const rows = queryAll<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

// Mutation helper for INSERT, UPDATE, DELETE
export function executeRun(sql: string, params: any[] = []): void {
  if (!dbInstance) throw new Error("Database not initialized");
  dbInstance.run(sql, params);
  persistDb();
}
