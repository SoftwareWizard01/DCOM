/**
 * ============================================================
 *  orderModel.js — MongoDB / Mongoose Data Store
 * ============================================================
 */

const mongoose = require("mongoose");

// ─── Pricing Table ───────────────────────────────────────────
const PRICING = {
  Shirt: 40,
  Pants: 60,
  Saree: 150,
};

// ─── Valid Status Flow ────────────────────────────────────────
const STATUS_FLOW = ["RECEIVED", "PROCESSING", "READY", "DELIVERED"];

// ─── Mongoose Schema ──────────────────────────────────────────
const garmentSchema = new mongoose.Schema({
  type: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  customerName: { type: String, required: true },
  phone: { type: String, required: true },
  garments: [garmentSchema],
  totalBill: { type: Number, required: true },
  status: { type: String, enum: STATUS_FLOW, default: "RECEIVED" },
}, { timestamps: true });

const Order = mongoose.model("Order", orderSchema);

// ─── generateOrderId ─────────────────────────────────────────
function generateOrderId() {
  const timestamp = Date.now();
  const randomPart = Math.random().toString(16).slice(2, 6);
  return `ORD-${timestamp}-${randomPart}`;
}

// ─── calculateBill ───────────────────────────────────────────
function calculateBill(garments) {
  let total = 0;
  for (const item of garments) {
    const unitPrice = PRICING[item.type];
    if (unitPrice === undefined) {
      throw new Error(
        `Unknown garment type: "${item.type}". Allowed types: ${Object.keys(PRICING).join(", ")}`
      );
    }
    total += unitPrice * item.quantity;
  }
  return total;
}

// ─── isValidTransition ───────────────────────────────────────
function isValidTransition(currentStatus, newStatus) {
  const currentIndex = STATUS_FLOW.indexOf(currentStatus);
  const newIndex = STATUS_FLOW.indexOf(newStatus);
  if (currentIndex === -1 || newIndex === -1) return false;
  return newIndex === currentIndex + 1;
}

// ─── CRUD Helpers (Async) ────────────────────────────────────

async function saveOrder(orderData) {
  const newOrder = new Order(orderData);
  return await newOrder.save();
}

async function getAllOrders() {
  return await Order.find({}).sort({ createdAt: -1 });
}

async function findOrderById(orderId) {
  return await Order.findOne({ orderId });
}

async function updateOrderStatus(orderId, newStatus) {
  return await Order.findOneAndUpdate(
    { orderId }, 
    { status: newStatus }, 
    { new: true }
  );
}

async function deleteOrder(orderId) {
  return await Order.findOneAndDelete({ orderId });
}

// ─── Exports ─────────────────────────────────────────────────
module.exports = {
  PRICING,
  STATUS_FLOW,
  generateOrderId,
  calculateBill,
  isValidTransition,
  saveOrder,
  getAllOrders,
  findOrderById,
  updateOrderStatus,
  deleteOrder,
};
