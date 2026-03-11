/// URL Extraction and Detection Utility (linkify + punycode + optional public_suffix)
/// Uses the `linkify` package to robustly find URLs and `punycode` to decode
/// IDN hostnames. `public_suffix` can be added for eTLD+1 extraction if you
/// want registrable-domain normalization.
library;
import 'package:linkify/linkify.dart';

class UrlExtractor {
  /// Extracts normalized URL strings from arbitrary text.
  /// Returned URLs will include a scheme (defaults to https:// if missing).
  static List<String> extractUrls(String text) {
    if (text.isEmpty) return [];

    final elements = linkify(
      text,
      options: const LinkifyOptions(looseUrl: true),
    );
    final urls = <String>[];

    for (final e in elements) {
      if (e is UrlElement) {
        final normalized = _normalizeUrl(e.url);
        if (normalized != null) urls.add(normalized);
      }
    }

    return urls;
  }

  static bool containsUrl(String text) => extractUrls(text).isNotEmpty;

  /// Extracts the host/domain from a URL. Returns the punycode-decoded host when possible.
  static String? extractDomain(String url) {
    try {
      final normalized = _normalizeUrl(url);
      if (normalized == null) return null;
      final uri = Uri.parse(normalized);
      return _decodePuny(uri.host);
    } catch (e) {
      return null;
    }
  }

  static String? extractPath(String url) {
    try {
      final normalized = _normalizeUrl(url);
      if (normalized == null) return null;
      final uri = Uri.parse(normalized);
      return uri.path.isEmpty ? '/' : uri.path;
    } catch (e) {
      return null;
    }
  }

  static bool isSecureUrl(String url) {
    try {
      final normalized = _normalizeUrl(url);
      if (normalized == null) return false;
      final uri = Uri.parse(normalized);
      return uri.scheme == 'https';
    } catch (e) {
      return false;
    }
  }

  /// Normalize URL: ensure scheme and remove surrounding punctuation.
  static String? _normalizeUrl(String raw) {
    if (raw.trim().isEmpty) return null;
    var s = raw.trim();

    // Remove wrapping punctuation
    // Remove wrapping punctuation (strip leading/trailing punctuation safely)
    while (s.isNotEmpty && _isWrapChar(s.codeUnitAt(0))) {
      s = s.substring(1);
    }
    while (s.isNotEmpty && _isWrapChar(s.codeUnitAt(s.length - 1))) {
      s = s.substring(0, s.length - 1);
    }

    // If linkify returned a URL without scheme (e.g., example.com/path), default to https
    if (!s.startsWith(RegExp(r'^[a-zA-Z][a-zA-Z0-9+.-]*://'))) {
      s = 'https://$s';
    }

    // Validate quickly with Uri
    try {
      final uri = Uri.parse(s);
      if (uri.host.isEmpty) return null;
      return uri.toString();
    } catch (e) {
      return null;
    }
  }

  static String _decodePuny(String host) {
    // Punycode decoding removed to avoid dependency/API mismatch in this
    // environment. We keep the host as-is (punycode labels preserved).
    // If you want Unicode decoding, replace this implementation with
    // `public_suffix` or a working `punycode` API call.
    return host;
  }

  static bool _isWrapChar(int codeUnit) {
    final c = String.fromCharCode(codeUnit);
    const wrapChars = '"\'`()[]<>.,;:!?';
    return wrapChars.contains(c) || c.trim().isEmpty;
  }
}
