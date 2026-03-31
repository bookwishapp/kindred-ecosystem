import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:ui_kit/ui_kit.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../kin/kin_sheet.dart';
import '../show_up/show_up_sheet.dart';
import '../../providers/kin_provider.dart';
import '../../services/auth_service.dart';
import '../../services/auth_api.dart';
import '../../services/profile_service.dart';
import '../../services/kindred_api.dart';
import '../../services/local_db.dart';
import 'package:core/core.dart';
import '../../widgets/kindred_grid.dart';

class KindredScreen extends StatefulWidget {
  const KindredScreen({super.key});

  @override
  State<KindredScreen> createState() => _KindredScreenState();
}

class _KindredScreenState extends State<KindredScreen> {
  bool _showSettingsDropdown = false;
  bool _isFirstLaunch = false;
  bool _emailUpdatesEnabled = false;

  @override
  void initState() {
    super.initState();
    _checkFirstLaunch();
  }

  @override
  void dispose() {
    super.dispose();
  }

  Future<void> _checkFirstLaunch() async {
    final isFirst = await LocalDb.instance.isFirstLaunch();
    if (mounted) {
      setState(() {
        _isFirstLaunch = isFirst;
      });
    }
  }

  Future<void> _loadEmailPreferences() async {
    try {
      final kindredApi = context.read<KindredApi>();
      final prefs = await kindredApi.getEmailPreferences();
      if (mounted) {
        setState(() {
          _emailUpdatesEnabled = prefs['subscribed'] ?? false;
        });
      }
    } catch (e) {
      debugPrint('Failed to load email preferences: $e');
      // Silently fail, keep toggle at false
    }
  }

  Future<void> _updateEmailPreferences(bool newValue) async {
    final previousValue = _emailUpdatesEnabled;
    setState(() {
      _emailUpdatesEnabled = newValue;
    });

    try {
      final kindredApi = context.read<KindredApi>();
      await kindredApi.updateEmailPreferences(subscribed: newValue);
    } catch (e) {
      debugPrint('Failed to update email preferences: $e');
      // Silently revert on failure
      if (mounted) {
        setState(() {
          _emailUpdatesEnabled = previousValue;
        });
      }
    }
  }

  void _onDropdownOpen() {
    final authService = context.read<AuthService>();
    if (authService.isAuthenticated) {
      _loadEmailPreferences();
    }
  }

  void _showShowUpSheet() {
    setState(() {
      _showSettingsDropdown = false;
    });

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

  Future<void> _handleDeleteAccount() async {
    // Get services before async gap
    final authService = context.read<AuthService>();
    final storage = SecureStorageService();
    final authApi = AuthApiFactory.create(
      storage: storage,
      tokenProvider: () async {
        // Try to get token from AuthService first (in memory)
        final token = authService.token;
        if (token != null) return token;

        // Fallback to loading from secure storage if not in memory yet
        return await storage.getAuthToken();
      },
    );

    final confirmed = await showCupertinoDialog<bool>(
      context: context,
      builder: (context) => CupertinoAlertDialog(
        title: const Text('Delete your account?'),
        content: const Text(
          'This removes your profile and cannot be undone. '
          'Your kin and notes stay on your device.',
        ),
        actions: [
          CupertinoDialogAction(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          CupertinoDialogAction(
            isDestructiveAction: true,
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        // Delete profile from auth server
        await authApi.deleteProfile();

        // Clear auth and log out
        await authService.logout();

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('Account deleted'),
              backgroundColor: AppTheme.colors.accent,
              duration: const Duration(seconds: 2),
            ),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Could not delete account right now'),
              backgroundColor: Colors.red,
              duration: Duration(seconds: 2),
            ),
          );
        }
      }
    }
  }

