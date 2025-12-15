import 'dart:ui';

class AppColorsDark {
  // Primary/Surface Colors (Professional, minimal dark mode)
  static const backgroundColor = Color.fromRGBO(18, 27, 34, 1); // Deep Slate Gray/Blue (Main background)
  static const appBarColor = Color.fromRGBO(33, 47, 60, 1);     // Darker Slate Gray (App bar/Surface)
  static const navigationBarColor = Color.fromRGBO(33, 47, 60, 1); // Same as AppBar for consistency
  static const dividerColor = Color.fromRGBO(40, 56, 70, 1);    // Subtle divider line
  static const statusBarColor = appBarColor;

  // Text Colors (High contrast for readability)
  static const textColor1 = Color.fromRGBO(245, 245, 245, 1); // Near White (Primary text)
  static const textColor2 = Color.fromRGBO(170, 179, 189, 1); // Light Gray (Secondary text/hints)

  // Interactive/Accent Colors (Trusty, professional accent)
  static const iconColor = Color.fromRGBO(170, 179, 189, 1);  // Light Gray (Unselected icons)
  static const indicatorColor = Color.fromRGBO(0, 168, 142, 1); // Teal Green (Primary accent/Indicator)
  static const selectedLabelColor = Color.fromRGBO(0, 168, 142, 1); // Teal Green (Selected state)
  static const unselectedLabelColor = Color.fromRGBO(100, 116, 131, 1); // Muted Gray

  // Message Bubbles (Clear distinction for incoming/outgoing)
  static const incomingMessageBubbleColor = Color.fromRGBO(33, 47, 60, 1); // Darker Slate Gray (Incoming)
  static const outgoingMessageBubbleColor = Color.fromRGBO(0, 94, 76, 1); // Dark Teal (Outgoing/Primary brand color)
  static const incomingEmbedColor = Color.fromRGBO(48, 62, 77, 1); // Slightly lighter than bubble
  static const outgoingEmbedColor = Color.fromRGBO(0, 107, 86, 1); // Slightly lighter than bubble

  // Utility/Status Colors
  static const errorSnackBarColor = Color.fromRGBO(220, 60, 90, 1); // Red (Error/Warning)
  static const blueColor = Color.fromRGBO(66, 162, 230, 1);  // Bright Blue (Link/Info)
  static const greenColor = Color.fromRGBO(37, 211, 102, 1); // Bright Green (Success/Online)
  static const yellowColor = Color.fromRGBO(255, 204, 0, 1); // Amber (Unread/Alert)
  static const greyColor = Color.fromRGBO(133, 148, 163, 1); // Neutral Gray
}

class AppColorsLight {
  // Primary/Surface Colors (Clean, bright light mode)
  static const backgroundColor = Color.fromRGBO(240, 242, 245, 1); // Very Light Gray/Off-White (Main background)
  static const appBarColor = Color.fromRGBO(0, 168, 142, 1);     // Teal Green (App bar/Primary brand)
  static const navigationBarColor = Color.fromRGBO(255, 255, 255, 1); // Pure White (Bottom Nav Bar)
  static const dividerColor = Color.fromRGBO(200, 200, 200, 1);  // Light Gray divider
  static const statusBarColor = appBarColor;

  // Text Colors (Dark contrast for readability)
  static const textColor1 = Color.fromRGBO(33, 33, 33, 1);   // Near Black (Primary text)
  static const textColor2 = Color.fromRGBO(100, 100, 100, 1); // Dark Gray (Secondary text/hints)

  // Interactive/Accent Colors (Consistent accent color)
  static const iconColor = Color.fromRGBO(255, 255, 255, 1); // White (Icons on the AppBar)
  static const indicatorColor = Color.fromRGBO(255, 255, 255, 1); // White (Indicator on AppBar)
  static const selectedLabelColor = Color.fromRGBO(255, 255, 255, 1); // White (Selected state)
  static const unselectedLabelColor = Color.fromRGBO(200, 240, 235, 1); // Very light Teal

  // Message Bubbles (Subtle, bright distinction)
  static const incomingMessageBubbleColor = Color.fromRGBO(255, 255, 255, 1); // Pure White (Incoming)
  static const outgoingMessageBubbleColor = Color.fromRGBO(220, 248, 198, 1); // Very Light Green/Off-White (Outgoing)
  static const incomingEmbedColor = Color.fromRGBO(235, 235, 235, 1); // Slightly darker than bubble
  static const outgoingEmbedColor = Color.fromRGBO(209, 234, 187, 1); // Slightly darker than bubble

