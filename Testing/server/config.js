require('dotenv').config();
const path = require('path');

module.exports = {
  // ── Server ─────────────────────────────────────────────────────────
  PORT: parseInt(process.env.PORT || '3001'),
  BACKEND_URL: process.env.BACKEND_URL || 'https://backend.sentrizk.me',

  // ── Supabase ───────────────────────────────────────────────────────
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  // ── Firebase ───────────────────────────────────────────────────────
  FIREBASE_SERVICE_ACCOUNT_PATH: path.resolve(
    __dirname,
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '../../Backend/serviceAccountKey.json'
  ),

  // ── Test Account ───────────────────────────────────────────────────
  TEST_USER: process.env.TEST_USER || 'sentrizk_test_user',
  TEST_SECRET: process.env.TEST_SECRET || '',
  TEST_SALT: process.env.TEST_SALT || '',
  TEST_UNAME_HASH: process.env.TEST_UNAME_HASH || '',
  TEST_DEVICE: process.env.TEST_DEVICE || 'test_device_dashboard_001',

  // ── Admin ──────────────────────────────────────────────────────────
  ADMIN_USERNAME: process.env.ADMIN_USERNAME || '',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || '',

  // ── ZKP Circuit Files ──────────────────────────────────────────────
  LOGIN_WASM: path.resolve(
    __dirname,
    process.env.LOGIN_WASM || '../../Backend/circuits/login/login_js/login.wasm'
  ),
  LOGIN_ZKEY: path.resolve(
    __dirname,
    process.env.LOGIN_ZKEY || '../../Backend/circuits/key_generation/login_final.zkey'
  ),
  REG_WASM: path.resolve(
    __dirname,
    '../../Backend/circuits/registration/registration_js/registration.wasm'
  ),
  REG_ZKEY: path.resolve(
    __dirname,
    '../../Backend/circuits/key_generation/registration_final.zkey'
  ),

  // ── APK (for reverse engineering tests) ───────────────────────────
  APK_PATH: path.resolve(
    __dirname,
    process.env.APK_PATH ||
      '../../Frontend/mobile/build/app/outputs/flutter-apk/app-release.apk'
  ),

  // ── ML Assets ─────────────────────────────────────────────────────
  ML_MODEL_PATH: path.resolve(
    __dirname,
    process.env.ML_MODEL_PATH || '../../Frontend/mobile/assets/ml/sentrizk_model.tflite'
  ),
  ML_VOCAB_PATH: path.resolve(
    __dirname,
    process.env.ML_VOCAB_PATH || '../../Frontend/mobile/assets/ml/vocab.json'
  ),
  ML_SERVICE_PATH: path.resolve(
    __dirname,
    process.env.ML_SERVICE_PATH ||
      '../../Frontend/mobile/lib/services/message_scan_service.dart'
  ),
};
