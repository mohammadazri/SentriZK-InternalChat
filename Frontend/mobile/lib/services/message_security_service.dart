/// Main Security Service - Orchestrates all security checks
/// This is the primary interface for checking message security
import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:isar/isar.dart';
import 'package:path_provider/path_provider.dart';
import 'security/homograph_detector.dart';
import 'security/safe_browsing_service.dart';
import 'security/local_phishing_database.dart';
import '../utils/url_extractor.dart';
import '../models/security_scan_cache.dart';
import '../models/local_message.dart';
import '../models/signal_state.dart';

class MessageSecurityService {
  static Isar? _isar;

  /// Initialize the Isar database for caching
  static Future<void> initialize() async {
    if (_isar != null) return;
    
    final dir = await getApplicationDocumentsDirectory();
    // Open a single shared Isar instance that contains both the
    // security cache and the local message schemas so other parts
    // of the app can reuse the same instance without opening again.
    _isar = await Isar.open(
      [
        SecurityScanCacheSchema, 
        LocalMessageSchema,
        SignalSessionSchema,
        SignalPreKeySchema,
        SignalSignedPreKeySchema,
        SignalIdentitySchema,
        LocalSignalIdentitySchema,
      ],
      directory: dir.path,
    );
  }

  /// Returns the shared Isar instance, initializing if necessary.
  static Future<Isar> getInstance() async {
    await initialize();
    return _isar!;
  }

  /// Generate a hash of the message content for cache lookup
  static String _generateContentHash(String content) {
    final bytes = utf8.encode(content.trim().toLowerCase());
    final digest = sha256.convert(bytes);
    return digest.toString();
  }

  /// Get cached scan result if available and not expired
  static Future<MessageSecurityResult?> _getCachedResult(String content) async {
    await initialize();
    
    final hash = _generateContentHash(content);
    final cached = await _isar!.securityScanCaches
        .filter()
        .contentHashEqualTo(hash)
        .findFirst();

    if (cached == null) {
      print('💾 [Cache] No cached result found');
      return null;
    }

    // Check if expired
    if (DateTime.now().isAfter(cached.expiresAt)) {
      print('⏰ [Cache] Cached result expired, re-scanning');
      // Delete expired cache
      await _isar!.writeTxn(() async {
        await _isar!.securityScanCaches.delete(cached.id);
      });
      return null;
    }

    print('✅ [Cache] Using cached result (scanned: ${cached.scanDate})');
    
    // Reconstruct result from cache
    final urls = cached.urls.split(',');
    final urlAnalyses = urls.map((url) {
      return UrlAnalysis(
        url: url.trim(),
        domain: UrlExtractor.extractDomain(url.trim()) ?? 'unknown',
        threatLevel: ThreatLevel.values[cached.threatLevel],
        warnings: cached.warnings != null 
            ? List<String>.from(jsonDecode(cached.warnings!))
            : [],
        requiresActiveCheck: false, // Already scanned
      );
    }).toList();

    return MessageSecurityResult(
      isSafe: cached.isSafe,
      hasUrls: urls.isNotEmpty,
      urlAnalyses: urlAnalyses,
    );
  }

  /// Cache the scan result
  static Future<void> _cacheResult(
    String content,
    MessageSecurityResult result,
  ) async {
    await initialize();
    
    final hash = _generateContentHash(content);
    final urls = result.urlAnalyses.map((a) => a.url).join(',');
    final allWarnings = result.urlAnalyses
        .expand((a) => a.warnings)
        .toList();

    final cache = SecurityScanCache()
      ..contentHash = hash
      ..urls = urls
      ..threatLevel = result.maxThreatLevel.index
      ..isSafe = result.isSafe
      ..hasDangerousUrls = result.hasDangerousUrls
      ..hasSuspiciousUrls = result.hasSuspiciousUrls
      ..warnings = allWarnings.isEmpty ? null : jsonEncode(allWarnings)
      ..scanDate = DateTime.now()
      ..expiresAt = DateTime.now().add(const Duration(days: 7));

    await _isar!.writeTxn(() async {
      await _isar!.securityScanCaches.put(cache);
    });
    
    print('💾 [Cache] Scan result cached (expires in 7 days)');
  }

