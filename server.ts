import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { getDb } from "./src/server/db.ts";
import { authMiddleware } from "./src/server/auth.ts";
import apiRoutes from "./src/server/routes.ts";

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const app = express();

  // Instant Health Check endpoint for Cloud Run and load balancers
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      app: "KitabKhana Digital Library & Marketplace",
      time: new Date().toISOString(),
    });
  });

  // Body parsers
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Global Auth middleware (populates req.user if Bearer token present)
  app.use(authMiddleware as any);

  // Mount API routes
  app.use("/api", apiRoutes);

  // Vite middleware for dev mode vs static in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`KitabKhana server running on http://0.0.0.0:${PORT}`);
  });

  // Initialize SQLite database and seed data asynchronously
  getDb().then(() => {
    console.log("Database initialized and ready.");
  }).catch((dbErr) => {
    console.error("Database initialization warning:", dbErr);
  });

  // Handle graceful shutdown for container platforms
  process.on("SIGTERM", () => {
    console.log("SIGTERM signal received: closing HTTP server");
    server.close(() => {
      console.log("HTTP server closed");
      process.exit(0);
    });
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
