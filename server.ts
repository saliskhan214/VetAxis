import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Crucial: Use express.json() but preserve raw body for webhook verification if needed
  app.use(express.json({
    verify: (req: any, res, buf) => {
      req.rawBody = buf;
    }
  }));

  // CORS headers
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // ─────────────────────────────────────────────────────────────────
  // PAYMENT API ENDPOINTS
  // ─────────────────────────────────────────────────────────────────

  // Healthcheck
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", mode: "full-stack" });
  });

  // ─────────────────────────────────────────────────────────────────
  // VITE DEVELOPMENT MIDDLEWARE OR STATIC PRODUCTION ASSETS
  // ─────────────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[VetAxis Backend] Full-stack Server listening on http://localhost:${PORT}`);
  });
}

startServer();
