// server/index.js
// =======================
// Production-ready backend for ZKP authentication
// Features:
// 🔒 Registration & login with ZKP proofs
// 🔒 Mobile-safe one-time token for deep-link redirect
// 🔒 Nonce expiration & optional rate limiting
// 🔒 Minimal file-based DB persistence
// =======================

const express = require("express");
const bodyParser = require("body-parser");
const snarkjs = require("snarkjs");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const crypto = require("crypto");
const circomlibjs = require("circomlibjs");
const rateLimit = require("express-rate-limit");

const app = express();

// =======================
// --- Configurations ---
// =======================
const DB_PATH = path.resolve(__dirname, "db.json");
const REG_VK_PATH = path.resolve(__dirname, "../Backend/circuits/key_generation/registration_verification_key.json");
const LOGIN_VK_PATH = path.resolve(__dirname, "../Backend/circuits/key_generation/login_verification_key.json");

const NONCE_TTL = 60 * 1000; // 1 minute
const TOKEN_TTL = 60 * 1000; // 1 minute
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 10; // max requests per IP

// =======================
// --- Middlewares ---
// =======================
app.use(cors());
app.use(bodyParser.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW,
  max: RATE_LIMIT_MAX,
});
app.use("/login", limiter);
app.use("/register", limiter);

// Centralized logging
function logRequest(req) {
  console.log("\n🔹 [Request] ------------------------------");
  console.log("➡️ Method:", req.method);
  console.log("➡️ URL   :", req.originalUrl);
  console.log("➡️ Headers:", JSON.stringify(req.headers, null, 2));
  console.log("➡️ Params :", JSON.stringify(req.params, null, 2));
  console.log("➡️ Query  :", JSON.stringify(req.query, null, 2));
  console.log("➡️ Body   :", JSON.stringify(req.body, null, 2));
}
function logResponse(res, body) {
  console.log("⬅️ [Response] -----------------------------");
  console.log("Status:", res.statusCode);
  console.log("Body  :", body);
  console.log("------------------------------------------\n");
}
app.use((req, res, next) => {
  logRequest(req);
  const originalSend = res.send;
  res.send = function (body) {
    logResponse(res, body);
    originalSend.call(this, body);
  };
  next();
});

// =======================
// --- DB Helpers ---
// =======================
function ensureDB() {
  if (!fs.existsSync(DB_PATH)) {
    console.log("🗄️ [db] No DB found, creating new one...");
    fs.writeFileSync(DB_PATH, JSON.stringify({ users: {}, tokens: {} }, null, 2));
  }
}
function loadDB() {
  ensureDB();
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
  } catch (e) {
    console.error("💥 [db] Failed to parse DB, recreating:", e);
    fs.writeFileSync(DB_PATH, JSON.stringify({ users: {}, tokens: {} }, null, 2));
    return { users: {}, tokens: {} };
  }
}
function saveDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  console.log("🗄️ [db] Saved DB snapshot.");
}
function getUser(db, username) {
  return db.users[username] || null;
}
function setUser(db, username, data) {
  db.users[username] = data;
  saveDB(db);
}

// =======================
// --- Utility Helpers ---
// =======================
function requireFields(obj, fields = []) {
  for (const f of fields) {
    if (!(obj && Object.prototype.hasOwnProperty.call(obj, f))) return `Missing field: ${f}`;
  }
  return null;
}
async function verifyProof(vk, signals, proof) {
  try {
    return await snarkjs.groth16.verify(vk, signals, proof);
  } catch (err) {
    console.error("💥 [verifyProof] error:", err);
    return false;
  }
}
function randomNonceBigIntString(bytes = 8) {
  const nonceBuf = crypto.randomBytes(bytes);
  return BigInt("0x" + nonceBuf.toString("hex")).toString();
}
function generateToken(bytes = 16) {
  return crypto.randomBytes(bytes).toString("hex");
}

// =======================
// --- Load Verification Keys ---
// =======================
console.log("🔑 [server] Loading verification keys...");
let regVk, loginVk;
try {
  regVk = JSON.parse(fs.readFileSync(REG_VK_PATH, "utf8"));
  loginVk = JSON.parse(fs.readFileSync(LOGIN_VK_PATH, "utf8"));
} catch (err) {
  console.error("💥 [server] Failed to load verification keys:", err);
  process.exit(1);
}

