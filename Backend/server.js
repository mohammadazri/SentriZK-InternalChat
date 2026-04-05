// server/index.js
// =======================
// Production-ready backend for ZKP authentication
// Features:
// 🔒 Registration & login with ZKP proofs
// 🔒 Mobile-safe one-time token for deep-link redirect
// 🔒 Nonce expiration & optional rate limiting
// 🔒 Minimal file-based DB persistence
// =======================

require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const snarkjs = require("snarkjs");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const crypto = require("crypto");
const circomlibjs = require("circomlibjs");
const rateLimit = require("express-rate-limit");
const admin = require("firebase-admin");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// =======================
// --- Firebase Admin SDK ---
// =======================
const serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
console.log("🔥 [firebase] Admin SDK initialized.");

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
// --- Admin Config ---
// =======================
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_TTL = process.env.JWT_TTL;

// =======================
// --- Admin SSE Stream ---
// =======================
let adminClients = [];
function broadcastAdminUpdate() {
  const payload = `data: ${JSON.stringify({ type: "UPDATE", timestamp: Date.now() })}\n\n`;
  adminClients.forEach(client => client.write(payload));
}

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
function setUserOffline(username) {
  if (!username) return;
  admin.firestore().collection("users").doc(username).set({
    activityStatus: "Offline",
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true }).catch(err => console.error(`🔥 [server] Failed to set offline status for ${username}:`, err));
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
function isValidUsername(username) {
  // Lowercase alphanumeric and underscores only, 3-20 chars, no spaces
  const regex = /^[a-z0-9_]{3,20}$/;
  return regex.test(username);
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
      if (data.username) setUserOffline(data.username);
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
  const { username } = req.params;
  if (!isValidUsername(username)) {
    return res.json({ available: false, error: "Username must be 3-20 characters and contain only letters, numbers, and underscores." });
  }
  const db = loadDB();
  const exists = !!db.users[username];
  res.json({ available: !exists });
});

// Fetch commitment + nonce (anti-replay)
app.get("/commitment/:username", (req, res) => {
  const username = req.params.username.toLowerCase();
  const db = loadDB();
  const user = getUser(db, username);
  if (!user) return res.status(404).json({ error: "User not found" });

  const nonceStr = randomNonceBigIntString(8);
  user.nonce = nonceStr;
  user.nonceTime = Date.now();
  setUser(db, username, user);

  res.json({ username, commitment: user.commitment, nonce: user.nonce });
});

// ---------------------
// Registration
// ---------------------
app.post("/register", async (req, res) => {
  try {
    const missing = requireFields(req.body, ["username", "proof", "publicSignals"]);
    if (missing) return res.status(400).json({ error: missing });
    if (!ensurePoseidonReady(res)) return;

    const { proof, publicSignals } = req.body;
    const username = String(req.body.username).toLowerCase();

    // Strict format check
    if (!isValidUsername(username)) {
      return res.status(400).json({ error: "Invalid username format. Use only lowercase letters, numbers, and underscores (3-20 chars)." });
    }

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
    broadcastAdminUpdate();

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
    const { proof, publicSignals } = req.body;
    const username = String(req.body.username).toLowerCase();
    const db = loadDB();
    cleanupExpiredTokens(db);

    const user = getUser(db, username);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Check if user is on hold
    if (user.status === "held") {
      return res.status(403).json({ error: "Account suspended. Contact your administrator." });
    }

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
// Firebase Custom Token (for Firestore auth)
// ---------------------
app.post("/firebase-token", async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: "sessionId required" });
    }

    const db = loadDB();
    cleanupExpiredTokens(db);

    const session = db.sessions[sessionId];
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }

    if (Date.now() > session.expires) {
      delete db.sessions[sessionId];
      saveDB(db);
      return res.status(401).json({ error: "Session expired" });
    }

    // Generate Firebase custom token using the username as UID
    const firebaseToken = await admin.auth().createCustomToken(session.username);
    console.log(`🔥 [firebase] Custom token generated for: ${session.username}`);

    res.json({ firebaseToken });
  } catch (err) {
    console.error("💥 [firebase-token] Error:", err);
    res.status(500).json({ error: "Failed to generate Firebase token", details: String(err) });
  }
});

