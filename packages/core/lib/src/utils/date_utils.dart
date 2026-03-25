/// Date utility functions for the Kindred ecosystem
class DateUtils {
  /// Format date as "January 1, 2026"
  static String formatDate(DateTime date) {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    return '${months[date.month - 1]} ${date.day}, ${date.year}';
  }

  /// Format date as "Jan 1"
  static String formatShortDate(DateTime date) {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    return '${months[date.month - 1]} ${date.day}';
  }

  /// Calculate days until next occurrence of date (accounting for annual recurrence)
  static int daysUntil(DateTime date) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);

    // Create the next occurrence of this date
    DateTime nextOccurrence;

    // If the date has no year component or is in the past, calculate next annual occurrence
    final thisYearDate = DateTime(now.year, date.month, date.day);

    if (thisYearDate.isBefore(today)) {
      // Date has passed this year, use next year
      nextOccurrence = DateTime(now.year + 1, date.month, date.day);
    } else {
      // Date is today or in the future this year
      nextOccurrence = thisYearDate;
    }

    return nextOccurrence.difference(today).inDays;
  }

  /// Check if date is upcoming within specified days
  static bool isUpcoming(DateTime date, {int withinDays = 30}) {
    final days = daysUntil(date);
    return days >= 0 && days <= withinDays;
  }
}