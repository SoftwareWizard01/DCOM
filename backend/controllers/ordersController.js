/**
 * ================================================================
 *  ordersController.js — Business Logic Layer
 * ================================================================
 *
 *  Each exported function maps to ONE API route.
 *  The controller:
 *    1. Validates incoming request data
 *    2. Calls model helpers to read/write data
 *    3. Sends a clean JSON response back to the client
 *
 *  No raw data access here — always go through the model.
 * ================================================================
 */

const {
  PRICING,
  STATUS_FLOW,
  generateOrderId,
  calculateBill,
  isValidTransition,
  saveOrder,
  getAllOrders,
  findOrderById,
  updateOrderStatus,
  deleteOrder: deleteOrderInModel,
} = require("../models/orderModel");

const Razorpay = require("razorpay");

const razorpay = new Razorpay({
  key_id: "rzp_test_SiYd13etimROjN",
  key_secret: "EREnLBAVNzMM3x3NNuxWvODG"
});

// ─────────────────────────────────────────────────────────────
//  STEP 3 — createOrder
//  POST /api/orders
// ─────────────────────────────────────────────────────────────
/**
 * Creates a new laundry order.
 *
 * Expected request body:
 * {
 *   "customerName": "Rahul Sharma",
 *   "phone": "9876543210",
 *   "garments": [
 *     { "type": "Shirt", "quantity": 2 },
 *     { "type": "Pants", "quantity": 1 }
 *   ]
 * }
 *
 * What it does:
 *  ✅ Validates required fields
 *  ✅ Validates garment types against PRICING table
 *  ✅ Calculates total bill
 *  ✅ Generates a unique order ID
 *  ✅ Saves order with default status = RECEIVED
 *  ✅ Returns the full order object
 */
