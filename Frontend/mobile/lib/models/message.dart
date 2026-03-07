import 'package:cloud_firestore/cloud_firestore.dart';

class Message {
  final String id;
  final String content;
  final String senderId;
  final String receiverId;
  final DateTime timestamp;
  final String? attachmentUrl;
  final String status;
  final double? threatScore;
  final int? signalType;

  Message({
    required this.id,
    required this.content,
    required this.senderId,
    required this.receiverId,
    required this.timestamp,
    this.attachmentUrl,
    this.status = 'sent',
    this.threatScore,
    this.signalType,
  });

  factory Message.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return Message(
      id: doc.id,
      content: data['content'] ?? '',
      senderId: data['senderId'] ?? '',
      receiverId: data['receiverId'] ?? '',
      timestamp: (data['timestamp'] as Timestamp).toDate(),
      attachmentUrl: data['attachmentUrl'],
      status: data['status'] ?? 'sent',
      threatScore: (data['threatScore'] as num?)?.toDouble(),
      signalType: data['signalType'],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'content': content,
      'senderId': senderId,
      'receiverId': receiverId,
      'timestamp': Timestamp.fromDate(timestamp),
      'attachmentUrl': attachmentUrl,
      'status': status,
      if (threatScore != null) 'threatScore': threatScore,
      if (signalType != null) 'signalType': signalType,
    };
  }
}
