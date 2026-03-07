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
}
