/// App Configuration
/// Change URLs here for all environments (development, production)
class AppConfig {
  // 🔧 BACKEND API URL - Update this with your ngrok or production URL (NO trailing slash)
  static const String apiUrl = "https://backend.a4innovation.shop";

  // 🌐 WEB FRONTEND URL - Update this with your web app URL (NO trailing slash)
  static const String webUrl = "https://frontend.a4innovation.shop";

  // 📱 DEEP LINK SCHEME - Don't change unless you modify AndroidManifest.xml
  static const String deepLinkScheme = "sentriapp";

  // 🔐 SECURITY SETTINGS
  static const int sessionTimeoutMinutes = 30;
  static const int matExpiryMinutes = 5;

  // 📍 COMPUTED URLS (don't modify these directly)
  static String get registerUrl => "$webUrl/register";
  static String get loginUrl => "$webUrl/login";

  // API Endpoints
  static String get generateMATEndpoint =>
      "$apiUrl/generate-mobile-access-token";
  static String get validateSessionEndpoint => "$apiUrl/validate-session";
  static String get refreshSessionEndpoint => "$apiUrl/refresh-session";
  static String get firebaseTokenEndpoint => "$apiUrl/firebase-token";
  static String get threatLogEndpoint => "$apiUrl/threat-log";
  static String get logoutEndpoint => "$apiUrl/logout";

  // Deep Link Callbacks
  static String get authCallbackUrl => "$deepLinkScheme://auth-callback";
  static String get loginSuccessUrl => "$deepLinkScheme://login-success";
}
