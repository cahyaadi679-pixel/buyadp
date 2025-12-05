const { URL } = require("url");
const { createQris, getTransactionDetail } = require("../pakasir/pakasir");
const { createUser, createServer } = require("../pakasir/ptero");
const config = require("../pakasir/config");

const orders = new Map();

// DOWNLOAD PATH UNTUK SCRIPT (harus cocok dengan file yang kamu upload)
const SCRIPT_DOWNLOAD_PATH = "/sc/alpha-centauri-v4.5.zip";

const PLANS = [
  { key: "1gb", label: "1GB", cpu: 40,  disk: 1000, ram: 1000,  price: 1000,  type: "panel" },
  { key: "2gb", label: "2GB", cpu: 60,  disk: 1000, ram: 2000,  price: 2000,  type: "panel" },
  { key: "3gb", label: "3GB", cpu: 80,  disk: 2000, ram: 3000,  price: 3000,  type: "panel" },
  { key: "4gb", label: "4GB", cpu: 100, disk: 2000, ram: 4000,  price: 4000,  type: "panel" },
  { key: "5gb", label: "5GB", cpu: 120, disk: 3000, ram: 5000,  price: 5000,  type: "panel" },
  { key: "6gb", label: "6GB", cpu: 140, disk: 3000, ram: 6000,  price: 6000,  type: "panel" },
  { key: "7gb", label: "7GB", cpu: 160, disk: 4000, ram: 7000,  price: 7000,  type: "panel" },
  { key: "8gb", label: "8GB", cpu: 180, disk: 4000, ram: 8000,  price: 8000,  type: "panel" },
  { key: "9gb", label: "9GB", cpu: 200, disk: 5000, ram: 9000,  price: 9000,  type: "panel" },
  { key: "10gb",label: "10GB",cpu: 220, disk: 5000, ram:10000,  price:10000,  type: "panel" },
  { key: "unlimited", label: "Unlimited", cpu: 0, disk: 0, ram: 0, price: 11000, type: "panel", unlimited: true },

  // produk script
  { key: "script_alpha", label: "Script Alpha Centauri v4.5", price: 15000, type: "script" }
];

function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => {
      data += chunk;
      if (data.length > 1e6) {
        req.destroy();
        reject(new Error("Body too large"));
      }
    });
    req.on("end", () => {
      if (!data) return resolve({});
      try {
        const json = JSON.parse(data);
        resolve(json);
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function generateOrderId() {
  return "ORD-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

function generateRandomPassword(length = 12) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
}

function findPlan(planKey) {
  return PLANS.find(p => p.key === planKey);
}

async function ensureServerForOrder(order) {
  if (order.serverCreated && order.server) return order.server;

  const plan = findPlan(order.planKey);
  if (!plan || plan.type !== "panel") {
    throw new Error("Plan panel tidak ditemukan untuk order ini");
  }

  const safeId = (order.id || "").replace(/[^A-Z0-9]/gi, "").slice(-10) || order.id;
  const base = safeId.toLowerCase();
  const email = `${base}@customer.local`;
  const username = (`cust_${base}`).slice(0, 32);
  const first_name = "Customer";
  const last_name = plan.label;
  const password = generateRandomPassword();

  const user = await createUser({
    email,
    username,
    first_name,
    last_name,
    password,
    root_admin: false
  });

  const server = await createServer({
    name: `${plan.label} Panel`,
    description: `Auto panel untuk order ${order.id}`,
    userId: user.id,
    ram: plan.ram,
    disk: plan.disk,
    cpu: plan.cpu,
    featureLimits: null
  });

  const serverInfo = {
    panelUrl: config.PTERO_DOMAIN,
    email,
    username,
    password,
    planKey: plan.key,
    planLabel: plan.label,
    pteroUserId: user.id,
    pteroServerId: server.id,
    serverIdentifier: server.identifier,
    createdAt: new Date().toISOString()
  };

  order.serverCreated = true;
  order.server = serverInfo;
  return serverInfo;
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  const url = new URL(req.url, "http://localhost");
  const pathname = url.pathname;

  try {
    // CREATE ORDER
    if (req.method === "POST" && pathname === "/api/order") {
      const body = await readJsonBody(req);
      const planKey = body.planKey;

      if (!planKey) {
        return sendJson(res, 400, { ok: false, message: "planKey wajib diisi." });
      }

      const plan = findPlan(planKey);
      if (!plan) {
        return sendJson(res, 400, { ok: false, message: "Paket tidak ditemukan." });
      }

      const amount = plan.price;
      const orderId = generateOrderId();

      const payment = await createQris({ amount, orderId });

      const order = {
        id: orderId,
        planKey: plan.key,
        planType: plan.type,
        amount,
        createdAt: new Date().toISOString(),
        paymentNumber: payment.payment_number,
        expiredAt: payment.expired_at,
        pakasirProject: payment.project,
        status: "pending",
        serverCreated: false,
        server: null,
        scriptDelivered: false,
        scriptDownloadPath: null
      };

      orders.set(orderId, order);

      return sendJson(res, 200, {
        ok: true,
        orderId,
        amount,
        paymentNumber: payment.payment_number,
        expiredAt: payment.expired_at,
        plan: { key: plan.key, label: plan.label, price: plan.price },
        planType: plan.type
      });
    }

    // CHECK ORDER STATUS
    if (req.method === "GET" && pathname === "/api/order-status") {
      const orderId = url.searchParams.get("orderId");
      if (!orderId) {
        return sendJson(res, 400, { ok: false, message: "orderId wajib diisi." });
      }

      const order = orders.get(orderId);
      if (!order) {
        return sendJson(res, 404, { ok: false, message: "Order tidak ditemukan." });
      }

      const plan = findPlan(order.planKey);
      const planType = plan ? plan.type : order.planType || "panel";

      let status = order.status || "pending";
      let paid = false;

      try {
        const tx = await getTransactionDetail({ amount: order.amount, orderId: order.id });
        if (tx && tx.status) {
          status = tx.status;
        }
      } catch (err) {
        console.error("getTransactionDetail error:", err.message || err);
      }

      order.status = status;
      if (status === "completed" || status === "paid" || status === "success") {
        paid = true;
      }

      if (paid && planType === "panel" && !order.serverCreated) {
        try {
          await ensureServerForOrder(order);
        } catch (err) {
          console.error("ensureServerForOrder error:", err.message || err);
        }
      }

      if (paid && planType === "script" && !order.scriptDelivered) {
        order.scriptDelivered = true;
        order.scriptDownloadPath = SCRIPT_DOWNLOAD_PATH;
      }

      return sendJson(res, 200, {
        ok: true,
        orderId: order.id,
        status: order.status,
        paid,
        planType,
        serverCreated: !!order.serverCreated,
        server: order.server,
        scriptDelivered: !!order.scriptDelivered,
        downloadUrl: order.scriptDownloadPath,
        planLabel: plan ? plan.label : undefined
      });
    }

    res.statusCode = 404;
    res.end("Not found");
  } catch (err) {
    console.error("API error:", err);
    return sendJson(res, 500, { ok: false, message: "Internal server error" });
  }
};
