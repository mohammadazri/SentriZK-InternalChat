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
  StreamSubscription<List<Map<String, dynamic>>>? _receiptSub;

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
        // 🔥 HIGH PERFORMANCE: No more 'markMessageSeen' middle-man updates. 
        // Updating to 'seen' just to delete it 1ms later causes Firebase to trigger Double Stream rebuilds.
        
        // 1. Save the locally decrypted plaintext securely
        await isar.writeTxn(() async {
          await isar.localMessages.put(
            LocalMessage()
              ..firebaseId = msg.id // 🔥 MUST save ID so we can send a read receipt later!
              ..content = msg.content
              ..senderId = msg.senderId
              ..receiverId = msg.receiverId
              ..timestamp = msg.timestamp
              ..attachmentUrl = msg.attachmentUrl
              ..status = 'delivered' // Saved locally as delivered initially
              ..threatScore = msg.threatScore,
          );
        });

        // 2. Fire a 2 grey ticks (delivered) receipt back to the sender
        await _chatService.sendReceipt(msg.senderId, msg.id, 'delivered');

        // 3. Delete from Firebase to preserve ephemeral privacy
        await _chatService.deleteMessageAfterLocalSave(
          widget.currentUserId,
          msg.id,
        );
      }
    });

    // Start listening globally for delivery/read receipts coming back to us
    _receiptSub = _chatService
        .listenForReceipts(widget.currentUserId)
        .listen((receipts) async {
      for (final receipt in receipts) {
        final messageId = receipt['messageId'] as String;
        final status = receipt['status'] as String;

        await isar.writeTxn(() async {
          // Find the exact message we sent that this receipt is responding to
          final localMessage = await isar.localMessages
              .filter()
              .firebaseIdEqualTo(messageId)
              .findFirst(); 

          if (localMessage != null) {
            // Only upgrade status (don't downgrade from read to delivered)
            if (localMessage.status == 'read') return;
            
            localMessage.status = status;
            await isar.localMessages.put(localMessage);
          }
        });

        // Delete the receipt node from Firebase completely. The sender has ingested it.
        await _chatService.deleteReceiptAfterLocalSave(widget.currentUserId, messageId);
      }
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _setOnlineStatus(false);
    _searchController.dispose();
    _globalMessageSub?.cancel();  // Stop background sync on exit
    _receiptSub?.cancel();
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
      backgroundColor: const Color(0xFF0B0F19), // Deep corporate navy
      body: StreamBuilder<QuerySnapshot>(
        stream: FirebaseFirestore.instance.collection('users').snapshots(),
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
            final name = (u['displayName'] ?? u['username'] ?? u['id'] ?? '')
                .toString()
                .toLowerCase();
            return name.contains(search);
          }).toList();

          return CustomScrollView(
            physics: const BouncingScrollPhysics(),
            slivers: [
              // Premium Sliver App Bar
              SliverAppBar(
                expandedHeight: 140.0,
                floating: true,
                pinned: true,
                backgroundColor: const Color(0xFF0F172A).withOpacity(0.95), // Slate 900 Frost
                elevation: 0,
                flexibleSpace: FlexibleSpaceBar(
                  titlePadding: const EdgeInsets.only(left: 20, bottom: 16),
                  title: Row(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      const Text(
                        'Messages',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                          fontSize: 22,
                          letterSpacing: -0.5,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFF2563EB).withOpacity(0.2), // Cobalt Blue
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFF2563EB).withOpacity(0.5)),
                        ),
                        child: Text(
                          '$onlineCount Online',
                          style: const TextStyle(
                            color: Color(0xFF60A5FA),
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                actions: [
                  IconButton(
                    tooltip: 'Logout',
                    icon: const Icon(Icons.logout_rounded, color: Colors.white70),
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
                  const SizedBox(width: 8),
                ],
                bottom: PreferredSize(
                  preferredSize: const Size.fromHeight(70),
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                    child: _SearchField(
                      controller: _searchController,
                      onChanged: (value) => setState(() => _searchQuery = value),
                    ),
                  ),
                ),
              ),

              // User List
              if (filtered.isEmpty)
                SliverFillRemaining(
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.inbox_outlined, size: 64, color: Colors.white.withOpacity(0.2)),
                        const SizedBox(height: 16),
                        const Text(
                          'No messages found',
                          style: TextStyle(color: Colors.white70, fontSize: 16),
                        ),
                      ],
                    ),
                  ),
                )
              else
                SliverPadding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, index) {
                        final user = filtered[index];
                        final isOnline = user['activityStatus'] == 'Online';
                        // Prioritize displayName, fallback to username
                        final displayName =
                            user['displayName'] ?? user['username'] ?? user['id'] ?? '';
                        final cryptoUsername = user['username'] ?? '';
                        
                        final initials = displayName.isNotEmpty
                            ? displayName
                                  .trim()
                                  .split(' ')
                                  .map((e) => e.isNotEmpty ? e[0] : '')
                                  .join()
                                  .toUpperCase()
                            : '?';

                        return _UserRow(
                          name: displayName,
                          username: cryptoUsername,
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
                      childCount: filtered.length,
                    ),
                  ),
                ),
            ],
          );
        },
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
      height: 46,
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B), // Slate 800
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
      ),
      child: TextField(
        controller: controller,
        onChanged: onChanged,
        style: const TextStyle(color: Colors.white, fontSize: 16),
        decoration: InputDecoration(
          hintText: 'Search teammates',
          hintStyle: TextStyle(color: Colors.white.withOpacity(0.5)),
          prefixIcon: Icon(Icons.search, color: Colors.white.withOpacity(0.5), size: 20),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        ),
      ),
    );
  }
}

class _UserRow extends StatelessWidget {
  final String name;
  final String username;
  final String status;
  final bool isOnline;
  final String initials;
  final VoidCallback onTap;

  const _UserRow({
    required this.name,
    required this.username,
    required this.status,
    required this.isOnline,
    required this.initials,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      splashColor: const Color(0xFF2563EB).withOpacity(0.1),
      highlightColor: Colors.transparent,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            Stack(
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: const LinearGradient(
                      colors: [Color(0xFF2563EB), Color(0xFF3B82F6)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    border: Border.all(color: Colors.white.withOpacity(0.1)),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    initials.length > 2 ? initials.substring(0, 2) : initials,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                      fontSize: 18,
                    ),
                  ),
                ),
                Positioned(
                  right: 0,
                  bottom: 0,
                  child: Container(
                    height: 14,
                    width: 14,
                    decoration: BoxDecoration(
                      color: isOnline ? const Color(0xFF10B981) : const Color(0xFF475569), // Emerald or Slate
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: const Color(0xFF0B0F19), // Match background color for cutout effect
                        width: 2.5,
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          name,
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w600,
                            fontSize: 16,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Text(
                        '12:45 PM', // Placeholder for dynamic timestamp integration later
                        style: TextStyle(
                          color: Colors.white.withOpacity(0.4),
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Icon(
                        Icons.shield_outlined,
                        size: 14,
                        color: Colors.white.withOpacity(0.3),
                      ),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          '@$username • Tap to chat',
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.5),
                            fontSize: 13,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
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
    );
  }
}