// ---------------------
// Threat Log (ML insider threat detection)
// ---------------------
app.post("/threat-log", (req, res) => {
  try {
    const { senderId, receiverId, content, threatScore, timestamp } = req.body;

    if (!senderId || !receiverId || !content || threatScore === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const db = loadDB();
    if (!db.threat_logs) db.threat_logs = [];

    const logEntry = {
      id: crypto.randomBytes(16).toString("hex"),
      senderId,
      receiverId,
      content,
      threatScore,
      timestamp: timestamp || Date.now(),
      reportedAt: Date.now(),
    };

    db.threat_logs.push(logEntry);
    saveDB(db);
    broadcastAdminUpdate();

    console.log(`🚨 [THREAT] Logged threat from "${senderId}" to "${receiverId}" (score: ${threatScore})`);
    res.json({ status: "ok", logId: logEntry.id });
  } catch (err) {
    console.error("💥 [threat-log] Error:", err);
    res.status(500).json({ error: "Failed to log threat", details: String(err) });
  }
});

// ---------------------
// Token validation (for mobile app redirect)
// ---------------------
app.get("/validate-token", (req, res) => {
  const db = loadDB();
  cleanupExpiredTokens(db);

  const { token, device } = req.query;
  if (!token || !db.tokens[token]) return res.status(400).json({ valid: false });

  const tokenData = db.tokens[token];
  const { username, expires, sessionId } = tokenData;

  if (Date.now() > expires) {
    delete db.tokens[token];
    saveDB(db);
    return res.status(400).json({ valid: false });
  }

  // If a sessionId exists, associate it with the requesting device (bind session to device)
  if (sessionId && db.sessions[sessionId]) {
    try {
      if (device) db.sessions[sessionId].deviceId = String(device);
      db.sessions[sessionId].validatedAt = Date.now();
      saveDB(db);
    } catch (e) {
      console.error('[validate-token] failed to bind device to session', e);
    }
  }

  // Consume token (single-use)
  delete db.tokens[token];
  saveDB(db);

  res.json({
    valid: true,
    username,
    sessionId: sessionId || null,
    type: tokenData.type || "unknown",
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
  const { sessionId, deviceId } = req.body;

  if (!sessionId || !deviceId) {
    return res.status(400).json({ error: "sessionId and deviceId required" });
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

  // Enforce device binding if present
  if (session.deviceId && String(session.deviceId) !== String(deviceId)) {
    return res.status(403).json({ error: "Device mismatch" });
  }

  // Rotate sessionId to mitigate replay risks
  const newSessionId = generateToken(32);
  const newSession = {
    username: session.username,
    deviceId: deviceId,
    createdAt: session.createdAt || Date.now(),
    refreshedAt: Date.now(),
    expires: Date.now() + SESSION_TTL,
  };

  // Delete old session and store rotated session
  delete db.sessions[sessionId];
  db.sessions[newSessionId] = newSession;
  saveDB(db);

  res.json({
    status: "ok",
    sessionId: newSessionId,
    expiresIn: SESSION_TTL,
    expiresAt: newSession.expires,
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
    const username = db.sessions[sessionId].username;
    if (username) setUserOffline(username);
    delete db.sessions[sessionId];
    saveDB(db);
  }

  res.json({ status: "ok", message: "Logged out successfully" });
});

// =======================
// --- Admin JWT Middleware ---
// =======================
function verifyAdminJWT(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Admin authentication required" });
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== "admin") throw new Error("Not an admin token");
    req.adminUser = payload.username;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired admin token" });
  }
}

// =======================
// --- Admin Routes ---
// =======================

// POST /admin/login
app.post("/admin/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "username and password required" });
    }
    if (username !== ADMIN_USERNAME) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    // Support both plain-text (for easy dev setup) and bcrypt hash
    let valid = false;
    if (ADMIN_PASSWORD.startsWith("$2")) {
      valid = await bcrypt.compare(password, ADMIN_PASSWORD);
    } else {
      valid = password === ADMIN_PASSWORD;
    }
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ username, role: "admin" }, JWT_SECRET, { expiresIn: JWT_TTL });
    console.log(`🔐 [ADMIN] Login successful for: ${username}`);
    res.json({ token, expiresIn: JWT_TTL });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: String(err) });
  }
});

