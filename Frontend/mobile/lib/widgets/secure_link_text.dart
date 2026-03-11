/// Clickable Link Widget with Security Integration
/// Displays URLs as clickable links with automatic security checks
library;
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter_linkify/flutter_linkify.dart';
import '../services/message_security_service.dart';
import '../utils/url_extractor.dart';
import 'security_warning_widget.dart';

class SecureLinkText extends StatefulWidget {
  final String text;
  final TextStyle? textStyle;
  final TextStyle? linkStyle;
  final bool enableSecurity;

  const SecureLinkText({
    super.key,
    required this.text,
    this.textStyle,
    this.linkStyle,
    this.enableSecurity = true,
  });

  @override
  State<SecureLinkText> createState() => _SecureLinkTextState();
}

class _SecureLinkTextState extends State<SecureLinkText> {
  MessageSecurityResult? _securityResult;
  bool _isAnalyzing = false;

  @override
  void initState() {
    super.initState();
    _analyzeText();
  }

  @override
  void didUpdateWidget(SecureLinkText oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.text != widget.text) {
      _analyzeText();
    }
  }

  Future<void> _analyzeText() async {
    if (!widget.enableSecurity || !UrlExtractor.containsUrl(widget.text)) {
      setState(() {
        _securityResult = null;
        _isAnalyzing = false;
      });
      return;
    }

    print('\n🔷 [Widget] Starting analysis for message: "${widget.text}"');
    setState(() => _isAnalyzing = true);

    // 1) Quick passive checks (instant) to show badge immediately
    try {
      print('⚡ [Widget] Running QUICK analysis...');
      final quick = await MessageSecurityService.quickAnalyze(widget.text);
      if (!mounted) return;
      print('⚡ [Widget] Quick result: ${quick.isSafe ? "SAFE" : "THREAT"}');
      setState(() {
        _securityResult = quick;
      });
    } catch (e) {
      print('❌ [Widget] Quick analysis error: $e');
    }

    // 2) Full analysis (includes active Safe Browsing) in background
    // This will update the UI when it completes.
    print('🔄 [Widget] Starting FULL analysis in background...');
    MessageSecurityService.analyzeMessage(widget.text)
        .then((full) {
          if (!mounted) return;
          print(
            '✅ [Widget] Full analysis complete: ${full.isSafe ? "SAFE" : "THREAT"}',
          );
          setState(() {
            _securityResult = full;
            _isAnalyzing = false;
          });
        })
        .catchError((e) {
          if (!mounted) return;
          print('❌ [Widget] Full analysis error: $e');
          setState(() => _isAnalyzing = false);
        });
  }

  @override
  Widget build(BuildContext context) {
    final urls = UrlExtractor.extractUrls(widget.text);

    if (urls.isEmpty) {
      return Text(widget.text, style: widget.textStyle);
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Security warning badge
        if (_securityResult != null && !_securityResult!.isSafe)
          SecurityWarningBadge(
            threatLevel: _securityResult!.maxThreatLevel,
            onTap: () => _showSecurityDetails(),
          ),

        // Small progress indicator while full analysis is running
        if (_isAnalyzing)
          const Padding(
            padding: EdgeInsets.only(top: 4, bottom: 4),
            child: SizedBox(
              height: 16,
              width: 16,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
          ),

        // Message text with clickable links (flutter_linkify handles detection)
        _buildTextWithLinks(),
      ],
    );
  }

  Widget _buildTextWithLinks() {
    return Linkify(
      text: widget.text,
      options: const LinkifyOptions(looseUrl: true),
      onOpen: (link) async {
        // Normalize the tapped link using our extractor
        final normalized = UrlExtractor.extractUrls(link.url).isNotEmpty
            ? UrlExtractor.extractUrls(link.url).first
            : link.url;

        // Try to find existing analysis for the normalized URL
        UrlAnalysis? analysis;
        if (_securityResult != null) {
          try {
            analysis = _securityResult!.urlAnalyses.firstWhere(
              (a) => a.url == normalized,
            );
          } catch (_) {
            analysis = null;
          }
        }

        await _handleLinkTap(normalized, analysis);
      },
      linkStyle: widget.linkStyle,
      textAlign: TextAlign.start,
      style: widget.textStyle,
    );
  }

  Color _getLinkColor(ThreatLevel? level) {
    if (level == null) return Colors.blue;

    switch (level) {
      case ThreatLevel.high:
        return Colors.red[700]!;
      case ThreatLevel.medium:
        return Colors.orange[700]!;
      case ThreatLevel.low:
        return Colors.blue;
      default:
        return Colors.blue;
    }
  }

  Future<void> _handleLinkTap(String url, UrlAnalysis? analysis) async {
    if (!widget.enableSecurity) {
      await _launchUrl(url);
      return;
    }

    if (analysis == null) {
      // No analysis yet, perform quick check
      final result = await MessageSecurityService.quickAnalyze(url);
      if (result.urlAnalyses.isNotEmpty) {
        analysis = result.urlAnalyses.first;
      }
    }

    if (analysis == null) {
      // Still no analysis, just open
      await _launchUrl(url);
      return;
    }

    // Perform active check (Google Safe Browsing) before opening
    if (analysis.requiresActiveCheck) {
      analysis = await MessageSecurityService.performActiveCheck(analysis);
    }

    if (!mounted) return;

    // Show appropriate dialog based on threat level
    if (analysis.threatLevel == ThreatLevel.high) {
      await _showDangerousLinkDialog(analysis);
    } else if (analysis.threatLevel == ThreatLevel.medium) {
      await _showSuspiciousLinkDialog(analysis);
    } else {
      await _launchUrl(url);
    }
  }

  Future<void> _showDangerousLinkDialog(UrlAnalysis analysis) async {
    return showDialog(
      context: context,
      builder: (context) => DangerousLinkDialog(
        urlAnalysis: analysis,
        onProceedAnyway: () {
          Navigator.of(context).pop();
          _launchUrl(analysis.url);
        },
        onCancel: () => Navigator.of(context).pop(),
      ),
    );
  }

  Future<void> _showSuspiciousLinkDialog(UrlAnalysis analysis) async {
    return showDialog(
      context: context,
      builder: (context) => SuspiciousLinkDialog(
        urlAnalysis: analysis,
        onProceed: () {
          Navigator.of(context).pop();
          _launchUrl(analysis.url);
        },
        onCancel: () => Navigator.of(context).pop(),
      ),
    );
  }

  Future<void> _launchUrl(String url) async {
    try {
      final uri = Uri.parse(url);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Could not open link: $url')));
      }
    }
  }

  void _showSecurityDetails() {
    if (_securityResult == null) return;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Security Analysis'),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'This message contains ${_securityResult!.urlAnalyses.length} link(s):',
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              ..._securityResult!.urlAnalyses.map(
                (analysis) => Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(
                            analysis.isDangerous
                                ? Icons.dangerous
                                : analysis.isSuspicious
                                ? Icons.warning
                                : Icons.check_circle,
                            size: 20,
                            color: analysis.isDangerous
                                ? Colors.red
                                : analysis.isSuspicious
                                ? Colors.orange
                                : Colors.green,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              analysis.domain,
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontFamily: 'monospace',
                                fontSize: 13,
                              ),
                            ),
                          ),
                        ],
                      ),
                      if (analysis.warnings.isNotEmpty) ...[
                        const SizedBox(height: 4),
                        ...analysis.warnings.map(
                          (w) => Padding(
                            padding: const EdgeInsets.only(left: 28, top: 2),
                            child: Text(
                              '• $w',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey[700],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }
}
