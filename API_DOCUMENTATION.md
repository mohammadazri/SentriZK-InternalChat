# SentriZK API Documentation

## Base URL
```
http://localhost:6000
```
Or your ngrok URL in production.

---

## Authentication Endpoints

### 1. Generate Mobile Access Token
**Generate a secure token for mobile-to-web communication**

- **URL**: `/generate-mobile-access-token`
- **Method**: `POST`
- **Auth Required**: No
- **Rate Limited**: No

#### Request Body
```json
{
  "deviceId": "string",  // Unique device identifier
  "action": "register" | "login"  // Type of action
}
```

#### Success Response (200 OK)
```json
{
  "mobileAccessToken": "a1b2c3d4e5f6...",
  "expiresIn": 300000,  // milliseconds (5 minutes)
  "action": "register"
}
```

#### Error Responses
- **400 Bad Request**: Missing deviceId or action
```json
{
  "error": "deviceId and action required"
}
```

- **400 Bad Request**: Invalid action
```json
{
  "error": "action must be 'register' or 'login'"
}
```

---

### 2. Check Username Availability
**Check if a username is already registered**

- **URL**: `/check-username/:username`
- **Method**: `GET`
- **Auth Required**: No
- **Rate Limited**: No

#### URL Parameters
- `username`: String - The username to check

#### Success Response (200 OK)
```json
{
  "available": true  // false if username exists
}
```

---

### 3. Get Commitment and Nonce
**Fetch user commitment and generate fresh nonce for login**

- **URL**: `/commitment/:username`
- **Method**: `GET`
- **Auth Required**: No
- **Rate Limited**: No

#### URL Parameters
- `username`: String - The username

#### Success Response (200 OK)
```json
{
  "username": "alice123",
  "commitment": "123456789...",
  "nonce": "987654321..."
}
```

#### Error Responses
- **404 Not Found**: User doesn't exist
```json
{
  "error": "User not found"
}
```

---

### 4. Register User
**Register a new user with ZKP proof**

- **URL**: `/register`
- **Method**: `POST`
- **Auth Required**: No
- **Rate Limited**: Yes (10 requests/minute per IP)

#### Request Body
```json
{
  "username": "string",
  "proof": {
    "pi_a": [...],
    "pi_b": [...],
    "pi_c": [...],
    "protocol": "groth16",
    "curve": "bn128"
  },
  "publicSignals": ["commitment"]
}
```

#### Success Response (200 OK)
```json
{
  "status": "ok",
  "token": "abc123..."  // Redirect token (1 min expiry)
}
```

#### Error Responses
- **400 Bad Request**: Missing fields
```json
{
  "error": "Missing field: username"
}
```

- **400 Bad Request**: Invalid proof
```json
{
  "error": "Invalid registration proof"
}
```

- **400 Bad Request**: Username taken
```json
{
  "error": "Username already registered"
}
```

- **503 Service Unavailable**: Poseidon not initialized
```json
{
  "error": "Poseidon not initialized yet. Try again shortly."
}
```

---

### 5. Login User
**Authenticate user with ZKP proof**

- **URL**: `/login`
- **Method**: `POST`
- **Auth Required**: No
- **Rate Limited**: Yes (10 requests/minute per IP)

#### Request Body
```json
{
  "username": "string",
  "proof": {
    "pi_a": [...],
    "pi_b": [...],
    "pi_c": [...],
    "protocol": "groth16",
    "curve": "bn128"
  },
  "publicSignals": ["commitment", "sessionHash"]
}
```

#### Success Response (200 OK)
```json
{
  "status": "ok",
  "token": "xyz789...",  // Redirect token (1 min expiry)
  "sessionId": "session123...",  // Session identifier
  "expiresIn": 1800000  // milliseconds (30 minutes)
}
```

#### Error Responses
- **400 Bad Request**: Missing fields
```json
{
  "error": "Missing field: proof"
}
```

- **404 Not Found**: User doesn't exist
```json
{
  "error": "User not found"
}
```

- **400 Bad Request**: Nonce expired
```json
{
  "error": "Nonce expired or not issued"
}
```

