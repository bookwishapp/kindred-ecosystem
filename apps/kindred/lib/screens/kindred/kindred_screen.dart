import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:ui_kit/ui_kit.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:dio/dio.dart';
import '../kin/kin_sheet.dart';
import '../show_up/show_up_sheet.dart';
import '../../providers/kin_provider.dart';
import '../../services/auth_service.dart';
import '../../services/profile_service.dart';
import '../../services/local_db.dart';
import '../../services/kindred_api.dart';
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
  final TextEditingController _emailController = TextEditingController();
  final Dio _dio = Dio();

  @override
  void initState() {
    super.initState();
    _checkFirstLaunch();
    _loadNewsletterEmail();
  }

  @override
  void dispose() {
    _emailController.dispose();
    _dio.close();
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

  Future<void> _loadNewsletterEmail() async {
    final email = await LocalDb.instance.getSetting('newsletter_email');
    if (email != null && mounted) {
      setState(() {
        _emailController.text = email;
        _emailUpdatesEnabled = true;
      });
    }
  }

  Future<bool> _subscribeToNewsletter(String email) async {
    try {
      final response = await _dio.post(
        'https://terryheath.com/api/subscribe',
        data: {
          'email': email.trim(),
          'source': 'kindred',
        },
        options: Options(
          headers: {'Content-Type': 'application/json'},
          validateStatus: (status) => status! < 500,
        ),
      );

      return response.statusCode == 200 && response.data['success'] == true;
    } catch (e) {
      debugPrint('Subscribe error: $e');
      return false;
    }
  }

  Future<bool> _unsubscribeFromNewsletter(String email) async {
    try {
      final response = await _dio.post(
        'https://terryheath.com/api/unsubscribe',
        data: {
          'email': email.trim(),
        },
        options: Options(
          headers: {'Content-Type': 'application/json'},
          validateStatus: (status) => status! < 500,
        ),
      );

      return response.statusCode == 200 && response.data['success'] == true;
    } catch (e) {
      debugPrint('Unsubscribe error: $e');
      return false;
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
    final kindredApi = KindredApi(
      baseUrl: 'https://api.fromkindred.com',
      storage: SecureStorageService(),
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
        // Delete profile from server
        await kindredApi.deleteProfile();

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
                        : authService.isAuthenticated ? 'Y' : '?',
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
                        child: Text(
                          'Show Up',
                          style: AppTheme.text.body,
                        ),
                      ),
                    ),
                    const Divider(height: 1),

                    // Email updates toggle with inline email field
                    Column(
                      children: [
                        InkWell(
                          onTap: () async {
                            final newValue = !_emailUpdatesEnabled;
                            setState(() {
                              _emailUpdatesEnabled = newValue;
                            });

                            // If toggling off and we have an email, unsubscribe
                            if (!newValue && _emailController.text.isNotEmpty) {
                              final success = await _unsubscribeFromNewsletter(_emailController.text);
                              if (success) {
                                // Clear local cache
                                await LocalDb.instance.removeSetting('newsletter_email');
                                if (mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: const Text('Unsubscribed from updates'),
                                      backgroundColor: AppTheme.colors.accent,
                                      duration: const Duration(seconds: 1),
                                    ),
                                  );
                                }
                              }
                            }
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
                                  onChanged: (value) async {
                                    setState(() {
                                      _emailUpdatesEnabled = value;
                                    });

                                    // If toggling off and we have an email, unsubscribe
                                    if (!value && _emailController.text.isNotEmpty) {
                                      final success = await _unsubscribeFromNewsletter(_emailController.text);
                                      if (success) {
                                        // Clear local cache
                                        await LocalDb.instance.removeSetting('newsletter_email');
                                        if (mounted) {
                                          ScaffoldMessenger.of(context).showSnackBar(
                                            SnackBar(
                                              content: const Text('Unsubscribed from updates'),
                                              backgroundColor: AppTheme.colors.accent,
                                              duration: const Duration(seconds: 1),
                                            ),
                                          );
                                        }
                                      }
                                    }
                                  },
                                ),
                              ],
                            ),
                          ),
                        ),
                        if (_emailUpdatesEnabled)
                          Padding(
                            padding: EdgeInsets.symmetric(
                              horizontal: AppTheme.spacing.space2,
                              vertical: AppTheme.spacing.space1,
                            ),
                            child: Row(
                              children: [
                                Expanded(
                                  child: CupertinoTextField(
                                    controller: _emailController,
                                    placeholder: 'Enter email',
                                    placeholderStyle: AppTheme.text.caption.copyWith(
                                      color: AppTheme.colors.tertiaryText,
                                    ),
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 12,
                                      vertical: 8,
                                    ),
                                    decoration: BoxDecoration(
                                      color: AppTheme.colors.surface,
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                  ),
                                ),
                                SizedBox(width: AppTheme.spacing.space2),
                                CupertinoButton(
                                  padding: EdgeInsets.symmetric(
                                    horizontal: AppTheme.spacing.space2,
                                    vertical: AppTheme.spacing.space1,
                                  ),
                                  color: AppTheme.colors.accent,
                                  child: Text(
                                    'Save',
                                    style: AppTheme.text.caption.copyWith(
                                      color: AppTheme.colors.warmWhite,
                                    ),
                                  ),
                                  onPressed: () async {
                                    if (_emailController.text.isNotEmpty) {
                                      final email = _emailController.text.trim();

                                      // Call subscribe API
                                      final success = await _subscribeToNewsletter(email);

                                      if (success) {
                                        // Save to local cache for UI state
                                        await LocalDb.instance.setSetting(
                                          'newsletter_email',
                                          email,
                                        );

                                        if (mounted) {
                                          ScaffoldMessenger.of(context).showSnackBar(
                                            SnackBar(
                                              content: const Text('Subscribed to updates!'),
                                              backgroundColor: AppTheme.colors.accent,
                                              duration: const Duration(seconds: 2),
                                            ),
                                          );
                                        }
                                      } else {
                                        if (mounted) {
                                          ScaffoldMessenger.of(context).showSnackBar(
                                            const SnackBar(
                                              content: Text('Failed to subscribe. Please try again.'),
                                              backgroundColor: Colors.red,
                                              duration: Duration(seconds: 2),
                                            ),
                                          );
                                        }
                                      }
                                    }
                                  },
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                    const Divider(height: 1),

                    // Support
                    InkWell(
                      onTap: () async {
                        final uri = Uri(
                          scheme: 'mailto',
                          path: 'terry@terryheath.com',
                          queryParameters: {
                            'subject': 'Kindred Support',
                          },
                        );
                        await launchUrl(uri);
                      },
                      child: Padding(
                        padding: EdgeInsets.all(AppTheme.spacing.space2),
                        child: Text(
                          'Support',
                          style: AppTheme.text.body,
                        ),
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
                        child: Text(
                          'Settings',
                          style: AppTheme.text.body,
                        ),
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
                            await launchUrl(Uri.parse('https://fromkindred.com/privacy'));
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
                            await launchUrl(Uri.parse('https://fromkindred.com/terms'));
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
                  child: _buildAppBarAvatar(),
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
                      isScrollControlled: true,
                      isDismissible: true,
                      enableDrag: true,
                      backgroundColor: Colors.transparent,
                      barrierColor: Colors.black26,
                      builder: (_) => KinSheet(person: person),
                    );

                    if (result == 'delete' && mounted) {
                      context.read<KinProvider>().deleteLocalKin(person.id);
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