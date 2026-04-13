// server/index.js
// =======================
// Production-ready backend for ZKP authentication
// Features:
// 🔒 Registration & login with ZKP proofs
// 🔒 Mobile-safe one-time token for deep-link redirect
// 🔒 Nonce expiration & rate limiting
// 🔒 Supabase PostgreSQL persistence (async, non-blocking)
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
const { createClient } = require("@supabase/supabase-js");

// =======================
// --- Firebase Admin SDK ---
// =======================
const serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
console.log("🔥 [firebase] Admin SDK initialized.");

// =======================
// --- Supabase Client ---
// =======================
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("💥 [supabase] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
console.log("🗄️ [supabase] Client initialized.");

const app = express();

// =======================
// --- Configurations ---
// =======================
const REG_VK_PATH = path.resolve(__dirname, "../Backend/circuits/key_generation/registration_verification_key.json");
const LOGIN_VK_PATH = path.resolve(__dirname, "../Backend/circuits/key_generation/login_verification_key.json");

const NONCE_TTL = 60 * 1000;             // 1 minute
const TOKEN_TTL = 60 * 1000;             // 1 minute
const SESSION_TTL = 30 * 60 * 1000;      // 30 minutes
const MOBILE_ACCESS_TOKEN_TTL = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_WINDOW = 60 * 1000;     // 1 minute
const RATE_LIMIT_MAX = 10;               // max requests per IP

// =======================
// --- Admin Config ---
// =======================
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_TTL = process.env.JWT_TTL;

if (!ADMIN_USERNAME || !ADMIN_PASSWORD || !JWT_SECRET) {
  console.error("💥 [server] ADMIN_USERNAME, ADMIN_PASSWORD, and JWT_SECRET must be set in .env");
  process.exit(1);
}

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
app.use(bodyParser.json({ limit: "100kb" })); // Prevent large payload DoS

// Rate limiting on sensitive endpoints
const limiter = rateLimit({ windowMs: RATE_LIMIT_WINDOW, max: RATE_LIMIT_MAX });
app.use("/login", limiter);
app.use("/register", limiter);
app.use("/admin/login", rateLimit({ windowMs: RATE_LIMIT_WINDOW, max: 5 }));

// Centralized logging (sanitizes body to avoid logging sensitive proofs)
app.use((req, res, next) => {
  const safeMethods = ["GET", "DELETE"];
  const logBody = safeMethods.includes(req.method) ? {} : { ...req.body, proof: "[REDACTED]", publicSignals: "[REDACTED]" };
  console.log(`\n🔹 ${req.method} ${req.originalUrl}`, JSON.stringify(logBody));
  next();
});

// =======================
// --- Probabilistic GC ---
// =======================
// To save CPU and memory, we do not run a continuous background loop.
// Instead, there's a 10% chance on any active API request to trigger the cleanup.
// If the server has no traffic, it sleeps efficiently.
app.use((req, res, next) => {
  if (Math.random() < 0.10) {
    cleanupExpiredTokens(); // Fire and forget background GC
  }
  next();
});

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
  // Lowercase alphanumeric and underscores only, 3-20 chars
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

// =======================
// --- Supabase DB Helpers ---
// =======================
async function getUser(username) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("username", username)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function setUserOffline(username) {
  if (!username) return;
  admin.firestore().collection("users").doc(username).set({
    activityStatus: "Offline",
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true }).catch(err => console.error(`🔥 [server] Failed to set offline for ${username}:`, err));
}

async function cleanupExpiredTokens() {
  const now = Date.now();
  try {
    const [t, s, m] = await Promise.all([
      supabase.from("tokens").delete().lt("expires", now),
      supabase.from("sessions").delete().lt("expires", now),
      supabase.from("mobile_access_tokens").delete().lt("expires", now),
    ]);
    // Set users offline for expired sessions
    if (s.data && s.data.length > 0) {
      await Promise.all(s.data.map(sess => setUserOffline(sess.username)));
      console.log(`🧹 [cleanup] Expired sessions purged and users set offline.`);
    }
    // console.log("🧹 [cleanup] Expired tokens/sessions purged.");
  } catch (e) {
    console.warn("⚠️ [cleanup] Error during token cleanup:", e.message);
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
app.get("/health", (_req, res) => res.json({ ok: true, db: "supabase" }));

// ---------------------
// Generate Mobile Access Token (MAT)
// ---------------------
app.post("/generate-mobile-access-token", async (req, res) => {
  try {
    const { deviceId, action } = req.body;
    if (!deviceId || !action) return res.status(400).json({ error: "deviceId and action required" });
    if (!["register", "login"].includes(action)) return res.status(400).json({ error: "action must be 'register' or 'login'" });

    const mat = generateMobileAccessToken();
    const expires = Date.now() + MOBILE_ACCESS_TOKEN_TTL;

    const { error } = await supabase.from("mobile_access_tokens").insert({
      mat,
      deviceId,
      action,
      expires,
      used: false,
      createdAt: Date.now(),
    });
    if (error) throw error;

    res.json({ mobileAccessToken: mat, expiresIn: MOBILE_ACCESS_TOKEN_TTL, action });
  } catch (err) {
    console.error("💥 [generate-mat]", err);
    res.status(500).json({ error: "Server error", details: String(err) });
  }
});

// ---------------------
// Validate Mobile Access Token (middleware)
// ---------------------
async function validateMobileAccessToken(req, res, next) {
  const mat = req.query.mat || req.body.mat || req.headers["x-mobile-access-token"];
  if (!mat) return res.status(403).json({ error: "Access denied: Mobile access token required" });

  const { data: matData, error } = await supabase
    .from("mobile_access_tokens")
    .select("*")
    .eq("mat", mat)
    .maybeSingle();

  if (error || !matData) return res.status(403).json({ error: "Invalid or expired mobile access token" });
  if (matData.used) return res.status(403).json({ error: "Mobile access token already used" });
  if (Date.now() > matData.expires) {
    await supabase.from("mobile_access_tokens").delete().eq("mat", mat);
    return res.status(403).json({ error: "Mobile access token expired" });
  }

  // Mark as used (single-use token)
  await supabase.from("mobile_access_tokens").update({ used: true }).eq("mat", mat);
  req.mobileAccessData = matData;
  req.mobileAccessToken = mat;
  next();
}

// Check username availability
app.get("/check-username/:username", async (req, res) => {
  const username = req.params.username.toLowerCase();
  if (!isValidUsername(username)) {
    return res.json({ available: false, error: "Username must be 3-20 lowercase letters, numbers, and underscores." });
  }
  const user = await getUser(username);
  res.json({ available: !user });
});

// Fetch commitment + nonce (anti-replay)
app.get("/commitment/:username", async (req, res) => {
  try {
    const username = req.params.username.toLowerCase();
    const user = await getUser(username);
    if (!user) return res.status(404).json({ error: "User not found" });

    const nonceStr = randomNonceBigIntString(8);
    const { error } = await supabase
      .from("users")
      .update({ nonce: nonceStr, nonceTime: Date.now() })
      .eq("username", username);
    if (error) throw error;

    res.json({ username, commitment: user.commitment, nonce: nonceStr });
  } catch (err) {
    console.error("💥 [commitment]", err);
    res.status(500).json({ error: "Server error", details: String(err) });
  }
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

    if (!isValidUsername(username)) {
      return res.status(400).json({ error: "Invalid username format. Use only lowercase letters, numbers, and underscores (3-20 chars)." });
    }

    const validReg = await verifyProof(regVk, publicSignals, proof);
    if (!validReg) return res.status(400).json({ error: "Invalid registration proof" });

    const commitment = String(publicSignals[0]);

    // Check if username already exists
    const existing = await getUser(username);
    if (existing) return res.status(400).json({ error: "Username already registered" });

    const { error: insertErr } = await supabase.from("users").insert({
      username,
      commitment,
      registeredAt: Date.now(),
    });
    if (insertErr) throw insertErr;

    // Generate short-lived ONE-TIME token for mobile redirect
    const token = generateToken();
    const { error: tokenErr } = await supabase.from("tokens").insert({
      token,
      username,
      expires: Date.now() + TOKEN_TTL,
      type: "registration",
    });
    if (tokenErr) throw tokenErr;

    broadcastAdminUpdate();
    res.json({ status: "ok", token });
  } catch (err) {
    console.error("💥 [register]", err);
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

    const user = await getUser(username);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Check if account is on hold
    if (user.status === "held") {
      return res.status(403).json({ error: "Account suspended. Contact your administrator." });
    }

    // Validate nonce
    if (!user.nonce || (user.nonceTime && Date.now() - user.nonceTime > NONCE_TTL)) {
      await supabase.from("users").update({ nonce: null, nonceTime: null }).eq("username", username);
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

    // Consume nonce & update lastLogin
    await supabase.from("users").update({ nonce: null, nonceTime: null, lastLogin: Date.now() }).eq("username", username);

    // Create session
    const sessionId = generateToken(32);
    const sessionExpires = Date.now() + SESSION_TTL;
    const { error: sessErr } = await supabase.from("sessions").insert({
      sessionId,
      username,
      expires: sessionExpires,
      createdAt: Date.now(),
    });
    if (sessErr) throw sessErr;

    // Generate one-time token for mobile redirect
    const token = generateToken();
    const { error: tokenErr } = await supabase.from("tokens").insert({
      token,
      username,
      expires: Date.now() + TOKEN_TTL,
      type: "login",
      sessionId,
    });
    if (tokenErr) throw tokenErr;

    res.json({ status: "ok", token, sessionId, expiresIn: SESSION_TTL });
  } catch (err) {
    console.error("💥 [login]", err);
    res.status(500).json({ error: "Server error", details: String(err) });
  }
});

// ---------------------
// Firebase Custom Token (for Firestore auth)
// ---------------------
app.post("/firebase-token", async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: "sessionId required" });

    const { data: session, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("sessionId", sessionId)
      .maybeSingle();
    if (error) throw error;
    if (!session) return res.status(401).json({ error: "Invalid or expired session" });
    if (Date.now() > session.expires) {
      await supabase.from("sessions").delete().eq("sessionId", sessionId);
      return res.status(401).json({ error: "Session expired" });
    }

    const firebaseToken = await admin.auth().createCustomToken(session.username);
    console.log(`🔥 [firebase] Custom token generated for: ${session.username}`);
    res.json({ firebaseToken });
  } catch (err) {
    console.error("💥 [firebase-token]", err);
    res.status(500).json({ error: "Failed to generate Firebase token", details: String(err) });
  }
});