// GET /admin/stream — Server-Sent Events for real-time dashboard pushing
app.get("/admin/stream", verifyAdminJWT, (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders(); // Establish SSE

  adminClients.push(res);
  console.log(`📡 [ADMIN] SSE stream connected. Total active: ${adminClients.length}`);

  // Send initial ping to confirm connection
  res.write(`data: ${JSON.stringify({ type: "CONNECTED" })}\n\n`);

  // Remove client on disconnect
  req.on("close", () => {
    adminClients = adminClients.filter(client => client !== res);
    console.log(`📡 [ADMIN] SSE stream closed. Remaining: ${adminClients.length}`);
  });
});

// GET /admin/users — list all registered users
app.get("/admin/users", verifyAdminJWT, (req, res) => {
  try {
    const db = loadDB();
    const users = Object.entries(db.users).map(([username, data]) => ({
      username,
      status: data.status || "active",
      registeredAt: data.registeredAt || null,
      lastLogin: data.lastLogin || null,
    }));
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: String(err) });
  }
});

// POST /admin/users/hold — suspend a user (block login)
app.post("/admin/users/hold", verifyAdminJWT, async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: "username required" });
    const db = loadDB();
    if (!db.users[username]) return res.status(404).json({ error: "User not found" });
    db.users[username].status = "held";
    db.users[username].heldAt = Date.now();
    db.users[username].heldBy = req.adminUser;
    saveDB(db);
    broadcastAdminUpdate();
    // Write accountStatus to Firestore so mobile app detects it instantly
    await admin.firestore().collection("users").doc(username).set({
      accountStatus: "held",
      activityStatus: "Offline",
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    console.log(`🔒 [ADMIN] User held: ${username} by ${req.adminUser}`);
    res.json({ status: "ok", message: `${username} is now on hold` });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: String(err) });
  }
});

// POST /admin/users/restore — restore a held user
app.post("/admin/users/restore", verifyAdminJWT, async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: "username required" });
    const db = loadDB();
    if (!db.users[username]) return res.status(404).json({ error: "User not found" });
    db.users[username].status = "active";
    delete db.users[username].heldAt;
    delete db.users[username].heldBy;
    saveDB(db);
    broadcastAdminUpdate();
    // Clear accountStatus in Firestore
    await admin.firestore().collection("users").doc(username).set({
      accountStatus: "active",
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    console.log(`✅ [ADMIN] User restored: ${username} by ${req.adminUser}`);
    res.json({ status: "ok", message: `${username} has been restored` });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: String(err) });
  }
});

