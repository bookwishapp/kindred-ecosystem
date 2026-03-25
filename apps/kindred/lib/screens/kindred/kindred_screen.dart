import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:ui_kit/ui_kit.dart';
import '../kin/kin_sheet.dart';
import '../../providers/kin_provider.dart';
import '../../widgets/kindred_grid.dart';

class KindredScreen extends StatelessWidget {
  const KindredScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.colors.warmWhite,
      appBar: AppBar(
        centerTitle: true,
        backgroundColor: AppTheme.colors.warmWhite,
        elevation: 0,
        title: Text(
          'Kindred',
          style: AppTheme.text.heading,
        ),
      ),
      body: Consumer<KinProvider>(
        builder: (context, provider, _) {
          final kin = provider.kin;
          if (kin.isEmpty) {
            return Center(
              child: Text(
                'No one here yet.',
                style: AppTheme.text.body.copyWith(
                  color: AppTheme.colors.secondaryText,
                ),
              ),
            );
          }
          return KindredGrid(
            kin: kin,
            onAvatarTap: (person) {
              showModalBottomSheet(
                context: context,
                isScrollControlled: true,
                isDismissible: true,
                enableDrag: true,
                backgroundColor: Colors.transparent,
                barrierColor: Colors.black26,
                builder: (_) => KinSheet(person: person),
              );
            },
          );
        },
      ),
    );
  }
}