const express = require("express");
const path = require("path");

const app = express();

// Middleware
app.use(express.json());

// ---------------- API ROUTES ----------------
try {
  const appRoutes = require("./app");
  app.use("/api", appRoutes);
  console.log("✅ API routes loaded");
} catch (err) {
  console.error("❌ Failed to load API routes:", err.message);
}

// ---------------- FRONTEND ----------------
const frontendPath = path.join(__dirname, "../Frontend");

// Serve static files
app.use(express.static(frontendPath));

// Serve index.html on root
app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// Fallback (for all routes)
app.get("*", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// ---------------- DB ----------------
(async () => {
  try {
    const connectDB = require("../db/connect.js");
    await connectDB();
    console.log("📦 DB connected");
  } catch (err) {
    console.error("⚠️ DB failed:", err.message);
  }
})();

// ---------------- SERVER ----------------
const PORT = process.env.PORT || 10000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Running on port ${PORT}`);
});
