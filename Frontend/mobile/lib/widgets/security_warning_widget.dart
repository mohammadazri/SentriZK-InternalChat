/// Security Warning Widget - Shows visual warnings for suspicious links
/// Inspired by WhatsApp's security UI
library;
import 'package:flutter/material.dart';
import '../services/message_security_service.dart';

class SecurityWarningBadge extends StatelessWidget {
  final ThreatLevel threatLevel;
  final VoidCallback? onTap;

  const SecurityWarningBadge({super.key, required this.threatLevel, this.onTap});

  @override
  Widget build(BuildContext context) {
    if (threatLevel == ThreatLevel.none) {
      return const SizedBox.shrink();
    }

    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(top: 4, bottom: 4),
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: _getBackgroundColor(),
          borderRadius: BorderRadius.circular(4),
          border: Border.all(color: _getBorderColor(), width: 1),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(_getIcon(), color: _getIconColor(), size: 16),
            const SizedBox(width: 6),
            Text(
              _getText(),
              style: TextStyle(
                color: _getTextColor(),
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
            if (onTap != null) ...[
              const SizedBox(width: 4),
              Icon(Icons.info_outline, color: _getIconColor(), size: 14),
            ],
          ],
        ),
      ),
    );
  }

  Color _getBackgroundColor() {
    switch (threatLevel) {
      case ThreatLevel.high:
        return Colors.red[50]!;
      case ThreatLevel.medium:
        return Colors.orange[50]!;
      case ThreatLevel.low:
        return Colors.yellow[50]!;
      default:
        return Colors.transparent;
    }
  }

  Color _getBorderColor() {
    switch (threatLevel) {
      case ThreatLevel.high:
        return Colors.red[300]!;
      case ThreatLevel.medium:
        return Colors.orange[300]!;
      case ThreatLevel.low:
        return Colors.yellow[700]!;
      default:
        return Colors.transparent;
    }
  }

  Color _getIconColor() {
    switch (threatLevel) {
      case ThreatLevel.high:
        return Colors.red[700]!;
      case ThreatLevel.medium:
        return Colors.orange[700]!;
      case ThreatLevel.low:
        return Colors.yellow[900]!;
      default:
        return Colors.grey;
    }
  }

  Color _getTextColor() {
    switch (threatLevel) {
      case ThreatLevel.high:
        return Colors.red[900]!;
      case ThreatLevel.medium:
        return Colors.orange[900]!;
      case ThreatLevel.low:
        return Colors.yellow[900]!;
      default:
        return Colors.grey;
    }
  }

  IconData _getIcon() {
    switch (threatLevel) {
      case ThreatLevel.high:
        return Icons.dangerous;
      case ThreatLevel.medium:
        return Icons.warning;
      case ThreatLevel.low:
        return Icons.info;
      default:
        return Icons.check_circle;
    }
  }

  String _getText() {
    switch (threatLevel) {
      case ThreatLevel.high:
        return 'Dangerous Link';
      case ThreatLevel.medium:
        return 'Suspicious Link';
      case ThreatLevel.low:
        return 'Caution';
      default:
        return 'Safe';
    }
  }
}

/// Full-screen warning dialog when user attempts to open dangerous link
class DangerousLinkDialog extends StatelessWidget {
  final UrlAnalysis urlAnalysis;
  final VoidCallback onProceedAnyway;
  final VoidCallback onCancel;

  const DangerousLinkDialog({
    super.key,
    required this.urlAnalysis,
    required this.onProceedAnyway,
    required this.onCancel,
  });

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Warning Icon
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.red[50],
                shape: BoxShape.circle,
              ),
              child: Icon(Icons.dangerous, color: Colors.red[700], size: 48),
            ),
            const SizedBox(height: 20),

            // Title
            Text(
              urlAnalysis.threatLevel == ThreatLevel.high
                  ? 'Dangerous Link Detected'
                  : 'Suspicious Link Detected',
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),

            // Domain
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                urlAnalysis.domain,
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey[800],
                  fontFamily: 'monospace',
                ),
                textAlign: TextAlign.center,
              ),
            ),
            const SizedBox(height: 16),

            // Warnings
            ...urlAnalysis.warnings
                .map(
                  (warning) => Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(
                          Icons.error_outline,
                          size: 16,
                          color: Colors.red[700],
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            warning,
                            style: TextStyle(
                              fontSize: 13,
                              color: Colors.grey[700],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                )
                ,
            const SizedBox(height: 24),

            // Warning Message
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.orange[50],
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                'This link may be an attempt to steal your personal information. Opening it could be dangerous.',
                style: TextStyle(fontSize: 13, color: Colors.orange[900]),
                textAlign: TextAlign.center,
              ),
            ),
            const SizedBox(height: 24),

            // Buttons
            Column(
              children: [
                // Cancel Button (Primary)
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: onCancel,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    child: const Text(
                      'Go Back (Recommended)',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 12),

                // Proceed Anyway Button (Secondary)
                SizedBox(
                  width: double.infinity,
                  child: TextButton(
                    onPressed: onProceedAnyway,
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                        side: BorderSide(color: Colors.grey[300]!),
                      ),
                    ),
                    child: Text(
                      'Open Anyway',
                      style: TextStyle(fontSize: 16, color: Colors.grey[700]),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// Info dialog for suspicious links
class SuspiciousLinkDialog extends StatelessWidget {
  final UrlAnalysis urlAnalysis;
  final VoidCallback onProceed;
  final VoidCallback onCancel;

  const SuspiciousLinkDialog({
    super.key,
    required this.urlAnalysis,
    required this.onProceed,
    required this.onCancel,
  });

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.warning_amber, color: Colors.orange[700], size: 48),
            const SizedBox(height: 16),
            const Text(
              'Suspicious Link',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            Text(
              urlAnalysis.domain,
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey[700],
                fontFamily: 'monospace',
              ),
            ),
            const SizedBox(height: 16),
            ...urlAnalysis.warnings
                .map(
                  (warning) => Padding(
                    padding: const EdgeInsets.symmetric(vertical: 2),
                    child: Text(
                      '• $warning',
                      style: TextStyle(fontSize: 13, color: Colors.grey[700]),
                    ),
                  ),
                )
                ,
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: TextButton(
                    onPressed: onCancel,
                    child: const Text('Cancel'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: onProceed,
                    child: const Text('Continue'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
