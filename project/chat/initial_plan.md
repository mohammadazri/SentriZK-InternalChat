# Chat APK Development Plan

## 1. Project Setup
- Initialize a new Flutter project.
- Use `flutterfire configure` to connect to Firebase (Auth, Firestore, Storage, Messaging).

## 2. Database Structure
- **users**: Store user profiles and status.
- **chats**: Each user has a subcollection of received messages.
- **fcmTokens**: Store device tokens for notifications.

## 3. Core Features
- **Authentication**: Phone/email login using Firebase Auth.
- **Real-time Messaging**: 
  - Send/receive messages via Firestore.
  - Store messages locally for offline access.
- **Attachments**: 
  - Upload/download media using Firebase Storage.
  - Support images, audio, video, documents.
- **Push Notifications**: 
  - Use FCM to notify users of new messages.
- **Message Deletion**: 
  - Delete messages from Firestore after delivery for privacy.

## 4. UI/UX
- Chat list, chat screen, contacts, media picker, settings.
- Show message status (sent, delivered, seen).
- Support for dark/light themes.

## 5. State Management
- Use Riverpod, Provider, or Bloc for state management.

## 6. Local Database
- Use Isar or Hive for offline message storage.

## 7. Security & Privacy
- Ensure messages are deleted from the cloud after delivery.
- Store only minimal metadata locally.

## 8. Testing & Deployment
- Test on Android/iOS devices and emulators.
- Prepare for Play Store/App Store release.

---

## Milestones

1. Project & Firebase setup
2. Auth & user profile
3. Messaging (text)
4. Attachments (media)
5. Push notifications
6. UI polish & themes
7. Testing & bug fixes
8. Deployment

---

## References

- WhatsUp repo architecture
- Firebase & FlutterFire docs
- Isar/Hive docs for local storage
