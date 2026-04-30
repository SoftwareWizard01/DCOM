/**
 * ================================================================
 *  frontend/app.js — Frontend JavaScript (Vanilla JS)
 * ================================================================
 *
 *  Talks to the backend REST API and updates the DOM.
 *
 *  Sections:
 *   1. Config & Helpers
 *   2. Dashboard (fetchDashboard)
 *   3. Garment Row Builder
 *   4. Bill Calculator (live preview)
 *   5. Create Order Form
 *   6. Orders List (loadOrders)
 *   7. Status Update Modal
 *   8. Filter Listeners
 *   9. Init (runs on page load)
 * ================================================================
 */

// ─── 1. Config & Helpers ──────────────────────────────────────

const API = "http://localhost:3000/api"; // Base URL — change for production

const PRICING = { Shirt: 40, Pants: 60, Saree: 150 };

const STATUS_FLOW = ["RECEIVED", "PROCESSING", "READY", "DELIVERED"];

/** Show a temporary message in a DOM element */
function showMessage(el, text, type) {
  el.textContent = text;
  el.className = `form-message ${type}`; // "success" or "error"
  setTimeout(() => {
    el.className = "form-message";
    el.textContent = "";
  }, 4000);
}

// ─── 2. Dashboard ─────────────────────────────────────────────

/**
 * Fetches /api/dashboard and renders 4 stat cards:
 *  - Total Orders
 *  - Total Revenue
 *  - Orders per status (RECEIVED, PROCESSING, READY, DELIVERED)
 */
async function fetchDashboard() {
  const grid = document.getElementById("stats-grid");

  try {
    const res = await fetch(`${API}/dashboard`);
    const data = await res.json();

    // Build stat cards HTML
    grid.innerHTML = `
      <div class="stat-card total-orders">
        <span class="stat-label">Total Orders</span>
        <span class="stat-value">${data.totalOrders}</span>
      </div>
      <div class="stat-card total-revenue">
        <span class="stat-label">Total Revenue</span>
        <span class="stat-value">₹${data.totalRevenue}</span>
      </div>
      ${STATUS_FLOW.map(
        (s) => `
        <div class="stat-card status-card">
          <span class="stat-label">${s}</span>
          <span class="stat-value">${data.statusCounts[s] ?? 0}</span>
        </div>`
      ).join("")}
    `;
  } catch (err) {
    grid.innerHTML = `<p class="empty-state">⚠️ Could not load dashboard.</p>`;
  }
}

// ─── 3. Garment Row Builder ───────────────────────────────────

/**
 * Creates one garment row (type select + quantity input + remove button).
 * Called when page loads and when user clicks "+ Add Another Garment".
 */
function createGarmentRow(container) {
  const row = document.createElement("div");
  row.className = "garment-row";

  row.innerHTML = `
    <select class="garment-type">
      ${Object.keys(PRICING)
        .map((t) => `<option value="${t}">${t} — ₹${PRICING[t]}</option>`)
        .join("")}
    </select>
    <input type="number" class="garment-qty" min="1" value="1" placeholder="Qty" />
    <button type="button" class="remove-btn" title="Remove">✕</button>
  `;

  // Remove row when ✕ is clicked (only if more than 1 row exists)
  row.querySelector(".remove-btn").addEventListener("click", () => {
    const rows = container.querySelectorAll(".garment-row");
    if (rows.length > 1) {
      row.remove();
      recalcBill(); // update bill preview after removal
    }
  });

  // Recalculate bill whenever type or quantity changes
  row.querySelector(".garment-type").addEventListener("change", recalcBill);
  row.querySelector(".garment-qty").addEventListener("input", recalcBill);

  container.appendChild(row);
  recalcBill(); // update immediately after adding a row
}

// ─── 4. Live Bill Calculator ──────────────────────────────────

/** Reads all garment rows and computes the live bill preview */
function recalcBill() {
  const rows = document.querySelectorAll(".garment-row");
  let total = 0;

  rows.forEach((row) => {
    const type = row.querySelector(".garment-type").value;
    const qty = parseInt(row.querySelector(".garment-qty").value) || 0;
    total += (PRICING[type] || 0) * qty;
  });

  document.getElementById("bill-amount").textContent = `₹${total}`;
}

// ─── 5. Create Order Form ─────────────────────────────────────

/**
 * Handles order creation (Cash or Online)
 */
