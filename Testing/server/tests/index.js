// Central test registry — maps testId → test module
module.exports = {
  // ── CONFIDENTIALITY ───────────────────────────────────────────────
  c1:  require('./auth/c1_db_no_passwords'),
  c2:  require('./auth/c2_secret_scanning'),
  c3a: require('./apk/c3a_jadx'),

  c3c: require('./apk/c3c_strings'),
  c4:  require('./chat/c4_firebase_ciphertext'),
//  c6:  require('./ml/c6_ml_privacy'),

  // ── INTEGRITY ─────────────────────────────────────────────────────
  i1:  require('./auth/i1_zkp_forgery'),
  i2:  require('./auth/i2_nonce_replay'),
  i3:  require('./auth/i3_commitment_sub'),
  i4:  require('./auth/i4_mat_reuse'),
  i5:  require('./auth/i5_jwt_forgery'),
  i6:  require('./auth/i6_session_rotation'),
  i7:  require('./auth/i7_device_binding'),
  i8:  require('./chat/i8_input_injection'),

  // ── AVAILABILITY ──────────────────────────────────────────────────
  a1:  require('./availability/a1_rate_limit_login'),
  a2:  require('./availability/a2_rate_limit_admin'),
  a3:  require('./availability/a3_payload_size'),
//  a4:  require('./availability/a4_session_expiry'),

  // ── ML DETECTION ──────────────────────────────────────────────────
  ml1: require('./ml/ml1_phishing'),
  ml2: require('./ml/ml2_safe'),
  ml3: require('./ml/ml3_short'),
};
