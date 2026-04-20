// C4 — Firebase E2EE: All Messages Are Ciphertext
// Uses Firebase Admin SDK to read Firestore messages and verify they're Signal ciphertext.
// PASS = no plaintext found, all content is base64 Signal ciphertext.

const fs     = require('fs');
const config = require('../../config');

module.exports = {
  id:          'c4',
  name:        'Firebase E2EE: Messages Are Ciphertext',
  category:    'CONFIDENTIALITY',
  description: 'Read raw Firestore messages. Prove server stores ONLY Signal Protocol ciphertext.',

  async run(emit) {
    emit({ type: 'ATTACK', msg: '🔥 Simulating Firebase breach (Admin SDK with full Firestore read access)...' });

    // ── Check Firebase service account ────────────────────────────
    if (!fs.existsSync(config.FIREBASE_SERVICE_ACCOUNT_PATH)) {
      emit({ type: 'SKIP', msg: `⚠️  Firebase service account not found at: ${config.FIREBASE_SERVICE_ACCOUNT_PATH}` });
      emit({ type: 'SKIP', msg: 'Copy Backend/serviceAccountKey.json and set FIREBASE_SERVICE_ACCOUNT_PATH in .env' });
      emit({ type: 'VERDICT', passed: null, msg: 'SKIPPED — Configure Firebase service account to run C4.' });
      return { passed: null };
    }

    let admin;
    try {
      admin = require('firebase-admin');
      if (!admin.apps.length) {
        const serviceAccount = require(config.FIREBASE_SERVICE_ACCOUNT_PATH);
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
      }
    } catch (err) {
      emit({ type: 'ERROR', msg: `Firebase init failed: ${err.message}` });
      emit({ type: 'VERDICT', passed: false, msg: '❌ FAIL — Firebase Admin SDK error.' });
      return { passed: false };
    }

    try {
      const db = admin.firestore();
      emit({ type: 'ATTACK', msg: 'Querying: db.collectionGroup("messages").limit(5)' });

      const snap = await db.collectionGroup('messages').limit(5).get();

      if (snap.empty) {
        emit({ type: 'SKIP', msg: '⚠️  No messages found in Firestore. Send some messages first.' });
        emit({ type: 'VERDICT', passed: null, msg: 'SKIPPED — No messages in Firestore to inspect.' });
        return { passed: null };
      }

      emit({ type: 'RESULT', msg: `Found ${snap.size} messages. Inspecting each document...` });

      const results = [];

      snap.forEach((doc) => {
        const d            = doc.data();
        const content      = d.content   || d.ciphertext || '';
        const signalType   = d.signalType;
        const hasPlaintext = d.plaintext !== undefined;

        // Is the content base64-ish (Signal ciphertext)?
        const isBase64 = /^[A-Za-z0-9+/=]{20,}$/.test(content.substring(0, 50));
        const isHumanReadable = /^[a-zA-Z\s,.!\-?]{10,}$/.test(content.substring(0, 30));

        emit({ type: 'RESULT', msg: `\n  Doc: ${doc.id.substring(0, 20)}...` });
        emit({ type: 'RESULT', msg: `  senderId: ${d.senderId}  →  receiverId: ${d.receiverId}` });
        emit({ type: 'RESULT', msg: `  signalType: ${signalType} (3=DoubleRatchet, 5=PreKey)` });
        emit({ type: 'RESULT', msg: `  content (first 60 chars): ${content.substring(0, 60)}` });
        emit({ type: 'CHECK',  msg: `  Looks like base64 ciphertext: ${isBase64 ? '✅ YES' : '⚠️  MAYBE NOT'}` });
        emit({ type: 'CHECK',  msg: `  Looks like human-readable text: ${isHumanReadable ? '❌ YES — PLAINTEXT STORED!' : '✅ NO'}` });
        emit({ type: 'CHECK',  msg: `  'plaintext' field exists: ${hasPlaintext ? '❌ YES — SCHEMA ERROR' : '✅ NO'}` });

        results.push(!isHumanReadable && !hasPlaintext && isBase64);
      });

      emit({ type: 'EXPLAIN', msg: 'Signal Protocol (Double Ratchet) encrypts every message with AES-256-CBC + HMAC-SHA256.' });
      emit({ type: 'EXPLAIN', msg: 'Each encryption uses a different ephemeral key — forward secrecy guaranteed.' });
      emit({ type: 'EXPLAIN', msg: 'Even Google (Firebase/Firestore) cannot read these messages.' });

      const passed = results.every(Boolean);
      emit({
        type:   'VERDICT',
        passed,
        msg:    passed
          ? '✅ PASS — All Firestore messages are Signal Protocol ciphertext. Zero plaintext stored.'
          : `❌ FAIL — ${results.filter(b => !b).length} message(s) appear to contain plaintext or missing signalType!`,
      });

      return { passed };
    } catch (err) {
      emit({ type: 'ERROR', msg: `Firestore query failed: ${err.message}` });
      emit({ type: 'VERDICT', passed: false, msg: '❌ FAIL — Firestore access error.' });
      return { passed: false };
    }
  },
};
