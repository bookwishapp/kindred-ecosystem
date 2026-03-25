import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// AnalogList Design System
///
/// Warm, collector-focused aesthetic inspired by record shops and used bookstores
class AppTheme {
  static const colors = AppColors._();
  static const text = AppTextStyles._();
  static const spacing = AppSpacing._();
  static const radius = AppRadius._();

  /// Light theme (default)
  static ThemeData get theme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: ColorScheme.fromSeed(
        seedColor: colors.warmAccent,
        brightness: Brightness.light,
        surface: colors.surface,
        primary: colors.warmAccent,
        secondary: colors.secondary,
        error: colors.error,
      ),
      scaffoldBackgroundColor: colors.warmWhite,
      appBarTheme: AppBarTheme(
        backgroundColor: colors.warmWhite,
        foregroundColor: colors.warmBlack,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: text.heading,
      ),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: colors.backgroundPrimary,
        selectedItemColor: colors.warmAccent,
        unselectedItemColor: colors.secondaryText,
        type: BottomNavigationBarType.fixed,
        elevation: 8,
      ),
      cardTheme: CardThemeData(
        color: colors.surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radius.md),
          side: BorderSide(
            color: colors.border,
            width: 1,
          ),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: colors.warmAccent,
          foregroundColor: colors.warmWhite,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(radius.sm),
          ),
          padding: EdgeInsets.symmetric(
            horizontal: spacing.space3,
            vertical: spacing.space2,
          ),
          textStyle: text.button,
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: colors.warmAccent,
          textStyle: text.button,
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: colors.surface,
        contentPadding: EdgeInsets.symmetric(
          horizontal: spacing.space2,
          vertical: spacing.space2,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radius.sm),
          borderSide: BorderSide(color: colors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radius.sm),
          borderSide: BorderSide(color: colors.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radius.sm),
          borderSide: BorderSide(color: colors.warmAccent, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radius.sm),
          borderSide: BorderSide(color: colors.error),
        ),
        labelStyle: text.label,
        hintStyle: text.caption.copyWith(color: colors.secondaryText),
      ),
    );
  }

  /// Dark theme (for future implementation)
  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: ColorScheme.fromSeed(
        seedColor: colors.warmAccent,
        brightness: Brightness.dark,
        surface: colors.darkSurface,
        primary: colors.warmAccent,
        secondary: colors.secondary,
        error: colors.error,
      ),
      scaffoldBackgroundColor: colors.darkBackground,
    );
  }
}

/// App color palette - turquoise and neutral aesthetic
class AppColors {
  const AppColors._();

  // Backgrounds
  final backgroundPrimary = const Color(0xFFF0EDE6);   // off-white
  final backgroundSecondary = const Color(0xFFFAFAF7); // card surface
  final backgroundTertiary = const Color(0xFFDDD8D0);  // borders

  // Text
  final textPrimary = const Color(0xFF141C1A);   // near-black
  final textSecondary = const Color(0xFF6A8A84); // muted
  final textHint = const Color(0xFF9ABAB4);      // inactive icons, hints

  // Accent
  final accent = const Color(0xFF2AB8A0);        // turquoise — primary accent
  final accentMuted = const Color(0xFFD0EAE6);   // turquoise tint for badges/fills
  final accentText = const Color(0xFF1A7A6A);    // turquoise text on accentMuted bg

  // UI
  final fabBackground = const Color(0xFF141C1A); // near-black FAB
  final fabIcon = const Color(0xFFF0EDE6);       // off-white FAB icon
  final border = const Color(0xFFDDD8D0);        // card borders
  final borderMuted = const Color(0xFFC8C4BC);   // dashed/inactive borders

  // Legacy color mappings for compatibility
  Color get warmBlack => textPrimary;
  Color get warmWhite => backgroundPrimary;
  Color get warmAccent => accent;
  Color get secondary => textSecondary;
  Color get surface => backgroundSecondary;
  Color get primaryText => textPrimary;
  Color get secondaryText => textSecondary;
  Color get tertiaryText => textHint;

  // Status colors
  final success = const Color(0xFF4A7358);         // Forest green
  final error = const Color(0xFFB44C43);           // Muted red
  final warning = const Color(0xFFD4A574);         // Warm yellow
  final info = const Color(0xFF5B7C99);            // Dusty blue

  // Dark mode colors (for future)
  final darkBackground = const Color(0xFF0F0D0A);  // Rich black
  final darkSurface = const Color(0xFF1A1611);     // Elevated surface
}

/// Typography system using editorial fonts
class AppTextStyles {
  const AppTextStyles._();

  // Display font for headings - clean sans-serif
  static final _displayFont = GoogleFonts.inter();

  // Body font - clean and readable
  static final _bodyFont = GoogleFonts.inter();