async function createOrder(req, res) {
  const { customerName, phone, garments, paymentMethod } = req.body;

  // ── Validation ────────────────────────────────────────────
  if (!customerName || !customerName.trim()) {
    return res.status(400).json({ error: "customerName is required." });
  }

  if (!phone || !phone.trim()) {
    return res.status(400).json({ error: "phone is required." });
  }

  if (!garments || !Array.isArray(garments) || garments.length === 0) {
    return res
      .status(400)
      .json({ error: "garments must be a non-empty array." });
  }

  // Validate each garment
  for (const item of garments) {
    if (!item.type || !PRICING[item.type]) {
      return res.status(400).json({
        error: `Invalid garment type: "${item.type}". Allowed: ${Object.keys(PRICING).join(", ")}`,
      });
    }
    if (!item.quantity || item.quantity < 1) {
      return res
        .status(400)
        .json({ error: `Quantity for "${item.type}" must be at least 1.` });
    }
  }

  // ── Core Logic ────────────────────────────────────────────
  let totalBill;
  try {
    totalBill = calculateBill(garments);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const newOrder = {
    orderId: generateOrderId(),
    customerName: customerName.trim(),
    phone: phone.trim(),
    garments,
    totalBill,
    status: "RECEIVED",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // If CASH, save immediately
  if (paymentMethod === "CASH") {
    await saveOrder(newOrder);
    return res.status(201).json({
      message: "Order created successfully (Cash).",
      order: newOrder
    });
  }

  // If ONLINE, just create Razorpay order and return data
  try {
    const rzpOrder = await razorpay.orders.create({
      amount: totalBill * 100, // amount in paise
      currency: "INR",
      receipt: newOrder.orderId
    });

    return res.status(200).json({
      message: "Razorpay order created.",
      order: newOrder, // Not saved in DB yet
      razorpayOrderId: rzpOrder.id
    });
  } catch (error) {
    console.error("Razorpay error:", error);
    return res.status(500).json({ error: "Failed to create Razorpay order." });
  }
}

/**
 * Finalizes an order after payment verification.
 * In a real app, you would verify the signature here.
 */
async function finalizeOrder(req, res) {
  const { order, razorpay_payment_id } = req.body;
  
  if (!razorpay_payment_id) {
    return res.status(400).json({ error: "Payment ID is required." });
  }

  try {
    await saveOrder(order);
    return res.status(201).json({
      message: "Order finalized and saved.",
      order
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to save order." });
  }
}

async function deleteOrder(req, res) {
  const { orderId } = req.params;
  try {
    const deleted = await deleteOrderInModel(orderId);
    if (!deleted) {
      return res.status(404).json({ error: "Order not found." });
    }
    return res.status(200).json({ message: "Order deleted successfully." });
  } catch (err) {
    return res.status(500).json({ error: "Failed to delete order." });
  }
}

// ─────────────────────────────────────────────────────────────
//  STEP 4 — updateStatus
//  PATCH /api/orders/:orderId/status
// ─────────────────────────────────────────────────────────────
/**
 * Moves an order to the next valid status.
 *
 * Expected request body:  { "status": "PROCESSING" }
 *
 * Rules enforced:
 *  ✅ Order must exist
 *  ✅ New status must be exactly one step forward
 *  ❌ Backward or same-step transitions are rejected
 */
async function updateStatus(req, res) {
  const { orderId } = req.params;
  const { status: newStatus } = req.body;

  // Validate the requested status value
  if (!newStatus || !STATUS_FLOW.includes(newStatus)) {
    return res.status(400).json({
      error: `Invalid status. Allowed values: ${STATUS_FLOW.join(", ")}`,
    });
  }

  // Find the order
  const order = await findOrderById(orderId);
  if (!order) {
    return res.status(404).json({ error: `Order "${orderId}" not found.` });
  }

  // Check if transition is valid (must move forward by exactly 1 step)
  if (!isValidTransition(order.status, newStatus)) {
    return res.status(400).json({
      error: `Cannot transition from "${order.status}" to "${newStatus}". ` +
             `Expected next status: "${STATUS_FLOW[STATUS_FLOW.indexOf(order.status) + 1] || "DELIVERED (final)"}"`,
    });
  }

  // Apply the update
  const updatedOrder = await updateOrderStatus(orderId, newStatus);

  return res.status(200).json({
    message: `Status updated to "${newStatus}".`,
    order: updatedOrder,
  });
}

// ─────────────────────────────────────────────────────────────
//  STEP 5 — getOrders (with filters)
//  GET /api/orders?status=RECEIVED&name=rahul&phone=9876
// ─────────────────────────────────────────────────────────────
/**
 * Returns all orders, optionally filtered by:
 *  - status        → exact match (case-sensitive: RECEIVED, PROCESSING, etc.)
 *  - name          → partial, case-insensitive match on customerName
 *  - phone         → partial match on phone number
 *
 * All filters can be combined. Example:
 *   GET /api/orders?status=PROCESSING&name=rahul
 */
async function getOrders(req, res) {
  const { status, name, phone } = req.query;

  let results = await getAllOrders(); // start with full list

  // Filter by status (exact match)
  if (status) {
    if (!STATUS_FLOW.includes(status)) {
      return res.status(400).json({
        error: `Invalid status filter. Allowed: ${STATUS_FLOW.join(", ")}`,
      });
    }
    results = results.filter((o) => o.status === status);
  }

  // Filter by name (partial, case-insensitive)
  if (name) {
    const nameLower = name.toLowerCase();
    results = results.filter((o) =>
      o.customerName.toLowerCase().includes(nameLower)
    );
  }

  // Filter by phone (partial match — useful for last-4-digits search)
  if (phone) {
    results = results.filter((o) => o.phone.includes(phone));
  }

  return res.status(200).json({
    count: results.length,
    orders: results,
  });
}

// ─────────────────────────────────────────────────────────────
//  STEP 6 — getDashboard
//  GET /api/dashboard
// ─────────────────────────────────────────────────────────────
/**
 * Returns high-level stats about all orders:
 * {
 *   totalOrders: 10,
 *   totalRevenue: 1500,
 *   statusCounts: {
 *     RECEIVED: 3,
 *     PROCESSING: 2,
 *     READY: 3,
 *     DELIVERED: 2
 *   }
 * }
 *
 * Uses Array.reduce() to compute everything in a single pass.
 */
async function getDashboard(req, res) {
  const allOrders = await getAllOrders();

  // Build statusCounts starting with all statuses set to 0
  const statusCounts = STATUS_FLOW.reduce((acc, status) => {
    acc[status] = 0;
    return acc;
  }, {});

  // Single pass: count orders per status and sum revenue
  let totalRevenue = 0;
  for (const order of allOrders) {
    statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    totalRevenue += order.totalBill;
  }

  return res.status(200).json({
    totalOrders: allOrders.length,
    totalRevenue,
    statusCounts,
  });
}

// ─────────────────────────────────────────────────────────────
//  getOrderById — GET /api/orders/:orderId
// ─────────────────────────────────────────────────────────────
/**
 * Fetches a single order by its ID.
 * Useful for the frontend "order detail" view.
 */
async function getOrderById(req, res) {
  const { orderId } = req.params;
  const order = await findOrderById(orderId);

  if (!order) {
    return res.status(404).json({ error: `Order "${orderId}" not found.` });
  }

  return res.status(200).json({ order });
}

// ─── Exports ─────────────────────────────────────────────────
module.exports = {
  createOrder,
  updateStatus,
  getOrders,
  getDashboard,
  getOrderById,
  finalizeOrder,
  deleteOrder,
};
