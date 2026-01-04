import 'package:isar/isar.dart';

part 'security_scan_cache.g.dart';

/// Local cache for message security scan results
/// Stores scan results to avoid re-scanning the same messages
@Collection()
class SecurityScanCache {
  Id id = Isar.autoIncrement;

  /// Hash of the message content (for quick lookup)
  @Index(unique: true)
  late String contentHash;

  /// The actual URL(s) scanned
  late String urls;

  /// Threat level: 0=none, 1=low, 2=medium, 3=high
  late int threatLevel;

  /// Whether the message is safe
  late bool isSafe;

  /// Whether the message has dangerous URLs
  late bool hasDangerousUrls;

  /// Whether the message has suspicious URLs
  late bool hasSuspiciousUrls;

  /// Warnings found during scan (JSON encoded list)
  String? warnings;

  /// When the scan was performed
  late DateTime scanDate;

  /// When this cache entry expires (7 days by default)
  late DateTime expiresAt;
}
