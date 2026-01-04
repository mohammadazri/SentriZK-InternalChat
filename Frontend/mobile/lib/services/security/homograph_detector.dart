/// Homograph Attack Detection Service
/// Detects suspicious Unicode characters that mimic ASCII characters (e.g., googIe.com)
import 'dart:core';

class HomographDetector {
  // Common homograph characters that look like ASCII but aren't
  static final Map<String, List<int>> _homographs = {
    'a': [
      0x0430,
      0x00E0,
      0x00E1,
      0x00E2,
      0x00E3,
      0x00E4,
      0x00E5,
    ], // Cyrillic 'а', à, á, â, ã, ä, å
    'c': [0x0441, 0x00E7], // Cyrillic 'с', ç
    'e': [0x0435, 0x00E8, 0x00E9, 0x00EA, 0x00EB], // Cyrillic 'е', è, é, ê, ë
    'i': [
      0x0456,
      0x00EC,
      0x00ED,
      0x00EE,
      0x00EF,
      0x0131,
    ], // Cyrillic 'і', ì, í, î, ï, ı
    'o': [
      0x043E,
      0x00F2,
      0x00F3,
      0x00F4,
      0x00F5,
      0x00F6,
      0x00F8,
    ], // Cyrillic 'о', ò, ó, ô, õ, ö, ø
    'p': [0x0440], // Cyrillic 'р'
    's': [0x0455], // Cyrillic 's'
    'x': [0x0445], // Cyrillic 'х'
    'y': [0x0443, 0x00FD, 0x00FF], // Cyrillic 'у', ý, ÿ
    'n': [0x00F1], // ñ
    'u': [0x00F9, 0x00FA, 0x00FB, 0x00FC], // ù, ú, û, ü
  };

  /// Check if a domain contains homograph characters
  /// Returns true if suspicious characters are detected
  static bool isSuspicious(String domain) {
    if (domain.isEmpty) return false;

    // Check for non-ASCII characters (code points > 127)
    for (int i = 0; i < domain.length; i++) {
      final codeUnit = domain.codeUnitAt(i);
      if (codeUnit > 127) {
        return true;
      }
    }

    return false;
  }

  /// Get detailed analysis of suspicious characters in domain
  static HomographAnalysis analyzeDomain(String domain) {
    final suspiciousChars = <SuspiciousChar>[];
    bool hasSuspicious = false;

    for (int i = 0; i < domain.length; i++) {
      final char = domain[i];
      final codeUnit = domain.codeUnitAt(i);

      if (codeUnit > 127) {
        hasSuspicious = true;
        suspiciousChars.add(
          SuspiciousChar(
            character: char,
            position: i,
            codePoint: codeUnit,
            lookalike: _findLookalike(codeUnit),
          ),
        );
      }
    }

    return HomographAnalysis(
      isSuspicious: hasSuspicious,
      suspiciousCharacters: suspiciousChars,
      domain: domain,
    );
  }

  /// Find what ASCII character this homograph might be mimicking
  static String? _findLookalike(int codePoint) {
    for (final entry in _homographs.entries) {
      if (entry.value.contains(codePoint)) {
        return entry.key;
      }
    }
    return null;
  }

  /// Check if domain is in ASCII-only (safe from homograph attacks)
  static bool isAsciiOnly(String domain) {
    return domain.runes.every((rune) => rune <= 127);
  }

  /// Get a safe version of the domain by replacing suspicious characters
  static String sanitizeDomain(String domain) {
    final buffer = StringBuffer();

    for (int i = 0; i < domain.length; i++) {
      final codeUnit = domain.codeUnitAt(i);
      if (codeUnit > 127) {
        final lookalike = _findLookalike(codeUnit);
        buffer.write(lookalike ?? '?');
      } else {
        buffer.write(domain[i]);
      }
    }

    return buffer.toString();
  }

  /// Check for common phishing patterns
  /// Only flags domains that MIMIC brands, not the real domains
  static bool hasPhishingPattern(String domain) {
    final lowerDomain = domain.toLowerCase();

    // Known legitimate domains - whitelist
    final legitDomains = [
      'google.com',
      'amazon.com',
      'microsoft.com',
      'apple.com',
      'facebook.com',
      'whatsapp.com',
      'paypal.com',
      'youtube.com',
      'twitter.com',
      'instagram.com',
      'linkedin.com',
      'netflix.com',
    ];

    // If it's a known legitimate domain, not suspicious
    for (final legit in legitDomains) {
      if (lowerDomain == legit || lowerDomain.endsWith('.$legit')) {
        return false;
      }
    }

    // Suspicious patterns - brand names combined with security/action words
    final suspiciousPatterns = [
      'paypal-verify',
      'paypal-secure',
      'paypal-account',
      'amazon-security',
      'amazon-verify',
      'amazon-account',
      'google-verify',
      'google-security',
      'microsoft-security',
      'microsoft-verify',
      'apple-verification',
      'apple-secure',
      'facebook-security',
      'whatsapp-verify',
      'verify',
      'secure-account',
      'account-update',
      'confirm-account',
      'login-verify',
      'banking-secure',
    ];

    // Check if domain contains suspicious patterns
    return suspiciousPatterns.any((pattern) => lowerDomain.contains(pattern));
  }
}

/// Result of homograph analysis
class HomographAnalysis {
  final bool isSuspicious;
  final List<SuspiciousChar> suspiciousCharacters;
  final String domain;

  HomographAnalysis({
    required this.isSuspicious,
    required this.suspiciousCharacters,
    required this.domain,
  });

  String get description {
    if (!isSuspicious) {
      return 'Domain appears safe';
    }

    final charList = suspiciousCharacters
        .map((c) => "'${c.character}' (looks like '${c.lookalike ?? '?'}')")
        .join(', ');

    return 'Suspicious characters detected: $charList';
  }
}

/// Information about a suspicious character
class SuspiciousChar {
  final String character;
  final int position;
  final int codePoint;
  final String? lookalike;

  SuspiciousChar({
    required this.character,
    required this.position,
    required this.codePoint,
    this.lookalike,
  });
}
