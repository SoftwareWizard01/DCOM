/**
 * ================================================================
 *  server.js — Render-safe entry point
 * ================================================================
 */

const express = require("express");

// --- Create app immediately (no external dependency yet)
const app = express();

// --- Basic middleware (safe defaults)
app.use(express.json());

// --- Health check (Render can hit this)
app.get("/", (req, res) => {
  res.status(200).send("Server is live");
});

// --- Try loading your actual app routes (non-fatal if broken)
try {
  const appRoutes = require("./app");
  app.use("/", appRoutes);
  console.log("✅ App routes loaded");
} catch (err) {
  console.error("⚠️ Failed to load ./app");
  console.error(err.message);
}

// --- Try connecting DB (non-blocking)
(async () => {
  try {
    const connectDB = require("../db/connect.js");
    await connectDB();
    console.log("📦 Database connected");
  } catch (err) {
    console.error("⚠️ Database connection failed");
    console.error(err.message);
  }
})();

// --- PORT (Render injects this automatically)
const PORT = process.env.PORT || 10000;

// --- ALWAYS start server (critical)
app.listen(PORT, "0.0.0.0", () => {
  console.log("─────────────────────────────────────────");
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/`);
  console.log("─────────────────────────────────────────");
});
