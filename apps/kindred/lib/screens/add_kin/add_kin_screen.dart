import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:ui_kit/ui_kit.dart';

class AddKinScreen extends StatelessWidget {
  const AddKinScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.colors.warmWhite,
      appBar: AppBar(
        centerTitle: true,
        automaticallyImplyLeading: true,
        backgroundColor: AppTheme.colors.warmWhite,
        elevation: 0,
        iconTheme: IconThemeData(color: AppTheme.colors.warmBlack),
      ),
      body: Padding(
        padding: EdgeInsets.all(AppTheme.spacing.screenPadding),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Spacer(),
            CupertinoButton(
              onPressed: () {
                // TODO: Implement manual add flow
              },
              color: AppTheme.colors.accent,
              padding: EdgeInsets.symmetric(vertical: AppTheme.spacing.space2),
              child: Text(
                'Keep someone',
                style: AppTheme.text.button.copyWith(
                  color: AppTheme.colors.warmWhite,
                ),
              ),
            ),
            const Spacer(),
          ],
        ),
      ),
    );
  }
}
