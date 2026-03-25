import 'package:flutter/material.dart';
import 'package:ui_kit/ui_kit.dart';

class ShowUpScreen extends StatelessWidget {
  const ShowUpScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.colors.warmWhite,
      appBar: AppBar(
        centerTitle: true,
        automaticallyImplyLeading: false, // No back button for main tab
        title: Text(
          'Show Up',
          style: AppTheme.text.heading,
        ),
        backgroundColor: AppTheme.colors.warmWhite,
        elevation: 0,
      ),
      body: Center(
        child: Text(
          'Your Profile',
          style: AppTheme.text.headingLarge,
        ),
      ),
    );
  }
}