import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:ui_kit/ui_kit.dart';
import '../screens/add_kin/add_kin_sheet.dart';
import '../screens/show_up/show_up_sheet.dart';

/// Notifier to track bottom sheet visibility
class BottomSheetVisibilityNotifier extends ChangeNotifier {
  bool _isBottomSheetVisible = false;

  bool get isBottomSheetVisible => _isBottomSheetVisible;

  void showBottomSheet() {
    _isBottomSheetVisible = true;
    notifyListeners();
  }

  void hideBottomSheet() {
    _isBottomSheetVisible = false;
    notifyListeners();
  }
}

/// AppShell provides the main app structure with bottom navigation
class AppShell extends StatelessWidget {
  final Widget child;

  const AppShell({
    super.key,
    required this.child,
  });

  void _dismissAllSheets(BuildContext context) {
    // Dismiss any open bottom sheets
    Navigator.of(context).popUntil((route) => route.isFirst);
  }

  void _showAddKinSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      isDismissible: true,
      enableDrag: true,
      backgroundColor: Colors.transparent,
      barrierColor: Colors.black26,
      builder: (_) => const AddKinSheet(),
    );
  }

  void _showShowUpSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      isDismissible: true,
      enableDrag: true,
      backgroundColor: Colors.transparent,
      barrierColor: Colors.black26,
      builder: (_) => const ShowUpSheet(),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: child,
      bottomNavigationBar: _buildBottomNav(context),
    );
  }

  Widget _buildBottomNav(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.colors.backgroundPrimary,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            offset: const Offset(0, -1),
            blurRadius: 4,
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              // Kin - dismisses sheets
              Expanded(
                child: _NavItem(
                  icon: CupertinoIcons.person_2,
                  label: 'Kin',
                  isSelected: true, // Always selected when on Kindred screen
                  onTap: () => _dismissAllSheets(context),
                ),
              ),
              // Add button
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: AppTheme.colors.fabBackground,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: CupertinoButton(
                  padding: EdgeInsets.zero,
                  onPressed: () => _showAddKinSheet(context),
                  child: Icon(
                    CupertinoIcons.plus,
                    color: AppTheme.colors.fabIcon,
                    size: 28,
                  ),
                ),
              ),
              // You - opens Show Up sheet
              Expanded(
                child: _NavItem(
                  icon: CupertinoIcons.person,
                  label: 'You',
                  isSelected: false,
                  onTap: () => _showShowUpSheet(context),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _NavItem({
    required this.icon,
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final color = isSelected
        ? AppTheme.colors.warmAccent
        : AppTheme.colors.secondaryText;

    return InkWell(
      onTap: onTap,
      child: Container(
        padding: EdgeInsets.symmetric(
          horizontal: AppTheme.spacing.space2,
          vertical: AppTheme.spacing.space1,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              color: color,
              size: 24,
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: AppTheme.text.labelSmall.copyWith(
                color: color,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}