import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ThemeProvider extends ChangeNotifier {
  ThemeMode _themeMode = ThemeMode.system;

  ThemeMode get themeMode => _themeMode;

  ThemeProvider() {
    _loadTheme();
  }

  void _loadTheme() async {
    final prefs = await SharedPreferences.getInstance();
    final isDark = prefs.getBool('isDarkMode');
    
    if (isDark == null) {
      _themeMode = ThemeMode.system;
    } else {
      _themeMode = isDark ? ThemeMode.dark : ThemeMode.light;
    }
    notifyListeners();
  }

  void toggleTheme() async {
    final prefs = await SharedPreferences.getInstance();
    
    if (_themeMode == ThemeMode.light) {
      _themeMode = ThemeMode.dark;
      await prefs.setBool('isDarkMode', true);
    } else if (_themeMode == ThemeMode.dark) {
      _themeMode = ThemeMode.light;
      await prefs.setBool('isDarkMode', false);
    } else {
      // If it's system, toggle to explicitly opposite of current brightness
      // For simplicity, we'll just toggle to dark mode here
      _themeMode = ThemeMode.dark;
      await prefs.setBool('isDarkMode', true);
    }
    
    notifyListeners();
  }

  void setSystemTheme() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('isDarkMode');
    _themeMode = ThemeMode.system;
    notifyListeners();
  }
}
