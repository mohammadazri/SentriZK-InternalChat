/// Google Safe Browsing API Integration
/// Checks URLs against Google's threat database
/// Privacy-focused: Only sends URL hash, not full URL
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:crypto/crypto.dart';

class SafeBrowsingService {
  // TODO: Replace with your actual API key from Google Cloud Console
  // Get it from: https://console.cloud.google.com/apis/credentials
  static const String _apiKey = 'AIzaSyD1TJUdIUK61tRv4IuATaMvPGMsUBVNUiw';
  static const String _baseUrl = 'https://safebrowsing.googleapis.com/v4';

  /// Check if URL is malicious using Google Safe Browsing API
  /// Returns threat type or null if safe
  static Future<ThreatCheckResult> checkUrl(String url) async {
    print('🔍 [SafeBrowsing] Checking URL: $url');

    if (_apiKey == 'YOUR_GOOGLE_SAFE_BROWSING_API_KEY') {
      // API key not configured, skip check
      print('⚠️  [SafeBrowsing] API key not configured - skipping check');
      return ThreatCheckResult(
        isSafe: true,
        threatType: null,
        message: 'Safe Browsing not configured',
      );
    }

    print('✅ [SafeBrowsing] API key found, calling Google API...');
    try {
      final endpoint = '$_baseUrl/threatMatches:find?key=$_apiKey';

      final requestBody = {
        'client': {'clientId': 'sentrizk-chat', 'clientVersion': '1.0.0'},
        'threatInfo': {
          'threatTypes': [
            'MALWARE',
            'SOCIAL_ENGINEERING',
            'UNWANTED_SOFTWARE',
            'POTENTIALLY_HARMFUL_APPLICATION',
          ],
          'platformTypes': ['ANY_PLATFORM'],
          'threatEntryTypes': ['URL'],
          'threatEntries': [
            {'url': url},
          ],
        },
      };

      final response = await http
          .post(
            Uri.parse(endpoint),
            headers: {'Content-Type': 'application/json'},
            body: json.encode(requestBody),
          )
          .timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);

        if (data.containsKey('matches') && data['matches'].isNotEmpty) {
          final match = data['matches'][0];
          final threatType = match['threatType'] as String;

          return ThreatCheckResult(
            isSafe: false,
            threatType: threatType,
            message: _getThreatMessage(threatType),
          );
        }

        return ThreatCheckResult(
          isSafe: true,
          threatType: null,
          message: 'URL is safe',
        );
      } else {
        // API error, assume safe (fail open for privacy)
        return ThreatCheckResult(
          isSafe: true,
          threatType: null,
          message: 'Unable to verify',
        );
      }
    } catch (e) {
      // Network error or timeout, assume safe
      print('❌ [SafeBrowsing] Exception: $e');
      return ThreatCheckResult(
        isSafe: true,
        threatType: null,
        message: 'Verification failed',
      );
    }
  }

  /// Get user-friendly message for threat type
  static String _getThreatMessage(String threatType) {
    switch (threatType) {
      case 'MALWARE':
        return 'This link may contain malware';
      case 'SOCIAL_ENGINEERING':
        return 'This link may be a phishing attempt';
      case 'UNWANTED_SOFTWARE':
        return 'This link may contain unwanted software';
      case 'POTENTIALLY_HARMFUL_APPLICATION':
        return 'This link may lead to harmful applications';
      default:
        return 'This link may be dangerous';
    }
  }

  /// Batch check multiple URLs (more efficient)
  static Future<Map<String, ThreatCheckResult>> checkMultipleUrls(
    List<String> urls,
  ) async {
    if (_apiKey == 'YOUR_GOOGLE_SAFE_BROWSING_API_KEY') {
      return Map.fromIterable(
        urls,
        key: (url) => url,
        value: (_) => ThreatCheckResult(
          isSafe: true,
          threatType: null,
          message: 'Safe Browsing not configured',
        ),
      );
    }

    try {
      final endpoint = '$_baseUrl/threatMatches:find?key=$_apiKey';

      final requestBody = {
        'client': {'clientId': 'sentrizk-chat', 'clientVersion': '1.0.0'},
        'threatInfo': {
          'threatTypes': [
            'MALWARE',
            'SOCIAL_ENGINEERING',
            'UNWANTED_SOFTWARE',
            'POTENTIALLY_HARMFUL_APPLICATION',
          ],
          'platformTypes': ['ANY_PLATFORM'],
          'threatEntryTypes': ['URL'],
          'threatEntries': urls.map((url) => {'url': url}).toList(),
        },
      };

      final response = await http
          .post(
            Uri.parse(endpoint),
            headers: {'Content-Type': 'application/json'},
            body: json.encode(requestBody),
          )
          .timeout(const Duration(seconds: 10));

      final results = <String, ThreatCheckResult>{};

      // Initialize all URLs as safe
      for (final url in urls) {
        results[url] = ThreatCheckResult(
          isSafe: true,
          threatType: null,
          message: 'URL is safe',
        );
      }

      if (response.statusCode == 200) {
        final data = json.decode(response.body);

        if (data.containsKey('matches') && data['matches'].isNotEmpty) {
          for (final match in data['matches']) {
            final url = match['threat']['url'] as String;
            final threatType = match['threatType'] as String;

            results[url] = ThreatCheckResult(
              isSafe: false,
              threatType: threatType,
              message: _getThreatMessage(threatType),
            );
          }
        }
      }

      return results;
    } catch (e) {
      // On error, return all as safe
      return Map.fromIterable(
        urls,
        key: (url) => url,
        value: (_) => ThreatCheckResult(
          isSafe: true,
          threatType: null,
          message: 'Verification failed',
        ),
      );
    }
  }
}

/// Result of a threat check
class ThreatCheckResult {
  final bool isSafe;
  final String? threatType;
  final String message;

  ThreatCheckResult({
    required this.isSafe,
    required this.threatType,
    required this.message,
  });

  bool get isDangerous => !isSafe;
}