// ---------------------
// Threat Log (ML insider threat detection)
// ---------------------
app.post("/threat-log", async (req, res) => {
  try {
    const { senderId, receiverId, content, threatScore, timestamp } = req.body;
    if (!senderId || !receiverId || !content || threatScore === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    // Input validation to prevent large payloads and XSS
    if (typeof content !== "string" || content.length > 2000) {
      return res.status(400).json({ error: "content must be a string under 2000 characters" });
    }
    if (typeof threatScore !== "number" || threatScore < 0 || threatScore > 1) {
      return res.status(400).json({ error: "threatScore must be a number between 0 and 1" });
    }

    const id = crypto.randomBytes(16).toString("hex");
    const { error } = await supabase.from("threat_logs").insert({
      id,
      senderId,
      receiverId,
      content,
      threatScore,
      timestamp: timestamp || Date.now(),
      reportedAt: Date.now(),
    });
    if (error) throw error;

    broadcastAdminUpdate();
    console.log(`🚨 [THREAT] Logged threat from "${senderId}" to "${receiverId}" (score: ${threatScore})`);
    res.json({ status: "ok", logId: id });
  } catch (err) {
    console.error("💥 [threat-log]", err);
    res.status(500).json({ error: "Failed to log threat", details: String(err) });
  }
});

// ---------------------
// Token validation (for mobile app redirect)
// ---------------------
app.get("/validate-token", async (req, res) => {
  try {
    const { token, device } = req.query;
    if (!token) return res.status(400).json({ valid: false, error: "token required" });

    const { data: tokenData, error } = await supabase
      .from("tokens")
      .select("*")
      .eq("token", token)
      .maybeSingle();
    if (error) throw error;
    if (!tokenData) return res.status(400).json({ valid: false, error: "Invalid token" });
    if (Date.now() > tokenData.expires) {
      await supabase.from("tokens").delete().eq("token", token);
      return res.status(400).json({ valid: false, error: "Token expired" });
    }

    // Bind device to session if provided
    if (tokenData.sessionId && device) {
      await supabase.from("sessions").update({
        deviceId: String(device),
        validatedAt: Date.now(),
      }).eq("sessionId", tokenData.sessionId);
    }

    // Consume token (single-use)
    await supabase.from("tokens").delete().eq("token", token);

    res.json({
      valid: true,
      username: tokenData.username,
      sessionId: tokenData.sessionId || null,
      type: tokenData.type || "unknown",
    });
  } catch (err) {
    console.error("💥 [validate-token]", err);
    res.status(500).json({ valid: false, error: "Server error" });
  }
});

// ---------------------
// Validate Session
// ---------------------
app.post("/validate-session", async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ valid: false, error: "sessionId required" });

    const { data: session, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("sessionId", sessionId)
      .maybeSingle();
    if (error) throw error;
    if (!session) return res.status(400).json({ valid: false, error: "Session not found" });
    if (Date.now() > session.expires) {
      await supabase.from("sessions").delete().eq("sessionId", sessionId);
      return res.status(400).json({ valid: false, error: "Session expired" });
    }

    res.json({ valid: true, username: session.username, expiresAt: session.expires, createdAt: session.createdAt });
  } catch (err) {
    console.error("💥 [validate-session]", err);
    res.status(500).json({ valid: false, error: "Server error" });
  }
});

