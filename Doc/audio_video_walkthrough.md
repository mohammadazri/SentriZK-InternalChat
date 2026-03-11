# Audio & Video Calling — Feature Walkthrough

> **Branch**: `feature/audio-video-calling`  
> **Date**: 2026-03-11

---

## What Was Built

End-to-end encrypted audio and video calling for the SentriZK mobile app. The implementation follows the same architecture as WhatsApp and Signal — WebRTC for peer-to-peer media with Firestore as the signaling server.

---

## Features Delivered

### 1. Core Calling Service (`call_service.dart`)

- **State Machine**: `idle → outgoing → connecting → active → ended`
- **WebRTC Management**: Peer connection creation, local/remote stream handling, ICE candidate exchange
- **Firestore Signaling**: SDP offer/answer exchange, call status updates, ICE candidate relay
- **In-Call Controls**: Mute/unmute, camera on/off, speaker toggle, switch front/rear camera
- **Incoming Call Detection**: Automatic Firestore listener for calls targeting the current user
- **Cleanup**: Proper disposal of streams, renderers, and Firestore subscriptions

### 2. Call Screen (`call_screen.dart`)

- **Video Mode**: Remote video fills the screen; local PiP video in the top-right corner (120×160px, rounded corners, mirrored for front camera)
- **Audio Mode**: Dark gradient background with a pulsing avatar glow showing the peer's initials
- **Encryption Badge**: Green lock icon with "Encrypted" or live timer display
- **Frosted Controls Bar**: Bottom gradient overlay with circular control buttons (Mute, Camera, End Call, Speaker, Flip Camera)
- **Auto-Navigation**: Automatically pops back to the chat screen when the call ends

### 3. Incoming Call Overlay (`incoming_call_overlay.dart`)

- **Full-Screen Overlay**: Dark gradient with "End-to-End Encrypted" badge
- **Pulsing Avatar**: Animated scale effect with blue glow
- **Action Buttons**: Large circular Decline (red) and Accept (green) buttons with shadow effects
- **Seamless Transition**: Accept navigates to CallScreen in incoming mode

### 4. ChatScreen Integration

- **AppBar Icons**: Phone (📞) and Camera (📷) buttons in the chat header
- **Permission Handling**: Runtime microphone/camera permission requests with error feedback via SnackBar
- **Navigation**: Direct navigation to CallScreen with the current peer's info

### 5. UserListScreen Integration

- **CallService Init**: Automatically initialized with the user's ID when the chat list loads
- **Incoming Call Handler**: Fetches SDP offer data and navigates to IncomingCallOverlay

### 6. Android Permissions

- Camera, Microphone, Audio Settings, Bluetooth — all configured in AndroidManifest.xml
- Camera/microphone set as `required="false"` to prevent app filtering on devices without cameras

---

## Security Verification

| Security Layer | Status | Method |
|---------------|--------|--------|
| Media Encryption | ✅ | WebRTC DTLS-SRTP (automatic, built-in) |
| Transport Security | ✅ | Firestore over TLS 1.3 |
| Access Control | ✅ | Firestore rules + caller/receiver filtering |
| Chat Ratchet Independence | ✅ | Signal Protocol NOT used for signaling |
| Permission Gating | ✅ | Runtime permission checks before any call |

---

## Git History

```
e6eb4eb chore: apply dart fix auto-corrections (deprecated APIs, super.key)
xxxxxxx feat: integrate call buttons in ChatScreen, incoming call listener in UserListScreen, Android permissions
xxxxxxx feat: add CallScreen and IncomingCallOverlay UI components
xxxxxxx feat: rewrite CallService with clean state machine and DTLS-SRTP architecture
xxxxxxx feat: add flutter_webrtc and permission_handler dependencies
```

---

## How to Test

1. Run the app on **two devices** (or one device + emulator)
2. Log in with different accounts on each device
3. Open a chat with the other user
4. Tap the 📞 (audio) or 📷 (video) icon in the header
5. The other device should show the incoming call overlay
6. Accept the call — media should flow with the green encryption badge visible

---

## Known Limitations

1. **STUN-only**: No TURN server configured — calls may fail over strict carrier NATs (4G/5G)
2. **Foreground-only**: Incoming calls only detected when the app is actively running (no push notification wake-up)
3. **No call history**: Calls are not logged locally yet
4. **No call cleanup**: Firestore call documents are not auto-deleted after completion
