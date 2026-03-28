import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:ui_kit/ui_kit.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:core/core.dart';
import '../../services/auth_api.dart';
import '../../services/auth_service.dart';
import '../../providers/kin_provider.dart';

class ProfilePreviewSheet extends StatefulWidget {
  final String username;

  const ProfilePreviewSheet({
    super.key,
    required this.username,
  });

  @override
  State<ProfilePreviewSheet> createState() => _ProfilePreviewSheetState();
}

class _ProfilePreviewSheetState extends State<ProfilePreviewSheet> {
  Map<String, dynamic>? _profile;
  bool _isLoading = true;
  String? _error;
  late AuthApi _api;
  late AuthService _authService;

  @override
  void initState() {
    super.initState();
    final storage = SecureStorageService();
    _authService = AuthService(storage: storage);
    _api = AuthApi(
      baseUrl: 'https://auth.terryheath.com',
      storage: storage,
    );
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    try {
      final response = await _api.getPublicProfile(widget.username);

      if (mounted) {
        setState(() {
          _profile = response['profile'];
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Could not load profile';
          _isLoading = false;
        });
      }
    }
  }

  String _formatDate(DateTime date) {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return '${months[date.month - 1]} ${date.day}';
  }

  bool _isAlreadyInKin(KinProvider kinProvider) {
    if (_profile == null) return false;

    // Check if any person in kin has this linkedProfileId
    return kinProvider.kin.any((person) =>
      person.linkedProfileId == _profile!['user_id']
    );
  }

