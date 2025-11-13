# 🔧 Mobile App Configuration Guide

All URLs and configuration are now centralized in one file for easy updates!

## 📁 Configuration File Location

```
Frontend/mobile/lib/config/app_config.dart
```

## 🛠️ How to Update URLs

### 1. Open the Configuration File

Navigate to: `Frontend/mobile/lib/config/app_config.dart`

### 2. Update Your URLs

```dart
class AppConfig {
  // 🔧 BACKEND API URL - Update this with your ngrok or production URL
  static const String apiUrl = "https://YOUR_BACKEND_NGROK_URL.ngrok-free.app";

  // 🌐 WEB FRONTEND URL - Update this with your web app URL  
  static const String webUrl = "https://YOUR_WEB_NGROK_URL.ngrok-free.app";

  // ... rest of the file
}
```

### 3. Replace These Values:

| Field | What to Update | Example |
|-------|---------------|---------|
| `apiUrl` | Your backend server ngrok URL | `https://abc123.ngrok-free.app` |
| `webUrl` | Your Next.js web app ngrok URL | `https://xyz789.ngrok-free.app` |
| `deepLinkScheme` | Keep as `sentriapp` (unless you change AndroidManifest.xml) | `sentriapp` |

## 📍 Where URLs Are Used

The centralized config automatically provides:

### Web URLs
- ✅ Registration page: `AppConfig.registerUrl`
- ✅ Login page: `AppConfig.loginUrl`

### API Endpoints
- ✅ Generate Mobile Access Token: `AppConfig.generateMATEndpoint`
- ✅ Validate Session: `AppConfig.validateSessionEndpoint`
- ✅ Refresh Session: `AppConfig.refreshSessionEndpoint`
- ✅ Logout: `AppConfig.logoutEndpoint`

### Deep Links
- ✅ Registration callback: `AppConfig.authCallbackUrl`
- ✅ Login success: `AppConfig.loginSuccessUrl`

## 🚀 Quick Setup Steps

### Development (with ngrok)

1. **Start Backend:**
   ```bash
   cd Backend
   node server.js
   ```

2. **Start ngrok for Backend:**
   ```bash
   ngrok http 6000
   ```
   Copy the URL (e.g., `https://abc123.ngrok-free.app`)

3. **Start Web Frontend:**
   ```bash
   cd Frontend/web
   npm run dev
   ```

4. **Start ngrok for Web:**
   ```bash
   ngrok http 3000
   ```
   Copy the URL (e.g., `https://xyz789.ngrok-free.app`)

5. **Update Mobile Config:**
   Open `Frontend/mobile/lib/config/app_config.dart` and update:
   ```dart
   static const String apiUrl = "https://abc123.ngrok-free.app";
   static const String webUrl = "https://xyz789.ngrok-free.app";
   ```

6. **Run Mobile App:**
   ```bash
   cd Frontend/mobile
   flutter run
   ```

### Production

1. **Update to Production URLs:**
   ```dart
   static const String apiUrl = "https://api.yourdomain.com";
   static const String webUrl = "https://app.yourdomain.com";
   ```

2. **Rebuild the app:**
   ```bash
   flutter build apk --release  # For Android
   flutter build ios --release  # For iOS
   ```

## 🎯 Files Updated (No Need to Touch These)

These files now automatically use `AppConfig`:

- ✅ `lib/services/auth_service.dart` - All API calls
- ✅ `lib/screens/auth_screen.dart` - Registration & login URLs
- ✅ `lib/main.dart` - Web URLs and deep link scheme

## ⚙️ Environment-Specific Config (Optional)

If you want different configs for dev/staging/production, you can modify `app_config.dart`:

```dart
class AppConfig {
  // Environment flag
  static const bool isProduction = false; // Change to true for production

  // URLs based on environment
  static const String apiUrl = isProduction
      ? "https://api.yourdomain.com"
      : "https://abc123.ngrok-free.app";

  static const String webUrl = isProduction
      ? "https://app.yourdomain.com"
      : "https://xyz789.ngrok-free.app";
  
  // ... rest
}
```

## 🔍 Troubleshooting

### Problem: "Could not open registration/login page"
**Solution:** Check if `webUrl` in `app_config.dart` is correct and accessible

### Problem: "Failed to generate mobile access token"
**Solution:** Check if `apiUrl` in `app_config.dart` is correct and backend is running

### Problem: Deep links not working
**Solution:** Verify `deepLinkScheme` matches your `AndroidManifest.xml` configuration (default: `sentriapp`)

### Problem: After updating URLs, changes not reflected
**Solution:** 
1. Hot restart the app (not just hot reload)
2. Or stop and run again: `flutter run`

## 📝 Notes

- **No need to update URLs in multiple files** - just update `app_config.dart`
- **Ngrok URLs change** every time you restart ngrok - remember to update `app_config.dart`
- **For production**, use permanent domain names instead of ngrok
- **Deep link scheme** should only be changed if you also update `AndroidManifest.xml`

---

**Happy coding! 🎉**
