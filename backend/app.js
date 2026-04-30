const express = require("express");
const path = require("path");

const app = express();

// Middleware
app.use(express.json());

// ---------------- API ROUTES ----------------
try {
  const routes = require("./routes"); // adjust if different
  app.use("/api", routes);
} catch (err) {
  console.error("⚠️ Routes not loaded:", err.message);
}

// ---------------- FRONTEND ----------------
const frontendPath = path.join(__dirname, "../Frontend");

// Serve static files
app.use(express.static(frontendPath));

// Root route
app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// Fallback route
app.get("*", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

module.exports = app;
