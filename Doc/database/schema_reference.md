# 🗄️ Database Schema Reference

> SentriZK uses a dual-database architecture:
> - **Supabase PostgreSQL** — Authentication state, sessions, tokens, threat logs
> - **Firebase Firestore** — Real-time chat data, user profiles, call signaling, push tokens

---

## 1. Supabase PostgreSQL

All tables are defined in [`Backend/supabase_schema.sql`](../../Backend/supabase_schema.sql).

### `users` — Core User Registry

Stores ZKP commitments. **No passwords are ever stored.**

| Column | Type | Constraint | Description |
|--------|------|-----------|-------------|
| `username` | `text` | **PRIMARY KEY** | Unique username (3–20 lowercase alphanumeric + underscores) |
| `commitment` | `text` | `NOT NULL` | Poseidon hash commitment — `Poseidon(secret, salt, unameHash)` |
| `registeredAt` | `bigint` | `NOT NULL` | Unix timestamp (ms) of registration |
| `lastLogin` | `bigint` | nullable | Unix timestamp (ms) of most recent login |
| `status` | `text` | `DEFAULT 'active'` | Account status: `active`, `held`, `revoked` |
| `heldAt` | `bigint` | nullable | When the account was suspended |
| `heldBy` | `text` | nullable | Admin username who suspended the account |
| `nonce` | `text` | nullable | Current login nonce (64-bit random BigInt string) |
| `nonceTime` | `bigint` | nullable | When the nonce was issued (enforces 60s TTL) |

### `sessions` — Active User Sessions

| Column | Type | Constraint | Description |
|--------|------|-----------|-------------|
| `sessionId` | `text` | **PRIMARY KEY** | 64-character hex token (`crypto.randomBytes(32)`) |
| `username` | `text` | `NOT NULL` | Owner of the session |
| `expires` | `bigint` | `NOT NULL` | Unix timestamp (ms) — session TTL is 30 minutes |
| `createdAt` | `bigint` | `NOT NULL` | When the session was first created |
| `deviceId` | `text` | nullable | Bound device fingerprint (set on token validation) |
| `validatedAt` | `bigint` | nullable | When the MAT was successfully bridged |
| `refreshedAt` | `bigint` | nullable | When the session was last rotated via `/refresh-session` |

**Index**: `idx_sessions_username ON sessions(username)`

### `tokens` — One-Time Redirect Tokens

Single-use tokens for the mobile deep-link handoff after ZKP authentication.

| Column | Type | Constraint | Description |
|--------|------|-----------|-------------|
| `token` | `text` | **PRIMARY KEY** | 32-character hex token (`crypto.randomBytes(16)`) |
| `username` | `text` | `NOT NULL` | Associated user |
| `expires` | `bigint` | `NOT NULL` | Unix timestamp (ms) — token TTL is 60 seconds |
| `type` | `text` | `NOT NULL` | `"registration"` or `"login"` |
| `sessionId` | `text` | nullable | Bound session ID (for login tokens) |

**Index**: `idx_tokens_expires ON tokens(expires)`

### `mobile_access_tokens` — MAT (Mobile ↔ Browser Bridge)

| Column | Type | Constraint | Description |
|--------|------|-----------|-------------|
| `mat` | `text` | **PRIMARY KEY** | 64-character hex token (`crypto.randomBytes(32)`) |
| `deviceId` | `text` | `NOT NULL` | Android device identifier |
| `action` | `text` | `NOT NULL` | `"register"` or `"login"` |
| `expires` | `bigint` | `NOT NULL` | Unix timestamp (ms) — MAT TTL is 5 minutes |
| `used` | `boolean` | `DEFAULT false` | Marked `true` on first use (single-use enforcement) |
| `createdAt` | `bigint` | `NOT NULL` | When the MAT was generated |

**Index**: `idx_mat_expires ON mobile_access_tokens(expires)`

### `threat_logs` — ML Insider Threat Detections

| Column | Type | Constraint | Description |
|--------|------|-----------|-------------|
| `id` | `text` | **PRIMARY KEY** | 32-character hex ID (`crypto.randomBytes(16)`) |
| `senderId` | `text` | `NOT NULL` | Username who sent the flagged message |
| `receiverId` | `text` | `NOT NULL` | Username of the intended recipient |
| `content` | `text` | `NOT NULL` | Message text content (max 2000 chars) |
| `threatScore` | `float8` | `NOT NULL` | TFLite model output: 0.0 (safe) to 1.0 (threat) |
| `timestamp` | `bigint` | `NOT NULL` | Original message timestamp |
| `reportedAt` | `bigint` | `NOT NULL` | When the log reached the server |
| `resolutionStatus` | `text` | nullable | `"pending"`, `"true-positive"`, `"false-positive"` |
| `resolvedBy` | `text` | nullable | Admin who resolved the log |
| `resolvedAt` | `bigint` | nullable | When the log was resolved |

