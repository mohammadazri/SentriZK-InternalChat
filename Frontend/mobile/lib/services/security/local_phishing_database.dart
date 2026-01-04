/// Local Phishing Database Service
/// Maintains a local list of known phishing domains for instant detection
/// No internet required - privacy-first approach
import 'dart:convert';
import 'package:flutter/services.dart';

class LocalPhishingDatabase {
  static List<PhishingDomain>? _cachedDomains;
  static DateTime? _lastLoaded;

  /// Load phishing domains from local JSON file
  static Future<List<PhishingDomain>> loadDomains() async {
    // Return cached if loaded within last hour
    if (_cachedDomains != null && _lastLoaded != null) {
      final age = DateTime.now().difference(_lastLoaded!);
      if (age.inHours < 1) {
        return _cachedDomains!;
      }
    }

    try {
      final jsonString = await rootBundle.loadString(
        'assets/security/known_phishing_domains.json',
      );
      final List<dynamic> jsonList = json.decode(jsonString);

      _cachedDomains = jsonList
          .map((json) => PhishingDomain.fromJson(json))
          .toList();
      _lastLoaded = DateTime.now();

      return _cachedDomains!;
    } catch (e) {
      // If file not found or error, return empty list
      _cachedDomains = [];
      _lastLoaded = DateTime.now();
      return [];
    }
  }

  /// Check if domain is in local phishing list
  static Future<PhishingCheckResult> checkDomain(String domain) async {
    final domains = await loadDomains();
    final cleanDomain = _cleanDomain(domain);

    // Exact match
    for (final phishing in domains) {
      if (phishing.domain.toLowerCase() == cleanDomain.toLowerCase()) {
        return PhishingCheckResult(
          isPhishing: true,
          reason: phishing.reason,
          matchType: 'exact',
        );
      }
    }

    // Check for similar domains (Levenshtein distance)
    for (final phishing in domains) {
      if (_isSimilar(cleanDomain, phishing.domain)) {
        return PhishingCheckResult(
          isPhishing: true,
          reason: '${phishing.reason} (similar domain)',
          matchType: 'similar',
        );
      }
    }

    return PhishingCheckResult(
      isPhishing: false,
      reason: 'Domain not found in phishing database',
      matchType: 'none',
    );
  }

  /// Clean domain by removing protocol and path
  static String _cleanDomain(String domain) {
    String clean = domain;

    // Remove protocol
    clean = clean.replaceAll(RegExp(r'^https?://'), '');
    clean = clean.replaceAll(RegExp(r'^ftp://'), '');
    clean = clean.replaceAll(RegExp(r'^www\.'), '');

    // Remove path
    final slashIndex = clean.indexOf('/');
    if (slashIndex != -1) {
      clean = clean.substring(0, slashIndex);
    }

    return clean;
  }

  /// Check if two domains are similar (simple similarity check)
  static bool _isSimilar(String domain1, String domain2) {
    final distance = _levenshteinDistance(
      domain1.toLowerCase(),
      domain2.toLowerCase(),
    );

    // Consider similar if distance is <= 2 characters
    return distance <= 2 && distance > 0;
  }

  /// Calculate Levenshtein distance between two strings
  static int _levenshteinDistance(String s1, String s2) {
    if (s1 == s2) return 0;
    if (s1.isEmpty) return s2.length;
    if (s2.isEmpty) return s1.length;

    final List<List<int>> matrix = List.generate(
      s1.length + 1,
      (i) => List.filled(s2.length + 1, 0),
    );

    for (int i = 0; i <= s1.length; i++) {
      matrix[i][0] = i;
    }
    for (int j = 0; j <= s2.length; j++) {
      matrix[0][j] = j;
    }

    for (int i = 1; i <= s1.length; i++) {
      for (int j = 1; j <= s2.length; j++) {
        final cost = s1[i - 1] == s2[j - 1] ? 0 : 1;
        matrix[i][j] = [
          matrix[i - 1][j] + 1, // deletion
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j - 1] + cost, // substitution
        ].reduce((a, b) => a < b ? a : b);
      }
    }

    return matrix[s1.length][s2.length];
  }

  /// Add domain to local database (for user-reported phishing)
  static Future<void> addDomain(PhishingDomain domain) async {
    if (_cachedDomains == null) {
      await loadDomains();
    }
    _cachedDomains!.add(domain);
    // In production, you'd persist this to local storage
  }

  /// Get statistics about the database
  static Future<DatabaseStats> getStats() async {
    final domains = await loadDomains();
    return DatabaseStats(
      totalDomains: domains.length,
      lastUpdated: _lastLoaded ?? DateTime.now(),
    );
  }
}

/// Represents a known phishing domain
class PhishingDomain {
  final String domain;
  final String reason;

  PhishingDomain({required this.domain, required this.reason});

  factory PhishingDomain.fromJson(Map<String, dynamic> json) {
    return PhishingDomain(
      domain: json['domain'] as String,
      reason: json['reason'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {'domain': domain, 'reason': reason};
  }
}

/// Result of phishing check
class PhishingCheckResult {
  final bool isPhishing;
  final String reason;
  final String matchType;

  PhishingCheckResult({
    required this.isPhishing,
    required this.reason,
    required this.matchType,
  });
}

/// Database statistics
class DatabaseStats {
  final int totalDomains;
  final DateTime lastUpdated;

  DatabaseStats({required this.totalDomains, required this.lastUpdated});
}