  // Utility/Status Colors
  static const errorSnackBarColor = Color.fromRGBO(220, 60, 90, 1); // Red (Error/Warning)
  static const blueColor = Color.fromRGBO(66, 162, 230, 1);
  static const greenColor = Color.fromRGBO(37, 211, 102, 1);
  static const yellowColor = Color.fromRGBO(255, 204, 0, 1);
  static const greyColor = Color.fromRGBO(102, 117, 127, 1);
}

class ColorTheme {
  final Color iconColor;
  final Color textColor1;
  final Color textColor2;
  final Color appBarColor;
  final Color dividerColor;
  final Color backgroundColor;
  final Color errorSnackBarColor;
  final Color incomingMessageBubbleColor;
  final Color outgoingMessageBubbleColor;
  final Color incomingEmbedColor;
  final Color outgoingEmbedColor;
  final Color selectedLabelColor;
  final Color unselectedLabelColor;
  final Color indicatorColor;
  final Color statusBarColor;
  final Color navigationBarColor;

  final Color blueColor;
  final Color greenColor;
  final Color yellowColor;
  final Color greyColor;

  const ColorTheme({
    required this.iconColor,
    required this.textColor1,
    required this.textColor2,
    required this.appBarColor,
    required this.dividerColor,
    required this.backgroundColor,
    required this.errorSnackBarColor,
    required this.incomingMessageBubbleColor,
    required this.outgoingMessageBubbleColor,
    required this.incomingEmbedColor,
    required this.outgoingEmbedColor,
    required this.selectedLabelColor,
    required this.unselectedLabelColor,
    required this.indicatorColor,
    required this.statusBarColor,
    required this.navigationBarColor,
    required this.blueColor,
    required this.greenColor,
    required this.yellowColor,
    required this.greyColor,
  });

  factory ColorTheme.dark() => const ColorTheme(
        iconColor: AppColorsDark.iconColor,
        textColor1: AppColorsDark.textColor1,
        textColor2: AppColorsDark.textColor2,
        appBarColor: AppColorsDark.appBarColor,
        dividerColor: AppColorsDark.dividerColor,
        backgroundColor: AppColorsDark.backgroundColor,
        errorSnackBarColor: AppColorsDark.errorSnackBarColor,
        incomingMessageBubbleColor: AppColorsDark.incomingMessageBubbleColor,
        outgoingMessageBubbleColor: AppColorsDark.outgoingMessageBubbleColor,
        incomingEmbedColor: AppColorsDark.incomingEmbedColor,
        outgoingEmbedColor: AppColorsDark.outgoingEmbedColor,
        selectedLabelColor: AppColorsDark.selectedLabelColor,
        unselectedLabelColor: AppColorsDark.unselectedLabelColor,
        indicatorColor: AppColorsDark.indicatorColor,
        statusBarColor: AppColorsDark.statusBarColor,
        navigationBarColor: AppColorsDark.navigationBarColor,
        blueColor: AppColorsDark.blueColor,
        greenColor: AppColorsDark.greenColor,
        yellowColor: AppColorsDark.yellowColor,
        greyColor: AppColorsDark.greyColor,
      );

  factory ColorTheme.light() => const ColorTheme(
        iconColor: AppColorsLight.iconColor,
        textColor1: AppColorsLight.textColor1,
        textColor2: AppColorsLight.textColor2,
        appBarColor: AppColorsLight.appBarColor,
        dividerColor: AppColorsLight.dividerColor,
        backgroundColor: AppColorsLight.backgroundColor,
        errorSnackBarColor: AppColorsLight.errorSnackBarColor,
        incomingMessageBubbleColor: AppColorsLight.incomingMessageBubbleColor,
        outgoingMessageBubbleColor: AppColorsLight.outgoingMessageBubbleColor,
        incomingEmbedColor: AppColorsLight.incomingEmbedColor,
        outgoingEmbedColor: AppColorsLight.outgoingEmbedColor,
        selectedLabelColor: AppColorsLight.selectedLabelColor,
        unselectedLabelColor: AppColorsLight.unselectedLabelColor,
        indicatorColor: AppColorsLight.indicatorColor,
        statusBarColor: AppColorsLight.statusBarColor,
        navigationBarColor: AppColorsLight.navigationBarColor,
        blueColor: AppColorsLight.blueColor,
        greenColor: AppColorsLight.greenColor,
        yellowColor: AppColorsLight.yellowColor,
        greyColor: AppColorsLight.greyColor,
      );
}