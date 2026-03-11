import 'package:intl/intl.dart';

class TimeUtils {
  static String formatChatTime(DateTime dateTime) {
    final now = DateTime.now();
    final localDateTime = dateTime.toLocal();
    final diff = now.difference(localDateTime);

    if (diff.inDays == 0 && now.day == localDateTime.day) {
      // Today
      return DateFormat.jm().format(localDateTime); // e.g., 12:30 PM
    } else if (diff.inDays == 1 || (diff.inDays == 0 && now.day != localDateTime.day)) {
      // Yesterday
      return 'Yesterday';
    } else if (diff.inDays < 7) {
      // Within last week
      return DateFormat('EEEE').format(localDateTime); // e.g., Monday
    } else {
      // Older
      return DateFormat('dd/MM/yy').format(localDateTime); // e.g., 25/03/24
    }
  }

  static String formatTimestamp(DateTime dateTime) {
    // For specific message details if needed
    return DateFormat('dd/MM/yyyy HH:mm').format(dateTime.toLocal());
  }
}
