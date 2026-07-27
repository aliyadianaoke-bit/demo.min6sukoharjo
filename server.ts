import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Serve static assets or API endpoints if any are needed
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API route for exporting JSON database
  app.get("/api/export/json", (req, res) => {
    const filePath = path.resolve(process.cwd(), "exported_db.json");
    if (fs.existsSync(filePath)) {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", 'attachment; filename="exported_db.json"');
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.status(404).json({ error: "Export file not found" });
    }
  });

  // API route for exporting Supabase SQL script
  app.get("/api/export/sql", (req, res) => {
    const filePath = path.resolve(process.cwd(), "supabase_migration.sql");
    if (fs.existsSync(filePath)) {
      res.setHeader("Content-Type", "text/plain");
      res.setHeader("Content-Disposition", 'attachment; filename="supabase_migration.sql"');
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.status(404).json({ error: "SQL Export file not found" });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Catch-all route to serve the SPA index.html
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
