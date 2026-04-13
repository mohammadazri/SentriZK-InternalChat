import 'package:isar/isar.dart';

part 'local_message.g.dart';

@Collection()
class LocalMessage {
  Id id = Isar.autoIncrement;
  late String content;
  late String senderId;
  late String receiverId;
  late DateTime timestamp;
  String? attachmentUrl;
  String status = 'sent';
  double? threatScore;

  @Index(unique: false)
  String? firebaseId;

  /// True when the local user chose "Delete for Me" — hidden only on this device.
  bool deletedForMe = false;

  /// True when the sender chose "Delete for Everyone" — shows a tombstone on both sides.
  bool deletedForEveryone = false;
}
