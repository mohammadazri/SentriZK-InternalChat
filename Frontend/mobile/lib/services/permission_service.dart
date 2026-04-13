import 'package:permission_handler/permission_handler.dart';
import 'dart:io';

class PermissionService {
  PermissionService._();
  static final PermissionService instance = PermissionService._();

  /// Requests all core permissions required for the app to function properly.
  /// This should be called at app startup to ensure a smooth user experience.
  Future<void> initializePermissions() async {
    // Basic permissions for E2EE notifications, Secure Calls, and Attachments
    final permissions = [
      Permission.notification,
      Permission.camera,
      Permission.microphone,
    ];

    // Request permissions in a batch
    // On Android 13+, notification permission is explicit.
    // Camera and Mike are needed for the 1:1 secure calls.
    Map<Permission, PermissionStatus> statuses = await permissions.request();

    // Log statuses for debugging
    statuses.forEach((permission, status) {
      print('🛡️ [Permission] ${permission.toString().split('.').last}: ${status.isGranted ? "GRANTED" : "DENIED"}');
    });

    // Handle permanent denials by suggesting settings if crucial
    if (statuses[Permission.camera]!.isPermanentlyDenied || 
        statuses[Permission.microphone]!.isPermanentlyDenied) {
      print('⚠️ [Permission] Critical permissions permanently denied. User may need to enable in settings.');
    }
  }
}
