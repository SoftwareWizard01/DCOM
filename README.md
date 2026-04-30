# DCOM — Dry Cleaning Order Management System

> A clean, production-readable full-stack web app built with **Node.js + Express** (backend) and **Vanilla HTML/CSS/JS** (frontend). Designed to be simple, modular, and beginner-friendly — yet deployable in real environments.

---

## 📌 Project Overview

LaundryOS lets a dry cleaning shop:
- **Create orders** with customer details and garment items
- **Track status** through a strict flow: `RECEIVED → PROCESSING → READY → DELIVERED`
- **View & filter** orders by status, name, or phone
- **See live dashboard** stats: total orders, revenue, counts per status

All data is stored in-memory (no database required to run). A MongoDB upgrade path is documented in Step 10.

---

## ✨ Features

| Feature | Detail |
|---|---|
| Create Order | Customer name, phone, garments list, auto-calculated bill |
| Unique Order ID | `ORD-{timestamp}-{random4hex}` format |
| Auto Bill Calc | Shirt ₹40, Pants ₹60, Saree ₹150 |
| Status Flow | Forward-only; invalid transitions rejected with clear errors |
| Filter Orders | By status, name (partial, case-insensitive), phone |
| Dashboard | Total orders, revenue, per-status counts |
| Frontend UI | Dark-mode, live bill preview, status update modal |

---

## 📁 Folder Structure

```
Laundary Manage Sys/
├── backend/
│   ├── server.js               ← Entry point: starts HTTP server
│   ├── app.js                  ← Express config, middleware, routing
│   ├── routes/
│   │   └── orders.js           ← Maps URLs → controller functions
│   ├── controllers/
│   │   └── ordersController.js ← Business logic for each endpoint
│   └── models/
│       └── orderModel.js       ← In-memory store + helper functions
├── frontend/
│   ├── index.html              ← UI shell
│   ├── style.css               ← Dark-mode design system
│   └── app.js                  ← Vanilla JS: API calls + DOM updates
├── package.json
└── README.md
```

---

## 🚀 Setup Instructions

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or higher
- npm (comes with Node)

### 1 — Install dependencies
```bash
cd "Laundary Manage Sys"
npm install
```

### 2 — Start the server
```bash
npm start
```
Or with auto-restart on file changes (development):
```bash
npm run dev
```

### 3 — Open the app
- **Frontend UI:** http://localhost:3000
- **API Base:**    http://localhost:3000/api

---

## 📡 API Endpoints

### ➕ Create Order
```
POST /api/orders
Content-Type: application/json
```
**Request:**
```json
{
  "customerName": "Rahul Sharma",
  "phone": "9876543210",
  "garments": [
    { "type": "Shirt", "quantity": 2 },
    { "type": "Pants", "quantity": 1 }
  ]
}
```
**Response (201):**
```json
{
  "message": "Order created successfully.",
  "order": {
    "orderId": "ORD-1714230412345-a3f2",
    "customerName": "Rahul Sharma",
    "phone": "9876543210",
    "garments": [
      { "type": "Shirt", "quantity": 2 },
      { "type": "Pants", "quantity": 1 }
    ],
    "totalBill": 140,
    "status": "RECEIVED",
    "createdAt": "2026-04-27T18:00:00.000Z",
    "updatedAt": "2026-04-27T18:00:00.000Z"
  }
}
```

---

### 🔄 Update Order Status
```
PATCH /api/orders/:orderId/status
Content-Type: application/json
```
**Request:**
```json
{ "status": "PROCESSING" }
```
**Response (200):**
```json
{
  "message": "Status updated to \"PROCESSING\".",
  "order": { "...": "full order object" }
}
```
**Error (400 — invalid transition):**
```json
{
  "error": "Cannot transition from \"PROCESSING\" to \"RECEIVED\". Expected next status: \"READY\""
}
```

---

### 📋 Get All Orders (with filters)
```
GET /api/orders?status=PROCESSING&name=rahul&phone=9876
```
**Query Parameters (all optional, can combine):**

| Param | Type | Example |
|---|---|---|
| `status` | exact | `RECEIVED` |
| `name` | partial, case-insensitive | `rahu` |
| `phone` | partial | `9876` |