**Index**: `idx_threats_sender ON threat_logs("senderId")`

---

## 2. Firebase Firestore

### Collection: `users/{username}`

User profiles (synced from mobile app).

| Field | Type | Description |
|-------|------|-------------|
| `displayName` | string | User's display name |
| `avatarUrl` | string | Profile image URL (Firebase Storage) |
| `activityStatus` | string | `"Online"` or `"Offline"` |
| `accountStatus` | string | `"active"`, `"held"`, or `"revoked"` |
| `bio` | string | User bio text |
| `updatedAt` | Timestamp | Server timestamp of last update |

### Collection: `signals/{username}`

Signal Protocol pre-key bundles for E2EE session establishment (X3DH).

| Field | Type | Description |
|-------|------|-------------|
| `registrationId` | int | Signal registration ID |
| `deviceId` | int | Always `1` (single-device) |
| `identityKey` | string | Base64-encoded long-term identity public key |
| `signedPreKey` | map | `{ id: int, publicKey: string, signature: string }` |
| `preKeys` | array | `[{ id: int, publicKey: string }]` × 100 one-time pre-keys |

### Collection: `chats/{chatId}`

Chat conversation metadata. `chatId` format: alphabetically sorted `"userA_userB"`.

| Field | Type | Description |
|-------|------|-------------|
| `participants` | array | `[userA, userB]` |
| `lastMessage` | string | Preview text (may be ciphertext indicator) |
| `lastMessageTime` | Timestamp | Time of the last message |
| `lastSenderId` | string | Username of the last sender |

### Subcollection: `chats/{chatId}/messages/{msgId}`

Individual encrypted messages.

| Field | Type | Description |
|-------|------|-------------|
| `senderId` | string | Username of the sender |
| `type` | int | Signal message type: `3` = PREKEY (first message), `1` = WHISPER |
| `ciphertext` | string | Base64-encoded Signal Protocol encrypted payload |
| `timestamp` | Timestamp | When the message was sent |
| `isRead` | bool | Read receipt status |

### Collection: `calls/{callId}`

WebRTC call signaling.

| Field | Type | Description |
|-------|------|-------------|
| `callerId` | string | Username of the caller |
| `receiverId` | string | Username of the receiver |
| `type` | string | `"audio"` or `"video"` |
| `status` | string | `"outgoing"`, `"ringing"`, `"active"`, `"ended"`, `"rejected"`, `"missed"` |
| `offer` | map | `{ type: string, sdp: string }` — WebRTC SDP offer |
| `answer` | map | `{ type: string, sdp: string }` — WebRTC SDP answer |
| `createdAt` | Timestamp | Call initiation time |
| `endedAt` | Timestamp | Call end time |

### Subcollection: `calls/{callId}/ice/{docId}`

ICE candidate exchange for WebRTC connection negotiation.

| Field | Type | Description |
|-------|------|-------------|
| `senderId` | string | Who sent this ICE candidate |
| `candidate` | map | `{ candidate, sdpMid, sdpMLineIndex }` |
| `ts` | Timestamp | When the candidate was sent |

### Collection: `fcmTokens/{username}`

Firebase Cloud Messaging registration tokens.

| Field | Type | Description |
|-------|------|-------------|
| `token` | string | FCM device registration token |
| `updatedAt` | Timestamp | When the token was last refreshed |

---

## 3. Data Lifecycle

### Token Expiration & Cleanup

| Token Type | TTL | Cleanup Mechanism |
|-----------|-----|-------------------|
| Nonce | 60 seconds | Consumed on login, validated by `nonceTime` check |
| One-time redirect token | 60 seconds | Consumed on `/validate-token`, GC deletes expired |
| MAT | 5 minutes | Marked `used=true` on first use, GC deletes expired |
| Session | 30 minutes | GC deletes expired, rotation on `/refresh-session` |
| Admin JWT | Configurable (`JWT_TTL`) | Verified on each request, no server-side storage |

**Garbage Collection**: Probabilistic — 10% chance per API request triggers `cleanupExpiredTokens()` which purges all expired tokens, sessions, and MATs in parallel. Expired sessions also trigger Firestore `activityStatus: "Offline"` updates.
