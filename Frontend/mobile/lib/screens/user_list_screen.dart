import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'chat_screen.dart';
import 'auth_screen.dart';

import '../services/user_service.dart';
import '../services/auth_service.dart';
import '../services/chat_service.dart';
import '../services/message_security_service.dart';
import '../models/local_message.dart';
import '../models/message.dart';
import 'dart:async';
import 'package:isar/isar.dart';

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
  final ChatService _chatService = ChatService();
  final TextEditingController _searchController = TextEditingController();
  
  String _searchQuery = '';
  Isar? _isar;
  StreamSubscription<List<Message>>? _globalMessageSub;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _setOnlineStatus(true);
    _initBackgroundSync();
  }

  Future<void> _initBackgroundSync() async {
    final isar = await MessageSecurityService.getInstance();
    if (!mounted) return;
    _isar = isar;

    // Start listening globally for all incoming messages
    _globalMessageSub = _chatService
        .getAllIncomingMessages(widget.currentUserId)
        .listen((messages) async {
      for (final msg in messages) {
        if (msg.status != 'seen') {
          // 1. Tell Firebase we saw it so others don't process it simultaneously
          await _chatService.markMessageSeen(widget.currentUserId, msg.id);

          // 2. Save the locally decrypted plaintext securely
          await isar.writeTxn(() async {
            await isar.localMessages.put(
              LocalMessage()
                ..content = msg.content
                ..senderId = msg.senderId
                ..receiverId = msg.receiverId
                ..timestamp = msg.timestamp
                ..attachmentUrl = msg.attachmentUrl
                ..status = 'seen'
                ..threatScore = msg.threatScore,
            );
          });

          // 3. Delete from Firebase to preserve ephemeral privacy
          await _chatService.deleteMessageAfterLocalSave(
            widget.currentUserId,
            msg.id,
          );
        }
      }
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _setOnlineStatus(false);
    _searchController.dispose();
    _globalMessageSub?.cancel();  // Stop background sync on exit
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
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.transparent,
        title: const Text(
          'Chats',
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w700,
            fontSize: 22,
          ),
        ),
        actions: [
          IconButton(
            tooltip: 'Logout',
            icon: const Icon(Icons.logout_rounded),
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
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF0F172A), Color(0xFF0B1224)],
          ),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0),
            child: StreamBuilder<QuerySnapshot>(
              stream: FirebaseFirestore.instance
                  .collection('users')
                  .snapshots(),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }

                final docs = snapshot.data?.docs ?? [];
                final users = docs
                    .map((d) => d.data() as Map<String, dynamic>)
                    .where((u) => u['id'] != widget.currentUserId)
                    .toList();

                final onlineCount = users
                    .where((u) => u['activityStatus'] == 'Online')
                    .length;

                final filtered = users.where((u) {
                  final search = _searchQuery.trim().toLowerCase();
                  if (search.isEmpty) return true;
                  final name = (u['username'] ?? u['id'] ?? '')
                      .toString()
                      .toLowerCase();
                  return name.contains(search);
                }).toList();

                if (filtered.isEmpty) {
                  return Column(
                    children: [
                      _HeaderCard(onlineCount: onlineCount),
                      const SizedBox(height: 16),
                      _SearchField(
                        controller: _searchController,
                        onChanged: (value) =>
                            setState(() => _searchQuery = value),
                      ),
                      const Spacer(),
                      const Text(
                        'No users found',
                        style: TextStyle(color: Colors.white70),
                      ),
                      const Spacer(),
                    ],
                  );
                }

                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _HeaderCard(onlineCount: onlineCount),
                    const SizedBox(height: 16),
                    _SearchField(
                      controller: _searchController,
                      onChanged: (value) =>
                          setState(() => _searchQuery = value),
                    ),
                    const SizedBox(height: 12),
                    Expanded(
                      child: ListView.separated(
                        itemCount: filtered.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (context, index) {
                          final user = filtered[index];
                          final isOnline = user['activityStatus'] == 'Online';
                          final displayName =
                              user['username'] ?? user['id'] ?? '';
                          final initials = displayName.isNotEmpty
                              ? displayName
                                    .trim()
                                    .split(' ')
                                    .map((e) => e.isNotEmpty ? e[0] : '')
                                    .join()
                                    .toUpperCase()
                              : '?';

                          return _UserCard(
                            name: displayName,
                            status: isOnline ? 'Online' : 'Offline',
                            isOnline: isOnline,
                            initials: initials,
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => ChatScreen(
                                    username: widget.currentUserId,
                                    peerId: user['id'],
                                    peerName: displayName,
                                  ),
                                ),
                              );
                            },
                          );
                        },
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
        ),
      ),
    );
  }
}

class _HeaderCard extends StatelessWidget {
  final int onlineCount;
  const _HeaderCard({required this.onlineCount});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        gradient: const LinearGradient(
          colors: [Color(0xFF1D4ED8), Color(0xFF7C3AED)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.25),
            blurRadius: 14,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Secure Chats',
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                  fontSize: 18,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                '$onlineCount online now',
                style: const TextStyle(color: Colors.white70, fontSize: 14),
              ),
            ],
          ),
          const Icon(Icons.lock_outline_rounded, color: Colors.white, size: 28),
        ],
      ),
    );
  }
}

class _SearchField extends StatelessWidget {
  final TextEditingController controller;
  final ValueChanged<String> onChanged;
  const _SearchField({required this.controller, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white12),
      ),
      child: TextField(
        controller: controller,
        onChanged: onChanged,
        style: const TextStyle(color: Colors.white),
        decoration: const InputDecoration(
          hintText: 'Search teammates',
          hintStyle: TextStyle(color: Colors.white60),
          prefixIcon: Icon(Icons.search, color: Colors.white70),
          border: InputBorder.none,
          contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        ),
      ),
    );
  }
}

class _UserCard extends StatelessWidget {
  final String name;
  final String status;
  final bool isOnline;
  final String initials;
  final VoidCallback onTap;

  const _UserCard({
    required this.name,
    required this.status,
    required this.isOnline,
    required this.initials,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.05),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white10),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.35),
              blurRadius: 12,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: Row(
          children: [
            Stack(
              children: [
                CircleAvatar(
                  radius: 26,
                  backgroundColor: isOnline
                      ? const Color(0xFF16A34A)
                      : const Color(0xFF334155),
                  child: Text(
                    initials,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                Positioned(
                  right: 0,
                  bottom: 0,
                  child: Container(
                    height: 12,
                    width: 12,
                    decoration: BoxDecoration(
                      color: isOnline ? const Color(0xFF22C55E) : Colors.grey,
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: const Color(0xFF0F172A),
                        width: 2,
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                      fontSize: 16,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    status,
                    style: TextStyle(
                      color: isOnline
                          ? const Color(0xFF22C55E)
                          : Colors.white70,
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Tap to start a secure chat',
                    style: TextStyle(color: Colors.white60, fontSize: 12),
                  ),
                ],
              ),
            ),
            const Icon(
              Icons.keyboard_arrow_right_rounded,
              color: Colors.white70,
            ),
          ],
        ),
      ),
    );
  }
}
