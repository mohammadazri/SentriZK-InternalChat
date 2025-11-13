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
const SESSION_TTL = 30 * 60 * 1000; // 30 minutes
const MOBILE_ACCESS_TOKEN_TTL = 5 * 60 * 1000; // 5 minutes - for mobile to web access
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
    fs.writeFileSync(DB_PATH, JSON.stringify({ users: {}, tokens: {}, sessions: {}, mobileAccessTokens: {} }, null, 2));
  }
}
function loadDB() {
  ensureDB();
  try {
    const data = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
    // Ensure all required keys exist
    if (!data.sessions) data.sessions = {};
    if (!data.mobileAccessTokens) data.mobileAccessTokens = {};
    return data;
  } catch (e) {
    console.error("💥 [db] Failed to parse DB, recreating:", e);
    fs.writeFileSync(DB_PATH, JSON.stringify({ users: {}, tokens: {}, sessions: {}, mobileAccessTokens: {} }, null, 2));
    return { users: {}, tokens: {}, sessions: {}, mobileAccessTokens: {} };
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
function generateMobileAccessToken() {
  return crypto.randomBytes(32).toString("hex");
}
function cleanupExpiredTokens(db) {
  const now = Date.now();
  let cleaned = 0;
  
  // Cleanup tokens
  for (const [token, data] of Object.entries(db.tokens)) {
    if (data.expires && now > data.expires) {
      delete db.tokens[token];
      cleaned++;
    }
  }
  
  // Cleanup sessions
  for (const [sessionId, data] of Object.entries(db.sessions)) {
    if (data.expires && now > data.expires) {
      delete db.sessions[sessionId];
      cleaned++;
    }
  }
  
  // Cleanup mobile access tokens
  for (const [mat, data] of Object.entries(db.mobileAccessTokens)) {
    if (data.expires && now > data.expires) {
      delete db.mobileAccessTokens[mat];
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    saveDB(db);
    console.log(`🧹 [cleanup] Removed ${cleaned} expired tokens/sessions`);
  }
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

// ---------------------
// Generate Mobile Access Token (MAT)
// Mobile app calls this to get a secure token before opening web pages
// ---------------------
app.post("/generate-mobile-access-token", (req, res) => {
  try {
    const { deviceId, action } = req.body; // action: "register" or "login"
    
    if (!deviceId || !action) {
      return res.status(400).json({ error: "deviceId and action required" });
    }
    
    if (!["register", "login"].includes(action)) {
      return res.status(400).json({ error: "action must be 'register' or 'login'" });
    }
    
    const db = loadDB();
    cleanupExpiredTokens(db);
    
    const mat = generateMobileAccessToken();
    const expires = Date.now() + MOBILE_ACCESS_TOKEN_TTL;
    
    db.mobileAccessTokens[mat] = {
      deviceId,
      action,
      expires,
      used: false,
      createdAt: Date.now()
    };
    
    saveDB(db);
    
    res.json({ 
      mobileAccessToken: mat,
      expiresIn: MOBILE_ACCESS_TOKEN_TTL,
      action 
    });
    
  } catch (err) {
    res.status(500).json({ error: "Server error", details: String(err) });
  }
});

// ---------------------
// Validate Mobile Access Token (middleware)
// ---------------------
function validateMobileAccessToken(req, res, next) {
  const mat = req.query.mat || req.body.mat || req.headers["x-mobile-access-token"];
  
  if (!mat) {
    return res.status(403).json({ 
      error: "Access denied: Mobile access token required",
      message: "This page can only be accessed from the mobile app"
    });
  }
  
  const db = loadDB();
  cleanupExpiredTokens(db);
  
  const matData = db.mobileAccessTokens[mat];
  
  if (!matData) {
    return res.status(403).json({ 
      error: "Invalid or expired mobile access token",
      message: "Please reopen this page from the mobile app"
    });
  }
  
  if (matData.used) {
    return res.status(403).json({ 
      error: "Mobile access token already used",
      message: "This link can only be used once"
    });
  }
  
  if (Date.now() > matData.expires) {
    delete db.mobileAccessTokens[mat];
    saveDB(db);
    return res.status(403).json({ 
      error: "Mobile access token expired",
      message: "Please reopen this page from the mobile app"
    });
  }
  
  // Mark as used
  matData.used = true;
  saveDB(db);
  
  // Attach to request for use in route handlers
  req.mobileAccessData = matData;
  req.mobileAccessToken = mat;
  
  next();
}

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
    cleanupExpiredTokens(db);

    if (getUser(db, username)) return res.status(400).json({ error: "Username already registered" });

    db.users[username] = { 
      commitment,
      registeredAt: Date.now()
    };
    saveDB(db);

    // Generate short-lived token for mobile redirect
    const token = generateToken();
    const expires = Date.now() + TOKEN_TTL;
    db.tokens[token] = { username, expires, type: "registration" };
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
    cleanupExpiredTokens(db);
    
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
    
    // Update last login
    user.lastLogin = Date.now();
    setUser(db, username, user);

    // Generate session ID
    const sessionId = generateToken(32);
    const sessionExpires = Date.now() + SESSION_TTL;
    db.sessions[sessionId] = {
      username,
      expires: sessionExpires,
      createdAt: Date.now()
    };

    // Generate one-time token for mobile redirect
    const token = generateToken();
    const tokenExpires = Date.now() + TOKEN_TTL;
    db.tokens[token] = { username, expires: tokenExpires, type: "login", sessionId };
    saveDB(db);

    res.json({ 
      status: "ok", 
      token,
      sessionId,
      expiresIn: SESSION_TTL
    });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: String(err) });
  }
});

