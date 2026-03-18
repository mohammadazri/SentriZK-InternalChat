import 'dart:convert';
import 'package:flutter/services.dart';
import 'package:tflite_flutter/tflite_flutter.dart';
import '../config/app_config.dart';

/// Singleton service that loads the TFLite model and vocab,
/// then scores messages for insider threat detection.
class MessageScanService {
  static MessageScanService? _instance;
  Interpreter? _interpreter;
  Map<String, int>? _vocab;
  bool _isReady = false;

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
      final options = InterpreterOptions()..addDelegate(GpuDelegateV2());
      options.useNnApiForAndroid = true;

      _interpreter = await Interpreter.fromAsset(AppConfig.mlModelAsset, options: options);
      print('✅ [ML] TFLite model loaded');

      // Load vocabulary
      final vocabJson = await rootBundle.loadString(AppConfig.mlVocabAsset);
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
    final indices = words.map((word) => (_vocab?[word] ?? AppConfig.mlOovIndex).toDouble()).toList();

    // Pad or truncate to maxLen
    if (indices.length >= AppConfig.mlMaxLen) {
      return indices.sublist(0, AppConfig.mlMaxLen);
    } else {
      return [...indices, ...List.filled(AppConfig.mlMaxLen - indices.length, 0.0)];
    }
  }

  /// Scan a message and return the threat score (0.0 = safe, 1.0 = threat).
  /// Returns 0.0 if the model is not ready or message is too short.
  Future<double> scanMessage(String text) async {
    if (!_isReady || _interpreter == null) {
      print('⚠️ [ML] Model not ready, skipping scan');
      return 0.0;
    }

    // Skip very short messages — they produce unreliable OOV-heavy scores
    final words = text.trim().split(RegExp(r'\s+'));
    if (words.length < AppConfig.mlMinWordCount) {
      print('⏭️ [ML] Message too short (${words.length} words), skipping scan');
      return 0.0;
    }

    try {
      final input = [_tokenize(text)]; // shape: [1, maxLen]
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
  bool isThreat(double score) => score > AppConfig.mlThreatThreshold;

  void dispose() {
    _interpreter?.close();
    _interpreter = null;
    _isReady = false;
  }
}