  // Display styles (using Inter)
  TextStyle get displayLarge => _displayFont.copyWith(
    fontSize: 22,
    fontWeight: FontWeight.w500,
    height: 1.2,
    color: const Color(0xFF141C1A),
  );

  TextStyle get displayMedium => _displayFont.copyWith(
    fontSize: 28,
    fontWeight: FontWeight.w600,
    height: 1.25,
    color: AppTheme.colors.warmBlack,
  );

  TextStyle get displaySmall => _displayFont.copyWith(
    fontSize: 24,
    fontWeight: FontWeight.w600,
    height: 1.3,
    color: AppTheme.colors.warmBlack,
  );

  // Heading styles (using Playfair Display)
  TextStyle get headingLarge => _displayFont.copyWith(
    fontSize: 22,
    fontWeight: FontWeight.w600,
    height: 1.35,
    color: AppTheme.colors.warmBlack,
  );

  TextStyle get heading => _displayFont.copyWith(
    fontSize: 20,
    fontWeight: FontWeight.w600,
    height: 1.4,
    color: AppTheme.colors.warmBlack,
  );

  TextStyle get headingSmall => _displayFont.copyWith(
    fontSize: 18,
    fontWeight: FontWeight.w500,
    height: 1.4,
    color: AppTheme.colors.warmBlack,
  );

  // Body styles (using Inter)
  TextStyle get bodyLarge => _bodyFont.copyWith(
    fontSize: 16,
    fontWeight: FontWeight.w400,
    height: 1.5,
    color: AppTheme.colors.primaryText,
  );

  TextStyle get body => _bodyFont.copyWith(
    fontSize: 14,
    fontWeight: FontWeight.w400,
    height: 1.5,
    color: AppTheme.colors.primaryText,
  );

  TextStyle get bodySmall => _bodyFont.copyWith(
    fontSize: 13,
    fontWeight: FontWeight.w400,
    height: 1.45,
    color: AppTheme.colors.primaryText,
  );

  // UI text styles
  TextStyle get label => _bodyFont.copyWith(
    fontSize: 14,
    fontWeight: FontWeight.w500,
    height: 1.4,
    letterSpacing: 0.1,
    color: AppTheme.colors.primaryText,
  );

  TextStyle get labelSmall => _bodyFont.copyWith(
    fontSize: 12,
    fontWeight: FontWeight.w500,
    height: 1.4,
    letterSpacing: 0.1,
    color: AppTheme.colors.primaryText,
  );

  TextStyle get button => _bodyFont.copyWith(
    fontSize: 14,
    fontWeight: FontWeight.w600,
    height: 1.4,
    letterSpacing: 0.5,
    color: AppTheme.colors.primaryText,
  );

  TextStyle get caption => _bodyFont.copyWith(
    fontSize: 12,
    fontWeight: FontWeight.w400,
    height: 1.35,
    color: AppTheme.colors.secondaryText,
  );

  // Special styles for item metadata
  TextStyle get itemTitle => _bodyFont.copyWith(
    fontSize: 15,
    fontWeight: FontWeight.w500,
    height: 1.4,
    color: AppTheme.colors.primaryText,
  );

  TextStyle get itemCreator => _bodyFont.copyWith(
    fontSize: 13,
    fontWeight: FontWeight.w400,
    height: 1.4,
    color: AppTheme.colors.secondaryText,
  );

  TextStyle get itemMetadata => _bodyFont.copyWith(
    fontSize: 12,
    fontWeight: FontWeight.w400,
    height: 1.35,
    color: AppTheme.colors.tertiaryText,
  );

  // New consistent text styles from UI spec
  TextStyle get titleMedium => _bodyFont.copyWith(
    fontSize: 16,
    fontWeight: FontWeight.w500,
    color: const Color(0xFF141C1A),
  );
}

/// Spacing system based on 8px grid
class AppSpacing {
  const AppSpacing._();

  final double space1 = 8.0;   // xs
  final double space2 = 16.0;  // sm
  final double space3 = 24.0;  // md
  final double space4 = 32.0;  // lg
  final double space5 = 40.0;  // xl
  final double space6 = 48.0;  // xxl
  final double space8 = 64.0;  // xxxl

  // Specific spacing
  final double cardPadding = 16.0;
  final double screenPadding = 16.0;
  final double listItemSpacing = 12.0;
}

/// Border radius values
class AppRadius {
  const AppRadius._();

  final double xs = 4.0;
  final double sm = 8.0;
  final double md = 12.0;
  final double lg = 16.0;
  final double xl = 24.0;
  final double full = 40.0;

  // Specific radii
  final double card = 12.0;
  final double button = 8.0;
  final double input = 8.0;
  final double bottomSheet = 24.0;
}