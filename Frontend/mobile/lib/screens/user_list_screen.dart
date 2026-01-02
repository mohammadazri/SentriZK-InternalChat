import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'chat_screen.dart';
import 'auth_screen.dart';

import '../services/user_service.dart';
import '../services/auth_service.dart';

class UserListScreen extends StatefulWidget {
  final String currentUserId;
  const UserListScreen({Key? key, required this.currentUserId})
    : super(key: key);

  @override
  State<UserListScreen> createState() => _UserListScreenState();
}

class _UserListScreenState extends State<UserListScreen>
    with WidgetsBindingObserver {
  final UserService _userService = UserService();
  final AuthService _authService = AuthService();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _setOnlineStatus(true);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _setOnlineStatus(false);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _setOnlineStatus(true);
    } else if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.inactive ||
        state == AppLifecycleState.detached) {
      _setOnlineStatus(false);
    }
  }

  Future<void> _setOnlineStatus(bool online) async {
    await _userService.createOrUpdateUser(
      userId: widget.currentUserId,
      username: widget.currentUserId,
      deviceId: '',
      activityStatus: online ? 'Online' : 'Offline',
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Chats'),
        actions: [
          IconButton(
            tooltip: 'Logout',
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await _setOnlineStatus(false);
              await _authService.logout();
              if (!mounted) return;
              Navigator.of(context).pushAndRemoveUntil(
                MaterialPageRoute(builder: (_) => const AuthScreen()),
                (route) => false,
              );
            },
          ),
        ],
      ),
      body: StreamBuilder<QuerySnapshot>(
        stream: FirebaseFirestore.instance.collection('users').snapshots(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          final users = snapshot.data?.docs ?? [];
          final filtered = users
              .where((u) => u['id'] != widget.currentUserId)
              .toList();
          if (filtered.isEmpty) {
            return const Center(child: Text('No users found.'));
          }
          return ListView.builder(
            itemCount: filtered.length,
            itemBuilder: (context, index) {
              final user = filtered[index];
              final isOnline = user['activityStatus'] == 'Online';
              return ListTile(
                leading: CircleAvatar(
                  child: Icon(
                    isOnline ? Icons.circle : Icons.circle_outlined,
                    color: isOnline ? Colors.green : Colors.grey,
                  ),
                ),
                title: Text(user['username'] ?? user['id'] ?? ''),
                subtitle: Text(isOnline ? 'Online' : 'Offline'),
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => ChatScreen(
                        username: widget.currentUserId,
                        peerId: user['id'],
                        peerName: user['username'] ?? user['id'],
                      ),
                    ),
                  );
                },
              );
            },
          );
        },
      ),
    );
  }
}
