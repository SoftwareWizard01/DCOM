/**
 * ================================================================
 *  server.js — Production + Render Ready
 * ================================================================
 */

const express = require("express");
const path = require("path");

const app = express();

// ------------------- Middleware -------------------
app.use(express.json());

// ------------------- Static Frontend -------------------
// Adjust path carefully (case-sensitive on Render)
const frontendPath = path.join(__dirname, "../Frontend");

// Serve static files (CSS, JS, images)
app.use(express.static(frontendPath));

// ------------------- API Routes -------------------
try {
  const appRoutes = require("./app");
  app.use("/api", appRoutes);
  console.log("✅ API routes loaded");
} catch (err) {
  console.error("⚠️ Failed to load API routes:", err.message);
}

// ------------------- Database Connection -------------------
(async () => {
  try {
    const connectDB = require("../db/connect.js");
    await connectDB();
    console.log("📦 Database connected");
  } catch (err) {
    console.error("⚠️ Database connection failed:", err.message);
  }
})();

// ------------------- Frontend Fallback -------------------
// This ensures your website loads on any route
app.get("*", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// ------------------- Start Server -------------------
const PORT = process.env.PORT || 10000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("─────────────────────────────────────────");
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 App URL: http://localhost:${PORT}`);
  console.log("─────────────────────────────────────────");
});
