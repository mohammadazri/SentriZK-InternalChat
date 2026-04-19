# SentriZK — Manual Security Testing Plan
## CIA Triad Adversarial Attacks Requiring Physical / Visual Setup

> **Scope**: Tests in this document require a physical Android device,
> specific desktop tools (Burp Suite, Wireshark, jadx GUI, Frida),
> or visual evidence collection that cannot be scripted.
>
> **For each test**: Follow the steps exactly. Capture the screenshot/recording at the ✅ moment.

---

## Required Hardware & Tools

| Tool | Download | Purpose |
|------|---------|---------|
| **Android Phone** (API 24+) | — | Real APK target device |
| **USB Cable** | — | ADB connection |
| **Burp Suite Community** | [portswigger.net/burp](https://portswigger.net/burp/communitydownload) | Real HTTPS MITM proxy |
| **mitmproxy** | `pip install mitmproxy` | Scriptable HTTPS proxy |
| **Wireshark** | [wireshark.org](https://wireshark.org) | Network packet capture |
| **jadx-gui** | [github.com/skylot/jadx/releases](https://github.com/skylot/jadx/releases) | APK visual decompiler |
| **apktool** | `choco install apktool` | APK decoder |
| **Frida + frida-tools** | `pip install frida-tools` | Runtime instrumentation |
| **ADB** | [Android SDK Platform Tools](https://developer.android.com/studio/releases/platform-tools) | Device control |
| **Postman** | [postman.com](https://postman.com) | API manual testing |
| **Firebase Console** | browser | Firestore evidence |
| **Supabase Dashboard** | browser | DB evidence |

---

# ██ CONFIDENTIALITY MANUAL TESTS ██

---

## M-C1 — Real MITM: Burp Suite Against Live APK

**CIA**: Confidentiality | **Domain**: TLS / Network Security
**Attack goal**: Read ZKP proofs, session tokens, and messages in transit
**Captures**: Screenshot of Burp showing SSL error, no readable traffic

---

### SETUP (5 minutes, one-time)

#### Step 1 — Install Burp Suite Community
Download from portswigger.net → install → launch

#### Step 2 — Get your PC's local IP
```
Windows: ipconfig → find IPv4 (e.g., 192.168.1.105)
```

#### Step 3 — Configure Burp listener
```
Burp Suite → Proxy → Options → Proxy Listeners
  Edit binding → All interfaces (0.0.0.0) → Port 8080
  Check "Support invisible proxying"
```

#### Step 4 — Configure Android phone proxy
```
Settings → WiFi → Long-press your network → Modify network
Advanced options → Proxy: Manual
  Host: 192.168.1.105  (your PC IP)
  Port: 8080
```

#### Step 5 — Install Burp CA cert on phone (USER store)
```
On phone browser → http://burpsuite     (while proxy is active)
  → Download CA cert
Settings → Security → Install certificate → CA certificate
  → Choose the downloaded cacert.der
```

> ⚠️ This installs the CA in the USER trust store (not system store).
> Flutter on Android 7+ IGNORES user-installed CAs — this is the exact attack we're testing.

---

### ATTACK EXECUTION

#### Step 6 — Open Burp → Proxy → HTTP History (clear it first)

#### Step 7 — Launch SentriZK app on phone

#### Step 8 — Try to login

---

### EXPECTED EVIDENCE

**Burp HTTP History panel**:
```
#  Host                        Method  Status  Length
1  backend.sentrizk.me         CONNECT  ──     ──
   ↑ Connection tunneled but SSL handshake FAILED
   → Burp cannot inject its MITM certificate
   → No decrypted traffic appears
```

**SentriZK app behavior**: Network error (cannot connect) while Burp is active.

**Screenshot to capture**: Burp HTTP History showing CONNECT attempts with no decoded bodies.

**Why it works (show examiner)**:
- Manifest has NO `networkSecurityConfig` attribute
- Flutter's Dart TLS stack uses Android's system trust store
- Burp cert is in USER store → ignored by Android API 24+
- `android:networkSecurityConfig` with `<certificates src="system"/>` is the default

---

## M-C1b — Real MITM: mitmproxy (Advanced — Shows SSL Error Live)

mitmproxy gives cleaner visual output than Burp for this demo.

### Steps

```bash
# Terminal 1 — Start mitmproxy (PC)
mitmdump --listen-host 0.0.0.0 --listen-port 8080 -v

# Install mitmproxy CA cert on phone:
# Phone browser → http://mitm.it → Download cert → Install as CA
```

```
Phone: Set WiFi proxy → PC_IP:8080
Open SentriZK app → attempt login
```

### Expected mitmdump output (proves real attack):
```
192.168.1.120:51234: clientconnect
192.168.1.120:51234: Establish TLS with client...
192.168.1.120:51234: TLS handshake failed.
                     The client does not trust the proxy's certificate.
                     Client OS error: CERTIFICATE_VERIFY_FAILED
192.168.1.120:51234: clientdisconnect

192.168.1.120:51235: clientconnect
192.168.1.120:51235: TLS handshake failed (same error)
192.168.1.120:51235: clientdisconnect
```

**Evidence**: Terminal screenshot showing `CERTIFICATE_VERIFY_FAILED` for every SentriZK connection attempt.

---

## M-C2 — Wireshark Packet Capture: All Traffic Is Encrypted

**CIA**: Confidentiality | **Domain**: Network Layer
**Attack goal**: Use Wireshark to read message content in raw packets
**Captures**: Wireshark screenshot showing TLS records, zero plaintext

### Steps

#### Step 1 — Set up Wireshark
```
Launch Wireshark → Select your WiFi adapter
Filter: ip.addr == [phone_IP]
Start capture
```

#### Step 2 — Get phone's IP
```
Android: Settings → WiFi → Connected network → IP Address
Example: 192.168.1.120
```

#### Step 3 — Send messages in SentriZK app

#### Step 4 — Check Wireshark

**Expected capture**:
```
No.  Time     Source             Destination         Protocol  Info
1    0.001    192.168.1.120     backend.sentrizk.me  TLSv1.3  Application Data
2    0.002    backend.sentrizk.me 192.168.1.120      TLSv1.3  Application Data
...

All packets: TLSv1.3 Application Data — encrypted binary blob
Right-click → Follow TCP Stream → shows only gibberish
```

**Wireshark display filter** to focus on what matters:
```
ip.addr == 192.168.1.120 and tls
```

**Screenshot to capture**: Wireshark stream view showing encrypted TLS Application Data, NO plaintext JSON.

---

## M-C3 — jadx GUI: Visual APK Decompilation Evidence

**CIA**: Confidentiality | **Domain**: APK Reverse Engineering
**Attack goal**: Navigate jadx's decompiled view trying to find business logic / secrets
**Captures**: jadx screenshot showing only Java stubs

### Steps

#### Step 1 — Open jadx-gui
```
jadx-gui → File → Open file → select sentrizk.apk
Wait for decompilation (1-2 minutes)
```

#### Step 2 — Navigate the package tree
```
Source code tree on left:
├── com.example.mobile
│   ├── MainActivity.java         ← open this, show it's empty Flutter shell
│   └── BuildConfig.java          ← nothing sensitive
├── io.flutter.*                  ← Flutter engine (Google's code, not yours)
├── com.dexterous.flutterlocalnotifications.*  
└── (no Dart package, no auth_service, no signal_manager)
```

#### Step 3 — Search (Ctrl+F) for sensitive terms
```
Search: "password"      → 0 results
Search: "JWT_SECRET"    → 0 results  
Search: "commitment"    → 0 results
Search: "snarkjs"       → 0 results
Search: "supabase"      → 0 results
Search: "encryptMessage" → 0 results
```

#### Step 4 — Navigate to lib/arm64-v8a
```
In jadx: Resources tab → lib → arm64-v8a → libapp.so
  Shows: Binary file (no decompilation possible)
```

**Screenshot to capture**: jadx with "0 results" for "password" search + libapp.so shown as binary file.

---

## M-C4 — Firebase Console: Raw Ciphertext Evidence

**CIA**: Confidentiality | **Domain**: E2EE Chat
**Attack goal**: Simulate Firebase breach — access Firestore, try to read messages
**Captures**: Firebase Console screenshot showing base64 ciphertext

### Steps

#### Step 1 — Send a test message between 2 accounts
Message: `"Meeting in conference room B at 3pm tomorrow"` (memorable plaintext)

#### Step 2 — Open Firebase Console
```
console.firebase.google.com → [your project] → Firestore Database
Navigate: chats → [recipient_uid] → messages → [most recent doc]
```

#### Step 3 — Screenshot the raw document

**Expected document structure**:
```json
{
  "content": "CiUKINk3xpQ8fO2lR0tL3mPK9Q...base64...",
  "senderId": "alice",
  "receiverId": "bob",
  "signalType": 3,
  "timestamp": November 19, 2025 at 2:22:00 PM UTC+8,
  "threatScore": 0.041,
  "status": "sent"
}
```

**Key observations to point out to examiner**:
- `content` = base64 Signal Protocol ciphertext — NOT your message
- `"Meeting in conference room B"` is **nowhere** in Firebase
- `signalType: 3` = CiphertextMessage.whisperType (Double Ratchet message)
- Even Firebase admin/Google cannot read this content

**Screenshot to capture**: Firebase Console raw doc with ciphertext visible, examiner can attempt to decode it manually (they'll fail).

---

## M-C5 — ADB Shell: KeyStore Extraction Attempt

**CIA**: Confidentiality | **Domain**: Secure Storage
**Attack goal**: Read SentriZK's encrypted credentials off a connected device
**Captures**: Terminal showing Permission denied OR encrypted blobs

### Steps

#### Step 1 — Enable USB Debugging on phone
```
Settings → Developer Options → USB Debugging → ON
```

#### Step 2 — Verify ADB sees device
```bash
adb devices
# Expected: 
# List of devices attached
# R5CX12345  device
```

#### Step 3 — Attempt to read secure storage

```bash
# Attempt 1: Direct run-as (works on debug builds, fails on release)
adb shell run-as com.example.mobile \
  cat /data/data/com.example.mobile/shared_prefs/FlutterSecureStorage.xml
```

**Expected (release build)**:
```
run-as: Package 'com.example.mobile' is not debuggable
```

```bash
# Attempt 2: List app data directory
adb shell ls /data/data/com.example.mobile/
```

**Expected**:
```
ls: /data/data/com.example.mobile/: Permission denied
```

```bash
# Attempt 3: Even with root access simulation (emulator test)
adb root
adb shell cat /data/data/com.example.mobile/shared_prefs/FlutterSecureStorage.xml
```

**Expected (rooted emulator)** — data exists but is AES-256-GCM encrypted:
```xml
<map>
  <string name="VlVLc3RlcmVkS2V5X2VuY3J5cHRlZF9zYWx0">
    AQAAAAQAAAAMAAAAIAAAAFpFVBtzaH...base64blob==
  </string>
</map>
```

**Explain to examiner**: The blob is AES-256-GCM encrypted. The key lives in the Android Keystore HSM (hardware-backed on modern devices). The key CANNOT be exported from the HSM even with root. Decryption requires the hardware security module to be present.

---

## M-C6 — Supabase Dashboard: Schema Evidence

**CIA**: Confidentiality | **Domain**: Database
**Captures**: Supabase Table Editor screenshot

### Steps

```
Supabase Dashboard → [your project] → Table Editor → users table
```

**Show examiner**:
1. Column list: `username, commitment, registeredAt, lastLogin, status, nonce, nonceTime`
2. NO `password`, `hash`, `secret`, or `salt` column
3. Click on any user row → `commitment` = large decimal number
4. SQL Editor → run: `SELECT * FROM users WHERE username='alice'`

**Screenshot**: Supabase Table Editor showing schema + sample row with commitment hash.

---

# ██ INTEGRITY MANUAL TESTS ██

---

## M-I1 — Frida Dynamic Instrumentation Attack

**CIA**: Integrity | **Domain**: Runtime Security
**Attack goal**: Hook `SignalManager.encryptMessage()` at runtime to intercept plaintext before encryption
**Captures**: Frida terminal output showing 0 exports, null symbol lookup

### Prerequisite — Install frida-server on device
```bash
# Check architecture
adb shell getprop ro.product.cpu.abi
# → arm64-v8a

# Download frida-server for arm64 from github.com/frida/frida/releases
# Match version to: pip show frida | grep Version

adb push frida-server-16.2.1-android-arm64 /data/local/tmp/frida-server
adb shell chmod 755 /data/local/tmp/frida-server
adb shell /data/local/tmp/frida-server &
```

### Attack Steps

```bash
# Step 1: Verify Frida sees the device
frida-ps -U | grep -i sentri

# Expected:
# 1234  com.example.mobile

# Step 2: Try to enumerate libapp.so exports
frida -U -n com.example.mobile --eval "
  var libapp = Module.findBaseAddress('libapp.so');
  console.log('[FRIDA] libapp.so base:', libapp);
  
  var exports = Module.enumerateExports('libapp.so');
  console.log('[FRIDA] Total exports in libapp.so:', exports.length);
  
  // Try to find encryption function by name
  var encFn = Module.findExportByName('libapp.so', 'encryptMessage');
  console.log('[FRIDA] encryptMessage exists:', encFn);
  
  var signalFn = Module.findExportByName('libapp.so', '_ZN13SignalManager14encryptMessageERKNSt6__ndk112basic_stringIcNS1_11char_traitsIcEENS1_9allocatorIcEEEE');
  console.log('[FRIDA] Mangled C++ symbol:', signalFn);
" 2>&1
```

### Expected Frida Output:
```
[USB::SM-A336B] -> [FRIDA] libapp.so base: 0x72ab3c0000
[USB::SM-A336B] -> [FRIDA] Total exports in libapp.so: 0
[USB::SM-A336B] -> [FRIDA] encryptMessage exists: null
[USB::SM-A336B] -> [FRIDA] Mangled C++ symbol: null
```

**Screenshot to capture**: Terminal with Frida output showing 0 exports and null symbol lookups.

**Explanation for examiner**: Flutter AOT release builds:
- Strip ALL debug symbols (no function names in libapp.so)
- Compile Dart to ARM64 machine code (not Java, not Dart bytecode)
- Without symbols: attacker must reverse-engineer 23MB of raw ARM assembly in Ghidra/IDA Pro (weeks of work)

---

## M-I2 — Signal Protocol: Message Tampering (MAC Failure)

**CIA**: Integrity | **Domain**: E2EE Chat Integrity
**Attack goal**: Modify a ciphertext in Firestore → receiver gets decryption failure
**Captures**: Firebase Console (modified doc) + Flutter debug log (MAC error)

### Steps

#### Step 1 — Enable Flutter debug logging
Run app in debug mode on a connected device:
```bash
cd Frontend/mobile
flutter run --debug
```

#### Step 2 — Send a message from Alice → Bob
Note the Firestore document ID from logs: `🔐 [E2EE] Message Encrypted Successfully.`

#### Step 3 — In Firebase Console, find the message document
```
Firestore → chats → [bob_uid] → messages → [doc_id]
Current content: CiUKINk3xpQ8fO2lR0tL3mPK9Qr...
```

#### Step 4 — Edit 1 character in the ciphertext
Change character at position 10 from `K` to `L`:
```
Before: CiUKINk3xpQ8fO2lR0tL3mPK9Qr...
After:  CiUKINk3xpL8fO2lR0tL3mPK9Qr...  ← 1 byte changed
```

#### Step 5 — Watch Bob's device (debug console)

**Expected Flutter debug output on Bob's device**:
```
🔐 [E2EE] Failed to decrypt message globally:
   InvalidMessageException: Bad Mac!

# OR:
   BadPaddingException: MAC check in GCM failed
```

**Expected UI**: Message shows `🔒 Waiting for this message.` fallback text.

**Explanation**: Signal Protocol computes HMAC-SHA256 over the ciphertext. A 1-byte change causes MAC verification to fail. The message content cannot be altered in transit without detection.

---

## M-I3 — Postman: Manual API Attack Showcase

**CIA**: Integrity | **Domain**: All API endpoints
**Purpose**: Show examiner live API responses during presentation

Import this Postman collection JSON and run each request:

### Collection: SentriZK Attack Suite

**1. ZKP Forgery**
```
POST https://backend.sentrizk.me/login
Body: {
  "username": "sentrizk_test_user",
  "proof": { "pi_a": ["999","888","1"], "pi_b": [["1","2"],["3","4"],["1","0"]], 
             "pi_c": ["555","666","1"], "protocol": "groth16" },
  "publicSignals": ["12345", "67890", "11111", "99999"]
}
Expected: 400 { "error": "Invalid login proof" }
```

**2. Admin Without Token**
```
GET https://backend.sentrizk.me/admin/users
Headers: (no Authorization header)
Expected: 401 { "error": "Admin authentication required" }
```

**3. Admin With Fake Token**
```
GET https://backend.sentrizk.me/admin/users
Headers: Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.fakePayload.fakeSignature
Expected: 401 { "error": "Invalid or expired admin token" }
```

**4. Oversized Body**
```
POST https://backend.sentrizk.me/register
Body: { "proof": "[paste 200KB of 'A' characters]" }
Expected: 413 Payload Too Large
```

**5. Nonce Expired**
```
POST https://backend.sentrizk.me/login
Body: { "username": "sentrizk_test_user", "proof": {...valid but old proof...}, "publicSignals": [...] }
Expected: 400 { "error": "Nonce expired or not issued" }
```

---

## M-I4 — WebRTC Call Security: SRTP Encryption Verification

**CIA**: Confidentiality + Integrity | **Domain**: Calls
**Attack goal**: Wireshark capture of a WebRTC audio/video call → prove traffic is SRTP (encrypted)
**Captures**: Wireshark showing STUN + SRTP packets, no RTP plaintext audio

### Steps

#### Step 1 — Start Wireshark capture
```
Wireshark → your WiFi adapter → Start
Filter: udp (WebRTC uses UDP for media)
```

#### Step 2 — Start an audio or video call in SentriZK app (between 2 devices)

#### Step 3 — Observe Wireshark

**Expected packets**:
```
No.   Protocol   Info
1     STUN       Binding Request
2     STUN       Binding Success Response  ← ICE connectivity check
3     SRTP       ← encrypted SRTP (not plain RTP!)
4     SRTP       ← another encrypted SRTP frame
```

**Key observation**: Packets show `SRTP` not `RTP`. SRTP = Secure RTP with AES-128-GCM.
If you see `RTP` instead of `SRTP` → call is unencrypted (FAIL — but SentriZK uses WebRTC which enforces DTLS-SRTP by default).

**Wireshark display filter for call traffic**:
```
udp && ip.addr == [phone_IP]
```

**Screenshot to capture**: Wireshark showing SRTP packets during active call.

---

# ██ AVAILABILITY MANUAL TESTS ██

---

## M-A1 — Admin Hold: Suspended User Cannot Login

**CIA**: Availability (controlled) | **Domain**: Admin
**Attack goal**: Prove admin can suspend a malicious insider's account
**Captures**: App login rejection screenshot

### Steps

#### Step 1 — Login to admin panel
```
https://frontend.sentrizk.me/admin (or admin route)
```

#### Step 2 — Put test user "on hold"
```
Admin dashboard → Users → sentrizk_test_user → [Hold]
```

#### Step 3 — Try to login as sentrizk_test_user
```
SentriZK app → login with test credentials
```

**Expected**:
- App shows: `"Account suspended. Contact your administrator."`
- Backend returns: `HTTP 403 { "error": "Account suspended. Contact your administrator." }`

**Capture**: App screenshot showing suspension message.

---

## M-A2 — Real-Time Admin Dashboard: SSE Threat Monitoring

**CIA**: — | **Domain**: Admin Monitoring
**Purpose**: Show real-time threat detection from admin perspective
**Captures**: Admin dashboard showing threat log update in real-time

### Steps

#### Step 1 — Open admin dashboard SSE stream in browser
```javascript
// In browser console on admin page:
const es = new EventSource('https://backend.sentrizk.me/admin/stream', { 
  headers: { Authorization: 'Bearer [admin_jwt]' } 
});
es.onmessage = (e) => console.log(JSON.parse(e.data));
```

#### Step 2 — Send a phishing message in SentriZK app
```
Message: "Click here urgently: http://paypal-login-secure.tk/verify"
```

#### Step 3 — Watch admin dashboard

**Expected**: Within seconds, admin panel shows:
```
🚨 NEW THREAT LOG
Sender:    alice
Receiver:  bob
Score:     0.891 (HIGH RISK)
Content:   "Click here urgently: http://paypal-login-secure.tk..."
Time:      14:33:21
Status:    Open
```

**Capture**: Admin dashboard screenshot showing threat auto-appearing without page refresh (SSE real-time).

---

# ██ ADVANCED MANUAL TESTS ██

---

## M-X1 — Account Recovery: Mnemonic + ZKP Re-Auth

**CIA**: Confidentiality | **Domain**: Authentication Resilience
**Purpose**: Prove that the 24-word mnemonic allows secure account recovery without server knowing the secret

### Steps

#### Step 1 — Uninstall SentriZK (simulates lost phone)
All local keys deleted.

#### Step 2 — Open recovery flow
```
SentriZK web → Forgot password → Enter username → Enter 24 mnemonic words → Enter new password
```

#### Step 3 — App re-derives the salt from mnemonic (BIP-39 derivation)

#### Step 4 — Login with recovered account

**Expected**: Login succeeds. Old messages cannot be recovered (forward secrecy — ratchet states gone), but new messages work.

**What this proves**: 
- Salt is derived from mnemonic (BIP-39) → only the user knows the mnemonic
- Server never sees the mnemonic
- Recovery doesn't require asking the server for a reset link → server cannot be social-engineered for password reset

---

## M-X2 — Threat Intelligence: Phishing Link Warning in Chat

**CIA**: Confidentiality | **Domain**: ML + Phishing Detection
**Purpose**: Visual demonstration that phishing links are caught and warned in UI
**Captures**: App screenshot showing URL warning

### Steps

#### Step 1 — Send a homograph attack URL
```bash
# Note: 'р' (Cyrillic р) vs 'p' (Latin p) — visually identical
Message: "Check this deal: https://раypal.com/login"
```

Expected: 
- App shows ⚠️ "Suspicious characters detected" warning
- URL highlighted in yellow/red

#### Step 2 — Send a HTTP (non-HTTPS) URL
```
Message: "Our wiki: http://192.168.1.50/docs"
```
Expected: ⚠️ "Insecure connection (HTTP)" warning

#### Step 3 — Try Google Safe Browsing test URL
```
Message: "Click: http://malware.testing.google.test/testing/malware/"
```
Expected: 🚨 "Known dangerous URL blocked" (if Safe Browsing API key configured)

**Captures**: 3 screenshots showing different threat level warnings.

---

## M-X3 — E2EE Forward Secrecy Demonstration

**CIA**: Confidentiality | **Domain**: E2EE Chat
**Purpose**: Prove that compromising TODAY's key doesn't decrypt yesterday's messages

### Conceptual Demonstration

#### Step 1 — Exchange 10 messages between Alice and Bob over 2 days

#### Step 2 — Export Bob's current ratchet state (debug build)
```dart
// Temporary debug code in signal_manager.dart
final session = await _store.loadSession(address);
print('[DEBUG] Current chain key: ${hex.encode(session.getSessionState().getSenderRatchetKey().serialize())}');
```

#### Step 3 — Show chain keys are DIFFERENT for each message
```
Message 1 chain key: a1b2c3d4e5f6...
Message 2 chain key: 7f8e9d0c1b2a...  (derived from msg 1 key via HKDF)
Message 3 chain key: 3c4d5e6f7a8b...  (derived from msg 2 key)
```

#### Step 4 — Explain forward secrecy
Even if an attacker captures Bob's current chain key, they CANNOT:
- Reverse HKDF to get message 1's key
- Decrypt any message sent before the current ratchet state
- Break past-session confidentiality

This is forward secrecy: each ratchet step is a one-way derivation.

---

## Evidence Collection Summary

| Test | Screenshot | Terminal Log | Timestamp |
|------|-----------|-------------|----------|
| M-C1 Burp SSL fail | ✅ | ✅ | yes |
| M-C1b mitmproxy SSL fail | — | ✅ | yes |
| M-C2 Wireshark TLS packets | ✅ | — | yes |
| M-C3 jadx 0 results | ✅ | — | yes |
| M-C4 Firebase ciphertext | ✅ | — | yes |
| M-C5 ADB permission denied | — | ✅ | yes |
| M-C6 Supabase no password | ✅ | — | yes |
| M-I1 Frida 0 exports | — | ✅ | yes |
| M-I2 Signal MAC fail | ✅ | ✅ | yes |
| M-I3 Postman API attacks | ✅ | — | per test |
| M-I4 SRTP in Wireshark | ✅ | — | yes |
| M-A1 User suspension | ✅ | — | yes |
| M-A2 Real-time threat log | ✅ | — | yes |
| M-X1 Account recovery | ✅ | — | yes |
| M-X2 Phishing URL warning | ✅ | — | yes |
| M-X3 Forward secrecy | ✅ | ✅ | yes |

---

## Presentation Script (45-minute flow)

```
0:00  Open automated dashboard → RUN ALL TESTS
      [15 tests auto-run while you explain each one]

0:20  Live app demo: send phishing message → threat warning popup
      Admin dashboard: threat log appears (SSE real-time)

0:25  Burp Suite: show SSL error live on phone screen

0:30  Wireshark: start call → show SRTP packets

0:35  jadx-gui: open APK → search "password" → 0 results

0:38  Firebase Console: show ciphertext document

0:40  Postman: manual API attacks (forged proof, JWT, oversized body)

0:43  Frida: hook attempt → 0 exports

0:45  Summary: all 19 automated PASS + all 16 manual PASS
       → CIA Triad fully defended
```
