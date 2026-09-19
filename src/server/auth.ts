import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { queryOne } from "./db.ts";

const JWT_SECRET = process.env.JWT_SECRET || "kitabkhana_super_secret_jwt_key_2026";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "CREATOR" | "USER";
  avatarUrl?: string;
  status: "ACTIVE" | "SUSPENDED";
  creatorId?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export function generateToken(user: { id: string; email: string; role: string }): string {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, {
    expiresIn: "7d",
  });
}

export function verifyToken(token: string): { id: string; email: string; role: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string };
  } catch (err) {
    return null;
  }
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.split(" ")[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    return next();
  }

  const user = queryOne<any>(
    "SELECT id, email, name, role, avatarUrl, status FROM users WHERE id = ?",
    [decoded.id]
  );

  if (user && user.status === "ACTIVE") {
    let creatorId: string | undefined = undefined;
    if (user.role === "CREATOR" || user.role === "ADMIN") {
      const creator = queryOne<any>("SELECT id FROM creators WHERE userId = ?", [user.id]);
      if (creator) {
        creatorId = creator.id;
      }
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl,
      status: user.status,
      creatorId,
    };
  }

  next();
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

export function requireRole(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied. Insufficient permissions." });
    }
    next();
  };
}
