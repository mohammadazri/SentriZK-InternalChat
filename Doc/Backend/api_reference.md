# 🔌 SentriZK Backend API Reference

Complete API documentation for the SentriZK authentication server.

---

## 📋 Table of Contents

- [Base URL](#base-url)
- [Authentication Endpoints](#authentication-endpoints)
- [Session Management](#session-management)
- [Mobile Access Tokens](#mobile-access-tokens)
- [Utility Endpoints](#utility-endpoints)
- [Error Codes](#error-codes)
- [Rate Limiting](#rate-limiting)

---

## Base URL

```
http://localhost:3000
```

All endpoints are relative to this base URL. In production, replace with your deployed server URL.

---

## Authentication Endpoints

### 1. Check Username Availability

Check if a username is already registered.

**Endpoint:** `GET /check-username/:username`

**Parameters:**
- `username` (path parameter): The username to check

**Response:**

```json
{
  "available": true
}
```

or

```json
{
  "available": false
}
```

**Example:**

```bash
curl http://localhost:3000/check-username/alice
```

---

### 2. Register New User

Register a new user with Zero-Knowledge Proof.

**Endpoint:** `POST /register`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**

```json
{
  "username": "alice",
  "proof": {
    "pi_a": ["...", "...", "1"],
    "pi_b": [["...", "..."], ["...", "..."], ["1", "0"]],
    "pi_c": ["...", "...", "1"],
    "protocol": "groth16",
    "curve": "bn128"
  },
  "publicSignals": [
    "commitment_value",
    "username_hash"
  ]
}
```

**Response (Success):**

```json
{
  "success": true,
  "message": "Registration successful",
  "username": "alice"
}
```

**Response (Error):**

```json
{
  "error": "Username already exists"
}
```

or

```json
{
  "error": "Invalid proof"
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice",
    "proof": {...},
    "publicSignals": [...]
  }'
```

---

### 3. User Login

Authenticate user with Zero-Knowledge Proof.

**Endpoint:** `POST /login`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**

```json
{
  "username": "alice",
  "proof": {
    "pi_a": ["...", "...", "1"],
    "pi_b": [["...", "..."], ["...", "..."], ["1", "0"]],
    "pi_c": ["...", "...", "1"],
    "protocol": "groth16",
    "curve": "bn128"
  },
  "publicSignals": [
    "commitment_value",
    "nullifier_hash"
  ]
}
```

**Response (Success):**

```json
{
  "success": true,
  "message": "Login successful",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "username": "alice"
}
```

**Response (Error):**

```json
{
  "error": "User not found"
}
```

or

```json
{
  "error": "Invalid proof"
}
```

or

```json
{
  "error": "Nonce expired or not found"
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice",
    "proof": {...},
    "publicSignals": [...]
  }'
```

---

### 4. Get User Commitment (Nonce)

Retrieve commitment and generate a time-limited nonce for login.

**Endpoint:** `GET /commitment/:username`

**Parameters:**
- `username` (path parameter): The username

**Response:**

```json
{
  "commitment": "1234567890",
  "nonce": "9876543210",
  "expiresAt": 1699999999999
}
```

**Response (Error):**

```json
{
  "error": "User not found"
}
```

**Example:**

```bash
curl http://localhost:3000/commitment/alice
```

**Note:** The nonce expires in 60 seconds. You must complete login before expiration.

---

## Session Management

### 5. Validate Session

Check if a session ID is valid and not expired.

**Endpoint:** `POST /validate-session`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**

```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response (Valid):**

```json
{
  "valid": true,
  "username": "alice",
  "createdAt": 1699999999999,
  "expiresAt": 1700001799999
}
```

**Response (Invalid):**

```json
{
  "valid": false,
  "error": "Session not found or expired"
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/validate-session \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "550e8400-e29b-41d4-a716-446655440000"}'
```

---

### 6. Refresh Session

Extend session expiration time.

**Endpoint:** `POST /refresh-session`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**

```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response (Success):**

```json
{
  "success": true,
  "message": "Session refreshed",
  "expiresAt": 1700003599999
}
```

**Response (Error):**

```json
{
  "error": "Session not found or expired"
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/refresh-session \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "550e8400-e29b-41d4-a716-446655440000"}'
```

---

### 7. Logout

End a user session.

**Endpoint:** `POST /logout`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**

```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/logout \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "550e8400-e29b-41d4-a716-446655440000"}'
```

---

## Mobile Access Tokens

### 8. Generate Mobile Access Token (MAT)

Generate a one-time token for mobile-to-web authentication flow.

**Endpoint:** `POST /generate-mobile-access-token`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**

```json
{
  "deviceId": "device_abc123",
  "action": "register"
}
```

or

```json
{
  "deviceId": "device_abc123",
  "action": "login"
}
```

**Response:**

```json
{
  "mobileAccessToken": "mat_1234567890abcdef",
  "expiresAt": 1699999999999,
  "action": "register"
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/generate-mobile-access-token \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "device_abc123",
    "action": "register"
  }'
```

**Note:** MAT expires in 5 minutes and can only be used once.

---

### 9. Validate Mobile Access Token

Check if a MAT is valid (used internally by web frontend).

**Endpoint:** `GET /validate-token?token=mat_xxx&device=device_xxx&action=register`

**Query Parameters:**
- `token`: The mobile access token
- `device`: The device ID
- `action`: Either "register" or "login"

**Response (Valid):**

```json
{
  "valid": true,
  "action": "register",
  "deviceId": "device_abc123"
}
```

**Response (Invalid):**

```json
{
  "valid": false,
  "error": "Token expired or not found"
}
```

**Example:**

```bash
curl "http://localhost:3000/validate-token?token=mat_xxx&device=device_xxx&action=register"
```

---

## Utility Endpoints

### 10. Health Check

Check if the server is running.

**Endpoint:** `GET /health`

**Response:**

```json
{
  "ok": true
}
```

**Example:**

```bash
curl http://localhost:3000/health
```

---

## Error Codes

| HTTP Status | Error Message | Description |
|------------|---------------|-------------|
| 200 | OK | Request successful |
| 400 | Invalid proof | ZKP verification failed |
| 400 | Missing required fields | Request body incomplete |
| 400 | Nonce expired or not found | Login nonce has expired (60s TTL) |
| 400 | Token expired or not found | MAT has expired (5min TTL) |
| 404 | User not found | Username doesn't exist |
| 409 | Username already exists | Registration with existing username |
| 429 | Too Many Requests | Rate limit exceeded (10 req/min) |
| 500 | Internal server error | Server-side error |

---

## Rate Limiting

The following endpoints are rate-limited to **10 requests per minute** per IP address:

- `POST /register`
- `POST /login`

If you exceed the limit, you'll receive:

```json
{
  "error": "Too many requests, please try again later"
}
```

**HTTP Status:** 429 Too Many Requests

---

## Security Considerations

### 1. HTTPS in Production
Always use HTTPS in production to prevent man-in-the-middle attacks.

### 2. CORS Configuration
Configure CORS to allow only trusted frontend domains:

```javascript
app.use(cors({
  origin: 'https://your-frontend-domain.com'
}));
```

### 3. Token Storage
- Sessions are stored in-memory (file-based `db.json`)
- In production, use Redis or a proper database

### 4. Nonce Expiration
- Nonces expire in 60 seconds
- Prevent replay attacks
- Client must complete login within the window

### 5. Session Expiration
- Sessions expire in 30 minutes
- Mobile Access Tokens expire in 5 minutes
- Automatic cleanup of expired tokens

---

## Example Workflows

### Registration Workflow

```bash
# 1. Check username availability
curl http://localhost:3000/check-username/alice

# 2. Generate ZKP proof on client (using snarkjs)

# 3. Submit registration
curl -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{"username": "alice", "proof": {...}, "publicSignals": [...]}'
```

### Login Workflow

```bash
# 1. Get commitment and nonce
curl http://localhost:3000/commitment/alice

# 2. Generate ZKP proof with nonce on client

# 3. Submit login
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"username": "alice", "proof": {...}, "publicSignals": [...]}'

# 4. Use returned sessionId for authenticated requests
```

### Mobile-to-Web Workflow

```bash
# 1. Mobile app generates MAT
curl -X POST http://localhost:3000/generate-mobile-access-token \
  -H "Content-Type: application/json" \
  -d '{"deviceId": "device_123", "action": "register"}'

# 2. Mobile app opens browser with MAT:
# https://webapp.com/register?mat=mat_xxx&device=device_123

# 3. Web frontend validates MAT
curl "http://localhost:3000/validate-token?token=mat_xxx&device=device_123&action=register"

# 4. User completes registration in browser

# 5. Browser redirects back to mobile:
# myapp://auth-callback?token=jwt_xxx&username=alice
```

---

## Support

For issues or questions, please contact:
- **Email**: mohamedazri@protonmail.com
- **GitHub Issues**: https://github.com/mohammadazri/SentriZK-InternalChat/issues
