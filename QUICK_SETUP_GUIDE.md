# Quick Setup Guide - SentriZK

## Prerequisites
- Node.js (v18 or higher)
- Flutter SDK (v3.8 or higher)
- Android Studio or Xcode for mobile development

## Step-by-Step Setup

### 1. Backend Setup (5 minutes)

```powershell
# Navigate to backend directory
cd d:\FYP\FYP_SentriZK\Backend

# Install dependencies (if not already done)
npm install

# Start the server
node server.js

# Expected output:
# 🚀 [server] running on all interfaces, port 6000
# 🔒 [security] Session timeout: 30 minutes
# 🔒 [security] Mobile access token TTL: 5 minutes
```

**Important**: The backend must be running on an accessible network (use ngrok for mobile testing)

### 2. Expose Backend with ngrok

```powershell
# In a new terminal
ngrok http 6000

# Copy the ngrok URL (e.g., https://abc123.ngrok-free.app)
```

### 3. Update Mobile App Configuration

Edit `d:\FYP\FYP_SentriZK\Frontend\mobile\lib\services\auth_service.dart`:

```dart
// Line 18 - Update with your ngrok URL
static const String _apiUrl = "https://YOUR_NGROK_URL";
```

Edit `d:\FYP\FYP_SentriZK\Frontend\mobile\lib\screens\auth_screen.dart`:

```dart
// Lines ~113 and ~130 - Update registration and login URLs
"https://YOUR_NGROK_URL/register"
"https://YOUR_NGROK_URL/login"
```

### 4. Update Web Frontend Configuration

Create or edit `d:\FYP\FYP_SentriZK\Frontend\web\.env.local`:

```env
NEXT_PUBLIC_LOGIN_WASM=/circuits/login/login_js/login.wasm
NEXT_PUBLIC_LOGIN_ZKEY=/circuits/login/login_final.zkey
NEXT_PUBLIC_REG_WASM=/circuits/registration/registration_js/registration.wasm
NEXT_PUBLIC_REG_ZKEY=/circuits/registration/registration_final.zkey
NEXT_PUBLIC_API_URL=https://YOUR_NGROK_URL
```

### 5. Install Mobile Dependencies

```powershell
cd d:\FYP\FYP_SentriZK\Frontend\mobile

# Get Flutter dependencies
flutter pub get

# Expected: All packages should be fetched successfully
```

### 6. Start Web Frontend

```powershell
cd d:\FYP\FYP_SentriZK\Frontend\web

# Install dependencies (if not already done)
npm install

# Start development server
npm run dev

# Expected: Server running on http://localhost:3000
```

### 7. Run Mobile App

```powershell
cd d:\FYP\FYP_SentriZK\Frontend\mobile

# For Android
flutter run

# OR for specific device
flutter run -d <device-id>

# Get device list
flutter devices
```

## Testing the Complete Flow

### Test 1: Registration

1. **Mobile App**:
   - Tap "🔐 Open Web Registration"
   - Wait for browser to open (MAT is generated)

2. **Web Browser**:
   - Should see "Connect Your Wallet" screen
   - Enter password: `demo123`
   - Select any demo wallet
   - Enter username (min 3 characters)
   - Enter password (min 8 characters)
   - Confirm password
   - Tap "Create Account"
   - Wait for ZKP proof generation
   - Browser will redirect back to app

3. **Mobile App (Callback)**:
   - Should show success message
   - Mnemonic words displayed (SAVE THESE!)
   - Credentials stored securely

### Test 2: Login

1. **Mobile App**:
   - Tap "🔓 Open Web Login"
   - Wait for browser to open

2. **Web Browser**:
   - Should see username pre-filled
   - Connect same wallet used in registration
   - Enter password
   - Tap "Login"
   - Wait for authentication
   - Browser will redirect back to app

3. **Mobile App (Callback)**:
   - Should show success with session info
   - Session active for 30 minutes

### Test 3: Session Management

1. **Check Session**:
   - Tap "Check Session"
   - Should show "✅ Session is valid and active"

2. **Refresh Session**:
   - Tap "Refresh"
   - Should extend session by 30 minutes

3. **Logout**:
   - Tap "🚪 Logout"
   - Confirm logout
   - Session cleared from backend

### Test 4: Security

1. **Direct Browser Access** (Should Fail):
   - Open browser on computer
   - Navigate to `YOUR_NGROK_URL/register`
   - Should see "Access Restricted" screen

2. **Expired MAT** (Should Fail):
   - Open registration from mobile
   - Wait 5+ minutes on the page
   - Try to proceed
   - Should see "Session expired" message

## Troubleshooting

### Issue: "Cannot connect to backend"
**Solution**: 
- Check backend is running (port 6000)
- Verify ngrok is running
- Update API URLs in mobile and web config

### Issue: "Access Denied" on web pages
**Solution**:
- Ensure you're opening pages from mobile app
- MAT must be valid (check it's not expired)
- Verify ngrok URL is correct

### Issue: "Session expired" immediately
**Solution**:
- Check system time is correct
- Verify backend session timeout configuration
- Clear mobile app storage and re-register

### Issue: Mobile app can't redirect back
**Solution**:
- Check deep link configuration in Android manifest
- Verify URL scheme is `sentriapp://`
- Test deep links: `adb shell am start -a android.intent.action.VIEW -d "sentriapp://test"`

### Issue: Wallet connector doesn't work
**Solution**:
- Try password: `demo123`
- Clear browser cache
- Check browser console for errors

### Issue: ZKP proof generation fails
**Solution**:
- Verify circuit files are in place
- Check environment variables are set
- Ensure wasm and zkey files are accessible
- Check browser console for detailed errors

## Network Configuration

### For Local Testing
- Backend: `http://localhost:6000`
- Web: `http://localhost:3000`
- Mobile: Connect to same WiFi network

### For External Testing (Recommended)
- Use ngrok to expose both backend and frontend
- Update all URLs in configurations
- Mobile can access from anywhere

## Security Notes

⚠️ **Important Security Reminders**:

1. **Never commit** `.env.local` files with production URLs
2. **Change wallet simulator password** in production
3. **Use HTTPS** for all production endpoints
4. **Implement proper** backend authentication for production
5. **Store mnemonic words** safely (user responsibility)
6. **Session timeout** is configurable in backend
7. **MAT expiration** should be adjusted based on UX needs

## Development Tips

1. **Hot Reload**: Both Flutter and Next.js support hot reload
2. **Debugging**: Use browser DevTools and Flutter DevTools
3. **Logs**: Check backend console, browser console, and Flutter console
4. **Database**: Backend uses file-based `db.json` for simplicity
5. **Clean State**: Delete `db.json` to reset all users

## Production Deployment

Before deploying to production:

1. ✅ Replace file-based DB with real database (PostgreSQL/MongoDB)
2. ✅ Implement proper backend authentication
3. ✅ Use environment variables for all sensitive data
4. ✅ Enable HTTPS everywhere
5. ✅ Add monitoring and logging
6. ✅ Implement backup and recovery
7. ✅ Add rate limiting and DDoS protection
8. ✅ Conduct security audit
9. ✅ Implement proper error handling
10. ✅ Add analytics and tracking

## Next Steps

Once setup is complete:
1. Test all flows thoroughly
2. Customize UI colors and branding
3. Add your app's business logic
4. Integrate with your backend services
5. Prepare for production deployment

---

**Need Help?** Check `IMPLEMENTATION_SUMMARY.md` for detailed information about the system architecture and features.

**Happy Coding! 🚀**
