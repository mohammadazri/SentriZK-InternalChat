import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:whatsapp_clone/theme/color_theme.dart';
import 'package:whatsapp_clone/theme/text_theme.dart';

// 1. CustomThemeData now uses factory constructors from ColorTheme
class CustomThemeData {
  final textTheme = CustomTextTheme();
  late final ColorTheme colorTheme;

  CustomThemeData.light() {
    colorTheme = ColorTheme.light();
  }

  CustomThemeData.dark() {
    colorTheme = ColorTheme.dark();
  }
}

// THEMES
final _customLightTheme = CustomThemeData.light();
final _customDarkTheme = CustomThemeData.dark();

final _lightTheme = ThemeData(
  // Use Material 3 conventions for a modern look
  useMaterial3: true,
  brightness: Brightness.light,
  // Define the core color scheme using the primary brand color
  colorScheme: ColorScheme.light(
    primary: _customLightTheme.colorTheme.appBarColor, // Teal Green
    secondary: _customLightTheme.colorTheme.greenColor, // Green Accent
    background: _customLightTheme.colorTheme.backgroundColor, // Off-White
    surface: Colors.white, // Use pure white for surfaces like Cards/Dialogs
    error: _customLightTheme.colorTheme.errorSnackBarColor,
  ),
  // Apply the custom text theme directly
  textTheme: TextTheme(
    titleLarge: _customLightTheme.textTheme.titleLarge.copyWith(
      color: _customLightTheme.colorTheme.textColor1,
    ),
    titleSmall: _customLightTheme.textTheme.titleSmall.copyWith(
      color: _customLightTheme.colorTheme.textColor1,
    ),
    bodyLarge: _customLightTheme.textTheme.bodyLarge.copyWith(
      color: _customLightTheme.colorTheme.textColor1,
    ),
    bodyMedium: _customLightTheme.textTheme.bodyMedium.copyWith(
      color: _customLightTheme.colorTheme.textColor1,
    ),
    labelLarge: _customLightTheme.textTheme.labelLarge.copyWith(
      color: _customLightTheme.colorTheme.textColor1,
    ),
    bodySmall: _customLightTheme.textTheme.bodySmall.copyWith(
      color: _customLightTheme.colorTheme.textColor2,
    ),
    labelSmall: _customLightTheme.textTheme.labelSmall.copyWith(
      color: _customLightTheme.colorTheme.textColor2,
    ),
  ),
  dialogTheme: DialogTheme(
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(8.0), // Slightly increased border radius
    ),
    backgroundColor: _customLightTheme.colorTheme.incomingMessageBubbleColor, // White surface
    titleTextStyle: _customLightTheme.textTheme.titleLarge.copyWith(
      color: _customLightTheme.colorTheme.textColor1,
    ),
    contentTextStyle: _customLightTheme.textTheme.bodyMedium.copyWith(
      color: _customLightTheme.colorTheme.textColor1,
    ),
  ),
  appBarTheme: AppBarTheme(
    elevation: 0.0,
    actionsIconTheme: IconThemeData(
      color: _customLightTheme.colorTheme.iconColor, // White icons on the green bar
    ),
    backgroundColor: _customLightTheme.colorTheme.appBarColor,
    systemOverlayStyle: SystemUiOverlayStyle(
      statusBarIconBrightness: Brightness.light, // White icons for dark background
      statusBarColor: _customLightTheme.colorTheme.appBarColor,
      systemNavigationBarColor: _customLightTheme.colorTheme.navigationBarColor,
      systemNavigationBarDividerColor: _customLightTheme.colorTheme.navigationBarColor,
    ),
    // Title style should also be set here for consistency
    titleTextStyle: _customLightTheme.textTheme.titleLarge.copyWith(
      color: Colors.white, // White text for the app bar
    ),
  ),
  floatingActionButtonTheme: FloatingActionButtonThemeData(
    backgroundColor: _customLightTheme.colorTheme.greenColor,
    foregroundColor: Colors.white,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(15.0), // Rounded corners for FAB
    ),
  ),
  scaffoldBackgroundColor: _customLightTheme.colorTheme.backgroundColor,
  iconTheme: IconThemeData(
    color: _customLightTheme.colorTheme.textColor2, // Default icon color for contrast
  ),
  progressIndicatorTheme: ProgressIndicatorThemeData(
    color: _customLightTheme.colorTheme.greenColor,
  ),
  dividerTheme: DividerThemeData(
    color: _customLightTheme.colorTheme.dividerColor, // Use the proper divider color
    thickness: 0.8, // Slightly thicker for visibility
  ),
  tabBarTheme: TabBarTheme(
    indicator: UnderlineTabIndicator(
      borderSide: BorderSide(
        color: _customLightTheme.colorTheme.indicatorColor,
        width: 3.0,
      ),
    ),
    indicatorSize: TabBarIndicatorSize.tab,
    labelColor: _customLightTheme.colorTheme.selectedLabelColor,
    unselectedLabelColor: _customLightTheme.colorTheme.unselectedLabelColor,
    dividerHeight: 0,
    labelStyle: _customLightTheme.textTheme.labelLarge,
    unselectedLabelStyle: _customLightTheme.textTheme.labelLarge,
  ),
);

