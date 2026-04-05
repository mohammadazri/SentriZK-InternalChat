import 'package:audioplayers/audioplayers.dart';

/// Centralized sound manager for SentriZK.
///
/// Sounds handled:
///   - Notification chime  → incoming message alert
///   - Outgoing call tone  → looping dial tone while caller waits
///   - Incoming call ring  → delegated to flutter_ringtone_player (system ringtone)
///
/// Usage:
///   SoundService().playNotification();
///   SoundService().startDialTone();
///   SoundService().stopDialTone();
///   SoundService().dispose();
class SoundService {
  // ── Singleton ────────────────────────────────────────────────────────────
  static final SoundService _instance = SoundService._internal();
  factory SoundService() => _instance;
  SoundService._internal();

  // ── Players ──────────────────────────────────────────────────────────────
  final AudioPlayer _notificationPlayer = AudioPlayer();
  final AudioPlayer _dialPlayer = AudioPlayer();

  bool _dialTonePlaying = false;

  // ── Public API ───────────────────────────────────────────────────────────

  /// Play a short notification chime for new incoming messages.
  Future<void> playNotification() async {
    try {
      await _notificationPlayer.stop();
      await _notificationPlayer.play(
        AssetSource('sounds/notification.wav'),
        volume: 0.7,
      );
    } catch (e) {
      // audioplayers missing asset → silent fallback
    }
  }

  /// Start a looping outgoing call dial tone (caller side).
  Future<void> startDialTone() async {
    if (_dialTonePlaying) return;
    try {
      await _dialPlayer.setReleaseMode(ReleaseMode.loop);
      await _dialPlayer.setVolume(0.5);
      await _dialPlayer.play(AssetSource('sounds/dialtone.wav'));
      _dialTonePlaying = true;
    } catch (e) {
      // silent fallback
    }
  }

  /// Stop the outgoing dial tone (call accepted/rejected/ended).
  Future<void> stopDialTone() async {
    if (!_dialTonePlaying) return;
    try {
      await _dialPlayer.stop();
      _dialTonePlaying = false;
    } catch (e) {
      _dialTonePlaying = false;
    }
  }

  /// Release all audio resources. Call this only when the app is fully disposed.
  Future<void> dispose() async {
    await _notificationPlayer.dispose();
    await _dialPlayer.dispose();
  }
}
