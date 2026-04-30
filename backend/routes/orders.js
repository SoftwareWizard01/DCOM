/**
 * ================================================================
 *  routes/orders.js — API Route Definitions
 * ================================================================
 *
 *  This file maps HTTP methods + URL paths → controller functions.
 *  Think of it as a "switchboard" — it receives the request and
 *  hands it off to the right controller function.
 *
 *  All routes are prefixed with /api in app.js, so:
 *    Router path "/orders"  →  Full path: GET /api/orders
 *    Router path "/dashboard" →  Full path: GET /api/dashboard
 * ================================================================
 */

const express = require("express");
const router = express.Router();

// Import all controller functions
const {
  createOrder,
  updateStatus,
  getOrders,
  getDashboard,
  getOrderById,
  finalizeOrder,
  deleteOrder,
} = require("../controllers/ordersController");

// ─── Order Routes ─────────────────────────────────────────────

/**
 * POST /api/orders
 * Create a new laundry order
 * Body: { customerName, phone, garments: [{type, quantity}] }
 */
router.post("/orders", createOrder);

/**
 * POST /api/orders/finalize
 * Finalize an online order after payment
 */
router.post("/orders/finalize", finalizeOrder);

/**
 * GET /api/orders
 * List all orders with optional filters
 * Query params: ?status=RECEIVED&name=rahul&phone=9876
 */
router.get("/orders", getOrders);

/**
 * GET /api/orders/:orderId
 * Get a single order by its unique ID
 */
router.get("/orders/:orderId", getOrderById);

/**
 * PATCH /api/orders/:orderId/status
 * Update the status of an order (must follow valid flow)
 * Body: { "status": "PROCESSING" }
 */
router.patch("/orders/:orderId/status", updateStatus);

/**
 * DELETE /api/orders/:orderId
 * Delete an order from the database
 */
router.delete("/orders/:orderId", deleteOrder);

// ─── Dashboard Route ──────────────────────────────────────────

/**
 * GET /api/dashboard
 * Returns totalOrders, totalRevenue, and counts per status
 */
router.get("/dashboard", getDashboard);

module.exports = router;
