Project Plan — Chat Module (based on WhatsUp)

Summary

Goal: Implement a robust chat module in mobile modeled after the WhatsUp approach: Firestore for transient delivery, Isar for local storage, Firebase Storage for attachments, FCM for notifications, and a set of UI components for chat UX.
Scope: mobile-first implementation (Flutter). Web integration later.
Objectives

Reliable send/receive with optimistic UI.
Local persistence (Isar) for offline access and fast UI.
Transient server-side storage (Firestore) with delete-on-receive semantics for privacy.
Attachment uploads via Firebase Storage.
Push notifications (FCM) for background wake/delivery.
Read/delivered receipts and simple presence/typing indicators.
High-level Architecture

Client (mobile):
UI (chat screen, message cards, attachment sender, viewers).
Controller (ChatStateNotifier) handles business logic: insert to Isar, upload attachments, call Firestore repo.
Local DB: Isar (embedded DB) for stored messages and contacts.
Remote: Firestore collections (per recipient) for incoming messages and system messages.
Storage: Firebase Storage for files.
Push: FCM for notifications (server or cloud function posts).
Server: minimal (can be optional) — Firestore + Cloud Functions (optional) or an external notification endpoint (WhatsUp used a separate notification endpoint).
Flow: send -> local Isar insert (pending) -> upload attachments -> write to Firestore (sent) -> recipient Firestore listener sees doc -> client-side handler copies into local Isar -> deletes Firestore doc -> sends system message (receipt) to sender.
Data model (client-side)

Message (id, content, senderId, receiverId, timestamp, status, attachment)
Attachment (fileName, url, type, uploadStatus, size, width, height)
RecentChat (message preview, user meta, unreadCount)
StoredMessage (Isar schema mirrors Message with embedded Attachment)
Collections (Firestore)

users/{userId} — profile, activityStatus
chats/{receiverId}/messages/{messageId} — ephemeral messages for a receiver
fcmTokens/{userId} — FCM token mapping
Optionally: system-messages or status updates under same chats collection.
Concrete Tasks (order of work)