// POST /admin/users/revoke — permanently delete a user
app.post("/admin/users/revoke", verifyAdminJWT, async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: "username required" });
    const db = loadDB();
    if (!db.users[username]) return res.status(404).json({ error: "User not found" });
    // Remove from db.json
    delete db.users[username];
    // Also remove any active sessions for this user
    for (const [sid, session] of Object.entries(db.sessions)) {
      if (session.username === username) delete db.sessions[sid];
    }
    saveDB(db);
    broadcastAdminUpdate();
    // Write accountStatus: revoked FIRST so mobile listener fires before doc deletion
    try {
      const fs = admin.firestore();
      await fs.collection("users").doc(username).set({
        accountStatus: "revoked",
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      
      // Brief delay so the mobile snapshot listener can fire and kick out the user
      await new Promise(r => setTimeout(r, 1500));
      
      // 1. Delete all messages sent BY this user (collectionGroup)
      try {
        const sentMsgs = await fs.collectionGroup("messages").where("senderId", "==", username).get();
        await Promise.all(sentMsgs.docs.map(doc => doc.ref.delete()));
        console.log(`[REVOKE] Deleted ${sentMsgs.docs.length} messages sent by ${username} globally.`);
      } catch (e) { console.error("Error deleting sent messages:", e.message); }

      // 2. Delete the user's own `chats/{username}/messages` and `chats/{username}`
      try {
        const ownMsgs = await fs.collection("chats").doc(username).collection("messages").get();
        await Promise.all(ownMsgs.docs.map(doc => doc.ref.delete()));
        await fs.collection("chats").doc(username).delete();
        console.log(`[REVOKE] Deleted ${ownMsgs.docs.length} inbox messages and chat document for ${username}.`);
      } catch (e) { console.error("Error deleting own chats:", e.message); }

      // 3. Delete the user document
      try {
        await fs.collection("users").doc(username).delete();
      } catch (e) { console.error("Error deleting user doc:", e.message); }

      // 4. Try to delete Firebase Auth account too (non-fatal if fails)
      await admin.auth().deleteUser(username).catch(() => {});
      
    } catch (fsErr) {
      console.warn(`⚠️ [ADMIN] Firestore ops for ${username} failed (non-fatal):`, fsErr.message);
    }
    console.log(`🗑️ [ADMIN] User revoked: ${username} by ${req.adminUser}`);
    res.json({ status: "ok", message: `${username} has been permanently revoked` });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: String(err) });
  }
});

// GET /admin/threat-logs — return all ML threat logs
app.get("/admin/threat-logs", verifyAdminJWT, (req, res) => {
  try {
    const db = loadDB();
    const logs = (db.threat_logs || []).slice().reverse(); // newest first
    res.json({ logs, total: logs.length });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: String(err) });
  }
});

// POST /admin/threat-logs/:id/status — mark as false positive or true positive
app.post("/admin/threat-logs/:id/status", verifyAdminJWT, (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!["false-positive", "true-positive", "pending"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    
    const db = loadDB();
    if (!db.threat_logs) return res.status(404).json({ error: "No logs found" });
    
    const logIndex = db.threat_logs.findIndex(l => l.id === id);
    if (logIndex === -1) return res.status(404).json({ error: "Log not found" });
    
    db.threat_logs[logIndex].resolutionStatus = status;
    db.threat_logs[logIndex].resolvedBy = req.adminUser;
    db.threat_logs[logIndex].resolvedAt = Date.now();
    saveDB(db);
    broadcastAdminUpdate();
    
    console.log(`🛡️ [ADMIN] Threat log ${id} marked as ${status} by ${req.adminUser}`);
    res.json({ status: "ok", message: `Log marked as ${status.replace('-', ' ')}` });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: String(err) });
  }
});

// DELETE /admin/threat-logs/:id — permanently delete a threat log
app.delete("/admin/threat-logs/:id", verifyAdminJWT, (req, res) => {
  try {
    const { id } = req.params;
    const db = loadDB();
    if (!db.threat_logs) return res.status(404).json({ error: "No logs found" });
    
    const logIndex = db.threat_logs.findIndex(l => l.id === id);
    if (logIndex === -1) return res.status(404).json({ error: "Log not found" });
    
    db.threat_logs.splice(logIndex, 1);
    saveDB(db);
    broadcastAdminUpdate();
    
    console.log(`🗑️ [ADMIN] Threat log ${id} deleted by ${req.adminUser}`);
    res.json({ status: "ok", message: "Log permanently removed" });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: String(err) });
  }
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
