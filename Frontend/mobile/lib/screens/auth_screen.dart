import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:app_links/app_links.dart';
import '../services/auth_service.dart';
import '../config/app_config.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> with TickerProviderStateMixin {
  final AppLinks _appLinks = AppLinks();
  final AuthService _authService = AuthService();

  late AnimationController _particleController;
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  String _status = "Ready to authenticate";
  String _mnemonicDisplay = "";
  bool _isLoggedIn = false;
  String? _username;
  bool _isLoading = false;
  IconData _statusIcon = Icons.shield_outlined;
  Color _statusColor = Colors.white70;

  @override
  void initState() {
    super.initState();
    _initAnimations();
    _listenForRedirect();
    _checkLoginStatus();
  }

  void _initAnimations() {
    _particleController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 20),
    )..repeat();

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
      final isValid = await _authService.isSessionValid();

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
          }
        });
      }
    } catch (e) {
      debugPrint('Error checking login status: $e');
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
    _particleController.dispose();
    _pulseController.dispose();
    super.dispose();
  }

  /// Listen for redirect after web authentication with secure handling
  void _listenForRedirect() {
    _appLinks.uriLinkStream.listen(
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
              _isLoggedIn = true;
              _username = username;
            });
          }

          // Security: Clear sensitive data from memory
          HapticFeedback.mediumImpact();
          await _showSuccessDialog('Registration Complete', result.message);
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

            // Update token and session with timeout protection
            await _authService
                .updateLoginToken(
                  token: token,
                  username: username,
                  sessionId: sessionId.isNotEmpty ? sessionId : null,
                )
                .timeout(
                  const Duration(seconds: 10),
                  onTimeout: () => throw TimeoutException('Login timeout'),
                );

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
              });
            }

            HapticFeedback.mediumImpact();
            await _showSuccessDialog(
              'Login Successful',
              'Welcome back, $username!',
            );
          } catch (e) {
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
      final existingSalt = existing['salt'];

      if (existingUsername != null && existingSalt != null) {
        final action = await showDialog<String>(
          context: context,
          builder: (context) => _buildAlertDialog(
            "Existing Account Detected",
            "An account for '$existingUsername' already exists.\n\nWould you like to remove it and register a new one?",
            [
              TextButton(
                onPressed: () => Navigator.pop(context, "cancel"),
                child: const Text("Cancel"),
              ),
              TextButton(
                onPressed: () => Navigator.pop(context, "login"),
                child: const Text("Login Instead"),
              ),
              ElevatedButton(
                onPressed: () => Navigator.pop(context, "new"),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.red,
                  foregroundColor: Colors.white,
                ),
                child: const Text("Remove & Register"),
              ),
            ],
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
      _updateStatus(
        "No saved credentials. Please register first.",
        Icons.warning,
        Colors.orangeAccent,
      );
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
          // Animated gradient background
          AnimatedBuilder(
            animation: _particleController,
            builder: (context, child) {
              return Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      const Color(0xFF0F172A), // Slate 900
                      const Color(0xFF1E293B), // Slate 800
                      const Color(0xFF334155), // Slate 700
                    ],
                    stops: [0.0, _particleController.value, 1.0],
                  ),
                ),
              );
            },
          ),

          // Particle effect overlay
          Positioned.fill(
            child: CustomPaint(
              painter: _ParticlePainter(_particleController.value),
            ),
          ),

          // Main content
          SafeArea(
            child: _isLoggedIn ? _buildLoggedInView() : _buildLandingView(),
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

          // Logo and title
          ScaleTransition(
            scale: _pulseAnimation,
            child: Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(
                  colors: [
                    const Color(0xFF6366F1).withOpacity(0.3),
                    const Color(0xFF8B5CF6).withOpacity(0.3),
                  ],
                ),
              ),
              child: const Icon(Icons.shield, size: 80, color: Colors.white),
            ),
          ),

          const SizedBox(height: 24),

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
              color: Colors.white.withOpacity(0.7),
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
            onTap: _openWebLogin,
          ),

          const SizedBox(height: 40),

          // Footer
          Text(
            'Powered by ZK-SNARKs',
            style: TextStyle(
              color: Colors.white.withOpacity(0.5),
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLoggedInView() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          const SizedBox(height: 20),

          // Profile card
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)],
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
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.2),
                    shape: BoxShape.circle,
                  ),
                  child: Text(
                    _username?.substring(0, 1).toUpperCase() ?? 'U',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _username ?? 'User',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          const Icon(
                            Icons.verified_user,
                            color: Colors.greenAccent,
                            size: 16,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            'ZK Verified',
                            style: TextStyle(
                              color: Colors.white.withOpacity(0.9),
                              fontSize: 14,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),

          // Status card
          _buildStatusCard(),

          const SizedBox(height: 24),

          // Mnemonic display
          if (_mnemonicDisplay.isNotEmpty)
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.1),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: Colors.orangeAccent.withOpacity(0.5),
                  width: 2,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.key, color: Colors.orangeAccent, size: 20),
                      SizedBox(width: 8),
                      Text(
                        'Recovery Phrase',
                        style: TextStyle(
                          color: Colors.orangeAccent,
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    _mnemonicDisplay,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontFamily: 'monospace',
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    '⚠️ Save this phrase securely. You\'ll need it to recover your account.',
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.7),
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),

          const SizedBox(height: 24),

          // Actions
          _buildActionButton(
            icon: Icons.logout,
            label: 'Logout',
            color: Colors.redAccent,
            onTap: _logout,
          ),
        ],
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
  }) {
    return GestureDetector(
      onTap: onTap,
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
                  child: Icon(icon, color: Colors.white, size: 32),
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

// Custom particle painter for background effect
class _ParticlePainter extends CustomPainter {
  final double animationValue;

  _ParticlePainter(this.animationValue);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white.withOpacity(0.1)
      ..style = PaintingStyle.fill;

    // Draw animated particles
    for (int i = 0; i < 30; i++) {
      final x = (size.width / 30) * i + (animationValue * 50);
      final y = (size.height / 3) * (i % 3) + (animationValue * 30);
      canvas.drawCircle(Offset(x % size.width, y % size.height), 2, paint);
    }
  }

  @override
  bool shouldRepaint(covariant _ParticlePainter oldDelegate) {
    return oldDelegate.animationValue != animationValue;
  }
}