Setup & infra
Create Firebase project; add Android/iOS configs (google-services.json, GoogleService-Info.plist).
Ensure firebase_core, cloud_firestore, firebase_storage, firebase_messaging versions compatible with your Flutter SDK.
Dependencies
Merge pubspec.yaml dependencies into your pubspec.yaml: firebase_core, firebase_auth (if using), cloud_firestore, firebase_storage, firebase_messaging, isar, isar_flutter_libs, image_picker, flutter_sound, audioplayers, flutter_riverpod (or your state management), uuid, file_picker, etc.
Run flutter pub get.
Local DB (Isar)
Copy Isar schema model files (from models & generated .g.dart) or recreate schemas.
Run flutter pub run build_runner build to generate models.
Init Isar at app startup (call IsarDb.init()).
Shared repositories
Copy and adapt firebase_firestore.dart, firebase_storage.dart, upload_service.dart, download_service.dart, push_notifications.dart, compression_service.dart, shared/utils/* into your project.
Replace package imports (whatsapp_clone → your package name) and fix null-safety mismatches if any.
Chat controller & models
Copy features/chat/models and chat_controller.dart. Adapt references to your services and app state (auth user provider).
Wire chat controller provider into your app (so UI can call send/receive methods).
UI
Copy chat UI widgets (message_cards, chat_field, attachment_sender, attachment_viewer, emoji picker) into lib/features/chat/views and plug into routes.
Ensure assets referenced exist; copy required icons/images to assets/.
Message flows
Implement send text: create Message object -> IsarDb.addMessage() -> delayed firebaseFirestoreRepo.sendMessage() -> update Isar status to sent.
Implement attachment flow: local save -> compress -> UploadService.upload() to Firebase Storage -> on upload complete, set attachment URL and send message to Firestore.
Receive flow
Implement Firestore listener: FirebaseFirestoreRepo.getChatStream(userId) reads chats/{userId}/messages snapshots; for each new doc, copy to Isar and immediately delete the Firestore doc (WhatsUp behavior).
Handle system messages (status updates) separately.
Notifications
Integrate firebase_messaging and background handler to convert push into a system message or navigate to chat.
Ensure PushNotificationsRepo sets FCM token into fcmTokens collection.
Reliability & UX
Implement optimistic UI, upload progress, cancel upload.
Implement retry/backoff on upload or send failures.
Implement pagination or lazy load in chat UI (Isar query sortByTimestampDesc).
Presence & receipts
Update users/{userId}.activityStatus.
Use system messages for delivery/read updates (update Isar entry status).
Offline / Sync
On reconnection, sync missed messages: either Firestore listener will pick new docs, or query recent messages; ensure idempotency.
Tests & QA
Unit test ChatStateNotifier send & upload logic.
Integration test for Firestore read/write (use emulator if possible).
Manual E2E tests across two devices.
Performance & polish
Use cached_network_image, image compression, and lazy list (ListView.builder with reverse).
Limit Firestore read frequency, use batched writes for attachments if needed.
Documentation & PR
Document how to setup Firebase, run build_runner, and any native changes.
Open PR from chat_module branch with clear changes and run instructions.
Milestones & Timeline (estimates)

Prep (Firebase + dependencies): 0.5–1 day
Local DB + models + build_runner: 0.5–1 day
Shared repo copy + adapt: 1 day
Message send/attachment upload: 1–2 days
Receive flow + delete-on-receive + push: 1–2 days
UI integration and polish: 2–4 days
Offline sync, receipts, tests: 2–4 days
Total MVP: ~1–2 weeks (focused effort)
Implementation notes / gotchas

Firestore delete-on-receive: ensure atomic handling to avoid message loss (use doc deletion only after persisting locally).
Isar model generation: commit generated .g.dart files or include in .gitignore then generate on CI.
Android/iOS native changes: check AndroidManifest.xml for permissions (storage, camera, mic) and Gradle plugins for google-services.
FCM background messages require proper setup in native Android Application and iOS capabilities.
Watch SDK version compatibility of Firebase packages with your Flutter SDK.
Consider using Firestore emulator during development to avoid quota/cost issues.

**Firebase quick-setup (one-command) for contributors**

- Prerequisites: Node/npm (for Firebase CLI), Dart SDK, Flutter SDK.
- Install CLIs (once):

```powershell
npm install -g firebase-tools
dart pub global activate flutterfire_cli
# ensure pub-cache bin is on PATH: %USERPROFILE%\\.pub-cache\\bin
```

- From the Flutter project root run (interactive):

```powershell
flutterfire configure
```

- Non-interactive example (replace with your Firebase project id):

```powershell
flutterfire configure --project YOUR_FIREBASE_PROJECT_ID --out lib/firebase_options.dart --platforms android,ios
```

- What this does:
	- Generates `lib/firebase_options.dart` and `ios/firebase_app_id_file.json`.
	- Adds FlutterFire hooks to Android/iOS native files (Gradle / Xcode markers).
	- You still may need to download `google-services.json` and `GoogleService-Info.plist` from the Firebase console for some setups.

- Optional: deploy rules & indexes (if provided in repo):

```powershell
firebase deploy --only firestore:rules,firestore:indexes
```

- Optional: seed example collections (if you want predictable test data). Use a small Node script with `firebase-admin` or the Firebase Emulator Suite. Example (node script):

```js
// tools/seed_firestore.js (example)
const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'YOUR_FIREBASE_PROJECT_ID' });
const db = admin.firestore();
async function seed(){
	await db.collection('users').doc('alice').set({name:'Alice'});
	await db.collection('users').doc('bob').set({name:'Bob'});
}
seed();
```

- Verification: run the app — client writes will create collections on first use; confirm `lib/firebase_options.dart` is present and `main.dart` calls `Firebase.initializeApp(...)`.

Include these steps in your repo `README.md` or `firebase_setup.md` so contributors can run a single command to wire Firebase for local dev.

**Automating Firestore collections, rules, indexes and seed data**

- Firestore is schemaless: collections and documents are created on first write. To automate project setup for contributors, include rules, indexes and optional seed data in the repo and provide CLI commands to deploy or import them.

- Rules & indexes
	- Add `firestore.rules` and `firestore.indexes.json` to the repo (typically under a `firebase/` or `infra/` folder).
	- Deploy them with the Firebase CLI:

	```powershell
	firebase deploy --only firestore:rules,firestore:indexes
	```

- Seed data (recommended approaches)
	- Quick dev seed using the Firestore Emulator: prepare an export and instruct contributors to run the emulator with import:

	```powershell
	# start emulator and import data directory
	firebase emulators:start --import=./seed_export

	# export current emulator data after seeding
	firebase emulators:export ./seed_export
	```

	- Controlled seed using a small Node script and the Admin SDK (safe for CI/local with service-account key):

	```js
	// tools/seed_firestore.js
	const admin = require('firebase-admin');
	admin.initializeApp({ credential: admin.credential.cert(require('./sa.json')) });
	const db = admin.firestore();
	async function seed(){
		await db.collection('users').doc('alice').set({name:'Alice'});
		await db.collection('users').doc('bob').set({name:'Bob'});
	}
	seed();
	```

	- Import a production-like export with `gcloud` if you have a Firestore export (advanced):

	```bash
	gcloud firestore import gs://YOUR_BUCKET/path/to/export
	```

- Notes & best practices
	- Commit `firestore.rules` and `firestore.indexes.json` to version control so CI can deploy them.
	- Use the Emulator Suite for contributor onboarding to avoid cloud costs and speed up testing.
	- Avoid destructive automated scripts that run against production; clearly document which commands target emulator vs. production.
	- If you need more advanced provisioning, create a `tools/` script that runs the Admin SDK seeding and mark it for local/CI use only.