// ---------------------
// Refresh Session
// ---------------------
app.post("/refresh-session", async (req, res) => {
  try {
    const { sessionId, deviceId } = req.body;
    if (!sessionId || !deviceId) return res.status(400).json({ error: "sessionId and deviceId required" });

    const { data: session, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("sessionId", sessionId)
      .maybeSingle();
    if (error) throw error;
    if (!session) return res.status(404).json({ error: "Session not found" });
    if (Date.now() > session.expires) {
      await supabase.from("sessions").delete().eq("sessionId", sessionId);
      return res.status(400).json({ error: "Session expired" });
    }
    if (session.deviceId && String(session.deviceId) !== String(deviceId)) {
      return res.status(403).json({ error: "Device mismatch" });
    }

    // Rotate sessionId (anti-replay)
    const newSessionId = generateToken(32);
    const newExpires = Date.now() + SESSION_TTL;

    await supabase.from("sessions").delete().eq("sessionId", sessionId);
    const { error: insertErr } = await supabase.from("sessions").insert({
      sessionId: newSessionId,
      username: session.username,
      deviceId,
      createdAt: session.createdAt || Date.now(),
      refreshedAt: Date.now(),
      expires: newExpires,
    });
    if (insertErr) throw insertErr;

    res.json({ status: "ok", sessionId: newSessionId, expiresIn: SESSION_TTL, expiresAt: newExpires });
  } catch (err) {
    console.error("💥 [refresh-session]", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ---------------------
// Logout (invalidate session)
// ---------------------
app.post("/logout", async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: "sessionId required" });

    const { data: session } = await supabase
      .from("sessions")
      .select("username")
      .eq("sessionId", sessionId)
      .maybeSingle();
    if (session?.username) setUserOffline(session.username);

    await supabase.from("sessions").delete().eq("sessionId", sessionId);
    res.json({ status: "ok", message: "Logged out successfully" });
  } catch (err) {
    console.error("💥 [logout]", err);
    res.status(500).json({ error: "Server error" });
  }
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
    if (!username || !password) return res.status(400).json({ error: "username and password required" });
    if (username !== ADMIN_USERNAME) return res.status(401).json({ error: "Invalid credentials" });

    let valid = false;
    if (ADMIN_PASSWORD.startsWith("$2")) {
      valid = await bcrypt.compare(password, ADMIN_PASSWORD);
    } else {
      // Constant-time comparison to prevent timing attacks
      const bufGuess = Buffer.from(password);
      const bufActual = Buffer.from(ADMIN_PASSWORD);
      if (bufGuess.length === bufActual.length) {
        valid = crypto.timingSafeEqual(bufGuess, bufActual);
      }
    }

    if (!valid) return res.status(401).json({ error: "Invalid credentials" });
    const token = jwt.sign({ username, role: "admin" }, JWT_SECRET, { expiresIn: JWT_TTL });
    console.log(`🔐 [ADMIN] Login successful for: ${username}`);
    res.json({ token, expiresIn: JWT_TTL });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: String(err) });
  }
});

