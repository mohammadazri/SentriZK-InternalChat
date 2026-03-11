# E2EE Audio & Video Calling — Technical Documentation

> **Module**: SentriZK Internal Chat — Mobile (Flutter)  
> **Branch**: `feature/audio-video-calling`  
> **Last Updated**: 2026-03-11  

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Security Model](#security-model)
3. [Technology Stack](#technology-stack)
4. [Call Flow](#call-flow)
5. [File Structure](#file-structure)
6. [Service: CallService](#callservice)
7. [UI: CallScreen](#callscreen)
8. [Widget: IncomingCallOverlay](#incomingcalloverlay)
9. [Integration Points](#integration-points)
10. [Android Permissions](#android-permissions)
11. [Production Recommendations](#production-recommendations)

---

## Architecture Overview

The calling system follows a **Peer-to-Peer (P2P)** model using WebRTC, the same protocol used by WhatsApp, Signal, and Google Meet. Media (audio/video) flows directly between devices without passing through our servers.

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Media Transport** | WebRTC **DTLS-SRTP** | End-to-end encrypted audio & video streams |
| **Signaling** | Firebase **Firestore** | SDP offer/answer & ICE candidate exchange |
| **NAT Traversal** | Google **STUN** servers | Discover public IP for P2P connection through firewalls |
| **Access Control** | Firestore **Security Rules** | Only caller/receiver can read/write call documents |

### Why NOT Signal Protocol for Signaling?

The initial design considered encrypting SDP payloads with the Signal Protocol (Double Ratchet), but this was **rejected** for critical reasons:

1. **Ratchet Desync**: Each encrypt/decrypt advances the Double Ratchet state. A single call generates 15–25 ratchet operations (1 offer + 1 answer + 10–20 ICE candidates). If a call fails, future **chat messages could fail to decrypt**.
2. **Unnecessary Overhead**: ICE candidates are ephemeral networking metadata (IP addresses, ports), not sensitive user content.
3. **Industry Standard**: WhatsApp and Signal themselves rely on WebRTC DTLS-SRTP for media encryption and **do not** encrypt their signaling payloads with the chat ratchet.

---

## Security Model

### Media Encryption (DTLS-SRTP)

WebRTC provides **built-in** end-to-end encryption for all media streams:

- **DTLS** (Datagram Transport Layer Security) negotiates encryption keys directly between peers during the ICE handshake
- **SRTP** (Secure Real-time Transport Protocol) encrypts all audio/video packets using the DTLS-negotiated keys
- The server (Firebase) **never** has access to the encryption keys or the media content
- This is the **same** encryption used by WhatsApp, Signal, Google Meet, and Microsoft Teams

### Signaling Protection

- All Firestore communication occurs over **TLS 1.3** (transport encryption)
- Firestore **Security Rules** restrict the `calls` collection so only the `callerId` and `receiverId` can read/write call documents
- SDP and ICE data are transient — call documents should be deleted after call completion

### What an attacker can see

| Attacker Position | Can See | Cannot See |
|-------------------|---------|------------|
| Network sniffer | Encrypted packets | Content, audio, video |
| Firebase admin | SDP metadata (IP, codec info) | Audio/video content |
| Our backend | Call existence, duration | Audio/video content |

---

## Technology Stack

### Dependencies

```yaml
# pubspec.yaml
flutter_webrtc: ^0.12.1        # WebRTC media & peer connections
permission_handler: ^11.3.1     # Runtime camera/mic permissions
```

### Android Permissions

```xml
<!-- AndroidManifest.xml -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
<uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
<uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />
```

---

## Call Flow

### Sequence Diagram

```
Caller (A)                    Firestore                    Receiver (B)
    |                             |                             |
    |-- 1. getUserMedia() ------->|                             |
    |   (get camera/mic)          |                             |
    |                             |                             |
    |-- 2. createOffer() -------->|                             |
    |-- 3. Write SDP offer ------>|                             |
    |   status: "outgoing"        |                             |
    |                             |-- 4. Snapshot listener ----->|
    |                             |   onIncomingCall triggered   |
    |                             |                             |
    |                             |<-- 5. Show overlay ---------|
    |                             |   User taps "Accept"        |
    |                             |                             |
    |                             |<-- 6. getUserMedia() -------|
    |                             |<-- 7. createAnswer() -------|
    |                             |<-- 8. Write SDP answer -----|
    |                             |   status: "active"          |
    |                             |                             |
    |<-- 9. setRemoteDesc() ------|                             |
    |                             |                             |
    |-- 10. ICE candidates ------>|<-- 10. ICE candidates ------|
    |   (bidirectional exchange)  |                             |
    |                             |                             |
    |<============ DTLS-SRTP Handshake ========================>|
    |                             |                             |
    |<========== P2P Media (Encrypted Audio/Video) ============>|
    |                             |                             |
    |-- 11. endCall() ----------->|                             |
    |   status: "ended"           |-- 12. cleanup() ---------->|
```

### State Machine

```
     ┌──────┐
     │ idle │ ←──────────────────────────────────────┐
     └──┬───┘                                         │
        │                                             │
   startCall()                                   _cleanup()
        │                                             │
        ▼                                             │
  ┌──────────┐    acceptCall()    ┌────────────┐      │
  │ outgoing │ ──────────────────>│ connecting │──────┤
  └──────────┘                    └─────┬──────┘      │
                                        │             │
        ┌──────────┐                ICE connected     │
        │ incoming │                    │             │
        └────┬─────┘                    ▼             │
             │                    ┌──────────┐        │
        acceptCall()              │  active  │────────┤
             │                    └──────────┘        │
             │                                        │
        rejectCall() ──> rejected ────────────────────┘
```

---

## File Structure

```
lib/
├── services/
│   └── call_service.dart          # Core WebRTC + Firestore signaling
├── screens/
│   └── call_screen.dart           # Full-screen calling UI
├── widgets/
│   └── incoming_call_overlay.dart  # Accept/Decline overlay
android/
└── app/src/main/
    └── AndroidManifest.xml         # Camera, mic, Bluetooth permissions
```

---

## CallService

**Path**: `lib/services/call_service.dart`  
**Pattern**: Singleton with callback functions

### Key Responsibilities

| Method | Description |
|--------|-------------|
| `init(userId)` | Initialize service and start listening for incoming calls |
| `startCall(receiverId, type)` | Create peer connection, generate SDP offer, write to Firestore |
| `acceptCall(callInfo, offerData)` | Set remote SDP, create answer, write to Firestore |
| `endCall()` | Update Firestore status, clean up all resources |
| `rejectCall(callId)` | Decline incoming call |
| `toggleMute()` | Enable/disable local audio track |
| `toggleCamera()` | Enable/disable local video track |
| `switchCamera()` | Toggle front/rear camera |
| `toggleSpeaker(enabled)` | Switch between earpiece and speaker |

### Callbacks

```dart
Function(MediaStream stream)?  onLocalStream;      // Local camera/mic ready
Function(MediaStream stream)?  onRemoteStream;     // Remote media arriving
Function(CallState state)?     onStateChanged;     // State machine transition
Function(CallInfo info)?       onIncomingCall;      // Someone is calling
```

### ICE Configuration

```dart
static const Map<String, dynamic> _rtcConfig = {
  'iceServers': [
    {'urls': 'stun:stun.l.google.com:19302'},
    {'urls': 'stun:stun1.l.google.com:19302'},
    {'urls': 'stun:stun2.l.google.com:19302'},
  ],
  'sdpSemantics': 'unified-plan',
};
```

---

## CallScreen

**Path**: `lib/screens/call_screen.dart`

### Features

- **Video calls**: Remote video fills the background; local video in a PiP corner (120×160px, rounded)
- **Audio calls**: Gradient background with pulsing avatar showing peer's initials
- **Encryption badge**: Green lock icon with "Encrypted" label (top-left)
- **Live timer**: `MM:SS` format, starts when call connects
- **Controls bar**: Frosted glass bottom bar with:
  - Mute / Unmute
  - Camera On / Off (video only)
  - End Call (red)
  - Speaker / Earpiece
  - Flip Camera (video only)

---

## IncomingCallOverlay

**Path**: `lib/widgets/incoming_call_overlay.dart`

### Features

- Full-screen dark gradient overlay
- "End-to-End Encrypted" badge
- Pulsing avatar with glow effect
- Caller name and call type label
- Two action buttons:
  - **Decline** (red) — calls `rejectCall()`
  - **Accept** (green) — navigates to `CallScreen` in incoming mode

---

## Integration Points

### ChatScreen (`lib/screens/chat_screen.dart`)

- **AppBar icons**: 📞 Audio Call + 📷 Video Call buttons
- **`_startCall()` method**: Requests runtime permissions (camera/microphone) via `permission_handler`, then navigates to `CallScreen`

### UserListScreen (`lib/screens/user_list_screen.dart`)

- **`_initCallService()`**: Called in `initState()` — initializes `CallService` with the user's ID
- **`onIncomingCall` callback**: Fetches SDP offer from Firestore and navigates to `IncomingCallOverlay`

---

## Android Permissions

| Permission | Purpose |
|-----------|---------|
| `CAMERA` | Video calls — access device camera |
| `RECORD_AUDIO` | Audio/video calls — access microphone |
| `MODIFY_AUDIO_SETTINGS` | Switch between speaker and earpiece |
| `BLUETOOTH` / `BLUETOOTH_CONNECT` | Support Bluetooth headsets during calls |

Permissions are requested at **runtime** using `permission_handler` before starting a call. If denied, a SnackBar is shown with an explanation.

---

## Production Recommendations

### 1. TURN Server (Critical)

STUN servers only work when both devices have compatible NATs (most WiFi networks). For cellular networks (4G/5G), a **TURN relay server** is essential:

```dart
// Example with Metered.ca or Twilio
'iceServers': [
  {'urls': 'stun:stun.l.google.com:19302'},
  {
    'urls': 'turn:your-turn-server.com:443',
    'username': 'api-key',
    'credential': 'api-secret',
  },
]
```

**Recommended providers**: Twilio Network Traversal, Metered.ca (free tier available), Xirsys.

### 2. Push Notifications (FCM)

Currently, incoming calls are only detected when the app is **active** (Firestore snapshot listener). For background/locked screen scenarios:

- Send an **FCM data message** when creating a call document
- Use `flutter_callkit_incoming` for native Android/iOS call UI
- Or use `awesome_notifications` for high-priority notification

### 3. Call History

Add a local Isar collection to log:
- Caller/receiver, call type (audio/video)
- Duration, status (completed/missed/rejected)
- Timestamp

### 4. Call Cleanup

Add a Cloud Function to automatically delete call documents from Firestore after a timeout (e.g., 60 seconds for unanswered calls, 5 minutes after ended calls) to keep the database clean.

---

## Firestore Data Model

### Collection: `calls/{callId}`

```json
{
  "callerId": "userA",
  "receiverId": "userB",
  "type": "video",
  "status": "outgoing | active | ended | rejected",
  "offer": {
    "type": "offer",
    "sdp": "<SDP string>"
  },
  "answer": {
    "type": "answer",
    "sdp": "<SDP string>"
  },
  "createdAt": "<server timestamp>",
  "endedAt": "<server timestamp>"
}
```

### Sub-collection: `calls/{callId}/ice/{candidateId}`

```json
{
  "senderId": "userA",
  "candidate": {
    "candidate": "candidate:...",
    "sdpMid": "0",
    "sdpMLineIndex": 0
  },
  "ts": "<server timestamp>"
}
```

### Recommended Security Rules

```javascript
match /calls/{callId} {
  allow read, write: if request.auth != null &&
    (request.auth.uid == resource.data.callerId ||
     request.auth.uid == resource.data.receiverId);

  allow create: if request.auth != null &&
    request.auth.uid == request.resource.data.callerId;
}
```
