# 🔌 SentriZK REST API Reference

> **Base URL**: `https://backend.sentrizk.me` (production) / `http://localhost:6000` (development)  
> **Server**: Node.js + Express 5.1 on port 6000  
> **Database**: Supabase PostgreSQL  
> **Body Limit**: 100 KB (returns `413` if exceeded)

---

## Global Middleware

| Middleware | Scope | Behavior |
|-----------|-------|----------|
| **CORS** | All routes | Open (`cors()`) |
| **Body Parser** | All routes | JSON, max 100 KB |
| **Request Logging** | All routes | Logs method + path; redacts `proof` and `publicSignals` |
| **Probabilistic GC** | All routes | 10% chance per request to purge expired tokens, sessions, and MATs |

---

## 1. Authentication Routes

### `POST /register`

Register a new user with a ZKP proof. Server stores only the Poseidon commitment — **no password**.

**Rate Limit**: 10 requests/minute per IP

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `username` | string | ✅ | 3–20 chars, lowercase alphanumeric + underscores |
| `proof` | object | ✅ | Groth16 proof object from snarkjs |
| `publicSignals` | string[] | ✅ | `[commitment, unameHash]` |

**Response** `200`:
```json
{ "status": "ok", "token": "<one-time-redirect-token>" }
```

**Errors**: `400` (invalid proof / username taken / bad format), `503` (Poseidon not ready)

---

### `POST /login`

Authenticate with a ZKP proof. Verifies commitment match and nonce binding.

**Rate Limit**: 10 requests/minute per IP

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `username` | string | ✅ | Registered username |
| `proof` | object | ✅ | Login Groth16 proof |
| `publicSignals` | string[] | ✅ | `[pubCommitment, pubSession]` |

**Response** `200`:
```json
{
  "status": "ok",
  "token": "<one-time-redirect-token>",
  "sessionId": "<64-char-hex>",
  "expiresIn": 1800000
}
```

**Errors**: `400` (nonce expired / commitment mismatch / invalid proof), `403` (account suspended), `404` (user not found)

---

### `GET /commitment/:username`

Fetch a user's stored commitment and issue a fresh nonce for login.

| Parameter | Description |
|-----------|-------------|
| `:username` | Registered username |

**Response** `200`:
```json
{
  "username": "azri_bcss",
  "commitment": "<poseidon-hash>",
  "nonce": "<64-bit-random-bigint-string>"
}
```

**Side Effect**: Updates `nonce` and `nonceTime` in database. Nonce expires in **60 seconds**.

---

### `GET /check-username/:username`

Check if a username is available for registration.

**Response** `200`:
```json
{ "available": true }
```

---

## 2. Mobile Access Token (MAT) Routes

### `POST /generate-mobile-access-token`

Generate a single-use MAT for mobile-to-web bridge authentication.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `deviceId` | string | ✅ | Android device identifier |
| `action` | string | ✅ | `"register"` or `"login"` |

**Response** `200`:
```json
{
  "mobileAccessToken": "<64-char-hex>",
  "expiresIn": 300000,
  "action": "login"
}
```

**TTL**: 5 minutes. Single-use — marked `used: true` on first consumption.

---

## 3. Token & Session Routes

### `GET /validate-token`

Validate and consume a one-time redirect token (used after ZKP auth).

| Query Param | Type | Required | Description |
|-------------|------|----------|-------------|
| `token` | string | ✅ | One-time token from `/register` or `/login` |
| `device` | string | ❌ | Device ID to bind to session |

**Response** `200`:
```json
{
  "valid": true,
  "username": "azri_bcss",
  "sessionId": "<64-char-hex>",
  "type": "login"
}
```

**Side Effect**: Token is deleted (consumed). Device is bound to session if provided.

---

### `POST /validate-session`

Check if a session is still valid.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sessionId` | string | ✅ | Session identifier |

**Response** `200`:
```json
{
  "valid": true,
  "username": "azri_bcss",
  "expiresAt": 1714635000000,
  "createdAt": 1714633200000
}
```

---

### `POST /refresh-session`

Rotate a session ID (anti-replay) and extend its TTL.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sessionId` | string | ✅ | Current session ID |
| `deviceId` | string | ✅ | Must match the bound device |

**Response** `200`:
```json
{
  "status": "ok",
  "sessionId": "<new-64-char-hex>",
  "expiresIn": 1800000,
  "expiresAt": 1714636800000
}
```

**Security**: Returns `403` if `deviceId` doesn't match the bound device. Old session is deleted.

---

### `POST /logout`

Invalidate a session and set the user offline.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sessionId` | string | ✅ | Session to invalidate |

**Response** `200`:
```json
{ "status": "ok", "message": "Logged out successfully" }
```

**Side Effect**: User's Firestore `activityStatus` set to `"Offline"`.

---

## 4. Firebase Bridge

### `POST /firebase-token`

Generate a Firebase custom token for Firestore authentication.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sessionId` | string | ✅ | Valid session ID |

