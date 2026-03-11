# Google Safe Browsing API - Setup Guide

## Overview
The Google Safe Browsing API protects your users by checking URLs against Google's constantly updated lists of unsafe web resources.

## Step-by-Step Setup

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click "New Project"
4. Enter project name: `sentrizk-phishing-detection` (or your choice)
5. Click "Create"

### 2. Enable Safe Browsing API

1. In the Cloud Console, go to **APIs & Services** > **Library**
2. Search for "Safe Browsing API"
3. Click on **"Safe Browsing API"**
4. Click **"Enable"**
5. Wait for activation (takes ~30 seconds)

### 3. Create API Key

1. Go to **APIs & Services** > **Credentials**
2. Click **"Create Credentials"** > **"API Key"**
3. Your API key will be displayed - **COPY IT IMMEDIATELY**
4. Format: `AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXX`

### 4. Restrict API Key (Recommended for Production)

1. Click on the API key you just created
2. Under "API restrictions":
   - Select "Restrict key"
   - Check only "Safe Browsing API"
3. Under "Application restrictions":
   - For Android: Select "Android apps"
   - Click "Add an item"
   - Enter your package name: `com.sentrizk.mobile` (adjust to your actual package)
   - Add SHA-1 fingerprint (get from Android Studio or keystore)
4. Click "Save"

### 5. Configure in Your App

Open `Frontend/mobile/lib/services/security/safe_browsing_service.dart`:

```dart
// Replace this line:
static const String _apiKey = 'YOUR_GOOGLE_SAFE_BROWSING_API_KEY';

// With your actual key:
static const String _apiKey = 'AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
```

### 6. Test the Integration

Run this test:

```dart
import 'package:mobile/services/security/safe_browsing_service.dart';

void testApi() async {
  // Test with known phishing site (Google's test URL)
  final result = await SafeBrowsingService.checkUrl(
    'http://malware.testing.google.test/testing/malware/'
  );
  
  print('Is dangerous: ${result.isDangerous}'); // Should be true
  print('Threat type: ${result.threatType}');   // Should be MALWARE
  print('Message: ${result.message}');
}
```

## API Quotas and Pricing

### Free Tier
- **10,000 requests per day** - FREE
- Sufficient for most small to medium apps
- Resets daily at midnight PST

### Paid Tier
- **$0.50 per 1,000 requests** (beyond free tier)
- No monthly fees
- Pay only for what you use

### Example Costs

| Daily Active Users | Est. Requests/Day | Monthly Cost |
|--------------------|-------------------|--------------|
| 100                | 500               | $0           |
| 1,000              | 5,000             | $0           |
| 5,000              | 25,000            | ~$22.50      |
| 10,000             | 50,000            | ~$60         |

*Assumes average 5 URL checks per user per day*

### Cost Optimization Tips

1. **Local checks first** - Already implemented
2. **Cache results** - Implement 30-minute TTL
3. **Batch requests** - Already implemented
4. **Rate limiting** - Add if needed
5. **User whitelists** - Skip trusted domains

## API Request Format

The app sends requests in this format:

```json
{
  "client": {
    "clientId": "sentrizk-chat",
    "clientVersion": "1.0.0"
  },
  "threatInfo": {
    "threatTypes": [
      "MALWARE",
      "SOCIAL_ENGINEERING",
      "UNWANTED_SOFTWARE",
      "POTENTIALLY_HARMFUL_APPLICATION"
    ],
    "platformTypes": ["ANY_PLATFORM"],
    "threatEntryTypes": ["URL"],
    "threatEntries": [
      {"url": "http://example.com/"}
    ]
  }
}
```

## API Response Format

Safe URL response:
```json
{}
```

Dangerous URL response:
```json
{
  "matches": [
    {
      "threatType": "MALWARE",
      "platformType": "ANY_PLATFORM",
      "threat": {
        "url": "http://malware-site.com/"
      },
      "threatEntryType": "URL"
    }
  ]
}
```

## Threat Types Explained

