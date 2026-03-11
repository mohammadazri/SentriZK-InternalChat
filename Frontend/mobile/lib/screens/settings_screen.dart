import 'dart:io';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'package:share_plus/share_plus.dart';
import 'package:path_provider/path_provider.dart';
import 'package:intl/intl.dart';

import '../providers/theme_provider.dart';
import '../services/user_service.dart';
import '../services/auth_service.dart';
import '../services/message_security_service.dart';
import '../models/local_message.dart';
import 'package:isar/isar.dart';
import 'auth_screen.dart';

class SettingsScreen extends StatefulWidget {
  final String currentUserId;
  const SettingsScreen({super.key, required this.currentUserId});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final UserService _userService = UserService();
  final AuthService _authService = AuthService();
  bool _isLoading = false;
  int _localMessageCount = 0;

  @override
  void initState() {
    super.initState();
    _countLocalMessages();
  }

  Future<void> _countLocalMessages() async {
    final isar = await MessageSecurityService.getInstance();
    final count = await isar.localMessages.count();
    if (mounted) {
      setState(() {
        _localMessageCount = count;
      });
    }
  }

  Future<void> _updateAvatar() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: ImageSource.gallery, imageQuality: 70);

    if (pickedFile != null) {
      setState(() => _isLoading = true);
      try {
        await _userService.updateProfileAvatar(widget.currentUserId, File(pickedFile.path));
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Profile photo updated successfully'), backgroundColor: Colors.green),
        );
      } catch (e) {
        if (e.toString().contains('permission-denied')) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Storage permissions denied. Please configure Firebase Storage rules.'), backgroundColor: Colors.orange),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Failed to update photo: $e'), backgroundColor: Colors.red),
          );
        }
      } finally {
        if (mounted) setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _editDisplayName(String currentName) async {
    final controller = TextEditingController(text: currentName);
    
    final newName = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Edit Display Name'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(
            labelText: 'New Name',
            border: OutlineInputBorder(),
          ),
          autofocus: true,
          textCapitalization: TextCapitalization.words,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, controller.text.trim()),
            child: const Text('Save'),
          ),
        ],
      ),
    );

    if (newName != null && newName.isNotEmpty && newName != currentName) {
      setState(() => _isLoading = true);
      try {
        await _userService.updateDisplayName(widget.currentUserId, newName);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Name updated successfully'), backgroundColor: Colors.green),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Failed to update name: $e'), backgroundColor: Colors.red),
          );
        }
      } finally {
        if (mounted) setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _exportChats() async {
    setState(() => _isLoading = true);
    try {
      final isar = await MessageSecurityService.getInstance();
      final messages = await isar.localMessages.where().sortByTimestamp().findAll();
      
      if (messages.isEmpty) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('No local messages to export')),
          );
        }
        return;
      }

      final buffer = StringBuffer();
      buffer.writeln('SentriZK Chat Export');
      buffer.writeln('Generated: ${DateTime.now().toIso8601String()}');
      buffer.writeln('User ID: ${widget.currentUserId}');
      buffer.writeln('-' * 40);

      for (var msg in messages) {
        final dateStr = DateFormat('yyyy-MM-dd HH:mm:ss').format(msg.timestamp);
        final direction = msg.senderId == widget.currentUserId ? 'Sent to ${msg.receiverId}' : 'From ${msg.senderId}';
        buffer.writeln('[$dateStr] $direction: ${msg.content}');
      }

      final directory = await getTemporaryDirectory();
      final file = File('${directory.path}/SentriZK_Export_${DateTime.now().millisecondsSinceEpoch}.txt');
      await file.writeAsString(buffer.toString());

      await Share.shareXFiles([XFile(file.path)], text: 'My SentriZK Chat Export');

    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to export chats: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _clearLocalData() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Clear Local Data?'),
        content: const Text('This will permanently delete all cached messages from this device. They cannot be recovered. Are you sure?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red, foregroundColor: Colors.white),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete All'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      setState(() => _isLoading = true);
      try {
        final isar = await MessageSecurityService.getInstance();
        await isar.writeTxn(() async {
          await isar.localMessages.clear();
        });
        await _countLocalMessages();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Local data cleared successfully'), backgroundColor: Colors.green),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error clearing data: $e'), backgroundColor: Colors.red),
          );
        }
      } finally {
        if (mounted) setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _logout() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirm Logout'),
        content: const Text('Are you sure you want to log out? You will need your recovery phrase to sign back in.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red, foregroundColor: Colors.white),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Logout'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      setState(() => _isLoading = true);
      
      // 1. Set status to offline
      await _userService.createOrUpdateUser(
        userId: widget.currentUserId,
        username: widget.currentUserId,
        deviceId: '',
        activityStatus: 'Offline',
      );
      
      if (!mounted) return;
      
      // 2. Navigate away FIRST, which destroys UserListScreen and calls its dispose()
      // This stops all the active Firestore streams that rely on the current Auth token
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const AuthScreen()),
        (route) => false,
      );
      
      // 3. Give streams a tiny bit of time to cancel
      await Future.delayed(const Duration(milliseconds: 300));
      
      // 4. Destroy the Auth Token
      await _authService.logout();
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: Stack(
        children: [
          // Background Gradient
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: isDark
                    ? [const Color(0xFF0B0F19), const Color(0xFF0F172A), const Color(0xFF1E293B)]
                    : [const Color(0xFFF8FAFC), const Color(0xFFEFF6FF), const Color(0xFFE2E8F0)],
              ),
            ),
          ),
          
          SafeArea(
            child: CustomScrollView(
              physics: const BouncingScrollPhysics(),
              slivers: [
                SliverAppBar(
                  floating: true,
                  pinned: true,
                  backgroundColor: Colors.transparent,
                  elevation: 0,
                  iconTheme: IconThemeData(color: Theme.of(context).colorScheme.onSurface),
                  title: Text(
                    'Settings',
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.onSurface,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                
                SliverToBoxAdapter(
                  child: StreamBuilder<DocumentSnapshot>(
                    stream: FirebaseFirestore.instance.collection('users').doc(widget.currentUserId).snapshots(),
                    builder: (context, snapshot) {
                      final userData = snapshot.data?.data() as Map<String, dynamic>?;
                      final displayName = userData?['displayName'] ?? userData?['username'] ?? widget.currentUserId;
                      final avatarUrl = userData?['avatarUrl'];

                      return Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const SizedBox(height: 20),
                            
                            // 1. User Profile Card
                            _buildGlassCard(
                              context,
                              child: Column(
                                children: [
                                  GestureDetector(
                                    onTap: _updateAvatar,
                                    child: Stack(
                                      alignment: Alignment.bottomRight,
                                      children: [
                                        CircleAvatar(
                                          radius: 50,
                                          backgroundColor: Theme.of(context).colorScheme.primary.withOpacity(0.2),
                                          backgroundImage: avatarUrl != null ? NetworkImage(avatarUrl) : null,
                                          child: avatarUrl == null
                                              ? Text(
                                                  displayName.isNotEmpty ? displayName.substring(0, 1).toUpperCase() : '?',
                                                  style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.primary),
                                                )
                                              : null,
                                        ),
                                        Container(
                                          padding: const EdgeInsets.all(8),
                                          decoration: BoxDecoration(
                                            color: Theme.of(context).colorScheme.primary,
                                            shape: BoxShape.circle,
                                            border: Border.all(color: Theme.of(context).scaffoldBackgroundColor, width: 3),
                                          ),
                                          child: const Icon(Icons.camera_alt, size: 16, color: Colors.white),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(height: 16),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Text(
                                        displayName,
                                        style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface),
                                      ),
                                      IconButton(
                                        icon: Icon(Icons.edit, size: 20, color: Theme.of(context).colorScheme.primary),
                                        onPressed: () => _editDisplayName(displayName),
                                      ),
                                    ],
                                  ),
                                  Text(
                                    '@${userData?['username'] ?? widget.currentUserId}',
                                    style: TextStyle(fontSize: 14, color: Theme.of(context).colorScheme.onSurface.withOpacity(0.5)),
                                  ),
                                ],
                              ),
                            ),
                            
                            const SizedBox(height: 24),
                            _buildSectionTitle(context, 'Appearance'),
                            
                            // 2. Appearance
                            _buildGlassCard(
                              context,
                              padding: EdgeInsets.zero,
                              child: Consumer<ThemeProvider>(
                                builder: (context, themeProvider, child) {
                                  final isDarkMode = themeProvider.themeMode == ThemeMode.dark ||
                                      (themeProvider.themeMode == ThemeMode.system &&
                                          MediaQuery.of(context).platformBrightness == Brightness.dark);
                                  return SwitchListTile(
                                    title: Text('Dark Mode', style: TextStyle(color: Theme.of(context).colorScheme.onSurface, fontWeight: FontWeight.w600)),
                                    subtitle: Text('Sleek dark aesthetics', style: TextStyle(color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6), fontSize: 13)),
                                    secondary: Icon(isDarkMode ? Icons.dark_mode : Icons.light_mode, color: Theme.of(context).colorScheme.primary),
                                    value: isDarkMode,
                                    onChanged: (val) => themeProvider.toggleTheme(),
                                  );
                                },
                              ),
                            ),

                            const SizedBox(height: 24),
                            _buildSectionTitle(context, 'Data & Storage'),
                            
                            // 3. Data Management
                            _buildGlassCard(
                              context,
                              padding: EdgeInsets.zero,
                              child: Column(
                                children: [
                                  ListTile(
                                    leading: Icon(Icons.download, color: Theme.of(context).colorScheme.primary),
                                    title: Text('Export Chat History', style: TextStyle(color: Theme.of(context).colorScheme.onSurface, fontWeight: FontWeight.w600)),
                                    subtitle: Text('Share $_localMessageCount messages as .txt', style: TextStyle(color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6), fontSize: 13)),
                                    trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                                    onTap: _exportChats,
                                  ),
                                  Divider(height: 1, color: Theme.of(context).colorScheme.onSurface.withOpacity(0.1)),
                                  ListTile(
                                    leading: const Icon(Icons.delete_sweep, color: Colors.redAccent),
                                    title: const Text('Clear Local Messages', style: TextStyle(color: Colors.redAccent, fontWeight: FontWeight.w600)),
                                    subtitle: Text('Free up local storage space', style: TextStyle(color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6), fontSize: 13)),
                                    onTap: _clearLocalData,
                                  ),
                                ],
                              ),
                            ),

                            const SizedBox(height: 24),
                            _buildSectionTitle(context, 'Account'),

                            // 4. Logout
                            _buildGlassCard(
                              context,
                              padding: EdgeInsets.zero,
                              child: ListTile(
                                leading: const Icon(Icons.logout, color: Colors.orangeAccent),
                                title: const Text('Logout Securely', style: TextStyle(color: Colors.orangeAccent, fontWeight: FontWeight.w600)),
                                subtitle: Text('Clears session from this device', style: TextStyle(color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6), fontSize: 13)),
                                trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                                onTap: _logout,
                              ),
                            ),

                            const SizedBox(height: 40),
                          ],
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
          
          if (_isLoading)
            Container(
              color: Colors.black.withOpacity(0.5),
              child: const Center(child: CircularProgressIndicator()),
            ),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(BuildContext context, String title) {
    return Padding(
      padding: const EdgeInsets.only(left: 8, bottom: 8),
      child: Text(
        title.toUpperCase(),
        style: TextStyle(
          color: Theme.of(context).colorScheme.onSurface.withOpacity(0.5),
          fontSize: 12,
          fontWeight: FontWeight.bold,
          letterSpacing: 1.2,
        ),
      ),
    );
  }

  Widget _buildGlassCard(BuildContext context, {required Widget child, EdgeInsetsGeometry? padding}) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          padding: padding ?? const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: isDark ? Colors.white.withOpacity(0.05) : Colors.white.withOpacity(0.6),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: isDark ? Colors.white.withOpacity(0.1) : Colors.black.withOpacity(0.05),
              width: 1,
            ),
          ),
          child: child,
        ),
      ),
    );
  }
}
