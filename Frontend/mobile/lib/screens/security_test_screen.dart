/// Example usage and testing for phishing detection
/// This file demonstrates how to use the security layer
import 'package:flutter/material.dart';
import '../services/message_security_service.dart';
import '../utils/url_extractor.dart';
import '../services/security/homograph_detector.dart';
import '../services/security/local_phishing_database.dart';

class SecurityTestScreen extends StatefulWidget {
  const SecurityTestScreen({Key? key}) : super(key: key);

  @override
  State<SecurityTestScreen> createState() => _SecurityTestScreenState();
}

class _SecurityTestScreenState extends State<SecurityTestScreen> {
  final _controller = TextEditingController();
  MessageSecurityResult? _result;
  bool _isAnalyzing = false;

  // Test cases
  final List<String> _testMessages = [
    'Check out https://google.com',
    'Visit https://paypal-verify.com for account update',
    'Go to https://ẉhatsapp.com/verify',
    'Click http://example.com (insecure)',
    'Multiple links: https://google.com and https://amazon-security.com',
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Security Testing')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Test message input
            TextField(
              controller: _controller,
              decoration: const InputDecoration(
                labelText: 'Enter message with URL',
                border: OutlineInputBorder(),
              ),
              maxLines: 3,
            ),
            const SizedBox(height: 12),

            // Analyze button
            ElevatedButton(
              onPressed: _isAnalyzing ? null : _analyzeMessage,
              child: _isAnalyzing
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Analyze Message'),
            ),
            const SizedBox(height: 24),

            // Quick test buttons
            const Text(
              'Quick Tests:',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _testMessages.asMap().entries.map((entry) {
                return ElevatedButton(
                  onPressed: () {
                    _controller.text = entry.value;
                    _analyzeMessage();
                  },
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ),
                  ),
                  child: Text('Test ${entry.key + 1}'),
                );
              }).toList(),
            ),
            const SizedBox(height: 24),

            // Results
            if (_result != null) ...[
              const Text(
                'Analysis Results:',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              Expanded(child: SingleChildScrollView(child: _buildResults())),
            ],
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showDatabaseInfo,
        child: const Icon(Icons.info),
      ),
    );
  }

  Widget _buildResults() {
    if (_result == null) return const SizedBox();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Overall status
            Row(
              children: [
                Icon(
                  _result!.isSafe ? Icons.check_circle : Icons.warning,
                  color: _result!.isSafe ? Colors.green : Colors.red,
                  size: 32,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    _result!.isSafe ? 'SAFE' : 'THREAT DETECTED',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: _result!.isSafe ? Colors.green : Colors.red,
                    ),
                  ),
                ),
              ],
            ),
            const Divider(height: 24),

            // Summary
            _buildInfoRow('Has URLs', _result!.hasUrls ? 'Yes' : 'No'),
            _buildInfoRow('URL Count', '${_result!.urlAnalyses.length}'),
            _buildInfoRow('Threat Level', _result!.maxThreatLevel.toString()),
            const SizedBox(height: 16),

            // Individual URL analyses
            if (_result!.urlAnalyses.isNotEmpty) ...[
              const Text(
                'URL Details:',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              ..._result!.urlAnalyses.map(
                (analysis) => Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  color: _getThreatColor(analysis.threatLevel),
                  child: Padding(
                    padding: const EdgeInsets.all(12.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          analysis.domain,
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontFamily: 'monospace',
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text('Threat: ${analysis.threatLevel}'),
                        if (analysis.warnings.isNotEmpty) ...[
                          const SizedBox(height: 8),
                          const Text(
                            'Warnings:',
                            style: TextStyle(fontWeight: FontWeight.w600),
                          ),
                          ...analysis.warnings.map(
                            (w) => Padding(
                              padding: const EdgeInsets.only(left: 8, top: 2),
                              child: Text('• $w'),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Text('$label: ', style: const TextStyle(fontWeight: FontWeight.w600)),
          Text(value),
        ],
      ),
    );
  }

  Color _getThreatColor(ThreatLevel level) {
    switch (level) {
      case ThreatLevel.high:
        return Colors.red[50]!;
      case ThreatLevel.medium:
        return Colors.orange[50]!;
      case ThreatLevel.low:
        return Colors.yellow[50]!;
      default:
        return Colors.green[50]!;
    }
  }

  Future<void> _analyzeMessage() async {
    final text = _controller.text.trim();
    if (text.isEmpty) return;

    setState(() {
      _isAnalyzing = true;
      _result = null;
    });

    try {
      final result = await MessageSecurityService.analyzeMessage(text);
      setState(() {
        _result = result;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    } finally {
      setState(() => _isAnalyzing = false);
    }
  }

  Future<void> _showDatabaseInfo() async {
    final stats = await LocalPhishingDatabase.getStats();

    if (!mounted) return;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Database Info'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Total known phishing domains: ${stats.totalDomains}'),
            const SizedBox(height: 8),
            Text('Last updated: ${stats.lastUpdated.toLocal()}'),
          ],
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

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }
}

/// Standalone testing functions
class SecurityTests {
  /// Test URL extraction
  static void testUrlExtraction() {
    final tests = [
      'Visit https://google.com',
      'Check www.example.com and http://test.org',
      'No URLs here',
      'Multiple: https://a.com, https://b.com, https://c.com',
    ];

    print('=== URL Extraction Tests ===');
    for (final test in tests) {
      final urls = UrlExtractor.extractUrls(test);
      print('Input: "$test"');
      print('URLs found: ${urls.length}');
      for (final url in urls) {
        print('  - $url');
      }
      print('');
    }
  }

  /// Test homograph detection
  static void testHomographDetection() {
    final tests = [
      'google.com', // Safe
      'googlе.com', // Cyrillic 'е'
      'αpple.com', // Greek alpha
      'microṡoft.com', // Dot above 's'
    ];

    print('=== Homograph Detection Tests ===');
    for (final domain in tests) {
      final isSuspicious = HomographDetector.isSuspicious(domain);
      final analysis = HomographDetector.analyzeDomain(domain);

      print('Domain: $domain');
      print('Suspicious: $isSuspicious');
      print('Analysis: ${analysis.description}');
      print('');
    }
  }

  /// Test local database
  static Future<void> testLocalDatabase() async {
    final domains = [
      'google.com',
      'paypal-verify.com',
      'amazon-security.com',
      'totally-safe-site.com',
    ];

    print('=== Local Database Tests ===');
    for (final domain in domains) {
      final result = await LocalPhishingDatabase.checkDomain(domain);
      print('Domain: $domain');
      print('Is Phishing: ${result.isPhishing}');
      print('Reason: ${result.reason}');
      print('');
    }
  }

  /// Run all tests
  static Future<void> runAllTests() async {
    testUrlExtraction();
    print('\n');
    testHomographDetection();
    print('\n');
    await testLocalDatabase();
  }
}
