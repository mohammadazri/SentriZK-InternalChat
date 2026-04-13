/// App Configuration
/// Change URLs here for all environments (development, production)
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// All tunable values live in this single file for easy maintenance.
/// After changing any value, rebuild the app (hot reload is enough for most).
class AppConfig {
  // ═══════════════════════════════════════════════════════════════
  //  🔧  BACKEND & WEB
  // ═══════════════════════════════════════════════════════════════

  /// Backend API URL (NO trailing slash)
  static const String apiUrl = "https://backend.sentrizk.me";

  /// Web frontend URL (NO trailing slash)
  static const String webUrl = "https://frontend.sentrizk.me";

  /// Deep link scheme — must match AndroidManifest.xml / Info.plist
  static const String deepLinkScheme = "sentriapp";

  // ═══════════════════════════════════════════════════════════════
  //  🔐  AUTH & SESSION
  // ═══════════════════════════════════════════════════════════════

  /// How long a session stays valid before requiring re-auth
  static const int sessionTimeoutMinutes = 30;

  /// How long MAT tokens live (mobile-to-web bridge)
  static const int matExpiryMinutes = 5;

  /// Timeout for login redirect processing (seconds)
  static const int loginRedirectTimeoutSeconds = 30;

  // ═══════════════════════════════════════════════════════════════
  //  🤖  ML THREAT DETECTION
  // ═══════════════════════════════════════════════════════════════

  /// Path to the TFLite model inside Flutter assets
  static const String mlModelAsset = 'assets/ml/sentrizk_model.tflite';

  /// Path to the vocabulary JSON inside Flutter assets
  static const String mlVocabAsset = 'assets/ml/vocab.json';

  /// Maximum sequence length (must match training MAX_LEN)
  static const int mlMaxLen = 120;

  /// Index used for out-of-vocabulary words (must match training OOV_TOK)
  static const int mlOovIndex = 1;

  /// Score above this = threat (0.0–1.0). Raise to reduce false positives.
  static const double mlThreatThreshold = 0.65;

  /// Messages shorter than this word count are skipped (avoids OOV noise)
  static const int mlMinWordCount = 4;

  // ═══════════════════════════════════════════════════════════════
  //  🛡️  SECURITY SCANNING
  // ═══════════════════════════════════════════════════════════════

  /// How many days to cache a URL scan result before re-scanning
  static const int scanCacheDays = 7;

  // ═══════════════════════════════════════════════════════════════
  //  📍  COMPUTED URLS (don't modify directly)
  // ═══════════════════════════════════════════════════════════════

  static String get registerUrl => "$webUrl/register";
  static String get loginUrl => "$webUrl/login";
  static String get recoverUrl => "$webUrl/recover";

  // API Endpoints
  static String get generateMATEndpoint =>
      "$apiUrl/generate-mobile-access-token";
  static String get validateSessionEndpoint => "$apiUrl/validate-session";
  static String get refreshSessionEndpoint => "$apiUrl/refresh-session";
  static String get firebaseTokenEndpoint => "$apiUrl/firebase-token";
  static String get threatLogEndpoint => "$apiUrl/threat-log";
  static String get logoutEndpoint => "$apiUrl/logout";
  static String get notifyEndpoint => "$apiUrl/notify";

  // Deep Link Callbacks
  static String get authCallbackUrl => "$deepLinkScheme://auth-callback";
  static String get loginSuccessUrl => "$deepLinkScheme://login-success";
}