  Widget _buildAppBarAvatar() {
    final profileService = context.watch<ProfileService>();
    final authService = context.watch<AuthService>();

    return GestureDetector(
      onTap: () {
        setState(() {
          _showSettingsDropdown = !_showSettingsDropdown;
          if (_showSettingsDropdown) {
            _onDropdownOpen();
          }
        });
      },
      child: Container(
        width: 32,
        height: 32,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: AppTheme.colors.surface,
        ),
        child: ClipOval(
          child: profileService.photoUrl != null
              ? CachedNetworkImage(
                  imageUrl: profileService.photoUrl!,
                  fit: BoxFit.cover,
                )
              : Center(
                  child: Text(
                    profileService.name?.isNotEmpty == true
                        ? profileService.name![0].toUpperCase()
                        : authService.isAuthenticated
                        ? 'Y'
                        : '?',
                    style: AppTheme.text.caption.copyWith(
                      color: AppTheme.colors.accent,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
        ),
      ),
    );
  }

  Widget _buildSettingsDropdown() {
    final authService = context.watch<AuthService>();

    return Positioned(
      top: MediaQuery.of(context).padding.top + 56, // Below AppBar
      right: 16,
      child: AnimatedOpacity(
        opacity: _showSettingsDropdown ? 1.0 : 0.0,
        duration: const Duration(milliseconds: 200),
        child: _showSettingsDropdown
            ? Container(
                width: 200,
                decoration: BoxDecoration(
                  color: AppTheme.colors.warmWhite,
                  borderRadius: BorderRadius.circular(8),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.1),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Show Up
                    InkWell(
                      onTap: _showShowUpSheet,
                      child: Padding(
                        padding: EdgeInsets.all(AppTheme.spacing.space2),
                        child: Text('Show Up', style: AppTheme.text.body),
                      ),
                    ),
                    const Divider(height: 1),


                    // Email updates toggle (only when authenticated)
                    if (authService.isAuthenticated) ...[
                      InkWell(
                        onTap: () {
                          _updateEmailPreferences(!_emailUpdatesEnabled);
                        },
                        child: Padding(
                          padding: EdgeInsets.all(AppTheme.spacing.space2),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Email updates',
                                style: AppTheme.text.body,
                              ),
                              CupertinoSwitch(
                                value: _emailUpdatesEnabled,
                                activeTrackColor: AppTheme.colors.accent,
                                onChanged: _updateEmailPreferences,
                              ),
                            ],
                          ),
                        ),
                      ),
                      const Divider(height: 1),
                    ],

                    // Support
                    InkWell(
                      onTap: () async {
                        final uri = Uri(
                          scheme: 'mailto',
                          path: 'terry@terryheath.com',
                          queryParameters: {'subject': 'Kindred Support'},
                        );
                        await launchUrl(uri);
                      },
                      child: Padding(
                        padding: EdgeInsets.all(AppTheme.spacing.space2),
                        child: Text('Support', style: AppTheme.text.body),
                      ),
                    ),
                    const Divider(height: 1),

                    // Settings (opens iOS system settings)
                    InkWell(
                      onTap: () async {
                        setState(() {
                          _showSettingsDropdown = false;
                        });
                        await launchUrl(Uri.parse('app-settings:'));
                      },
                      child: Padding(
                        padding: EdgeInsets.all(AppTheme.spacing.space2),
                        child: Text('Settings', style: AppTheme.text.body),
                      ),
                    ),

                    // Legal links
                    const Divider(height: 1),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        InkWell(
                          onTap: () async {
                            setState(() {
                              _showSettingsDropdown = false;
                            });
                            await launchUrl(
                              Uri.parse('https://fromkindred.com/privacy'),
                            );
                          },
                          child: Padding(
                            padding: EdgeInsets.symmetric(
                              horizontal: AppTheme.spacing.space2,
                              vertical: AppTheme.spacing.space1,
                            ),
                            child: Text(
                              'Privacy',
                              style: AppTheme.text.caption.copyWith(
                                color: AppTheme.colors.tertiaryText,
                                fontSize: 11,
                              ),
                            ),
                          ),
                        ),
                        Text(
                          '·',
                          style: AppTheme.text.caption.copyWith(
                            color: AppTheme.colors.tertiaryText,
                            fontSize: 11,
                          ),
                        ),
                        InkWell(
                          onTap: () async {
                            setState(() {
                              _showSettingsDropdown = false;
                            });
                            await launchUrl(
                              Uri.parse('https://fromkindred.com/terms'),
                            );
                          },
                          child: Padding(
                            padding: EdgeInsets.symmetric(
                              horizontal: AppTheme.spacing.space2,
                              vertical: AppTheme.spacing.space1,
                            ),
                            child: Text(
                              'Terms',
                              style: AppTheme.text.caption.copyWith(
                                color: AppTheme.colors.tertiaryText,
                                fontSize: 11,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),

                    // Sign out (only if authenticated)
                    if (authService.isAuthenticated) ...[
                      const Divider(height: 1),
                      InkWell(
                        onTap: () {
                          setState(() {
                            _showSettingsDropdown = false;
                          });
                          authService.logout();
                        },
                        child: Padding(
                          padding: EdgeInsets.all(AppTheme.spacing.space2),
                          child: Text(
                            'Sign out',
                            style: AppTheme.text.caption.copyWith(
                              color: AppTheme.colors.tertiaryText,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ),
                      const Divider(height: 1),
                      InkWell(
                        onTap: () {
                          setState(() {
                            _showSettingsDropdown = false;
                          });
                          _handleDeleteAccount();
                        },
                        child: Padding(
                          padding: EdgeInsets.all(AppTheme.spacing.space2),
                          child: Text(
                            'Delete account',
                            style: AppTheme.text.caption.copyWith(
                              color: CupertinoColors.destructiveRed,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              )
            : const SizedBox.shrink(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final kinProvider = context.watch<KinProvider>();

    // Check if first kin has been added to mark as launched
    if (_isFirstLaunch && kinProvider.kin.isNotEmpty) {
      LocalDb.instance.markLaunched();
      _isFirstLaunch = false;
    }

    return GestureDetector(
      onTap: () {
        // Dismiss settings dropdown when tapping elsewhere
        if (_showSettingsDropdown) {
          setState(() {
            _showSettingsDropdown = false;
          });
        }
      },
      child: Stack(
        children: [
          Scaffold(
            backgroundColor: AppTheme.colors.warmWhite,
            appBar: AppBar(
              centerTitle: true,
              backgroundColor: AppTheme.colors.warmWhite,
              elevation: 0,
              title: SvgPicture.asset(
                'assets/kind.svg',
                height: 28,
                colorFilter: const ColorFilter.mode(
                  Color(0xFF141C1A),
                  BlendMode.srcIn,
                ),
              ),
              actions: [
                Padding(
                  padding: const EdgeInsets.only(right: 16),
                  child: Consumer<ProfileService>(
                    builder: (context, profileService, _) {
                      return _buildAppBarAvatar();
                    },
                  ),
                ),
              ],
            ),
            body: Consumer<KinProvider>(
              builder: (context, provider, _) {
                final kin = provider.kin;
                if (kin.isEmpty) {
                  return Center(
                    child: Text(
                      _isFirstLaunch
                          ? 'The people you keep close show up here.'
                          : 'No one here yet.',
                      style: AppTheme.text.body.copyWith(
                        color: AppTheme.colors.secondaryText,
                      ),
                    ),
                  );
                }
                return KindredGrid(
                  kin: kin,
                  onAvatarTap: (person) async {
                    final result = await showModalBottomSheet<String>(
                      context: context,
                      useRootNavigator: true,
                      isScrollControlled: true,
                      isDismissible: true,
                      enableDrag: true,
                      backgroundColor: Colors.transparent,
                      barrierColor: Colors.black26,
                      builder: (_) => KinSheet(person: person),
                    );

                    if (result == 'delete' && mounted) {
                      context.read<KinProvider>().deleteKin(person.id);
                    }
                  },
                );
              },
            ),
          ),
          // Settings dropdown overlay
          _buildSettingsDropdown(),
        ],
      ),
    );
  }
}