**Response** `200`:
```json
{ "firebaseToken": "<firebase-custom-token>" }
```

**Flow**: Mobile calls `signInWithCustomToken(firebaseToken)` to access Firestore.

---

## 5. Threat Detection

### `POST /threat-log`

Report an ML-detected threat from on-device inference.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `senderId` | string | ✅ | Username of the sender |
| `receiverId` | string | ✅ | Username of the receiver |
| `content` | string | ✅ | Message text (max 2000 chars) |
| `threatScore` | number | ✅ | 0.0–1.0 from TFLite model |
| `timestamp` | number | ❌ | Original message timestamp |

**Response** `200`:
```json
{ "status": "ok", "logId": "<32-char-hex>" }
```

**Side Effect**: Broadcasts `UPDATE` event to all connected admin SSE clients.

---

## 6. Push Notifications

### `POST /notify`

Trigger an FCM push notification (metadata only — no message content).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `toUserId` | string | ✅ | Target username |
| `type` | string | ✅ | `"message"` or `"call"` |
| `senderName` | string | ❌ | Display name of sender |
| `callType` | string | ❌ | `"audio"` or `"video"` (for calls) |
| `callId` | string | ❌ | Firestore call document ID |

**Response** `200`:
```json
{ "sent": true }
```

**Notification Types**:
- **Message**: Data-only push (silent). App decrypts and builds notification locally.
- **Call**: Visible notification with ringtone. Channel: `sentrizk_calls`, priority: HIGH.

---

## 7. Admin Routes

All admin routes require `Authorization: Bearer <admin-jwt>` header.

### `POST /admin/login`

Authenticate as admin.

**Rate Limit**: 5 requests/minute per IP

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `username` | string | ✅ | Admin username (from `.env`) |
| `password` | string | ✅ | Admin password (bcrypt or plaintext with `timingSafeEqual`) |

**Response** `200`:
```json
{ "token": "<admin-jwt>", "expiresIn": "1h" }
```

---

### `GET /admin/stream`

Server-Sent Events (SSE) stream for real-time dashboard updates.

**Headers**: `Content-Type: text/event-stream`

**Events** (JSON `data` field):
```json
{ "type": "CONNECTED" }
{ "type": "UPDATE", "timestamp": 1714633200000 }
```

Broadcasts occur on: user registration, user hold/restore/revoke, threat log received.

---

### `GET /admin/users`

List all registered users.

**Response** `200`:
```json
{
  "users": [
    { "username": "azri_bcss", "status": "active", "registeredAt": 1714633200000, "lastLogin": 1714635000000 }
  ]
}
```

---

### `POST /admin/users/hold`

Suspend a user account.

| Field | Type | Required |
|-------|------|----------|
| `username` | string | ✅ |

**Side Effects**: Sets Supabase `status='held'`, Firestore `accountStatus='held'` + `activityStatus='Offline'`. Login returns `403`.

---

### `POST /admin/users/restore`

Restore a suspended user.

| Field | Type | Required |
|-------|------|----------|
| `username` | string | ✅ |

---

### `POST /admin/users/revoke`

Permanently delete a user and all their data.

| Field | Type | Required |
|-------|------|----------|
| `username` | string | ✅ |

**Cascade Delete**: Supabase (users, sessions, tokens) → Firestore (accountStatus='revoked' → 1.5s delay → delete messages, chats, user doc, Firebase Auth user).

---

### `GET /admin/threat-logs`

Retrieve all ML threat logs (newest first).

**Response** `200`:
```json
{
  "logs": [
    {
      "id": "<hex>", "senderId": "alice", "receiverId": "bob",
      "content": "click this link", "threatScore": 0.87,
      "timestamp": 1714633200000, "reportedAt": 1714633200000,
      "resolutionStatus": null, "resolvedBy": null, "resolvedAt": null
    }
  ],
  "total": 5
}
```

---

### `POST /admin/threat-logs/:id/status`

Update resolution status of a threat log.

| Field | Type | Required | Values |
|-------|------|----------|--------|
| `status` | string | ✅ | `"false-positive"`, `"true-positive"`, `"pending"` |

---

### `DELETE /admin/threat-logs/:id`

Permanently delete a threat log.

---

## 8. Health Check

### `GET /health`

```json
{ "ok": true, "db": "supabase" }
```

---

## Error Response Format

All error responses follow this format:
```json
{ "error": "Human-readable error message", "details": "Optional technical details" }
```

## Rate Limiting Summary

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /register` | 10 req | 1 minute |
| `POST /login` | 10 req | 1 minute |
| `POST /admin/login` | 5 req | 1 minute |
| All others | Unlimited | — |