  /// Analyze a message for security threats
  /// This performs all security checks: homograph, local DB, and Safe Browsing
  /// Results are cached to avoid re-scanning the same messages
  static Future<MessageSecurityResult> analyzeMessage(String content) async {
    print('\n🔐 [Security] Starting FULL analysis for: "$content"');
    
    // Check cache first
    final cachedResult = await _getCachedResult(content);
    if (cachedResult != null) {
      return cachedResult;
    }
    
    // Step 1: Extract URLs
    final urls = UrlExtractor.extractUrls(content);
    print('🔗 [Security] Extracted ${urls.length} URLs: $urls');

    if (urls.isEmpty) {
      print('✅ [Security] No URLs found - message is safe');
      return MessageSecurityResult(
        isSafe: true,
        hasUrls: false,
        urlAnalyses: [],
      );
    }

    // Step 2: Analyze each URL with passive checks
    final analyses = <UrlAnalysis>[];

    for (final url in urls) {
      print('\n🔍 [Security] Analyzing URL: $url');
      var analysis = await _analyzeUrl(url);
      print('📊 [Security] Passive check result: ${analysis.threatLevel} (${analysis.warnings.length} warnings)');
      
      // Step 3: If not already flagged as dangerous, run active Safe Browsing check
      // Run active check for low and none levels to confirm safety
      if (analysis.threatLevel == ThreatLevel.none || analysis.threatLevel == ThreatLevel.low) {
        print('🌐 [Security] Running ACTIVE Safe Browsing check...');
        analysis = await performActiveCheck(analysis);
        print('📊 [Security] Active check result: ${analysis.threatLevel}');
      } else {
        print('⏭️  [Security] Skipping active check (already flagged as medium/high)');
      }
      
      analyses.add(analysis);
    }

    // Step 4: Determine overall safety
    final hasDangerousUrls = analyses.any(
      (a) => a.threatLevel == ThreatLevel.high,
    );
    final hasSuspiciousUrls = analyses.any(
      (a) => a.threatLevel == ThreatLevel.medium || a.threatLevel == ThreatLevel.low,
    );

    final isSafe = !hasDangerousUrls && !hasSuspiciousUrls;
    print('\n🎯 [Security] Final result: ${isSafe ? "SAFE" : "THREAT DETECTED"}');
    print('   - Dangerous URLs: $hasDangerousUrls');
    print('   - Suspicious URLs: $hasSuspiciousUrls');

    final result = MessageSecurityResult(
      isSafe: isSafe,
      hasUrls: true,
      urlAnalyses: analyses,
    );
    
    // Cache the result for future use
    await _cacheResult(content, result);
    
    return result;
  }

  /// Analyze a single URL through all security layers
  static Future<UrlAnalysis> _analyzeUrl(String url) async {
    print('  🔎 [Passive] Checking: $url');
    final warnings = <String>[];
    ThreatLevel threatLevel = ThreatLevel.none;

    // Layer 1: Homograph Detection (Passive - Instant)
    final domain = UrlExtractor.extractDomain(url);
    print('  🌐 [Passive] Domain: $domain');
    if (domain != null) {
      final homographAnalysis = HomographDetector.analyzeDomain(domain);

      if (homographAnalysis.isSuspicious) {
        print('  ⚠️  [Passive] Homograph detected!');
        warnings.add(
          'Suspicious characters detected: ${homographAnalysis.description}',
        );
        threatLevel = ThreatLevel.medium;
      } else {
        print('  ✅ [Passive] No homograph detected');
      }

      // Check for common phishing patterns
      if (HomographDetector.hasPhishingPattern(domain)) {
        print('  ⚠️  [Passive] Phishing pattern detected!');
        warnings.add('Domain contains suspicious keywords');
        threatLevel = ThreatLevel.medium;
      } else {
        print('  ✅ [Passive] No phishing pattern');
      }
    }

    // Layer 2: Local Database Check (Passive - Instant)
    if (domain != null) {
      print('  📚 [Passive] Checking local database...');
      final localCheck = await LocalPhishingDatabase.checkDomain(domain);

      if (localCheck.isPhishing) {
        print('  🚨 [Passive] FOUND IN LOCAL DB: ${localCheck.reason}');
        warnings.add('Known phishing domain: ${localCheck.reason}');
        threatLevel = ThreatLevel.high;
      } else {
        print('  ✅ [Passive] Not in local phishing database');
      }
    }

    // Layer 3: HTTPS Check
    if (!UrlExtractor.isSecureUrl(url)) {
      warnings.add('Insecure connection (HTTP)');
      if (threatLevel == ThreatLevel.none) {
        threatLevel = ThreatLevel.low;
      }
    }

    return UrlAnalysis(
      url: url,
      domain: domain ?? 'unknown',
      threatLevel: threatLevel,
      warnings: warnings,
      requiresActiveCheck: threatLevel == ThreatLevel.none,
    );
  }

