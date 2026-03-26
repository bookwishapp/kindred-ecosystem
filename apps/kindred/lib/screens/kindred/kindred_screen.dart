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
import '../../services/profile_service.dart';
import '../../services/local_db.dart';
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

  @override
  void initState() {
    super.initState();
    _checkFirstLaunch();
    _loadNewsletterEmail();
  }

  @override
  void dispose() {
    _emailController.dispose();
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
                          onTap: () {
                            setState(() {
                              _emailUpdatesEnabled = !_emailUpdatesEnabled;
                            });
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
                                  onChanged: (value) {
                                    setState(() {
                                      _emailUpdatesEnabled = value;
                                    });
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
                                      await LocalDb.instance.setSetting(
                                        'newsletter_email',
                                        _emailController.text.trim(),
                                      );
                                      if (mounted) {
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          SnackBar(
                                            content: Text('Email saved'),
                                            backgroundColor: AppTheme.colors.accent,
                                            duration: Duration(seconds: 1),
                                          ),
                                        );
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
              centerTitle: false,
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
          ),
          // Settings dropdown overlay
          _buildSettingsDropdown(),
        ],
      ),
    );
  }
}