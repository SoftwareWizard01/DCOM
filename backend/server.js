/**
 * ================================================================
 *  server.js — HTTP Server Entry Point
 * ================================================================
 *
 *  This is the file you run to start the application:
 *    node server.js   OR   npm start
 *
 *  It:
 *    1. Imports the configured Express app
 *    2. Reads the port from environment variable (or defaults to 3000)
 *    3. Starts listening for incoming HTTP connections
 *    4. Logs a startup message with the local URL
 * ================================================================
 */

/**
 * ================================================================
 *  server.js — HTTP Server Entry Point (Render Ready)
 * ================================================================
 */

const app = require("./app");
const connectDB = require("../db/connect.js");

// Use Render-provided port or fallback for local
const PORT = process.env.PORT || 10000;

const start = async () => {
  try {
    await connectDB();
    console.log("📦 Connected to Database");
  } catch (error) {
    console.error("❌ Database connection failed");
    console.error(error);
  }

  // ✅ ALWAYS start server (critical for Render)
  app.listen(PORT, "0.0.0.0", () => {
    console.log("─────────────────────────────────────────");
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log("─────────────────────────────────────────");
  });
};

start();