  /// Perform active check (Google Safe Browsing) when user taps link
  static Future<UrlAnalysis> performActiveCheck(UrlAnalysis analysis) async {
    // Only check if not already flagged as dangerous
    if (analysis.threatLevel == ThreatLevel.high) {
      return analysis;
    }

    // Perform Safe Browsing check
    final safeBrowsingResult = await SafeBrowsingService.checkUrl(analysis.url);

    if (safeBrowsingResult.isDangerous) {
      return UrlAnalysis(
        url: analysis.url,
        domain: analysis.domain,
        threatLevel: ThreatLevel.high,
        warnings: [...analysis.warnings, safeBrowsingResult.message],
        requiresActiveCheck: false,
      );
    }

    return analysis;
  }

  /// Quick check - only local checks (for real-time message display)
  static Future<MessageSecurityResult> quickAnalyze(String content) async {
    final urls = UrlExtractor.extractUrls(content);

    if (urls.isEmpty) {
      return MessageSecurityResult(
        isSafe: true,
        hasUrls: false,
        urlAnalyses: [],
      );
    }

    final analyses = <UrlAnalysis>[];

    for (final url in urls) {
      final domain = UrlExtractor.extractDomain(url);
      final warnings = <String>[];
      ThreatLevel threatLevel = ThreatLevel.none;

      if (domain != null) {
        // Quick homograph check
        if (HomographDetector.isSuspicious(domain)) {
          warnings.add('Suspicious link detected');
          threatLevel = ThreatLevel.medium;
        }

        // Quick local DB check
        final localCheck = await LocalPhishingDatabase.checkDomain(domain);
        if (localCheck.isPhishing) {
          warnings.add('Known phishing domain');
          threatLevel = ThreatLevel.high;
        }
      }

      analyses.add(
        UrlAnalysis(
          url: url,
          domain: domain ?? 'unknown',
          threatLevel: threatLevel,
          warnings: warnings,
          requiresActiveCheck: threatLevel == ThreatLevel.none,
        ),
      );
    }

    final hasDangerousUrls = analyses.any(
      (a) => a.threatLevel == ThreatLevel.high,
    );
    final hasSuspiciousUrls = analyses.any(
      (a) => a.threatLevel == ThreatLevel.medium || a.threatLevel == ThreatLevel.low,
    );

    return MessageSecurityResult(
      isSafe: !hasDangerousUrls && !hasSuspiciousUrls,
      hasUrls: true,
      urlAnalyses: analyses,
    );
  }
}

/// Result of message security analysis
class MessageSecurityResult {
  final bool isSafe;
  final bool hasUrls;
  final List<UrlAnalysis> urlAnalyses;

  MessageSecurityResult({
    required this.isSafe,
    required this.hasUrls,
    required this.urlAnalyses,
  });

  bool get hasDangerousUrls =>
      urlAnalyses.any((a) => a.threatLevel == ThreatLevel.high);

  bool get hasSuspiciousUrls =>
      urlAnalyses.any((a) => a.threatLevel == ThreatLevel.medium);

  ThreatLevel get maxThreatLevel {
    if (urlAnalyses.isEmpty) return ThreatLevel.none;

    var maxLevel = ThreatLevel.none;
    for (final analysis in urlAnalyses) {
      if (analysis.threatLevel.index > maxLevel.index) {
        maxLevel = analysis.threatLevel;
      }
    }
    return maxLevel;
  }
}

/// Analysis of a single URL
class UrlAnalysis {
  final String url;
  final String domain;
  final ThreatLevel threatLevel;
  final List<String> warnings;
  final bool requiresActiveCheck;

  UrlAnalysis({
    required this.url,
    required this.domain,
    required this.threatLevel,
    required this.warnings,
    required this.requiresActiveCheck,
  });

  bool get isSafe => threatLevel == ThreatLevel.none;
  bool get isDangerous => threatLevel == ThreatLevel.high;
  bool get isSuspicious => 
      threatLevel == ThreatLevel.medium || threatLevel == ThreatLevel.low;
}

/// Threat level enumeration
enum ThreatLevel {
  none, // No threats detected
  low, // Minor issues (e.g., HTTP instead of HTTPS)
  medium, // Suspicious (e.g., homograph attack)
  high, // Dangerous (e.g., known phishing)
}