// GET /admin/stream — SSE real-time dashboard
app.get("/admin/stream", verifyAdminJWT, (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  adminClients.push(res);
  console.log(`📡 [ADMIN] SSE connected. Active: ${adminClients.length}`);
  res.write(`data: ${JSON.stringify({ type: "CONNECTED" })}\n\n`);

  req.on("close", () => {
    adminClients = adminClients.filter(client => client !== res);
    console.log(`📡 [ADMIN] SSE closed. Remaining: ${adminClients.length}`);
  });
});

// GET /admin/users — list all registered users
app.get("/admin/users", verifyAdminJWT, async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from("users")
      .select("username, status, registeredAt, lastLogin")
      .order("registeredAt", { ascending: false });
    if (error) throw error;
    res.json({ users: users.map(u => ({ ...u, status: u.status || "active" })) });
  } catch (err) {
    console.error("💥 [admin/users]", err);
    res.status(500).json({ error: "Server error", details: String(err) });
  }
});

// POST /admin/users/hold — suspend a user
app.post("/admin/users/hold", verifyAdminJWT, async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: "username required" });

    const user = await getUser(username);
    if (!user) return res.status(404).json({ error: "User not found" });

    const { error } = await supabase.from("users").update({
      status: "held",
      heldAt: Date.now(),
      heldBy: req.adminUser,
    }).eq("username", username);
    if (error) throw error;

    broadcastAdminUpdate();
    await admin.firestore().collection("users").doc(username).set({
      accountStatus: "held",
      activityStatus: "Offline",
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log(`🔒 [ADMIN] User held: ${username} by ${req.adminUser}`);
    res.json({ status: "ok", message: `${username} is now on hold` });
  } catch (err) {
    console.error("💥 [admin/hold]", err);
    res.status(500).json({ error: "Server error", details: String(err) });
  }
});