- **400 Bad Request**: Invalid proof
```json
{
  "error": "Invalid login proof"
}
```

- **400 Bad Request**: Commitment mismatch
```json
{
  "error": "Commitment mismatch"
}
```

- **400 Bad Request**: Session mismatch
```json
{
  "error": "Session mismatch"
}
```

---

## Session Management Endpoints

### 6. Validate Token
**Validate a redirect token (used by mobile after redirect)**

- **URL**: `/validate-token`
- **Method**: `GET`
- **Auth Required**: No
- **Rate Limited**: No

#### Query Parameters
- `token`: String - The redirect token

#### Success Response (200 OK)
```json
{
  "valid": true,
  "username": "alice123",
  "sessionId": "session123...",  // Only for login tokens
  "type": "login"  // or "registration"
}
```

#### Error Responses
- **400 Bad Request**: Invalid or expired token
```json
{
  "valid": false
}
```

---

### 7. Validate Session
**Check if a session is still valid**

- **URL**: `/validate-session`
- **Method**: `POST`
- **Auth Required**: No
- **Rate Limited**: No

#### Request Body
```json
{
  "sessionId": "string"
}
```

#### Success Response (200 OK)
```json
{
  "valid": true,
  "username": "alice123",
  "expiresAt": 1699876543210,  // Unix timestamp
  "createdAt": 1699874743210
}
```

#### Error Responses
- **400 Bad Request**: Missing sessionId
```json
{
  "valid": false,
  "error": "sessionId required"
}
```

- **400 Bad Request**: Session not found
```json
{
  "valid": false,
  "error": "Session not found"
}
```

- **400 Bad Request**: Session expired
```json
{
  "valid": false,
  "error": "Session expired"
}
```

---

### 8. Refresh Session
**Extend session timeout by another 30 minutes**

- **URL**: `/refresh-session`
- **Method**: `POST`
- **Auth Required**: No
- **Rate Limited**: No

#### Request Body
```json
{
  "sessionId": "string"
}
```

#### Success Response (200 OK)
```json
{
  "status": "ok",
  "sessionId": "session123...",
  "expiresIn": 1800000,  // milliseconds (30 minutes)
  "expiresAt": 1699878343210  // Unix timestamp
}
```

#### Error Responses
- **400 Bad Request**: Missing sessionId
```json
{
  "error": "sessionId required"
}
```

- **404 Not Found**: Session not found
```json
{
  "error": "Session not found"
}
```

- **400 Bad Request**: Session expired
```json
{
  "error": "Session expired"
}
```

---

### 9. Logout
**Invalidate a session**

- **URL**: `/logout`
- **Method**: `POST`
- **Auth Required**: No
- **Rate Limited**: No

#### Request Body
```json
{
  "sessionId": "string"
}
```

#### Success Response (200 OK)
```json
{
  "status": "ok",
  "message": "Logged out successfully"
}
```

#### Error Responses
- **400 Bad Request**: Missing sessionId
```json
{
  "error": "sessionId required"
}
```

---

## Health Check

### 10. Health Check
**Check if the server is running**

- **URL**: `/health`
- **Method**: `GET`
- **Auth Required**: No
- **Rate Limited**: No

#### Success Response (200 OK)
```json
{
  "ok": true
}
```

---

## Data Models

### User Object
```typescript
interface User {
  commitment: string;      // Poseidon hash commitment
  nonce?: string;          // Current nonce (temporary)
  nonceTime?: number;      // Nonce generation timestamp
  registeredAt: number;    // Registration timestamp
  lastLogin?: number;      // Last login timestamp
}
```

### Session Object
```typescript
interface Session {
  username: string;
  expires: number;         // Expiration timestamp
  createdAt: number;       // Creation timestamp
  refreshedAt?: number;    // Last refresh timestamp
}
```

### Token Object
```typescript
interface Token {
  username: string;
  expires: number;         // Expiration timestamp
  type: 'login' | 'registration';
  sessionId?: string;      // Only for login tokens
}
```

### Mobile Access Token Object
```typescript
interface MobileAccessToken {
  deviceId: string;
  action: 'register' | 'login';
  expires: number;         // Expiration timestamp
  used: boolean;           // Single-use flag
  createdAt: number;       // Creation timestamp
}
```

