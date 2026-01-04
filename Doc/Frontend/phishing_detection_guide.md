# Phishing Detection Security Layer - Implementation Guide

## Overview
This security layer implements WhatsApp-style phishing detection in your Flutter chat app with two-layer protection:
- **Passive (Automatic)**: Homograph attack detection and local database checks
- **Active (On-Tap)**: Google Safe Browsing API verification

## Architecture

### Components Created

1. **URL Extraction** (`lib/utils/url_extractor.dart`)
   - Extracts URLs from messages using regex
   - Parses domains and validates HTTPS

2. **Homograph Detector** (`lib/services/security/homograph_detector.dart`)
   - Detects suspicious Unicode characters (e.g., googIe.com)
   - Identifies common phishing patterns
   - Provides ASCII sanitization

3. **Google Safe Browsing** (`lib/services/security/safe_browsing_service.dart`)
   - Integrates with Google Safe Browsing API v4
   - Checks URLs against threat database
   - Supports batch checking for efficiency

4. **Local Phishing Database** (`lib/services/security/local_phishing_database.dart`)
   - Maintains offline list of known phishing domains
   - Instant checks without network calls
   - Privacy-first approach

5. **Message Security Service** (`lib/services/message_security_service.dart`)
   - Orchestrates all security checks
   - Provides unified interface
   - Manages threat levels

6. **Security UI Widgets** (`lib/widgets/`)
   - `security_warning_widget.dart`: Warning badges and dialogs
   - `secure_link_text.dart`: Clickable links with security integration

## Setup Instructions

### Step 1: Install Dependencies

Run in terminal:
```bash
cd Frontend/mobile
flutter pub get
```

### Step 2: Configure Google Safe Browsing API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "Safe Browsing API"
4. Create credentials → API Key
5. Copy the API key

6. Open `lib/services/security/safe_browsing_service.dart`
7. Replace the placeholder:
   ```dart
   static const String _apiKey = 'YOUR_ACTUAL_API_KEY_HERE';
   ```

**Important**: For production, store the API key securely using environment variables or Flutter's `--dart-define`.

### Step 3: Verify Asset Configuration

The `pubspec.yaml` already includes:
```yaml
flutter:
  assets:
    - assets/
```

This covers `assets/security/known_phishing_domains.json`.

### Step 4: Test the Implementation

Create a test message with URLs:
```dart
// Test in your app
"Check this link: https://google.com"  // Safe
"Visit: https://paypal-verify.com"     // Local DB hit
"Go to: https://ẉhatsapp.com"         // Homograph detected
```

## How It Works

### Message Flow

```
User receives message
    ↓
1. URL Extraction
    ↓
2. PASSIVE CHECKS (Instant)
   - Homograph detection
   - Local phishing database
   - HTTPS validation
    ↓
3. Display message with security badge
    ↓
4. User taps link
    ↓
5. ACTIVE CHECK (Network call)
   - Google Safe Browsing API
    ↓
6. Show warning dialog if dangerous
    ↓
7. User decides to proceed or cancel
```

### Threat Levels

| Level | Description | UI Color | Action |
|-------|-------------|----------|--------|
| None | Safe URL | Blue | Open directly |
| Low | Minor issues (HTTP) | Yellow | Warning badge |
| Medium | Suspicious (homograph) | Orange | Confirmation dialog |
| High | Known phishing | Red | Strong warning |

## Privacy Considerations

✅ **Privacy-First Design**:
- Only URLs are sent to Google, not full messages
- Local checks happen first (no network)
- Checks happen on-device
- No user data is logged
- Failed API calls default to "safe" (fail-open)

## Customization

### Add More Phishing Domains

Edit `assets/security/known_phishing_domains.json`:
```json
{
  "domain": "example-phishing.com",
  "reason": "Known phishing site"
}
```

### Adjust Threat Levels

Modify `lib/services/message_security_service.dart`:
```dart
// Make homograph detection less strict
if (homographAnalysis.isSuspicious) {
  threatLevel = ThreatLevel.low; // Changed from medium
}
```

### Customize UI Colors

Edit `lib/widgets/security_warning_widget.dart`:
```dart
Color _getBackgroundColor() {
  switch (threatLevel) {
    case ThreatLevel.high:
      return Colors.red[50]!; // Change colors here
    // ...
  }
}
```

## Testing Checklist

- [ ] Regular URLs display as blue links
- [ ] Homograph URLs show orange "Suspicious Link" badge
- [ ] Known phishing domains show red "Dangerous Link" badge
- [ ] Clicking dangerous links shows full-screen warning
- [ ] "Go Back" button closes dialog
- [ ] "Open Anyway" opens browser
- [ ] HTTP links show yellow caution badge
- [ ] Security info icon shows detailed analysis

## Performance Optimization

### Current Optimizations:
1. **Local caching**: Phishing database cached for 1 hour
2. **Quick analyze**: Fast path for message display
3. **Batch checking**: Multiple URLs checked in single API call
4. **Lazy loading**: Active checks only on link tap

### For Large Message Histories:
```dart
// Use quick analyze for real-time display
final result = await MessageSecurityService.quickAnalyze(message);

// Defer full analysis to background
Future.delayed(Duration(seconds: 1), () {
  MessageSecurityService.analyzeMessage(message);
});
```

## Troubleshooting

### Links not detected
- Check URL regex in `url_extractor.dart`
- Ensure URLs have proper format (http/https)

### API not working
- Verify API key is correct
- Check API is enabled in Google Cloud
- Check network connectivity
- Review API quota limits

### Warning not showing
- Check `SecureLinkText` is used instead of `Text`
- Verify threat level calculation
- Check widget build logic

### Performance issues
- Reduce frequency of full analysis
- Use quick analyze for display
- Increase cache duration

## Security Best Practices

1. **Never store full messages** on external servers
2. **Only send URL hashes** to third-party APIs (future enhancement)
3. **Keep local database updated** regularly
4. **Log security events** for audit (optional)
5. **Rate limit API calls** to prevent abuse
6. **Implement user feedback** for false positives

## Future Enhancements

1. **URL shortener expansion**: Expand bit.ly, tinyurl before checking
2. **Machine learning**: Use on-device ML model for classification
3. **User reporting**: Let users report phishing URLs
4. **Periodic database updates**: Fetch new phishing domains from server
5. **Whitelist**: Allow users to whitelist trusted domains
6. **Analytics**: Track threat detection rates (privacy-preserving)

## API Cost Management

Google Safe Browsing API pricing:
- **Free tier**: 10,000 requests/day
- **Beyond free**: $0.50 per 1,000 requests

To minimize costs:
1. Use local checks first
2. Cache Safe Browsing results (TTL: 30 minutes)
3. Batch multiple URLs
4. Implement request throttling

## Support

For issues or questions:
1. Check this documentation
2. Review code comments
3. Test with sample URLs
4. Check Flutter/Dart logs

## Credits

Based on WhatsApp's phishing detection architecture with adaptations for Flutter/Dart.