final _darkTheme = ThemeData(
  // Use Material 3 conventions
  useMaterial3: true,
  brightness: Brightness.dark,
  // Define the core color scheme using the primary brand color
  colorScheme: ColorScheme.dark(
    primary: _customDarkTheme.colorTheme.appBarColor, // Dark Slate Gray/Blue
    secondary: _customDarkTheme.colorTheme.indicatorColor, // Teal Green Accent
    background: _customDarkTheme.colorTheme.backgroundColor, // Deep Slate Gray/Blue
    surface: _customDarkTheme.colorTheme.appBarColor, // Darker Slate Gray for surfaces
    error: _customDarkTheme.colorTheme.errorSnackBarColor,
  ),
  // Apply the custom text theme directly
  textTheme: TextTheme(
    titleLarge: _customDarkTheme.textTheme.titleLarge.copyWith(
      color: _customDarkTheme.colorTheme.textColor1,
    ),
    titleSmall: _customDarkTheme.textTheme.titleSmall.copyWith(
      color: _customDarkTheme.colorTheme.textColor1,
    ),
    bodyLarge: _customDarkTheme.textTheme.bodyLarge.copyWith(
      color: _customDarkTheme.colorTheme.textColor1,
    ),
    bodyMedium: _customDarkTheme.textTheme.bodyMedium.copyWith(
      color: _customDarkTheme.colorTheme.textColor1,
    ),
    labelLarge: _customDarkTheme.textTheme.labelLarge.copyWith(
      color: _customDarkTheme.colorTheme.textColor1,
    ),
    bodySmall: _customDarkTheme.textTheme.bodySmall.copyWith(
      color: _customDarkTheme.colorTheme.textColor2,
    ),
    labelSmall: _customDarkTheme.textTheme.labelSmall.copyWith(
      color: _customDarkTheme.colorTheme.textColor2,
    ),
  ),
  dialogTheme: DialogTheme(
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(8.0),
    ),
    backgroundColor: _customDarkTheme.colorTheme.appBarColor,
    titleTextStyle: _customDarkTheme.textTheme.titleLarge.copyWith(
      color: _customDarkTheme.colorTheme.textColor1,
    ),
    contentTextStyle: _customDarkTheme.textTheme.bodyMedium.copyWith(
      color: _customDarkTheme.colorTheme.textColor2,
    ),
  ),
  appBarTheme: AppBarTheme(
    elevation: 0.0,
    actionsIconTheme: IconThemeData(
      color: _customDarkTheme.colorTheme.iconColor,
    ),
    backgroundColor: _customDarkTheme.colorTheme.appBarColor,
    systemOverlayStyle: SystemUiOverlayStyle(
      statusBarIconBrightness: Brightness.light, // White icons for dark background
      statusBarColor: _customDarkTheme.colorTheme.appBarColor,
      systemNavigationBarColor: _customDarkTheme.colorTheme.navigationBarColor,
      systemNavigationBarDividerColor: _customDarkTheme.colorTheme.navigationBarColor,
    ),
    // Title style should also be set here for consistency
    titleTextStyle: _customDarkTheme.textTheme.titleLarge.copyWith(
      color: _customDarkTheme.colorTheme.textColor1,
    ),
  ),
  floatingActionButtonTheme: FloatingActionButtonThemeData(
    backgroundColor: _customDarkTheme.colorTheme.indicatorColor, // Use the accent color
    foregroundColor: Colors.white,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(15.0),
    ),
  ),
  scaffoldBackgroundColor: _customDarkTheme.colorTheme.backgroundColor,
  iconTheme: IconThemeData(
    color: _customDarkTheme.colorTheme.iconColor,
  ),
  progressIndicatorTheme: ProgressIndicatorThemeData(
    color: _customDarkTheme.colorTheme.greenColor,
  ),
  dividerTheme: DividerThemeData(
    color: _customDarkTheme.colorTheme.dividerColor,
    thickness: 0.8,
  ),
  tabBarTheme: TabBarTheme(
    indicator: UnderlineTabIndicator(
      borderSide: BorderSide(
        color: _customDarkTheme.colorTheme.indicatorColor,
        width: 3.0,
      ),
    ),
    indicatorSize: TabBarIndicatorSize.tab,
    labelColor: _customDarkTheme.colorTheme.selectedLabelColor,
    unselectedLabelColor: _customDarkTheme.colorTheme.unselectedLabelColor,
    dividerHeight: 0,
    labelStyle: _customDarkTheme.textTheme.labelLarge,
    unselectedLabelStyle: _customDarkTheme.textTheme.labelLarge,
  ),
);

// THEME PROVIDERS
final darkThemeProvider = Provider((ref) => _darkTheme);
final lightThemeProvider = Provider((ref) => _lightTheme);

// EXTENSION
extension CustomTheme on ThemeData {
  CustomThemeData get custom =>
      brightness == Brightness.dark ? _customDarkTheme : _customLightTheme;

  AssetImage themedImage(String name) {
    final path =
        brightness == Brightness.dark ? 'assets/images/dark' : 'assets/images';
    return AssetImage('$path/$name');
  }
}