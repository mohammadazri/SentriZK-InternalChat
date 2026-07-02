# SentriZK Release Notes — v1.0.8 (Build 9)

**Release Date:** 14 May 2026

---

## 🐛 Critical Fix: ML Threat Detection on Physical Devices

### Problem
The Edge AI threat scanner was **always returning 35.9%** on certain physical Android devices (e.g. RMX1911 / Oppo Realme, Android 10, Qualcomm Adreno GPU). The TFLite GPU + NNAPI delegate loaded without any error, but silently produced **incorrect inference results**, causing the model to output the same score for every message — safe or malicious.

Meanwhile, emulators running Android 16 with newer GPU drivers worked perfectly fine (100% threat for phishing messages).

### Root Cause
Older Qualcomm Adreno GPU drivers on Android 10 partially support TFLite GPU delegation but produce **garbage output** for certain model operations (e.g. `FULLY_CONNECTED v12`, `SELECT_V2`). The delegate does not throw an error — it silently returns wrong values.

### Fix
Added a **self-validation step** during model initialization:
1. After loading the model with GPU+NNAPI, two test inferences are run — one safe message and one clearly malicious message.
2. If the score difference between them is less than **5%**, the delegate is detected as broken.
3. The model is automatically reloaded in **CPU-only mode**, which produces correct results on all devices.
4. Devices with modern GPUs (emulators, newer phones) continue to use hardware acceleration as before.

**Files Changed:**
- `Frontend/mobile/lib/services/message_scan_service.dart`

---

## 🚀 New Feature: One-Step Account Recovery

### Problem
Previously, after completing the account recovery process on the web portal, the user was redirected back to the app but left on the login screen. They had to **manually tap "Sign In" again** to actually enter the app — a confusing two-step process.

### Fix
- The web recovery page now redirects with a new `recover-success` deep link intent (instead of the generic `auth-callback`).
- The mobile app detects `recover-success`, **saves the recovered credentials** (username + encryptedSalt), and **immediately triggers the full login sequence** — Firebase auth, Firestore profile sync, FCM token registration, and dashboard navigation.
- The existing `login-success` flow was refactored into a reusable `_performLoginSequence()` method shared by both login and recovery.

**Files Changed:**
- `Frontend/web/src/app/recover/page.tsx`
- `Frontend/mobile/lib/screens/auth_screen.dart`

---

## 💬 Chat Management Features (from v1.0.7)

### Delete Chat Threads
- Long-press any chat in the main list to delete the entire local conversation.
- Clears all Isar database messages for that peer and removes saved drafts from SharedPreferences.
- Includes a confirmation dialog before deletion.

### Copy Message Text
- Long-press any message inside a 1-on-1 chat.
- New "Copy Text" option appears in the bottom sheet alongside "Delete".
- Copies the message content to the clipboard with a SnackBar confirmation.

**Files Changed:**
- `Frontend/mobile/lib/screens/user_list_screen.dart`
- `Frontend/mobile/lib/screens/chat_screen.dart`

---

## 📋 Full Changelog

| Commit | Description |
|--------|-------------|
| `fix(ml)` | TFLite delegate validation + CPU fallback for older Android devices |
| `feat(auth)` | One-step account recovery → auto-login redirect |
| `feat(chat)` | Long-press delete chat threads + copy message text |
| `chore(release)` | Version bump to 1.0.8+9 |

---

## 🔧 Technical Notes
- **ML Threshold:** Threat warning triggers at ≥65% (`AppConfig.mlThreatThreshold = 0.65`)
- **ML Warning:** Only displayed on the **receiver's** device (sender sees nothing)
- **Chat Deletion:** Local-only (Isar). Server-side Firestore data is not affected.
- **Min Android:** API 29 (Android 10) — now verified working with CPU fallback

---
*Built with Flutter 3.8 • TFLite • ZK-SNARKs • Firebase*