// ---------------------
// Token validation (for mobile app redirect)
// ---------------------
app.get("/validate-token", (req, res) => {
  const db = loadDB();
  cleanupExpiredTokens(db);
  
  const { token } = req.query;
  if (!token || !db.tokens[token]) return res.status(400).json({ valid: false });

  const tokenData = db.tokens[token];
  const { username, expires, sessionId } = tokenData;
  
  if (Date.now() > expires) {
    delete db.tokens[token];
    saveDB(db);
    return res.status(400).json({ valid: false });
  }

  delete db.tokens[token]; // single-use
  saveDB(db);
  
  res.json({ 
    valid: true, 
    username,
    sessionId: sessionId || null,
    type: tokenData.type || "unknown"
  });
});

// ---------------------
// Validate Session
// ---------------------
app.post("/validate-session", (req, res) => {
  const { sessionId } = req.body;
  
  if (!sessionId) {
    return res.status(400).json({ valid: false, error: "sessionId required" });
  }
  
  const db = loadDB();
  cleanupExpiredTokens(db);
  
  const session = db.sessions[sessionId];
  
  if (!session) {
    return res.status(400).json({ valid: false, error: "Session not found" });
  }
  
  if (Date.now() > session.expires) {
    delete db.sessions[sessionId];
    saveDB(db);
    return res.status(400).json({ valid: false, error: "Session expired" });
  }
  
  res.json({ 
    valid: true, 
    username: session.username,
    expiresAt: session.expires,
    createdAt: session.createdAt
  });
});

// ---------------------
// Refresh Session
// ---------------------
app.post("/refresh-session", (req, res) => {
  const { sessionId } = req.body;
  
  if (!sessionId) {
    return res.status(400).json({ error: "sessionId required" });
  }
  
  const db = loadDB();
  cleanupExpiredTokens(db);
  
  const session = db.sessions[sessionId];
  
  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }
  
  if (Date.now() > session.expires) {
    delete db.sessions[sessionId];
    saveDB(db);
    return res.status(400).json({ error: "Session expired" });
  }
  
  // Extend session
  session.expires = Date.now() + SESSION_TTL;
  session.refreshedAt = Date.now();
  saveDB(db);
  
  res.json({ 
    status: "ok",
    sessionId,
    expiresIn: SESSION_TTL,
    expiresAt: session.expires
  });
});

// ---------------------
// Logout (invalidate session)
// ---------------------
app.post("/logout", (req, res) => {
  const { sessionId } = req.body;
  
  if (!sessionId) {
    return res.status(400).json({ error: "sessionId required" });
  }
  
  const db = loadDB();
  
  if (db.sessions[sessionId]) {
    delete db.sessions[sessionId];
    saveDB(db);
  }
  
  res.json({ status: "ok", message: "Logged out successfully" });
});

// =======================
// --- Periodic Cleanup ---
// =======================
setInterval(() => {
  const db = loadDB();
  cleanupExpiredTokens(db);
}, 60 * 1000); // Run cleanup every minute

// =======================
// --- Start Server ---
// =======================
const PORT = process.env.PORT || 6000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 [server] running on all interfaces, port ${PORT}`);
  console.log(`🔒 [security] Session timeout: ${SESSION_TTL / 1000 / 60} minutes`);
  console.log(`🔒 [security] Mobile access token TTL: ${MOBILE_ACCESS_TOKEN_TTL / 1000 / 60} minutes`);
  console.log(`🔒 [security] Nonce TTL: ${NONCE_TTL / 1000} seconds`);
});
