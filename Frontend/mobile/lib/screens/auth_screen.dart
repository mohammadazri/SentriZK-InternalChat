import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:app_links/app_links.dart';
import '../services/auth_service.dart';
import '../services/user_service.dart';
import '../services/notification_service.dart';

import '../config/app_config.dart';
import 'user_list_screen.dart';
import 'profile_setup_screen.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen>
    with TickerProviderStateMixin, WidgetsBindingObserver {
  final AppLinks _appLinks = AppLinks();
  final AuthService _authService = AuthService();

  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  String _status = "Ready to authenticate";
  String _mnemonicDisplay = "";
  bool _isLoggedIn = false;
  String? _username;
  bool _isLoading = false;
  bool _hasNavigatedToDashboard = false;
  bool _isRedirecting = false;
  static String? _lastProcessedToken;
  StreamSubscription? _linkSubscription;
  IconData _statusIcon = Icons.shield_outlined;
  Color _statusColor = Colors.white70;

  @override
  void initState() {
    super.initState();
    _initAnimations();
    _listenForRedirect();
    WidgetsBinding.instance.addObserver(this);
    _checkLoginStatus();
  }

  void _initAnimations() {
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    )..repeat(reverse: true);

    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.1).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
  }

  Future<void> _checkLoginStatus() async {
    try {
      final loginData = await _authService.loadLoginData();
      final username = loginData['username'];
      // 🔥 PERFORMANCE: Use local check instead of a blocking HTTP request to backend
      final isValid = await _authService.hasLocalSession();

      if (mounted) {
        setState(() {
          _isLoggedIn = isValid && username != null;
          _username = username;
          if (_isLoggedIn) {
            _updateStatus(
              "Welcome back, $_username!",
              Icons.verified_user,
              Colors.greenAccent,
            );
            _navigateToDashboard();
          }
        });
      }
    } catch (e) {
      debugPrint('Error checking login status: $e');
    }
  }

  Future<void> _navigateToDashboard() async {
    if (_hasNavigatedToDashboard || !mounted || _username == null) return;
    
    // Diagnostic logging for UID mismatch
    final currentUser = FirebaseAuth.instance.currentUser;
    debugPrint('🔥 [AUTH] Navigating to dashboard for user: $_username');
    debugPrint('🔥 [AUTH] Firebase Current User UID: ${currentUser?.uid}');

    setState(() {
      _hasNavigatedToDashboard = true;
      _isRedirecting = true;
    });

    try {
      final doc = await FirebaseFirestore.instance
          .collection('users')
          .doc(_username)
          .get()
          .catchError((e) {
        debugPrint('🔥 [AUTH] Firestore fetch error: $e');
        throw e;
      });

      final hasDisplayName = doc.exists &&
          doc.data()!.containsKey('displayName') &&
          doc.data()!['displayName'] != null;

      if (!mounted) return;

      Widget nextScreen;
      if (hasDisplayName) {
        nextScreen = UserListScreen(currentUserId: _username!);
      } else {
        nextScreen = ProfileSetupScreen(username: _username!);
      }

      Navigator.of(context)
          .pushReplacement(MaterialPageRoute(builder: (context) => nextScreen))
          .whenComplete(() {
        if (mounted) setState(() => _isRedirecting = false);
      });
    } catch (e) {
      debugPrint('Error navigating to dashboard: $e');
      // If permission denied, we might need to show an error or try a different ID
      if (mounted) {
        _updateStatus(
          "Permission Denied: Firebase configuration issue.",
          Icons.error_outline,
          Colors.redAccent,
        );
        setState(() => _isRedirecting = false);
      }
    }
  }

  void _updateStatus(String message, IconData icon, Color color) {
    if (mounted) {
      setState(() {
        _status = message;
        _statusIcon = icon;
        _statusColor = color;
      });
    }
  }

  @override
  void dispose() {
    _linkSubscription?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    _pulseController.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _onAppResume();
    }
  }

  Future<void> _onAppResume() async {
    try {
      // 🔥 PERFORMANCE: Don't do 2 HTTP requests (validate + refresh) on every single app resume!
      // The _refreshTimer in AuthService automatically handles background refreshing based on TTL.
      final isValid = await _authService.hasLocalSession();
      if (!isValid) {
        // Not valid — ensure UI reflects logged-out status
        if (mounted && (_isLoggedIn || _username != null)) {
          setState(() {
            _isLoggedIn = false;
            _username = null;
            _updateStatus(
              "Session expired. Please re-authenticate.",
              Icons.lock_open,
              Colors.orangeAccent,
            );
          });
        }
      }
    } catch (e) {
      debugPrint('Error on app resume refresh: $e');
    }
  }

  /// Listen for redirect after web authentication with secure handling
  void _listenForRedirect() {
    _linkSubscription = _appLinks.uriLinkStream.listen(
      (uri) async {
        // Security: Validate scheme
        if (uri.scheme != 'sentriapp') {
          _updateStatus(
            "Security: Invalid URI scheme rejected",
            Icons.warning,
            Colors.orangeAccent,
          );
          return;
        }

        // Debug: Print received URI
        debugPrint('📱 Received deep link: $uri');

        final host = uri.host;
        final path = uri.path;
        final uriString = uri.toString();

        // Determine callback type
        String callbackType = '';
        if (host.isNotEmpty && host != 'null') {
          callbackType = host;
        } else if (path.isNotEmpty && path != '/') {
          callbackType = path;
        } else if (uriString.contains('auth-callback')) {
          callbackType = 'auth-callback';
        } else if (uriString.contains('login-success')) {
          callbackType = 'login-success';
        }

        final token = uri.queryParameters['token'] ?? "";
        
        // Deduplicate: prevent the exact same token from triggering the backend validation API twice
        if (token.isNotEmpty && token == _lastProcessedToken) {
          debugPrint('📱 Skipping duplicate login deep link processing for token: $token');
          return;
        }
        if (token.isNotEmpty) {
          _lastProcessedToken = token;
        }

        final username = uri.queryParameters['username'] ?? "";
        final encryptedSalt = uri.queryParameters['encryptedSalt'] ?? "";
        final encodedMnemonic = uri.queryParameters['mnemonic'] ?? "";

        // Handle different redirect types
        if (callbackType.contains('auth-callback')) {
          // Registration callback
          debugPrint('📱 Processing registration callback...');

          _updateStatus(
            "Securing credentials...",
            Icons.lock_clock,
            Colors.blueAccent,
          );

          final result = await _authService.saveRedirectData(
            token: token,
            username: username,
            encryptedSalt: encryptedSalt,
            encodedMnemonic: encodedMnemonic,
          );

          _updateStatus(result.message, Icons.check_circle, Colors.greenAccent);

          if (mounted) {
            setState(() {
              _mnemonicDisplay = result.mnemonic;
              _isLoggedIn = false; // Stay on auth screen after signup
              _username = username;
            });
            _updateStatus(
              "Sign-up successful. Please log in after saving your mnemonic.",
              Icons.check_circle,
              Colors.greenAccent,
            );
          }

          // Security: Clear sensitive data from memory
          HapticFeedback.mediumImpact();
          await _showRecoveryPhraseDialog(result.mnemonic);
        } else if (callbackType.contains('login-success')) {
          // Login callback
          debugPrint('📱 Processing login callback...');
          final sessionId = uri.queryParameters['sessionId'] ?? "";

          // Security: Validate required fields
          if (token.isEmpty || username.isEmpty) {
            _updateStatus(
              "Login failed: Invalid credentials",
              Icons.error,
              Colors.redAccent,
            );
            return;
          }

          try {
            _updateStatus(
              "Authenticating...",
              Icons.lock_clock,
              Colors.blueAccent,
            );

            if (mounted) {
              setState(() {
                _isLoading = true;
              });
            }

            // Secure login: validate token with backend and store validated session
            await _authService
                .processLoginRedirect(token: token, username: username)
                .timeout(
                  const Duration(seconds: 30),
                  onTimeout: () => throw TimeoutException('Login timeout'),
                );

            // Sign in to Firebase Auth with custom token (required before Firestore writes)
            final firebaseSessionId = await _authService.getSessionId();
            if (firebaseSessionId != null) {
              await _authService.signInToFirebase(firebaseSessionId);
            }

            // Create or update Firestore user profile after successful login
            final deviceId = await _authService.getDeviceId();
            final userService = UserService();

            await userService.createOrUpdateUser(
              userId: username, // Use a unique userId if available
              username: username,
              deviceId: deviceId,
              // Add avatarUrl/phone if available
            );

            // Register and save FCM token for push notifications
            final notificationService = NotificationService();
            await notificationService.saveFcmToken(userId: username);

            _updateStatus(
              "Welcome back, $username",
              Icons.verified_user,
              Colors.greenAccent,
            );

            if (mounted) {
              setState(() {
                _mnemonicDisplay = "";
                _isLoggedIn = true;
                _username = username;
                _isLoading = false;
              });

              // Navigate to UserListScreen after successful login
              _navigateToDashboard();
            }

            HapticFeedback.mediumImpact();
            await _showSuccessDialog(
              'Login Successful',
              'Welcome back, $username!',
            );
          } catch (e) {
            if (mounted) {
              setState(() {
                _isLoading = false;
              });
            }
            _updateStatus(
              "Login error: ${e.toString()}",
              Icons.error,
              Colors.redAccent,
            );
          }
        } else {
          // Security: Log and reject unknown callbacks
          _updateStatus(
            "Security: Unknown callback rejected",
            Icons.warning,
            Colors.orangeAccent,
          );
          debugPrint('Security: Rejected unknown callback: $callbackType');
        }
      },
      onError: (error) {
        // Security: Handle stream errors gracefully
        debugPrint('Deep link error: $error');
        _updateStatus(
          "Connection error occurred",
          Icons.error,
          Colors.redAccent,
        );
      },
    );
  }

  Future<void> _showRecoveryPhraseDialog(String mnemonic) async {
    bool isCopied = false;
    return showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => Dialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
          ),
          backgroundColor: Colors.transparent,
          child: Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  const Color(0xFFFF6B35).withOpacity(0.9),
                  const Color(0xFFF7931E).withOpacity(0.9),
                ],
              ),
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFFFF6B35).withOpacity(0.3),
                  blurRadius: 20,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.key, color: Colors.white, size: 48),
                const SizedBox(height: 16),
                const Text(
                  'Recovery Phrase',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Save this phrase securely!',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.9),
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 20),
                // Copyable mnemonic container
                GestureDetector(
                  onTap: () async {
                    await Clipboard.setData(ClipboardData(text: mnemonic));
                    HapticFeedback.lightImpact();
                    setDialogState(() {
                      isCopied = true;
                    });
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Recovery phrase copied to clipboard!'),
                          duration: Duration(seconds: 2),
                          backgroundColor: Colors.green,
                        ),
                      );
                    }
                  },
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isCopied
                            ? Colors.greenAccent
                            : Colors.white.withOpacity(0.5),
                        width: 2,
                      ),
                    ),
                    child: Column(
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              isCopied
                                  ? Icons.check_circle
                                  : Icons.content_copy,
                              color: Colors.white,
                              size: 16,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              isCopied ? 'Copied!' : 'Tap to copy',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        SelectableText(
                          mnemonic,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                            fontFamily: 'monospace',
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.warning_amber_rounded,
                        color: Colors.yellowAccent,
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Write this down on paper or save it securely. You\'ll need it to recover your account.',
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.95),
                            fontSize: 11,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () async {
                      if (!isCopied) {
                        final confirm = await showDialog<bool>(
                          context: context,
                          builder: (context) => AlertDialog(
                            title: Row(
                              children: const [
                                Icon(Icons.warning, color: Colors.orange),
                                SizedBox(width: 8),
                                Text('Warning'),
                              ],
                            ),
                            content: const Text(
                              'You haven\'t copied the recovery phrase yet. Are you sure you\'ve saved it somewhere safe?',
                            ),
                            actions: [
                              TextButton(
                                onPressed: () => Navigator.pop(context, false),
                                child: const Text('Go Back'),
                              ),
                              ElevatedButton(
                                onPressed: () => Navigator.pop(context, true),
                                child: const Text('Yes, I\'ve Saved It'),
                              ),
                            ],
                          ),
                        );
                        if (confirm != true) return;
                      }

                      HapticFeedback.mediumImpact();
                      if (context.mounted) {
                        Navigator.of(context).pop();
                        // Clear mnemonic and go back to login page
                        setState(() {
                          _mnemonicDisplay = '';
                          _isLoggedIn = false;
                        });
                      }
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: const Color(0xFFFF6B35),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: const Text(
                      'I\'ve Saved It Securely',
                      style: TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _showSuccessDialog(String title, String message) async {
    return showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        backgroundColor: Colors.transparent,
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                const Color(0xFF6366F1).withOpacity(0.9),
                const Color(0xFF8B5CF6).withOpacity(0.9),
              ],
            ),
            borderRadius: BorderRadius.circular(24),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF6366F1).withOpacity(0.3),
                blurRadius: 20,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.check_circle,
                  color: Colors.white,
                  size: 48,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                title,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                message,
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Colors.white.withOpacity(0.9),
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => Navigator.of(context).pop(),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: const Color(0xFF6366F1),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text(
                    'Continue',
                    style: TextStyle(fontWeight: FontWeight.w600),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Check before registration
  Future<void> _checkBeforeRegistration() async {
    setState(() => _isLoading = true);
    try {
      final existing = await _authService.loadLoginData();
      final existingUsername = existing['username'];
      final existingSalt = existing['encryptedSalt'];

      if (existingUsername != null && existingSalt != null) {
        final action = await showDialog<String>(
          context: context,
          barrierDismissible: false,
          builder: (context) => Dialog(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(24),
            ),
            backgroundColor: Colors.transparent,
            child: Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    const Color(0xFF1E293B).withOpacity(0.95),
                    const Color(0xFF334155).withOpacity(0.95),
                  ],
                ),
                borderRadius: BorderRadius.circular(24),
                border: Border.all(
                  color: Colors.white.withOpacity(0.1),
                  width: 1,
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.3),
                    blurRadius: 20,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Icon
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFFFBBF24), Color(0xFFF59E0B)],
                      ),
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFFFBBF24).withOpacity(0.3),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: const Icon(
                      Icons.person_outline,
                      color: Colors.white,
                      size: 32,
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Title
                  const Text(
                    'Account Already Exists',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Username badge
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFF6366F1).withOpacity(0.2),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: const Color(0xFF6366F1).withOpacity(0.5),
                        width: 1,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.account_circle,
                          color: Color(0xFF818CF8),
                          size: 18,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          existingUsername,
                          style: const TextStyle(
                            color: Color(0xFF818CF8),
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Message
                  Text(
                    'An account is already registered on this device. What would you like to do?',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.8),
                      fontSize: 14,
                      height: 1.5,
                    ),
                  ),
                  const SizedBox(height: 28),

                  // Action buttons
                  Column(
                    children: [
                      // Login button (primary)
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: () => Navigator.pop(context, "login"),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF6366F1),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            elevation: 0,
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: const [
                              Icon(Icons.login, size: 20),
                              SizedBox(width: 8),
                              Text(
                                'Login with Existing Account',
                                style: TextStyle(
                                  fontWeight: FontWeight.w600,
                                  fontSize: 15,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Remove & Register button (danger)
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton(
                          onPressed: () => Navigator.pop(context, "new"),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: const Color(0xFFEF4444),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            side: const BorderSide(
                              color: Color(0xFFEF4444),
                              width: 1.5,
                            ),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: const [
                              Icon(Icons.delete_outline, size: 20),
                              SizedBox(width: 8),
                              Text(
                                'Remove & Create New',
                                style: TextStyle(
                                  fontWeight: FontWeight.w600,
                                  fontSize: 15,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Cancel button
                      TextButton(
                        onPressed: () => Navigator.pop(context, "cancel"),
                        style: TextButton.styleFrom(
                          foregroundColor: Colors.white.withOpacity(0.7),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                        child: const Text(
                          'Cancel',
                          style: TextStyle(
                            fontWeight: FontWeight.w500,
                            fontSize: 14,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );

        if (action == "login") {
          await _openWebLogin();
          return;
        } else if (action == "new") {
          await _authService.clearAccountData();
          _updateStatus(
            "Old account removed. Proceeding...",
            Icons.delete_sweep,
            Colors.orangeAccent,
          );
          await Future.delayed(const Duration(milliseconds: 500));
          await _openWebRegistration();
          return;
        } else {
          _updateStatus("Registration cancelled", Icons.cancel, Colors.grey);
          return;
        }
      }

      await _openWebRegistration();
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _openWebRegistration() async {
    _updateStatus(
      "Generating secure token...",
      Icons.lock_clock,
      Colors.blueAccent,
    );

    final opened = await _authService.openUrlWithMAT(
      AppConfig.registerUrl,
      "register",
    );

    _updateStatus(
      opened ? "Opening secure portal..." : "Failed to open registration",
      opened ? Icons.open_in_browser : Icons.error,
      opened ? Colors.cyan : Colors.redAccent,
    );
  }

  Future<void> _openWebLogin() async {
    final loginData = await _authService.loadLoginData();
    final encryptedSalt = loginData['encryptedSalt'];
    final username = loginData['username'];

    if (encryptedSalt == null) {
      await _showFirstTimeSignInOptions();
      return;
    }

    _updateStatus(
      "Generating secure token...",
      Icons.lock_clock,
      Colors.blueAccent,
    );

    final baseUrl = Uri.parse(AppConfig.loginUrl)
        .replace(
          queryParameters: {
            if (username != null) 'username': username,
            'encryptedSalt': encryptedSalt,
          },
        )
        .toString();

    final opened = await _authService.openUrlWithMAT(baseUrl, "login");

    _updateStatus(
      opened ? "Opening secure portal..." : "Failed to open login",
      opened ? Icons.open_in_browser : Icons.error,
      opened ? Colors.cyan : Colors.redAccent,
    );
  }

  Future<void> _handleSignIn() async {
    setState(() => _isLoading = true);
    try {
      await _openWebLogin();
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _showFirstTimeSignInOptions() async {
    final choice = await showDialog<String>(
      context: context,
      barrierDismissible: true,
      builder: (context) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        backgroundColor: Colors.transparent,
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
            ),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.white24, width: 1),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'First-time Sign In',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'No saved credentials found on this device. Recover your account using your 24-word recovery phrase.',
                style: TextStyle(color: Colors.white70),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () => Navigator.pop(context, 'recover'),
                  icon: const Icon(Icons.key),
                  label: const Text('Recover with Recovery Phrase'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF6366F1),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 8),
              TextButton(
                onPressed: () => Navigator.pop(context, 'cancel'),
                child: const Text('Cancel'),
              ),
            ],
          ),
        ),
      ),
    );

    if (choice == 'recover') {
      await _showRecoveryDialog();
    } else {
      _updateStatus('Sign-in cancelled', Icons.info_outline, Colors.white70);
    }
  }

  Future<void> _showRecoveryDialog() async {
    final usernameCtrl = TextEditingController(text: _username ?? '');
    final mnemonicCtrl = TextEditingController();
    final passphraseCtrl = TextEditingController();
    final passwordCtrl = TextEditingController();
    final confirmCtrl = TextEditingController();
    String? error;

    await showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => StatefulBuilder(
        builder: (context, setDlg) => Dialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          backgroundColor: Colors.transparent,
          child: Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF111827), Color(0xFF0B1220)],
              ),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.white10),
            ),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    'Recover Account',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Enter your username and 24-word recovery phrase. Choose a password to protect your salt for web login.',
                    style: TextStyle(color: Colors.white70, fontSize: 13),
                  ),
                  const SizedBox(height: 14),
                  TextField(
                    controller: usernameCtrl,
                    decoration: _inputDeco('Username'),
                    style: const TextStyle(color: Colors.white),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: mnemonicCtrl,
                    maxLines: 3,
                    decoration: _inputDeco('Recovery phrase (24 words)'),
                    style: const TextStyle(color: Colors.white),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: passphraseCtrl,
                    decoration: _inputDeco('BIP-39 passphrase (optional)'),
                    style: const TextStyle(color: Colors.white),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: passwordCtrl,
                    obscureText: true,
                    decoration: _inputDeco('New password (min 8 chars)'),
                    style: const TextStyle(color: Colors.white),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: confirmCtrl,
                    obscureText: true,
                    decoration: _inputDeco('Confirm password'),
                    style: const TextStyle(color: Colors.white),
                  ),
                  if (error != null) ...[
                    const SizedBox(height: 10),
                    Text(
                      error!,
                      style: const TextStyle(color: Colors.redAccent),
                    ),
                  ],
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => Navigator.pop(context),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.white70,
                            side: const BorderSide(color: Colors.white24),
                          ),
                          child: const Text('Cancel'),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: () async {
                            final username = usernameCtrl.text.trim();
                            final mnemonic = mnemonicCtrl.text.trim();
                            final passphrase = passphraseCtrl.text;
                            final pwd = passwordCtrl.text;
                            final confirm = confirmCtrl.text;

                            if (username.isEmpty || mnemonic.isEmpty) {
                              setDlg(
                                () => error =
                                    'Username and recovery phrase are required',
                              );
                              return;
                            }
                            if (pwd.length < 8) {
                              setDlg(
                                () => error =
                                    'Password must be at least 8 characters',
                              );
                              return;
                            }
                            if (pwd != confirm) {
                              setDlg(() => error = 'Passwords do not match');
                              return;
                            }

                            try {
                              setDlg(() => error = null);
                              _updateStatus(
                                'Deriving credentials securely...',
                                Icons.lock_clock,
                                Colors.blueAccent,
                              );
                              final encrypted = await _authService
                                  .recoverAndStoreEncryptedSalt(
                                    username: username,
                                    mnemonic: mnemonic,
                                    passphrase: passphrase,
                                    password: pwd,
                                  );

                              // Save local UI state and proceed to web login
                              if (mounted) {
                                setState(() => _username = username);
                              }
                              _updateStatus(
                                'Opening secure login portal...',
                                Icons.open_in_browser,
                                Colors.cyan,
                              );

                              // Open web login with MAT including username & encrypted salt bundle
                              final baseUrl = Uri.parse(AppConfig.loginUrl)
                                  .replace(
                                    queryParameters: {
                                      'username': username,
                                      'encryptedSalt': encrypted,
                                    },
                                  )
                                  .toString();
                              await _authService.openUrlWithMAT(
                                baseUrl,
                                'login',
                              );
                              if (context.mounted) Navigator.pop(context);
                            } catch (e) {
                              setDlg(
                                () =>
                                    error = 'Recovery failed: ${e.toString()}',
                              );
                              _updateStatus(
                                'Recovery failed',
                                Icons.error,
                                Colors.redAccent,
                              );
                            }
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF10B981),
                            foregroundColor: Colors.white,
                          ),
                          child: const Text('Continue to Web Login'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  InputDecoration _inputDeco(String label) {
    return InputDecoration(
      labelText: label,
      labelStyle: const TextStyle(color: Colors.white70),
      filled: true,
      fillColor: Colors.white.withOpacity(0.06),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Colors.white24),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFF6366F1)),
      ),
    );
  }

  Future<void> _logout() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => _buildAlertDialog(
        "Confirm Logout",
        "Are you sure you want to logout?",
        [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text("Cancel"),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
            ),
            child: const Text("Logout"),
          ),
        ],
      ),
    );

    if (confirm == true) {
      _updateStatus("Logging out...", Icons.logout, Colors.orangeAccent);

      await _authService.logout();

      setState(() {
        _isLoggedIn = false;
        _username = null;
        _mnemonicDisplay = "";
      });

      _updateStatus(
        "Logged out successfully",
        Icons.check_circle,
        Colors.greenAccent,
      );
    }
  }

  Widget _buildAlertDialog(String title, String content, List<Widget> actions) {
    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: Text(title),
      content: Text(content),
      actions: actions,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // Minimalist deep geometric backdrop
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Color(0xFF0B0F19), // Deep corporate navy
                  Color(0xFF0F172A), // Slate 900
                  Color(0xFF1E293B), // Slate 800
                ],
                stops: [0.0, 0.5, 1.0],
              ),
            ),
          ),

          // Main content
          SafeArea(
            child: _isLoggedIn ? _buildRedirectingView() : _buildLandingView(),
          ),

          // Redirecting overlay
          if (_isRedirecting)
            Positioned.fill(
              child: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
                  ),
                ),
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: const [
                      SizedBox(
                        width: 64,
                        height: 64,
                        child: CircularProgressIndicator(
                          strokeWidth: 6,
                          valueColor: AlwaysStoppedAnimation<Color>(
                            Color(0xFF8B5CF6),
                          ),
                        ),
                      ),
                      SizedBox(height: 16),
                      Text(
                        'Preparing your chats…',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

          // Loading overlay
          if (_isLoading)
            Container(
              color: Colors.black54,
              child: const Center(
                child: CircularProgressIndicator(
                  valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF6366F1)),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildLandingView() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          const SizedBox(height: 40),

          // Large logo, no background
          ScaleTransition(
            scale: _pulseAnimation,
            child: Center(
              child: Image.asset(
                'assets/mobil_logo_no_bg.png',
                width: 120,
                height: 120,
                fit: BoxFit.contain,
              ),
            ),
          ),

          const SizedBox(height: 32),

          const Text(
            'SentriZK',
            style: TextStyle(
              fontSize: 40,
              fontWeight: FontWeight.bold,
              color: Colors.white,
              letterSpacing: -1,
            ),
          ),

          const SizedBox(height: 8),

          Text(
            'Zero-Knowledge Authentication',
            style: TextStyle(
              fontSize: 16,
              color: Colors.white70,
              fontWeight: FontWeight.w500,
            ),
          ),

          const SizedBox(height: 40),

          // Status card
          _buildStatusCard(),

          const SizedBox(height: 32),

          // Register card
          _buildGlassmorphicCard(
            icon: Icons.person_add_alt_1,
            title: 'Create Account',
            subtitle: 'Zero-knowledge proof\nsecured registration',
            gradient: const LinearGradient(
              colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)],
            ),
            onTap: _checkBeforeRegistration,
          ),

          const SizedBox(height: 16),

          // Login card
          _buildGlassmorphicCard(
            icon: Icons.login,
            title: 'Sign In',
            subtitle: 'Prove identity without\nrevealing your password',
            gradient: const LinearGradient(
              colors: [Color(0xFF10B981), Color(0xFF06B6D4)],
            ),
            onTap: _handleSignIn,
            isLoading: _isLoading,
          ),

          const SizedBox(height: 40),

          // Footer
          Text(
            'Powered by ZK-SNARKs',
            style: TextStyle(color: Colors.white54, fontSize: 12),
          ),
        ],
      ),
    );
  }

  Widget _buildRedirectingView() {
    WidgetsBinding.instance.addPostFrameCallback((_) => _navigateToDashboard());
    return const Center(
      child: Padding(
        padding: EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 12),
            Text(
              'Redirecting to chats…',
              style: TextStyle(color: Colors.white70),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: _statusColor.withOpacity(0.3), width: 1),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: _statusColor.withOpacity(0.2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(_statusIcon, color: _statusColor, size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Text(
              _status,
              style: const TextStyle(color: Colors.white, fontSize: 14),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGlassmorphicCard({
    required IconData icon,
    required String title,
    required String subtitle,
    required Gradient gradient,
    required VoidCallback onTap,
    bool isLoading = false,
  }) {
    return GestureDetector(
      onTap: isLoading ? null : onTap,
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          gradient: gradient,
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(
              color: gradient.colors.first.withOpacity(0.3),
              blurRadius: 20,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(24),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: isLoading
                      ? const SizedBox(
                          width: 32,
                          height: 32,
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 3,
                          ),
                        )
                      : Icon(icon, color: Colors.white, size: 32),
                ),
                const SizedBox(width: 20),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        subtitle,
                        style: TextStyle(
                          color: Colors.white.withOpacity(0.9),
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                ),
                Icon(
                  Icons.arrow_forward_ios,
                  color: Colors.white.withOpacity(0.7),
                  size: 20,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildActionButton({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
        decoration: BoxDecoration(
          color: color.withOpacity(0.2),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withOpacity(0.5), width: 1),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(width: 12),
            Text(
              label,
              style: TextStyle(
                color: color,
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
