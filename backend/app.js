/**
 * ================================================================
 *  app.js — Express Application Setup
 * ================================================================
 *
 *  This file configures the Express app:
 *    - Parses JSON request bodies
 *    - Serves static frontend files
 *    - Mounts all API routes under /api
 *    - Adds a global 404 and error handler
 *
 *  Kept separate from server.js so that the app can be
 *  imported and tested without actually starting the HTTP server.
 * ================================================================
 */

const express = require("express");



const path = require("path");
const orderRoutes = require("./routes/orders");

const app = express();

// ─── Middleware ───────────────────────────────────────────────

// Parse incoming JSON request bodies (req.body)
app.use(express.json());

// Allow cross-origin requests from the frontend (development)
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, PUT, DELETE, OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// ─── Serve Frontend Static Files ─────────────────────────────
// Serves index.html + style.css + app.js from the /frontend folder
app.use(express.static(path.join(__dirname, "../Frontend")));

// ─── API Routes ───────────────────────────────────────────────
// All routes in orders.js are prefixed with /api
app.use("/api", orderRoutes);

// ─── Root Route ───────────────────────────────────────────────
// Redirect / to frontend index.html (already handled by static above)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../Frontend/index.html"));
});

// ─── 404 Handler ─────────────────────────────────────────────
// Catches any request that didn't match a defined route
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.url}` });
});

// ─── Global Error Handler ─────────────────────────────────────
// Catches errors thrown by any middleware or route handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: "Internal server error.", detail: err.message });
});

module.exports = app;
