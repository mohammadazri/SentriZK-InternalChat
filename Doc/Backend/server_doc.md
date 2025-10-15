

# **SentriZK Authentication – Frontend Developer Guide**

## **Overview**

This system leverages **Zero-Knowledge Proofs (ZKP)** to allow users to register and log in **without exposing their secret credentials**. Each user has:

* **Commitment:** Hash derived from their secret (e.g., a wallet private key).
* **Nonce:** One-time server-issued value for login sessions.
* **Session:** Derived from Poseidon hash for session validation.

Key principles:

1. Users **never transmit their secret directly**.
2. Authentication involves **generating ZKP proofs** using the secret and server-provided nonce.
3. Login is **resistant to replay attacks**.

---

## **Server Base URL**

Default:

```
http://localhost:5000
```

Replace with the production URL when deployed.

---

## **API Endpoints**

### **1. Health Check**

* **URL:** `/health`
* **Method:** `GET`
* **Response:**

```json
{ "ok": true }
```

> Purpose: Verify server availability.

---

### **2. Check Username Availability**

* **URL:** `/check-username/:username`
* **Method:** `GET`
* **Response:**

```json
{ "available": true } // or false
```

> Usage: Ensure username is not already registered before registration.

---

### **3. Fetch Commitment + Nonce (Anti-Replay)**

* **URL:** `/commitment/:username`
* **Method:** `GET`
* **Response:**

```json
{
  "username": "alice",
  "commitment": "1234567890",
  "nonce": "9876543210"
}
```

**Frontend Flow:**

1. Call this endpoint before login.
2. Receive **nonce** to generate the login proof.
3. Nonce is valid **only once**, preventing replay attacks.

---

### **4. Registration**

* **URL:** `/register`
* **Method:** `POST`
* **Request Body:**

```json
{
  "username": "alice",
  "proof": { /* ZKP proof */ },
  "publicSignals": [ /* commitment */ ]
}
```

* **Response (Success):**

```json
{
  "status": "ok",
  "username": "alice",
  "commitment": "1234567890"
}
```

**Frontend Flow:**

1. Generate **commitment** from the user’s secret.
2. Generate **ZKP proof** using the commitment.
3. Send proof and `publicSignals` to `/register`.
4. Check response status.

---

### **5. Login**

* **URL:** `/login`
* **Method:** `POST`
* **Request Body:**

```json
{
  "username": "alice",
  "proof": { /* ZKP proof using commitment + nonce */ },
  "publicSignals": [
      "commitment",
      "session" // Poseidon(commitment, nonce)
  ]
}
```

* **Response (Success):**

```json
{
  "status": "ok",
  "message": "Login successful",
  "session": "9876543210"
}
```

**Frontend Flow:**

1. Fetch **commitment + nonce** from `/commitment/:username`.
2. Generate **login proof** using:

```
ZKP(secret, nonce)
```

3. Send proof + `publicSignals` to `/login`.
4. On success, store **session** for authenticated requests.

---

## **Security Notes**

1. **Never send secrets** directly—always use ZKP.
2. **Nonce changes each login**; never reuse old ones.
3. **Commitment alone** is useless without the secret and correct proof.
4. Treat **session** as a temporary login token.

---

## **Example Frontend Flow (Pseudo-JS)**

```js
// Check username availability
const res = await fetch(`/check-username/${username}`);
const { available } = await res.json();
if (!available) throw new Error("Username taken");

// Register
const regProof = generateZKP(secret);
const regSignals = getPublicSignals(secret);
await fetch('/register', {
  method: 'POST',
  body: JSON.stringify({ username, proof: regProof, publicSignals: regSignals }),
  headers: { 'Content-Type': 'application/json' }
});

// Login
const commitRes = await fetch(`/commitment/${username}`);
const { commitment, nonce } = await commitRes.json();

const loginProof = generateLoginZKP(secret, nonce);
const loginSignals = [commitment, poseidon(commitment, nonce)];

const loginRes = await fetch('/login', {
  method: 'POST',
  body: JSON.stringify({ username, proof: loginProof, publicSignals: loginSignals }),
  headers: { 'Content-Type': 'application/json' }
});
const { session } = await loginRes.json();
```

---

## **Frontend Developer Checklist**

* [ ] Integrate a **ZKP library** (e.g., `snarkjs`).
* [ ] Always fetch **nonce before login**.
* [ ] Generate proofs **in the browser**; never expose secrets.
* [ ] Handle server errors gracefully (`commitment mismatch`, `session mismatch`, `invalid proof`).
* [ ] Store session token securely for authenticated requests.

---

