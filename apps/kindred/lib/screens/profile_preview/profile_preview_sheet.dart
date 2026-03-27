import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:ui_kit/ui_kit.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:core/core.dart';
import '../../services/kindred_api.dart';
import '../../providers/kin_provider.dart';

class ProfilePreviewSheet extends StatefulWidget {
  final String userId;

  const ProfilePreviewSheet({
    super.key,
    required this.userId,
  });

  @override
  State<ProfilePreviewSheet> createState() => _ProfilePreviewSheetState();
}

class _ProfilePreviewSheetState extends State<ProfilePreviewSheet> {
  Map<String, dynamic>? _profile;
  List<dynamic> _wishlistLinks = [];
  List<dynamic> _dates = [];
  bool _isLoading = true;
  String? _error;
  late KindredApi _api;

  @override
  void initState() {
    super.initState();
    _api = KindredApi(
      baseUrl: 'https://api.fromkindred.com',
      storage: SecureStorageService(),
    );
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    try {
      final response = await _api.getProfile(widget.userId);

      if (mounted) {
        setState(() {
          _profile = response['profile'];
          _wishlistLinks = response['wishlist_links'] ?? [];
          _dates = response['dates'] ?? [];
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
      person.linkedProfileId == _profile!['id']
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

        // Birthday
        if (_profile!['birthday'] != null) ...[
          Center(
            child: Text(
              'Birthday — ${_formatDate(DateTime.parse(_profile!['birthday']))}',
              style: AppTheme.text.body,
            ),
          ),
          SizedBox(height: AppTheme.spacing.space3),
        ],

        // Wishlist links
        if (_wishlistLinks.isNotEmpty) ...[
          Text(
            'Wishlist',
            style: AppTheme.text.label.copyWith(
              color: AppTheme.colors.secondaryText,
            ),
          ),
          SizedBox(height: AppTheme.spacing.space1),
          ..._wishlistLinks.map((link) {
            return GestureDetector(
              onTap: () async {
                final uri = Uri.tryParse(link['url']);
                if (uri != null) {
                  await launchUrl(uri, mode: LaunchMode.externalApplication);
                }
              },
              child: Padding(
                padding: EdgeInsets.only(bottom: AppTheme.spacing.space2),
                child: Text(
                  link['label'],
                  style: AppTheme.text.body.copyWith(
                    color: AppTheme.colors.accent,
                    decoration: TextDecoration.underline,
                  ),
                ),
              ),
            );
          }),
          SizedBox(height: AppTheme.spacing.space3),
        ],

        // Shared dates
        if (_dates.isNotEmpty) ...[
          Text(
            'Important dates',
            style: AppTheme.text.label.copyWith(
              color: AppTheme.colors.secondaryText,
            ),
          ),
          SizedBox(height: AppTheme.spacing.space1),
          ..._dates.map((date) {
            final dateObj = DateTime.parse(date['date']);
            return Padding(
              padding: EdgeInsets.only(bottom: AppTheme.spacing.space2),
              child: Text(
                '${date['label']} — ${_formatDate(dateObj)}',
                style: AppTheme.text.body,
              ),
            );
          }),
          SizedBox(height: AppTheme.spacing.space3),
        ],

        const Spacer(),

        // Keep button or Already in Kin message
        if (isAlreadyInKin) ...[
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
                  await kinProvider.addKinLinked(_profile!['id']);

                  if (mounted) {
                    // Show success and close sheet
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('${_profile!['name']} added to your Kin'),
                        backgroundColor: Colors.green,
                      ),
                    );
                    Navigator.of(context).pop();
                  }
                } catch (e) {
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('Could not add to Kin: ${e.toString()}'),
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