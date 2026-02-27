import 'dart:convert';
import 'package:flutter/services.dart';
import 'package:tflite_flutter/tflite_flutter.dart';

/// Singleton service that loads the TFLite Bi-LSTM model and vocab,
/// then scores messages for insider threat detection.
class MessageScanService {
  static MessageScanService? _instance;
  Interpreter? _interpreter;
  Map<String, int>? _vocab;
  bool _isReady = false;

  static const int _maxLen = 120;
  static const int _oovIndex = 1; // <OOV> token index
  static const double _threatThreshold = 0.5;

  MessageScanService._();

  static MessageScanService get instance {
    _instance ??= MessageScanService._();
    return _instance!;
  }

  bool get isReady => _isReady;

  /// Initialize the model and vocabulary. Call once at app startup.
  Future<void> init() async {
    if (_isReady) return;

    try {
      // Load TFLite model
      _interpreter = await Interpreter.fromAsset('ml/sentrizk_model.tflite');
      print('✅ [ML] TFLite model loaded');

      // Load vocabulary
      final vocabJson = await rootBundle.loadString('assets/ml/vocab.json');
      _vocab = Map<String, int>.from(jsonDecode(vocabJson));
      print('✅ [ML] Vocabulary loaded (${_vocab!.length} words)');

      _isReady = true;
    } catch (e) {
      print('❌ [ML] Failed to initialize: $e');
      _isReady = false;
    }
  }

  /// Tokenize text: lowercase → split → map to vocab indices → pad/truncate
  List<double> _tokenize(String text) {
    final words = text.toLowerCase().replaceAll(RegExp(r'[^\w\s]'), '').split(RegExp(r'\s+'));
    final indices = words.map((word) => (_vocab?[word] ?? _oovIndex).toDouble()).toList();

    // Pad or truncate to _maxLen
    if (indices.length >= _maxLen) {
      return indices.sublist(0, _maxLen);
    } else {
      return [...indices, ...List.filled(_maxLen - indices.length, 0.0)];
    }
  }

  /// Scan a message and return the threat score (0.0 = safe, 1.0 = threat).
  /// Returns 0.0 if the model is not ready.
  Future<double> scanMessage(String text) async {
    if (!_isReady || _interpreter == null) {
      print('⚠️ [ML] Model not ready, skipping scan');
      return 0.0;
    }

    try {
      final input = [_tokenize(text)]; // shape: [1, 120]
      final output = [
        [0.0]
      ]; // shape: [1, 1]

      _interpreter!.run(input, output);

      final score = output[0][0];
      print('🔍 [ML] Scan result: ${(score * 100).toStringAsFixed(1)}% threat');
      return score;
    } catch (e) {
      print('❌ [ML] Scan error: $e');
      return 0.0;
    }
  }

  /// Check if a score exceeds the threat threshold
  bool isThreat(double score) => score > _threatThreshold;

  void dispose() {
    _interpreter?.close();
    _interpreter = null;
    _isReady = false;
  }
}