// =======================
// --- Poseidon Setup ---
// =======================
let poseidon = null;
let F = null;
(async () => {
  try {
    console.log("🔧 [server] Building Poseidon...");
    poseidon = await circomlibjs.buildPoseidon();
    F = poseidon.F;
    console.log("🔧 [server] Poseidon ready.");
  } catch (err) {
    console.error("💥 [server] Failed to build Poseidon:", err);
  }
})();
function ensurePoseidonReady(res = null) {
  if (!poseidon || !F) {
    const msg = "Poseidon not initialized yet. Try again shortly.";
    console.warn("⚠️ [server] " + msg);
    if (res) res.status(503).json({ error: msg });
    return false;
  }
  return true;
}

// =======================
// --- Routes ---
// =======================

// Health check
app.get("/health", (_req, res) => res.json({ ok: true }));

// Check username availability
app.get("/check-username/:username", (req, res) => {
  const db = loadDB();
  const exists = !!db.users[req.params.username];
  res.json({ available: !exists });
});

// Fetch commitment + nonce (anti-replay)
app.get("/commitment/:username", (req, res) => {
  const db = loadDB();
  const user = getUser(db, req.params.username);
  if (!user) return res.status(404).json({ error: "User not found" });

  const nonceStr = randomNonceBigIntString(8);
  user.nonce = nonceStr;
  user.nonceTime = Date.now();
  setUser(db, req.params.username, user);

  res.json({ username: req.params.username, commitment: user.commitment, nonce: user.nonce });
});

// ---------------------
// Registration
// ---------------------
app.post("/register", async (req, res) => {
  try {
    const missing = requireFields(req.body, ["username", "proof", "publicSignals"]);
    if (missing) return res.status(400).json({ error: missing });
    if (!ensurePoseidonReady(res)) return;

    const { username, proof, publicSignals } = req.body;
    const validReg = await verifyProof(regVk, publicSignals, proof);
    if (!validReg) return res.status(400).json({ error: "Invalid registration proof" });

    const commitment = String(publicSignals[0]);
    const db = loadDB();

    if (getUser(db, username)) return res.status(400).json({ error: "Username already registered" });

    db.users[username] = { commitment };
    saveDB(db);

    // Generate short-lived token for mobile redirect
    const token = generateToken();
    const expires = Date.now() + TOKEN_TTL;
    db.tokens[token] = { username, expires };
    saveDB(db);

    res.json({ status: "ok", token });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: String(err) });
  }
});

// ---------------------
// Login
// ---------------------
app.post("/login", async (req, res) => {
  try {
    const missing = requireFields(req.body, ["username", "proof", "publicSignals"]);
    if (missing) return res.status(400).json({ error: missing });

    const { username, proof, publicSignals } = req.body;
    const db = loadDB();
    const user = getUser(db, username);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Check nonce expiration
    if (!user.nonce || (user.nonceTime && Date.now() - user.nonceTime > NONCE_TTL)) {
      delete user.nonce;
      delete user.nonceTime;
      setUser(db, username, user);
      return res.status(400).json({ error: "Nonce expired or not issued" });
    }

    const valid = await verifyProof(loginVk, publicSignals, proof);
    if (!valid) return res.status(400).json({ error: "Invalid login proof" });

    const proofCommitment = String(publicSignals[0]);
    const proofSession = String(publicSignals[1]);
    if (proofCommitment !== String(user.commitment)) return res.status(400).json({ error: "Commitment mismatch" });

    if (!ensurePoseidonReady(res)) return;
    const expectedSession = F.toObject(poseidon([BigInt(user.commitment), BigInt(user.nonce)])).toString();
    if (proofSession !== expectedSession) return res.status(400).json({ error: "Session mismatch" });

    // Remove nonce after use
    delete user.nonce;
    delete user.nonceTime;
    setUser(db, username, user);

    // Generate one-time token for mobile redirect
    const token = generateToken();
    const expires = Date.now() + TOKEN_TTL;
    db.tokens[token] = { username, expires };
    saveDB(db);

    res.json({ status: "ok", token });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: String(err) });
  }
});

// ---------------------
// Token validation (for mobile app redirect)
// ---------------------
app.get("/validate-token", (req, res) => {
  const db = loadDB();
  const { token } = req.query;
  if (!token || !db.tokens[token]) return res.status(400).json({ valid: false });

  const { username, expires } = db.tokens[token];
  if (Date.now() > expires) {
    delete db.tokens[token];
    saveDB(db);
    return res.status(400).json({ valid: false });
  }

  delete db.tokens[token]; // single-use
  saveDB(db);
  res.json({ valid: true, username });
});

// =======================
// --- Start Server ---
// =======================
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => console.log(`🚀 [server] running on all interfaces, port ${PORT}`));