| Threat Type | Description | User Message |
|-------------|-------------|--------------|
| MALWARE | Site hosts malware | "This link may contain malware" |
| SOCIAL_ENGINEERING | Phishing/deceptive content | "This link may be a phishing attempt" |
| UNWANTED_SOFTWARE | PUPs, adware | "This link may contain unwanted software" |
| POTENTIALLY_HARMFUL_APPLICATION | Harmful mobile apps | "This link may lead to harmful applications" |

## Security Best Practices

### For Development
```dart
// ✅ DO: Use environment variable
static const String _apiKey = String.fromEnvironment(
  'SAFE_BROWSING_API_KEY',
  defaultValue: '',
);
```

### For Production

1. **Use Flutter's --dart-define**:
   ```bash
   flutter build apk --dart-define=SAFE_BROWSING_API_KEY=AIzaSy...
   ```

2. **Or use flutter_dotenv**:
   ```yaml
   dependencies:
     flutter_dotenv: ^5.1.0
   ```
   
   Create `.env` file:
   ```
   SAFE_BROWSING_API_KEY=AIzaSy...
   ```
   
   Load in code:
   ```dart
   import 'package:flutter_dotenv/flutter_dotenv.dart';
   
   await dotenv.load();
   final apiKey = dotenv.env['SAFE_BROWSING_API_KEY']!;
   ```

3. **Add .env to .gitignore**:
   ```
   .env
   .env.local
   ```

## Monitoring API Usage

### View Usage in Google Cloud Console

1. Go to **APIs & Services** > **Dashboard**
2. Click on **Safe Browsing API**
3. View graphs for:
   - Requests per day
   - Errors
   - Latency
   - Quotas

### Set Up Budget Alerts

1. Go to **Billing** > **Budgets & alerts**
2. Click **"Create Budget"**
3. Set threshold (e.g., $10/month)
4. Add email alerts
5. Get notified before costs exceed budget

## Troubleshooting

### Error: "API key not valid"
- Verify key is copied correctly
- Check API is enabled
- Wait 5 minutes after enabling API

### Error: "API key expired"
- Regenerate key in Cloud Console
- Update in app

### Error: "Quota exceeded"
- Check daily usage in dashboard
- Implement caching to reduce calls
- Consider upgrading to paid tier

### Error: "Permission denied"
- Check API restrictions
- Verify app package name matches restriction

### No response / Timeout
- Check internet connectivity
- Verify endpoint URL is correct
- Check firewall/proxy settings

## Alternative: Run Without API Key

The app will still work without an API key using only:
- ✅ Homograph detection (local)
- ✅ Local phishing database (offline)
- ✅ HTTPS validation (local)

Only Google Safe Browsing checks will be skipped.

To disable API calls entirely:
```dart
// In safe_browsing_service.dart
static Future<ThreatCheckResult> checkUrl(String url) async {
  // Skip API call, return safe
  return ThreatCheckResult(
    isSafe: true,
    threatType: null,
    message: 'Safe Browsing disabled',
  );
}
```

## Testing URLs

Google provides test URLs for development:

```dart
// Test malware detection
'http://malware.testing.google.test/testing/malware/'

// Test social engineering
'http://testsafebrowsing.appspot.com/s/phishing.html'

// Safe URL
'https://www.google.com'
```

## Support & Resources

- [API Documentation](https://developers.google.com/safe-browsing/v4)
- [API Reference](https://developers.google.com/safe-browsing/v4/reference/rest)
- [Pricing Details](https://developers.google.com/safe-browsing/v4/usage-limits)
- [Support Forum](https://groups.google.com/g/google-safe-browsing-api)

## Summary Checklist

- [ ] Create Google Cloud project
- [ ] Enable Safe Browsing API
- [ ] Create API key
- [ ] Restrict API key (production)
- [ ] Add key to app code
- [ ] Test with known malicious URL
- [ ] Set up billing alerts
- [ ] Monitor usage
- [ ] Implement caching (optional)
- [ ] Secure API key (use env vars)

---

**Note**: API key is optional. App provides strong protection with local checks alone.
