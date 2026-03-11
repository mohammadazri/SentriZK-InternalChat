import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:provider/provider.dart';
import '../providers/theme_provider.dart';
import 'package:mobile/utils/time_utils.dart';
import 'chat_screen.dart';
import 'auth_screen.dart';
import 'settings_screen.dart';

import '../services/user_service.dart';
import '../services/auth_service.dart';
import '../services/chat_service.dart';
import '../services/call_service.dart';
import '../services/message_security_service.dart';
import '../models/local_message.dart';
import '../widgets/incoming_call_overlay.dart';
import 'dart:async';
import 'package:isar/isar.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:firebase_auth/firebase_auth.dart';

class UserListScreen extends StatefulWidget {
  final String currentUserId;
  const UserListScreen({super.key, required this.currentUserId});

  @override
  State<UserListScreen> createState() => _UserListScreenState();
}

class _UserListScreenState extends State<UserListScreen>
    with WidgetsBindingObserver {
  final UserService _userService = UserService();
  final AuthService _authService = AuthService();
  final ChatService _chatService = ChatService();
  Map<String, String> _drafts = {};
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();
  
  Isar? _isar;
  StreamSubscription? _globalMessageSub;
  StreamSubscription? _receiptSub;
  StreamSubscription? _localMessagesSub;
  Map<String, LocalMessage> _lastMessages = {};

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _setOnlineStatus(true);
    _initBackgroundSync();
    _loadDrafts();
    _initCallService();
  }

  void _initCallService() {
    final callService = CallService();
    callService.init(widget.currentUserId);

    callService.onIncomingCall = (callInfo) {
      if (!mounted) return;
      // Fetch the offer data from Firestore to pass to the overlay
      FirebaseFirestore.instance
          .collection('calls')
          .doc(callInfo.callId)
          .get()
          .then((doc) {
        if (doc.exists && mounted) {
          final offerData = doc.data()!['offer'] as Map<String, dynamic>;
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => IncomingCallOverlay(
                callInfo: callInfo,
                offerData: offerData,
              ),
            ),
          );
        }
      });
    };
  }

  Future<void> _loadDrafts() async {
    final prefs = await SharedPreferences.getInstance();
    final keys = prefs.getKeys();
    final newDrafts = <String, String>{};
    
    for (var key in keys) {
      if (key.startsWith('draft_${widget.currentUserId}_')) {
        final peerId = key.replaceAll('draft_${widget.currentUserId}_', '');
        final text = prefs.getString(key);
        if (text != null && text.isNotEmpty) {
          newDrafts[peerId] = text;
        }
      }
    }
    
    if (mounted) {
      setState(() {
        _drafts = newDrafts;
      });
    }
  }

  Future<void> _initBackgroundSync() async {
    final isar = await MessageSecurityService.getInstance();
    if (!mounted) return;
    _isar = isar;
    
    // Initial load of last messages
    await _updateLastMessages();

    // Listen to local changes to refresh the "Last Message" snippets
    _localMessagesSub = isar.localMessages.watchLazy().listen((_) {
      _updateLastMessages();
    });

    // Start listening globally for all incoming messages
    _globalMessageSub = _chatService
        .getAllIncomingMessages(widget.currentUserId)
        .listen((messages) async {
      // ... same processing logic ...
      for (final msg in messages) {
        await isar.writeTxn(() async {
          await isar.localMessages.put(
            LocalMessage()
              ..firebaseId = msg.id
              ..content = msg.content
              ..senderId = msg.senderId
              ..receiverId = msg.receiverId
              ..timestamp = msg.timestamp
              ..attachmentUrl = msg.attachmentUrl
              ..status = 'delivered'
              ..threatScore = msg.threatScore,
          );
        });
        await _chatService.sendReceipt(msg.senderId, msg.id, 'delivered');
        await _chatService.deleteMessageAfterLocalSave(
          widget.currentUserId,
          msg.id,
        );
      }
    }, onError: (e) {
      debugPrint('🔥 [SYNC] Global message listener error: $e');
    });

    // Start listening globally for delivery/read receipts
    _receiptSub = _chatService
        .listenForReceipts(widget.currentUserId)
        .listen((receipts) async {
      for (final receipt in receipts) {
        final messageId = receipt['messageId'] as String;
        final status = receipt['status'] as String;

        await isar.writeTxn(() async {
          final localMessage = await isar.localMessages
              .filter()
              .firebaseIdEqualTo(messageId)
              .findFirst(); 

          if (localMessage != null) {
            if (localMessage.status == 'read') return;
            localMessage.status = status;
            await isar.localMessages.put(localMessage);
          }
        });
        await _chatService.deleteReceiptAfterLocalSave(widget.currentUserId, messageId);
      }
    }, onError: (e) {
      debugPrint('🔥 [SYNC] Global receipt listener error: $e');
    });
  }

  Future<void> _updateLastMessages() async {
    if (_isar == null) return;
    
    final allMessages = await _isar!.localMessages.where().sortByTimestampDesc().findAll();
    final Map<String, LocalMessage> lastMsgs = {};
    
    for (var msg in allMessages) {
      final peerId = msg.senderId == widget.currentUserId ? msg.receiverId : msg.senderId;
      if (!lastMsgs.containsKey(peerId)) {
        lastMsgs[peerId] = msg;
      }
    }
    
    if (mounted) {
      setState(() {
        _lastMessages = lastMsgs;
      });
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _setOnlineStatus(false);
    _searchController.dispose();
    _globalMessageSub?.cancel();  // Stop background sync on exit
    _receiptSub?.cancel();
    _localMessagesSub?.cancel();
    CallService().dispose();
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
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: StreamBuilder<QuerySnapshot>(
        stream: FirebaseFirestore.instance.collection('users').snapshots(),
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            // If the user has intentionally signed out, don't flash an error screen while routing
            if (FirebaseAuth.instance.currentUser == null) {
              return const Center(child: CircularProgressIndicator());
            }

            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.lock_person, size: 48, color: Colors.orangeAccent),
                    const SizedBox(height: 16),
                    Text(
                      'Access Restricted: ${snapshot.error}',
                      style: TextStyle(color: Theme.of(context).colorScheme.onSurface.withOpacity(0.7)),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            );
          }
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

          // WhatsApp Style: Sort by last message timestamp (most recent first)
          filtered.sort((a, b) {
            final lastA = _lastMessages[a['id']]?.timestamp;
            final lastB = _lastMessages[b['id']]?.timestamp;
            if (lastA == null && lastB == null) return 0;
            if (lastA == null) return 1; // Put new/empty chats at bottom
            if (lastB == null) return -1;
            return lastB.compareTo(lastA);
          });

          return CustomScrollView(
            physics: const BouncingScrollPhysics(),
            slivers: [
              SliverAppBar(
                expandedHeight: 140.0,
                floating: true,
                pinned: true,
                backgroundColor: Theme.of(context).scaffoldBackgroundColor.withOpacity(0.95),
                elevation: 0,
                flexibleSpace: FlexibleSpaceBar(
                  titlePadding: const EdgeInsets.only(left: 20, bottom: 16),
                  title: Row(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      Text(
                        'Messages',
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.onSurface,
                          fontWeight: FontWeight.w700,
                          fontSize: 22,
                          letterSpacing: -0.5,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: Theme.of(context).colorScheme.primary.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: Theme.of(context).colorScheme.primary.withOpacity(0.3)),
                        ),
                        child: Text(
                          '$onlineCount Online',
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.primary,
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
                    icon: Icon(
                      Icons.settings_outlined,
                      color: Theme.of(context).colorScheme.onSurface.withOpacity(0.7),
                    ),
                    tooltip: 'Settings',
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => SettingsScreen(
                            currentUserId: widget.currentUserId,
                          ),
                        ),
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
                        Icon(Icons.inbox_outlined, size: 64, color: Theme.of(context).colorScheme.onSurface.withOpacity(0.2)),
                        const SizedBox(height: 16),
                        Text(
                          'No messages found',
                          style: TextStyle(color: Theme.of(context).colorScheme.onSurface.withOpacity(0.7), fontSize: 16),
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
                        final draftText = _drafts[user['id']];
                        final isTyping = user['typingTo'] == widget.currentUserId;

                        final lastMsg = _lastMessages[user['id']];
                        final timeString = lastMsg != null 
                            ? TimeUtils.formatChatTime(lastMsg.timestamp)
                            : '';
                        final snippet = isTyping 
                            ? 'typing...' 
                            : (draftText != null ? 'Draft: $draftText' : (lastMsg?.content ?? ''));

                        return _UserRow(
                          name: displayName,
                          username: cryptoUsername,
                          status: isOnline ? 'Online' : 'Offline',
                          isOnline: isOnline,
                          initials: initials,
                          draft: draftText,
                          isTyping: isTyping,
                          time: timeString,
                          lastMessage: snippet,
                          onTap: () async {
                            await Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => ChatScreen(
                                  username: widget.currentUserId,
                                  peerId: user['id'],
                                  peerName: displayName,
                                ),
                              ),
                            );
                            // Refresh drafts when returning from ChatScreen
                            _loadDrafts();
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
        color: Theme.of(context).colorScheme.surface, // Slate 800
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Theme.of(context).colorScheme.onSurface.withOpacity(0.05)),
      ),
      child: TextField(
        controller: controller,
        onChanged: onChanged,
        style: TextStyle(color: Theme.of(context).colorScheme.onSurface, fontSize: 16),
        decoration: InputDecoration(
          hintText: 'Search teammates',
          hintStyle: TextStyle(color: Theme.of(context).colorScheme.onSurface.withOpacity(0.5)),
          prefixIcon: Icon(Icons.search, color: Theme.of(context).colorScheme.onSurface.withOpacity(0.5), size: 20),
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
  final String? draft;
  final bool isTyping;
  final String time;
  final String lastMessage;
  final VoidCallback onTap;

  const _UserRow({
    required this.name,
    required this.username,
    required this.status,
    required this.isOnline,
    required this.initials,
    this.draft,
    this.isTyping = false,
    required this.time,
    required this.lastMessage,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      splashColor: Theme.of(context).colorScheme.primary.withOpacity(0.1),
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
                    border: Border.all(color: Theme.of(context).colorScheme.onSurface.withOpacity(0.1)),
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
                        color: Theme.of(context).scaffoldBackgroundColor, // Match background color for cutout effect
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
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          name,
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.onSurface,
                            fontWeight: FontWeight.w600,
                            fontSize: 16,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (time.isNotEmpty)
                        Text(
                          time,
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.onSurface.withOpacity(0.4),
                            fontSize: 12,
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          lastMessage,
                          style: TextStyle(
                            color: isTyping
                                ? const Color(0xFF10B981)
                                : (draft != null
                                    ? const Color(0xFFFACC15)
                                    : Theme.of(context).colorScheme.onSurface.withOpacity(0.5)),
                            fontSize: 14,
                            fontWeight: (isTyping || draft != null) ? FontWeight.w600 : FontWeight.normal,
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