**Response (200):**
```json
{
  "count": 1,
  "orders": [ { "...": "order objects" } ]
}
```

---

### 📊 Dashboard
```
GET /api/dashboard
```
**Response (200):**
```json
{
  "totalOrders": 10,
  "totalRevenue": 1000,
  "statusCounts": {
    "RECEIVED": 3,
    "PROCESSING": 2,
    "READY": 3,
    "DELIVERED": 2
  }
}
```

---

### 🔍 Get Single Order
```
GET /api/orders/:orderId
```
**Response (200):**
```json
{
  "order": { "...": "full order object" }
}
```

---

## 🤖 AI Usage Report

### Tools Used
- **Google Deepmind Antigravity** (Claude Sonnet 4.6 Thinking) — Primary code generation tool

### Sample Prompts Used
- *"Build a Dry Cleaning Management System with Node.js + Express"*
- *"Create modular backend with in-memory storage, controllers, and routes"*
- *"Generate a premium dark-mode frontend with live bill calculator and status modal"*

### Where AI Helped
- Generated entire boilerplate structure instantly (saved ~3-4 hours)
- Wrote all JSDoc comments and inline explanations
- Designed the CSS design token system and status badge colors
- Enforced status transition validation logic clearly

### Where AI Needed Human Review
- Port/CORS configuration needed adjustment for specific environments
- Garment pricing is hardcoded — a real app would fetch from a DB config
- Phone validation (format/length) left intentionally loose for flexibility

### Improvements Made After AI Generation
- Added `updatedAt` field on status change
- Added `count` field to list response for easier pagination later
- Added `filter-name` Enter key listener for better UX

---

## ⚖️ Tradeoffs

| Decision | Tradeoff |
|---|---|
| In-memory storage | Fast to start, data lost on restart; easy to swap for MongoDB |
| Vanilla JS frontend | No build step, instant setup; less reactive than React |
| Forward-only status | Simpler logic; can't undo mistakes (acceptable for MVP) |
| Single-file model | Easy to read; would split at scale |

---

## 🔮 Future Improvements

- [ ] **MongoDB integration** using Mongoose (schema defined below)
- [ ] **Authentication** — shop owner login with JWT
- [ ] **Print receipt** button per order
- [ ] **Pagination** for large order lists
- [ ] **SMS/WhatsApp notification** when order is READY
- [ ] **Date-range filter** on orders
- [ ] **Edit order** before PROCESSING status

---

## 🗄️ Step 10 — MongoDB Schema (Bonus)

Install Mongoose and replace `orderModel.js`:
```bash
npm install mongoose
```

```js
// models/orderModel.js (MongoDB version)
const mongoose = require("mongoose");

const garmentSchema = new mongoose.Schema({
  type:     { type: String, enum: ["Shirt", "Pants", "Saree"], required: true },
  quantity: { type: Number, min: 1, required: true },
});

const orderSchema = new mongoose.Schema({
  orderId:      { type: String, unique: true },
  customerName: { type: String, required: true, trim: true },
  phone:        { type: String, required: true, trim: true },
  garments:     { type: [garmentSchema], required: true },
  totalBill:    { type: Number, required: true },
  status: {
    type: String,
    enum: ["RECEIVED", "PROCESSING", "READY", "DELIVERED"],
    default: "RECEIVED",
  },
}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);
```

Connect in `server.js`:
```js
const mongoose = require("mongoose");
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error(err));
```

Add to `.env`:
```
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/laundrydb
PORT=3000
```

---

## ☁️ Step 11 — Deployment (Render)

### Deploy on [Render.com](https://render.com) (free tier)

1. Push code to GitHub
2. Go to Render → **New Web Service**
3. Connect your GitHub repo
4. Set:
   - **Build Command:** `npm install`
   - **Start Command:** `node backend/server.js`
5. Add environment variables:
   - `PORT` = `3000`
   - `MONGO_URI` = your MongoDB Atlas connection string (if using DB)
6. Deploy 🎉

### Common Mistakes
- ❌ Hardcoding `localhost` in frontend — use relative paths or env var for API URL
- ❌ Not setting `process.env.PORT` — Render assigns a dynamic port
- ❌ Forgetting CORS headers — already handled in `app.js`

---

## 📜 License

MIT — free to use and modify.