// POST /admin/users/restore — restore a held user
app.post("/admin/users/restore", verifyAdminJWT, async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: "username required" });

    const user = await getUser(username);
    if (!user) return res.status(404).json({ error: "User not found" });

    const { error } = await supabase.from("users").update({
      status: "active",
      heldAt: null,
      heldBy: null,
    }).eq("username", username);
    if (error) throw error;

    broadcastAdminUpdate();
    await admin.firestore().collection("users").doc(username).set({
      accountStatus: "active",
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log(`✅ [ADMIN] User restored: ${username} by ${req.adminUser}`);
    res.json({ status: "ok", message: `${username} has been restored` });
  } catch (err) {
    console.error("💥 [admin/restore]", err);
    res.status(500).json({ error: "Server error", details: String(err) });
  }
});

// POST /admin/users/revoke — permanently delete a user
app.post("/admin/users/revoke", verifyAdminJWT, async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: "username required" });

    const user = await getUser(username);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Remove from Supabase (sessions too)
    await Promise.all([
      supabase.from("users").delete().eq("username", username),
      supabase.from("sessions").delete().eq("username", username),
      supabase.from("tokens").delete().eq("username", username),
    ]);

    broadcastAdminUpdate();

    // Signal mobile app first, then clean up Firestore
    try {
      const firestoreDb = admin.firestore();
      await firestoreDb.collection("users").doc(username).set({
        accountStatus: "revoked",
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      // Brief delay so mobile snapshot listener can react
      await new Promise(r => setTimeout(r, 1500));

      let sentMsgs = { docs: [] };
      let ownMsgs = { docs: [] };
      
      try {
        const results = await Promise.all([
          firestoreDb.collectionGroup("messages").where("senderId", "==", username).get(),
          firestoreDb.collection("chats").doc(username).collection("messages").get(),
        ]);
        sentMsgs = results[0];
        ownMsgs = results[1];
      } catch (msgErr) {
        console.warn(`⚠️ [ADMIN] Could not fetch messages for cleanup (index might be missing):`, msgErr.message);
      }

      await Promise.all([
        ...sentMsgs.docs.map(doc => doc.ref.delete().catch(() => {})),
        ...ownMsgs.docs.map(doc => doc.ref.delete().catch(() => {})),
        firestoreDb.collection("chats").doc(username).delete().catch(() => {}),
        firestoreDb.collection("users").doc(username).delete().catch(() => {}),
        admin.auth().deleteUser(username).catch(() => {}),
      ]);
    } catch (fsErr) {
      console.warn(`⚠️ [ADMIN] Firestore cleanup for ${username} failed (non-fatal):`, fsErr.message);
    }

    console.log(`🗑️ [ADMIN] User revoked: ${username} by ${req.adminUser}`);
    res.json({ status: "ok", message: `${username} has been permanently revoked` });
  } catch (err) {
    console.error("💥 [admin/revoke]", err);
    res.status(500).json({ error: "Server error", details: String(err) });
  }
});

