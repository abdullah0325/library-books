export type UserRole = "ADMIN" | "CREATOR" | "USER";
export type BookStatus = "DRAFT" | "PENDING" | "APPROVED" | "PUBLISHED" | "REJECTED" | "SUSPENDED";
export type AccessType = "PURCHASED" | "FREE" | "GIFT";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  bio?: string;
  status: "ACTIVE" | "SUSPENDED";
  creatorId?: string;
}

export interface Creator {
  id: string;
  userId: string;
  displayName: string;
  slug: string;
  bio?: string;
  website?: string;
  avatarUrl?: string;
  verified: number | boolean;
  totalSales: number;
  totalEarnings: number;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  bookCount: number;
  publishedBooksCount?: number;
}

export interface Author {
  id: string;
  name: string;
  slug: string;
  bio?: string;
  photoUrl?: string;
  bornYear?: number;
  nationality?: string;
  booksCount?: number;
}

export interface Book {
  id: string;
  title: string;
  slug: string;
  description: string;
  excerpt?: string;
  authorId?: string;
  authorName: string;
  creatorId: string;
  creatorName?: string;
  creatorVerified?: number | boolean;
  creatorSlug?: string;
  categoryId: string;
  categoryName: string;
  language: string;
  pages: number;
  fileSize: string;
  price: number;
  isFree: boolean;
  status: BookStatus;
  rejectionReason?: string | null;
  coverKey?: string;
  coverUrl: string;
  pdfKey: string;
  pdfFileName: string;
  isbn?: string;
  publicationYear?: number;
  tags: string[];
  featured: boolean;
  viewCount: number;
  downloadCount: number;
  purchaseCount: number;
  rating: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface LibraryItem {
  id: string;
  userId: string;
  bookId: string;
  acquiredAt: string;
  lastReadAt?: string;
  currentPage: number;
  totalPages: number;
  progressPercent: number;
  isFavorite: boolean;
  accessType: AccessType;
  // joined fields
  title: string;
  slug: string;
  authorName: string;
  coverUrl: string;
  categoryName: string;
  pages: number;
  price: number;
  isFree: boolean;
  pdfFileName: string;
}

export interface Review {
  id: string;
  userId: string;
  bookId: string;
  rating: number;
  comment: string;
  userName: string;
  userAvatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  bookId: string;
  amount: number;
  currency: string;
  status: "COMPLETED" | "PENDING" | "REFUNDED";
  paymentMethod: string;
  createdAt: string;
  bookTitle?: string;
  userName?: string;
  userEmail?: string;
  creatorName?: string;
}

export interface AdminOverview {
  metrics: {
    usersCount: number;
    creatorsCount: number;
    booksCount: number;
    publishedBooksCount: number;
    pendingApprovalsCount: number;
    ordersCount: number;
    revenueTotal: number;
    reportsCount: number;
  };
  recentOrders: Order[];
  pendingBooks: Book[];
}

export interface R2Status {
  connected: boolean;
  bucket: string;
  endpoint: string;
  storageLayer: string;
  databaseLayer: string;
  error?: string;
}