  Widget _buildAvatar({String? photoUrl, String? name}) {
    return Container(
      width: 80,
      height: 80,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: AppTheme.colors.surface,
      ),
      child: ClipOval(
        child: photoUrl != null
            ? CachedNetworkImage(
                imageUrl: photoUrl,
                fit: BoxFit.cover,
              )
            : Center(
                child: Text(
                  name?.isNotEmpty == true ? name![0].toUpperCase() : '?',
                  style: AppTheme.text.heading.copyWith(
                    color: AppTheme.colors.secondaryText,
                  ),
                ),
              ),
      ),
    );
  }

  Widget _buildContent(KinProvider kinProvider) {
    if (_isLoading) {
      return Center(
        child: CupertinoActivityIndicator(
          color: AppTheme.colors.secondaryText,
        ),
      );
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              _error!,
              style: AppTheme.text.body.copyWith(
                color: AppTheme.colors.secondaryText,
              ),
            ),
            SizedBox(height: AppTheme.spacing.space3),
            CupertinoButton(
              onPressed: () => Navigator.of(context).pop(),
              child: Text(
                'Close',
                style: AppTheme.text.button.copyWith(
                  color: AppTheme.colors.accent,
                ),
              ),
            ),
          ],
        ),
      );
    }

    if (_profile == null) {
      return Center(
        child: Text(
          'Profile not found',
          style: AppTheme.text.body.copyWith(
            color: AppTheme.colors.secondaryText,
          ),
        ),
      );
    }

    final isAlreadyInKin = _isAlreadyInKin(kinProvider);
    final isAuthenticated = _authService.isAuthenticated;
    final wishlistLinks = _profile!['wishlist_links'] ?? [];
    final sharedDates = _profile!['shared_dates'] ?? [];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Avatar
        Center(
          child: _buildAvatar(
            photoUrl: _profile!['photo_url'],
            name: _profile!['name'],
          ),
        ),
        SizedBox(height: AppTheme.spacing.space3),

        // Name
        Center(
          child: Text(
            _profile!['name'] ?? 'Unknown',
            style: AppTheme.text.headingLarge,
          ),
        ),
        SizedBox(height: AppTheme.spacing.space2),

        // Birthday (month/day only, no year)
        if (_profile!['birthday'] != null) ...[
          Center(
            child: Text(
              _formatDate(DateTime.parse(_profile!['birthday'])),
              style: AppTheme.text.body.copyWith(
                color: AppTheme.colors.secondaryText,
              ),
            ),
          ),
          SizedBox(height: AppTheme.spacing.space3),
        ],

        // Wishlist links
        if (wishlistLinks.isNotEmpty) ...[
          Text(
            'Wishlist',
            style: AppTheme.text.label.copyWith(
              color: AppTheme.colors.secondaryText,
            ),
          ),
          SizedBox(height: AppTheme.spacing.space1),
          ...wishlistLinks.map((link) {
            return GestureDetector(
              onTap: () async {
                final uri = Uri.tryParse(link['url']);
                if (uri != null) {
                  await launchUrl(uri, mode: LaunchMode.externalApplication);
                }
              },
              child: Padding(
                padding: EdgeInsets.only(bottom: AppTheme.spacing.space2),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        link['label'],
                        style: AppTheme.text.body.copyWith(
                          color: AppTheme.colors.accent,
                          decoration: TextDecoration.underline,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          }),
          SizedBox(height: AppTheme.spacing.space2),
        ],

        // Shared dates
        if (sharedDates.isNotEmpty) ...[
          Text(
            'Important dates',
            style: AppTheme.text.label.copyWith(
              color: AppTheme.colors.secondaryText,
            ),
          ),
          SizedBox(height: AppTheme.spacing.space1),
          ...sharedDates.map((date) {
            final dateObj = DateTime.parse(date['date']);
            return Padding(
              padding: EdgeInsets.only(bottom: AppTheme.spacing.space1),
              child: Text(
                '${date['label']} — ${_formatDate(dateObj)}',
                style: AppTheme.text.body.copyWith(
                  color: AppTheme.colors.secondaryText,
                ),
              ),
            );
          }),
          SizedBox(height: AppTheme.spacing.space3),
        ],

        const Spacer(),

        // Keep button or status messages
        if (!isAuthenticated) ...[
          Center(
            child: Text(
              'Show Up to keep someone',
              style: AppTheme.text.body.copyWith(
                color: AppTheme.colors.tertiaryText,
              ),
            ),
          ),
        ] else if (isAlreadyInKin) ...[
          Center(
            child: Text(
              'Already in your Kin',
              style: AppTheme.text.body.copyWith(
                color: AppTheme.colors.tertiaryText,
              ),
            ),
          ),
        ] else ...[
          SizedBox(
            width: double.infinity,
            child: CupertinoButton(
              color: AppTheme.colors.accent,
              onPressed: () async {
                try {
                  await kinProvider.addKinLinked(_profile!['user_id']);

                  if (mounted) {
                    Navigator.of(context).pop();
                  }
                } catch (e) {
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('Could not keep this person right now'),
                        backgroundColor: Colors.red,
                      ),
                    );
                  }
                }
              },
              child: Text(
                'Keep',
                style: AppTheme.text.button.copyWith(
                  color: AppTheme.colors.warmWhite,
                ),
              ),
            ),
          ),
        ],

        SizedBox(height: AppTheme.spacing.space3),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final kinProvider = context.watch<KinProvider>();

    return DraggableScrollableSheet(
      initialChildSize: 0.8,
      maxChildSize: 0.95,
      minChildSize: 0.3,
      expand: false,
      builder: (context, scrollController) {
        return Container(
          decoration: BoxDecoration(
            color: AppTheme.colors.warmWhite,
            borderRadius: BorderRadius.vertical(
              top: Radius.circular(AppTheme.radius.bottomSheet),
            ),
          ),
          child: Column(
            children: [
              // Handle bar
              Center(
                child: Container(
                  margin: EdgeInsets.only(top: AppTheme.spacing.space1),
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppTheme.colors.border,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),

              // Content
              Expanded(
                child: Padding(
                  padding: EdgeInsets.symmetric(
                    horizontal: AppTheme.spacing.screenPadding,
                  ),
                  child: _buildContent(kinProvider),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}