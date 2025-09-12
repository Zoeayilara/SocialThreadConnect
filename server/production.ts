import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(process.cwd(), "dist", "public");

  if (!fs.existsSync(distPath)) {
    // Fallback to client/dist for Railway
    const fallbackPath = path.resolve(process.cwd(), "client", "dist");
    if (fs.existsSync(fallbackPath)) {
      app.use(express.static(fallbackPath));
      app.get("*", (req, res) => {
        if (!req.path.startsWith('/api/')) {
          res.sendFile(path.resolve(fallbackPath, "index.html"));
        } else {
          res.status(404).json({ message: "API endpoint not found" });
        }
      });
      return;
    }
    
    throw new Error(
      `Could not find build directory: ${distPath} or ${fallbackPath}`,
    );
  }

  app.use(express.static(distPath));
  
  // Only serve index.html for non-API routes
  app.get("*", (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.resolve(distPath, "index.html"));
    } else {
      res.status(404).json({ message: "API endpoint not found" });
    }
  });
}