async function handleCreateOrder(paymentMethod) {
  const msgEl = document.getElementById("form-message");
  const cashBtn = document.getElementById("cash-btn");
  const onlineBtn = document.getElementById("online-btn");
  
  const name = document.getElementById("customerName").value.trim();
  const phone = document.getElementById("phone").value.trim();

  // Collect garments
  const garmentRows = document.querySelectorAll(".garment-row");
  const garments = Array.from(garmentRows).map((row) => ({
    type: row.querySelector(".garment-type").value,
    quantity: parseInt(row.querySelector(".garment-qty").value) || 1,
  }));

  if (!name || !phone) {
    return showMessage(msgEl, "❌ Customer name and phone are required.", "error");
  }

  // Disable buttons
  cashBtn.disabled = true;
  onlineBtn.disabled = true;

  try {
    const res = await fetch(`${API}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerName: name, phone, garments, paymentMethod }),
    });

    const data = await res.json();

    if (!res.ok) {
      showMessage(msgEl, `❌ ${data.error}`, "error");
      cashBtn.disabled = false;
      onlineBtn.disabled = false;
    } else {
      if (paymentMethod === "CASH") {
        showMessage(msgEl, `✅ Order ${data.order.orderId} created (Cash)!`, "success");
        resetForm();
        fetchDashboard();
        loadOrders();
        cashBtn.disabled = false;
        onlineBtn.disabled = false;
      } else {
        // ONLINE flow: data contains razorpayOrderId and unsaved order info
        if (typeof payNow === 'function') {
          payNow(data);
        }
        // Button will be re-enabled after checkout or failure
      }
    }
  } catch (err) {
    showMessage(msgEl, "❌ Could not reach server.", "error");
    cashBtn.disabled = false;
    onlineBtn.disabled = false;
  }
}

function resetForm() {
  document.getElementById("customerName").value = "";
  document.getElementById("phone").value = "";
  const container = document.getElementById("garments-container");
  container.innerHTML = "";
  createGarmentRow(container);
}

document.getElementById("cash-btn").addEventListener("click", () => handleCreateOrder("CASH"));
document.getElementById("online-btn").addEventListener("click", () => handleCreateOrder("ONLINE"));

/**
 * Called from index.html Razorpay handler on success
 */
async function finalizeOnlinePayment(order, razorpay_payment_id) {
  const msgEl = document.getElementById("form-message");
  try {
    const res = await fetch(`${API}/orders/finalize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order, razorpay_payment_id }),
    });

    const data = await res.json();
    if (res.ok) {
      showMessage(msgEl, `✅ Payment Success! Order ${order.orderId} placed.`, "success");
      resetForm();
      fetchDashboard();
      loadOrders();
    } else {
      showMessage(msgEl, `❌ Error finalizing: ${data.error}`, "error");
    }
  } catch (err) {
    showMessage(msgEl, "❌ Network error during finalization.", "error");
  } finally {
    document.getElementById("cash-btn").disabled = false;
    document.getElementById("online-btn").disabled = false;
  }
}

// ─── 6. Orders List ──────────────────────────────────────────

/**
 * Fetches /api/orders (with optional filters from the filter bar)
 * and renders order cards into #orders-list.
 */
async function loadOrders() {
  const listEl = document.getElementById("orders-list");
  listEl.innerHTML = `<p class="empty-state">Loading…</p>`;

  // Build query string from filter inputs
  const status = document.getElementById("filter-status").value;
  const name   = document.getElementById("filter-name").value.trim();
  const phone  = document.getElementById("filter-phone").value.trim();

  const params = new URLSearchParams();
  if (status) params.append("status", status);
  if (name)   params.append("name", name);
  if (phone)  params.append("phone", phone);

  try {
    const res  = await fetch(`${API}/orders?${params.toString()}`);
    const data = await res.json();

    if (!data.orders || data.orders.length === 0) {
      listEl.innerHTML = `<p class="empty-state">📭 No orders found. Try creating one above!</p>`;
      return;
    }

    // Render each order as a card
    listEl.innerHTML = data.orders
      .map((order) => renderOrderCard(order))
      .join("");

    // Attach "Update Status" button listeners
    document.querySelectorAll(".update-status-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        openStatusModal(btn.dataset.orderid, btn.dataset.status, btn.dataset.name);
      });
    });

    // Attach "Delete" button listeners
    document.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (confirm(`Are you sure you want to delete order ${btn.dataset.orderid}?`)) {
          await deleteOrderRequest(btn.dataset.orderid);
        }
      });
    });
  } catch (err) {
    listEl.innerHTML = `<p class="empty-state">⚠️ Could not load orders. Is the server running?</p>`;
  }
}