// GET /admin/threat-logs — return all ML threat logs (newest first)
app.get("/admin/threat-logs", verifyAdminJWT, async (req, res) => {
  try {
    const { data: logs, error } = await supabase
      .from("threat_logs")
      .select("*")
      .order("reportedAt", { ascending: false });
    if (error) throw error;
    res.json({ logs, total: logs.length });
  } catch (err) {
    console.error("💥 [admin/threat-logs]", err);
    res.status(500).json({ error: "Server error", details: String(err) });
  }
});

// POST /admin/threat-logs/:id/status — mark as false/true positive
app.post("/admin/threat-logs/:id/status", verifyAdminJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!["false-positive", "true-positive", "pending"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const { data, error } = await supabase.from("threat_logs").update({
      resolutionStatus: status,
      resolvedBy: req.adminUser,
      resolvedAt: Date.now(),
    }).eq("id", id).select().maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Log not found" });

    broadcastAdminUpdate();
    console.log(`🛡️ [ADMIN] Threat log ${id} marked as ${status} by ${req.adminUser}`);
    res.json({ status: "ok", message: `Log marked as ${status.replace("-", " ")}` });
  } catch (err) {
    console.error("💥 [admin/threat-log-status]", err);
    res.status(500).json({ error: "Server error", details: String(err) });
  }
});

// DELETE /admin/threat-logs/:id — permanently delete a threat log
app.delete("/admin/threat-logs/:id", verifyAdminJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase.from("threat_logs").delete().eq("id", id).select().maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Log not found" });

    broadcastAdminUpdate();
    console.log(`🗑️ [ADMIN] Threat log ${id} deleted by ${req.adminUser}`);
    res.json({ status: "ok", message: "Log permanently removed" });
  } catch (err) {
    console.error("💥 [admin/threat-log-delete]", err);
    res.status(500).json({ error: "Server error", details: String(err) });
  }
});



// =======================
// --- Start Server ---
// =======================
const PORT = process.env.PORT || 6000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 [server] running on all interfaces, port ${PORT}`);
  console.log(`🗄️ [db] Using Supabase PostgreSQL`);
  console.log(`🔒 [security] Session TTL: ${SESSION_TTL / 1000 / 60} minutes`);
  console.log(`🔒 [security] MAT TTL: ${MOBILE_ACCESS_TOKEN_TTL / 1000 / 60} minutes`);
  console.log(`🔒 [security] Nonce TTL: ${NONCE_TTL / 1000} seconds`);
});
