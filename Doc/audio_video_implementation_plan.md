# Architecture: E2EE Audio & Video Calls (WebRTC)

## Overview
To provide WhatsApp-like Audio and Video calls, we will implement **WebRTC (Web Real-Time Communication)**. WebRTC natively supports End-to-End Encryption (DTLS-SRTP) for media streams, guaranteeing that the server cannot listen to the calls.

## Technical Stack
- **Flutter WebRTC**: `flutter_webrtc` package for camera/microphone access, ICE negotiation, and rendering video streams.
- **Signaling Server**: We will use our existing Firebase Firestore infrastructure as the signaling server. Peers will exchange Session Description Protocol (SDP) offers, answers, and ICE candidates via a new `calls` collection in Firestore.

## Proposed Flow
1. **Initiate Call**: User A presses "Call". App creates a WebRTC `RTCPeerConnection`, generates an SDP Offer, and writes it to `calls/{callId}` in Firestore.
2. **Ringing**: User B listens to the `calls` collection. When an offer appears, User B's phone rings (using `flutter_callkit_incoming` for native call UIs if desired, or just an in-app overlay).
3. **Accept Call**: User B accepts, generates an SDP Answer, and writes it back to Firebase.
4. **ICE Negotiation**: Both peers generate ICE Candidate network routes and swap them via Firebase to establish a direct P2P connection (or via TURN server if behind strict NATs).
5. **Media Stream**: Audio/Video tracks flow directly between devices, encrypted via DTLS-SRTP.

## Implementation Steps

### Phase 1: Dependency Setup & Permissions
- Modify `pubspec.yaml` to include `flutter_webrtc`.
- Modify `AndroidManifest.xml` to add `RECORD_AUDIO`, `CAMERA` permissions.

### Phase 2: Call Signaling Service
- Create `CallService` in `Backend/` and `Frontend/` to handle Firestore signaling (Offers, Answers, ICE).

### Phase 3: UI Implementation
- Add Call/Video icons to the `ChatScreen` AppBar.
- Create `CallScreen` for active calls (showing local/remote video renderers, mute buttons, hangup).
- Add an incoming call overlay/dialog when the app is active and someone calls.

## User Action Required
> [!NOTE]
> WebRTC operates Peer-to-Peer. For 100% reliability across all mobile networks (like 4G/5G strict NATs), a **TURN Server** is required in production. For this MVP, we will rely on free public STUN servers (e.g., Google's STUN), which work for most home WiFi networks but might fail over some cellular networks. Does this STUN-only logic sound good for the first draft?

## Postponed Tasks Tracker
- [ ] Add `flutter_webrtc` dependency and Android permissions
- [ ] Implement `CallService` for Firestore SDP/ICE signaling
- [ ] Add Audio/Video icons to Chat header
- [ ] Create `CallScreen` UI (Video renderers, Mute/Video Toggles)
- [ ] Implement Incoming Call Ringing UI listener