---

## Error Codes

| Code | Meaning |
|------|---------|
| 400  | Bad Request - Invalid input or expired data |
| 403  | Forbidden - Access denied (e.g., invalid MAT) |
| 404  | Not Found - Resource doesn't exist |
| 429  | Too Many Requests - Rate limit exceeded |
| 500  | Internal Server Error - Server-side error |
| 503  | Service Unavailable - Service not ready (e.g., Poseidon) |

---

## Rate Limiting

The following endpoints are rate limited:
- `/register`: 10 requests per minute per IP
- `/login`: 10 requests per minute per IP

**Headers Included in Rate-Limited Responses:**
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Time when limit resets

**429 Response:**
```json
{
  "error": "Too many requests, please try again later."
}
```

---

## Automatic Cleanup

The backend automatically cleans up expired data every minute:
- Expired tokens (1 minute TTL)
- Expired sessions (30 minute TTL)
- Expired mobile access tokens (5 minute TTL)
- Used nonces

---

## Security Headers

All responses include standard security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`

---

## CORS Configuration

CORS is enabled for all origins in development:
```javascript
app.use(cors());
```

For production, configure specific origins:
```javascript
app.use(cors({
  origin: ['https://yourdomain.com'],
  credentials: true
}));
```

---

## Request Examples

### JavaScript/TypeScript (axios)
```typescript
import axios from 'axios';

// Generate MAT
const matResponse = await axios.post('http://localhost:6000/generate-mobile-access-token', {
  deviceId: 'device-123',
  action: 'login'
});

// Login
const loginResponse = await axios.post('http://localhost:6000/login', {
  username: 'alice',
  proof: { /* proof object */ },
  publicSignals: ['12345', '67890']
});

// Validate session
const sessionResponse = await axios.post('http://localhost:6000/validate-session', {
  sessionId: loginResponse.data.sessionId
});
```

### Dart (http package)
```dart
import 'package:http/http.dart' as http;
import 'dart:convert';

// Generate MAT
final matResponse = await http.post(
  Uri.parse('http://localhost:6000/generate-mobile-access-token'),
  headers: {'Content-Type': 'application/json'},
  body: jsonEncode({
    'deviceId': 'device-123',
    'action': 'login',
  }),
);

// Refresh session
final refreshResponse = await http.post(
  Uri.parse('http://localhost:6000/refresh-session'),
  headers: {'Content-Type': 'application/json'},
  body: jsonEncode({
    'sessionId': 'session-123',
  }),
);
```

---

## Testing with curl

```bash
# Generate MAT
curl -X POST http://localhost:6000/generate-mobile-access-token \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"test-device","action":"register"}'

# Check username
curl http://localhost:6000/check-username/alice

# Validate session
curl -X POST http://localhost:6000/validate-session \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"your-session-id"}'

# Logout
curl -X POST http://localhost:6000/logout \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"your-session-id"}'

# Health check
curl http://localhost:6000/health
```

---

## Logging

The backend logs all requests and responses:

```
🔹 [Request] ------------------------------
➡️ Method: POST
➡️ URL   : /login
➡️ Headers: {...}
➡️ Body   : {...}
⬅️ [Response] -----------------------------
Status: 200
Body  : {...}
------------------------------------------
```

Additional logs:
- `🗄️ [db]`: Database operations
- `🔐 [ZKP]`: Proof verification
- `🧹 [cleanup]`: Token/session cleanup
- `🔒 [security]`: Security-related events

---

## Best Practices

1. **Always validate sessions** before performing sensitive operations
2. **Refresh sessions** periodically during active use
3. **Logout on app close** or user request
4. **Store session IDs securely** (never in plain text)
5. **Handle rate limits gracefully** with exponential backoff
6. **Implement request timeouts** (30 seconds recommended)
7. **Validate all inputs** on both client and server
8. **Use HTTPS** in production
9. **Monitor failed authentication attempts**
10. **Implement proper error handling** for all API calls

---

**For more information, see `IMPLEMENTATION_SUMMARY.md` and `QUICK_SETUP_GUIDE.md`**
