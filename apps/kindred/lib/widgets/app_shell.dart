import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:ui_kit/ui_kit.dart';

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

  void _showAddKinSheet(BuildContext context) {
    final notifier = context.read<BottomSheetVisibilityNotifier>();
    notifier.showBottomSheet();

    // For now, navigate to the Add Kin screen
    // In the future, this could be a bottom sheet with multiple options
    context.push('/add-kin');
    notifier.hideBottomSheet();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: child,
      bottomNavigationBar: _buildBottomNav(context),
    );
  }

  Widget _buildBottomNav(BuildContext context) {
    final currentRoute = GoRouterState.of(context).uri.path;

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
              // Kindred tab (home/grid)
              Expanded(
                child: _NavItem(
                  icon: CupertinoIcons.person_2_fill,
                  label: 'Kin',
                  isSelected: currentRoute == '/' || currentRoute.startsWith('/kin'),
                  onTap: () => context.go('/'),
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
                child: IconButton(
                  icon: Icon(
                    CupertinoIcons.add,
                    color: AppTheme.colors.fabIcon,
                    size: 28,
                  ),
                  onPressed: () => _showAddKinSheet(context),
                ),
              ),
              // Show Up tab (your profile)
              Expanded(
                child: _NavItem(
                  icon: CupertinoIcons.person_fill,
                  label: 'You',
                  isSelected: currentRoute.startsWith('/show-up'),
                  onTap: () => context.go('/show-up'),
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