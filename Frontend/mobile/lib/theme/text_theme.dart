import 'package:flutter/material.dart';

class CustomTextTheme {
  // Base font family for a professional look (consider 'Roboto' or similar system font for consistency)
  static const String _fontFamily = 'Roboto'; // Assuming 'Roboto' is available or set as default

  // --- Display and Headline Styles (Larger, higher emphasis text) ---

  // For very large titles, such as screen headers or main app title
  final headlineLarge = const TextStyle(
    fontSize: 28,
    fontWeight: FontWeight.w700, // Bold for high impact
    fontFamily: _fontFamily,
  );

  // For secondary headings or main content titles
  final headlineMedium = const TextStyle(
    fontSize: 24,
    fontWeight: FontWeight.w600, // Semi-bold
    fontFamily: _fontFamily,
  );

  // --- Title and Subtitle Styles (Medium emphasis, commonly used in lists/cards) ---

  // Your original titleLarge - now titleMedium for standard card/list titles
  final titleLarge = const TextStyle(
    fontSize: 20, // Clean, prominent title
    fontWeight: FontWeight.w500, // Medium weight for good readability
    fontFamily: _fontFamily,
  );

  // Your original titleMedium - now titleSmall for secondary titles
  final titleSmall = const TextStyle(
    fontSize: 18,
    fontWeight: FontWeight.w500,
    fontFamily: _fontFamily,
  );

  // For prominent metadata or labels, like timestamps or status indicators
  final labelLarge = const TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w600, // Bold for emphasis on labels
    fontFamily: _fontFamily,
    letterSpacing: 0.5, // Subtle spacing for better label distinction
  );

  // --- Body Styles (Standard content text) ---

  // Your original bodyText1 - now bodyLarge for primary paragraph text
  final bodyLarge = const TextStyle(
    fontSize: 16,
    fontWeight: FontWeight.w400, // Regular weight
    fontFamily: _fontFamily,
    height: 1.4, // Good line height for readability
  );

  // Your original bodyText2 - now bodyMedium for standard message/conversation text
  final bodyMedium = const TextStyle(
    fontSize: 15,
    fontWeight: FontWeight.w400,
    fontFamily: _fontFamily,
    height: 1.35,
  );

  // --- Small Text Styles (Hints, captions, metadata) ---

  // For smaller secondary text, like message previews or detailed metadata
  final bodySmall = const TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w400,
    fontFamily: _fontFamily,
  );

  // Your original caption - now labelSmall for smallest, lowest emphasis text
  final labelSmall = const TextStyle(
    fontSize: 12,
    fontWeight: FontWeight.w400,
    fontFamily: _fontFamily,
  );

  // --- Utility Styles ---

  // A dedicated style for bolding within other texts (can be merged with body styles)
  final bold = const TextStyle(
    fontWeight: FontWeight.w700, // Increased to w700 for better contrast
    fontFamily: _fontFamily,
  );

  // Style for links or action buttons
  final button = const TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w600, // Semi-bold for buttons
    fontFamily: _fontFamily,
  );
}

// NOTE: The original `subtitle1` and `subtitle2` names are deprecated in Flutter's modern Material 3 theme naming conventions (They are now generally replaced by `bodySmall` or `labelMedium`/`labelSmall`). I have modernized the names to reflect better Flutter practices while keeping the original size intentions.