// server/index.js
const express = require("express");
const bodyParser = require("body-parser");
const snarkjs = require("snarkjs");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const crypto = require("crypto");
const circomlibjs = require("circomlibjs");

const app = express();

// --- Enable CORS (dev only: allow all origins) ---
app.use(cors());
app.use(bodyParser.json());

// --- Paths ---
const DB_PATH = path.resolve(__dirname, "db.json");
const REG_VK_PATH = path.resolve(__dirname, "../circuits/registration/registration_verification_key.json");
const LOGIN_VK_PATH = path.resolve(__dirname, "../circuits/login/login_verification_key.json");

// ---------------------
// Centralized logger
// ---------------------
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

// ---------------------
// File-backed DB helpers
// ---------------------
function ensureDB() {
  if (!fs.existsSync(DB_PATH)) {
    console.log("🗄️ [db] No DB found, creating new one...");
    fs.writeFileSync(DB_PATH, JSON.stringify({ users: {} }, null, 2));
  }
}
function loadDB() {
  ensureDB();
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
  } catch (e) {
    console.error("💥 [db] Failed to parse DB, recreating:", e);
    fs.writeFileSync(DB_PATH, JSON.stringify({ users: {} }, null, 2));
    return { users: {} };
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

// ---------------------
// Utility helpers
// ---------------------
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

// ---------------------
// Load verification keys
// ---------------------
console.log("🔑 [server] Loading verification keys...");
let regVk, loginVk;
try {
  regVk = JSON.parse(fs.readFileSync(REG_VK_PATH, "utf8"));
  loginVk = JSON.parse(fs.readFileSync(LOGIN_VK_PATH, "utf8"));
} catch (err) {
  console.error("💥 [server] Failed to load verification keys - ensure paths are correct:", err);
  process.exit(1);
}

// ---------------------
// Poseidon factory readiness
// ---------------------
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

// ---------------------
// Routes
// ---------------------

// Health
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
  setUser(db, req.params.username, user);

  res.json({ username: req.params.username, commitment: user.commitment, nonce: user.nonce });
});

// Registration (without uniqueness check)
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

    res.json({ status: "ok", username, commitment });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: String(err) });
  }
});

// Login
app.post("/login", async (req, res) => {
  try {
    const missing = requireFields(req.body, ["username", "proof", "publicSignals"]);
    if (missing) return res.status(400).json({ error: missing });

    const { username, proof, publicSignals } = req.body;
    const db = loadDB();
    const user = getUser(db, username);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (!user.nonce) return res.status(400).json({ error: "Nonce not issued or already used" });

    const valid = await verifyProof(loginVk, publicSignals, proof);
    if (!valid) return res.status(400).json({ error: "Invalid login proof" });

    const proofCommitment = String(publicSignals[0]);
    const proofSession = String(publicSignals[1]);

    if (proofCommitment !== String(user.commitment)) return res.status(400).json({ error: "Commitment mismatch" });

    if (!ensurePoseidonReady(res)) return;
    const expectedSession = F.toObject(poseidon([BigInt(user.commitment), BigInt(user.nonce)])).toString();
    if (proofSession !== expectedSession) return res.status(400).json({ error: "Session mismatch" });

    delete user.nonce;
    setUser(db, username, user);

    res.json({ status: "ok", message: "Login successful", session: expectedSession });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: String(err) });
  }
});

// ---------------------
// Start server
// ---------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => console.log(`🚀 [server] running on all interfaces, port ${PORT}`));