/** Returns the HTML string for one order card */
function renderOrderCard(order) {
  const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(order.status) + 1];
  const isDelivered = order.status === "DELIVERED";

  const garmentTags = order.garments
    .map((g) => `<span class="garment-tag">${g.type} ×${g.quantity}</span>`)
    .join("");

  const createdDate = new Date(order.createdAt).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  return `
    <div class="order-card">
      <div class="order-main">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <button class="delete-btn" data-orderid="${order.orderId}" title="Delete Order">🗑️</button>
          <span class="order-id">${order.orderId}</span>
        </div>
        <span class="order-name">${order.customerName}</span>
        <span class="order-phone">📞 ${order.phone}</span>
        <div class="order-garments">${garmentTags}</div>
        <span class="order-phone">🕐 ${createdDate}</span>
      </div>
      <div class="order-meta">
        <span class="order-bill">₹${order.totalBill}</span>
        <span class="status-badge status-${order.status}">${order.status}</span>
        <button
          class="update-status-btn"
          data-orderid="${order.orderId}"
          data-status="${order.status}"
          data-name="${order.customerName}"
          ${isDelivered ? "disabled title='Final status'" : ""}
        >
          ${isDelivered ? "✅ Delivered" : `→ ${nextStatus}`}
        </button>
      </div>
    </div>
  `;
}

// ─── 7. Status Update Modal ───────────────────────────────────

let _activeOrderId = null; // tracks which order the modal is for

/** Opens the status update modal for a given order */
function openStatusModal(orderId, currentStatus, customerName) {
  _activeOrderId = orderId;

  document.getElementById("modal-order-info").textContent =
    `Order: ${orderId}  |  Customer: ${customerName}  |  Current: ${currentStatus}`;

  // Only show the next valid status as an option
  const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(currentStatus) + 1];
  const select = document.getElementById("modal-status-select");
  select.innerHTML = nextStatus
    ? `<option value="${nextStatus}">${nextStatus}</option>`
    : `<option value="">No further transitions</option>`;

  document.getElementById("modal-message").textContent = "";
  document.getElementById("modal-overlay").classList.add("open");
}

/** Closes the modal */
function closeModal() {
  document.getElementById("modal-overlay").classList.remove("open");
  _activeOrderId = null;
}

// Cancel button closes modal
document.getElementById("modal-cancel-btn").addEventListener("click", closeModal);

// Click outside modal also closes it
document.getElementById("modal-overlay").addEventListener("click", (e) => {
  if (e.target === document.getElementById("modal-overlay")) closeModal();
});

// Confirm button — sends PATCH request
document.getElementById("modal-confirm-btn").addEventListener("click", async () => {
  const newStatus = document.getElementById("modal-status-select").value;
  const msgEl = document.getElementById("modal-message");

  if (!newStatus) {
    msgEl.textContent = "No valid status to transition to.";
    return;
  }

  try {
    const res = await fetch(`${API}/orders/${_activeOrderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    const data = await res.json();

    if (!res.ok) {
      msgEl.textContent = `❌ ${data.error}`;
    } else {
      closeModal();
      fetchDashboard(); // refresh stats
      loadOrders();     // refresh list
    }
  } catch (err) {
    msgEl.textContent = "❌ Server error. Try again.";
  }
});

async function deleteOrderRequest(orderId) {
  try {
    const res = await fetch(`${API}/orders/${orderId}`, { method: "DELETE" });
    if (res.ok) {
      fetchDashboard();
      loadOrders();
    } else {
      const data = await res.json();
      alert(`Error: ${data.error}`);
    }
  } catch (err) {
    alert("❌ Network error during deletion.");
  }
}

// ─── 8. Filter Listeners ──────────────────────────────────────

document.getElementById("apply-filter-btn").addEventListener("click", loadOrders);

// Clear all filters and reload
document.getElementById("clear-filter-btn").addEventListener("click", () => {
  document.getElementById("filter-status").value = "";
  document.getElementById("filter-name").value   = "";
  document.getElementById("filter-phone").value  = "";
  loadOrders();
});

// Also filter on Enter key in text inputs
["filter-name", "filter-phone"].forEach((id) => {
  document.getElementById(id).addEventListener("keydown", (e) => {
    if (e.key === "Enter") loadOrders();
  });
});

// "Add Another Garment" button
document.getElementById("add-garment-btn").addEventListener("click", () => {
  createGarmentRow(document.getElementById("garments-container"));
});

// ─── 9. Init ─────────────────────────────────────────────────

/** Runs when the page first loads */
function init() {
  // Add the first garment row to the form
  createGarmentRow(document.getElementById("garments-container"));

  // Load dashboard and orders
  fetchDashboard();
  loadOrders();
}

init();
