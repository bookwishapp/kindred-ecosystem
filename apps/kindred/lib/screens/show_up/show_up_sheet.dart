import 'dart:io';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:ui_kit/ui_kit.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:dio/dio.dart';
import 'package:core/core.dart';
import '../../services/auth_service.dart';
import '../../services/profile_service.dart';
import '../../services/photo_service.dart';
import '../../services/photo_upload_service.dart';

class ShowUpSheet extends StatefulWidget {
  const ShowUpSheet({super.key});

  @override
  State<ShowUpSheet> createState() => _ShowUpSheetState();
}

class _ShowUpSheetState extends State<ShowUpSheet> {
  // Form controllers
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _linkLabelController = TextEditingController();
  final TextEditingController _linkUrlController = TextEditingController();
  final TextEditingController _dateLabelController = TextEditingController();

  // Form state
  DateTime? _selectedBirthday;
  String? _localPhotoPath;
  String? _uploadedPhotoUrl;
  bool _isAddingLink = false;
  bool _isEditingName = false;
  bool _isUploading = false;

  @override
  void dispose() {
    _emailController.dispose();
    _nameController.dispose();
    _linkLabelController.dispose();
    _linkUrlController.dispose();
    _dateLabelController.dispose();
    super.dispose();
  }

  String _formatDate(DateTime date) {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return '${months[date.month - 1]} ${date.day}';
  }

  Future<void> _pickPhoto() async {
    final path = await PhotoService.pickPhoto(context);
    if (path != null) {
      setState(() {
        _localPhotoPath = path;
        _uploadedPhotoUrl = null; // Reset uploaded URL when new photo is picked
      });

      // If we have an existing profile, upload and update immediately
      final profileService = context.read<ProfileService>();
      if (profileService.hasProfile) {
        await _updateProfilePhoto(profileService);
      }
    }
  }

  Future<void> _updateProfilePhoto(ProfileService profileService) async {
    try {
      final s3PhotoUrl = await _uploadPhotoIfNeeded();
      if (s3PhotoUrl != null) {
        await profileService.updateProfile({'photo_url': s3PhotoUrl});

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Photo updated successfully'),
              backgroundColor: Colors.green,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to update photo: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<String?> _uploadPhotoIfNeeded() async {
    // If we already uploaded this photo, return the URL
    if (_uploadedPhotoUrl != null) {
      return _uploadedPhotoUrl;
    }

    // If there's no local photo to upload, return null
    if (_localPhotoPath == null) {
      return null;
    }

    setState(() {
      _isUploading = true;
    });

    try {
      final dio = Dio();
      final storage = SecureStorageService();
      final baseUrl = const String.fromEnvironment(
        'KINDRED_API_URL',
        defaultValue: 'http://localhost:3001',
      );

      final photoUrl = await PhotoUploadService.upload(
        filePath: _localPhotoPath!,
        dio: dio,
        baseUrl: baseUrl,
        tokenProvider: storage.getAuthToken,
      );

      setState(() {
        _uploadedPhotoUrl = photoUrl;
        _isUploading = false;
      });

      return photoUrl;
    } catch (e) {
      debugPrint('Failed to upload photo: $e');
      setState(() {
        _isUploading = false;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to upload photo: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }

      return null;
    }
  }

  Widget _buildAvatar({String? photoUrl, String? name, double size = 80}) {
    return GestureDetector(
      onTap: _isUploading ? null : _pickPhoto,
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: AppTheme.colors.surface,
        ),
        child: ClipOval(
          child: _isUploading
              ? Center(
                  child: CupertinoActivityIndicator(
                    color: AppTheme.colors.secondaryText,
                  ),
                )
              : _localPhotoPath != null
                  ? Image.file(
                      File(_localPhotoPath!),
                      fit: BoxFit.cover,
                    )
                  : photoUrl != null
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
      ),
    );
  }

  Widget _buildUnauthenticatedState(AuthService authService) {
    if (authService.magicLinkSent) {
      return Column(
        children: [
          SizedBox(height: AppTheme.spacing.space6),
          Text(
            'Check your email.',
            style: AppTheme.text.body,
          ),
          SizedBox(height: AppTheme.spacing.space1),
          Text(
            'A link is on its way.',
            style: AppTheme.text.caption.copyWith(
              color: AppTheme.colors.tertiaryText,
            ),
          ),
        ],
      );
    }

    return Column(
      children: [
        _buildAvatar(name: 'You'),
        SizedBox(height: AppTheme.spacing.space4),

        Padding(
          padding: EdgeInsets.symmetric(horizontal: AppTheme.spacing.space4),
          child: Text(
            'This is what you share. What matters to you.\nThe days you keep.',
            style: AppTheme.text.body.copyWith(
              color: AppTheme.colors.secondaryText,
            ),
            textAlign: TextAlign.center,
          ),
        ),
        SizedBox(height: AppTheme.spacing.space3),

        Text(
          'When you Show Up, someone can keep you.',
          style: AppTheme.text.bodySmall.copyWith(
            color: AppTheme.colors.tertiaryText,
          ),
        ),
        SizedBox(height: AppTheme.spacing.space4),

        // Email field
        CupertinoTextField(
          controller: _emailController,
          keyboardType: TextInputType.emailAddress,
          style: AppTheme.text.body,
          placeholder: 'Email',
          placeholderStyle: AppTheme.text.body.copyWith(
            color: AppTheme.colors.tertiaryText,
          ),
          padding: EdgeInsets.symmetric(
            horizontal: AppTheme.spacing.space2,
            vertical: AppTheme.spacing.space2,
          ),
          decoration: BoxDecoration(
            color: AppTheme.colors.surface,
            borderRadius: BorderRadius.circular(AppTheme.radius.sm),
          ),
        ),
        SizedBox(height: AppTheme.spacing.space2),

        // Send link button
        SizedBox(
          width: double.infinity,
          child: CupertinoButton(
            color: AppTheme.colors.accent,
            onPressed: authService.isLoading ? null : () async {
              if (_emailController.text.isNotEmpty) {
                try {
                  await authService.requestMagicLink(_emailController.text.trim());
                  // Add setState after async call to ensure rebuild
                  if (mounted) {
                    setState(() {});
                  }
                } catch (e) {
                  if (mounted) {
                    setState(() {}); // Force rebuild on error too
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('Failed to send magic link: ${e.toString()}'),
                        backgroundColor: Colors.red,
                      ),
                    );
                  }
                }
              }
            },
            child: Text(
              'Send',
              style: AppTheme.text.button.copyWith(
                color: AppTheme.colors.warmWhite,
              ),
            ),
          ),
        ),
        SizedBox(height: AppTheme.spacing.space2),

        // Not now
        GestureDetector(
          onTap: () => Navigator.pop(context),
          child: Text(
            'Not now',
            style: AppTheme.text.caption.copyWith(
              color: AppTheme.colors.tertiaryText,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildProfileCreationState(ProfileService profileService) {
    return Column(
      children: [
        _buildAvatar(name: _nameController.text.isEmpty ? 'You' : _nameController.text),
        SizedBox(height: AppTheme.spacing.space3),

        // Name field
        CupertinoTextField(
          controller: _nameController,
          style: AppTheme.text.body,
          placeholder: 'Your name',
          placeholderStyle: AppTheme.text.body.copyWith(
            color: AppTheme.colors.tertiaryText,
          ),
          padding: EdgeInsets.symmetric(
            horizontal: AppTheme.spacing.space2,
            vertical: AppTheme.spacing.space2,
          ),
          decoration: null,
        ),
        SizedBox(height: AppTheme.spacing.space2),

        // Birthday picker
        GestureDetector(
          onTap: () {
            showCupertinoModalPopup(
              context: context,
              builder: (BuildContext context) => Container(
                height: 250,
                color: AppTheme.colors.warmWhite,
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        CupertinoButton(
                          child: Text('Cancel'),
                          onPressed: () => Navigator.pop(context),
                        ),
                        CupertinoButton(
                          child: Text('Done'),
                          onPressed: () {
                            Navigator.pop(context);
                          },
                        ),
                      ],
                    ),
                    Expanded(
                      child: CupertinoDatePicker(
                        mode: CupertinoDatePickerMode.date,
                        initialDateTime: _selectedBirthday ??
                            DateTime(DateTime.now().year - 30, 1, 1),
                        minimumDate: DateTime(1900),
                        maximumDate: DateTime.now(),
                        onDateTimeChanged: (DateTime newDate) {
                          setState(() {
                            _selectedBirthday = newDate;
                          });
                        },
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
          child: Container(
            padding: EdgeInsets.symmetric(
              horizontal: AppTheme.spacing.space2,
              vertical: AppTheme.spacing.space2,
            ),
            decoration: BoxDecoration(
              color: AppTheme.colors.surface,
              borderRadius: BorderRadius.circular(AppTheme.radius.sm),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  _selectedBirthday != null
                      ? 'Birthday — ${_formatDate(_selectedBirthday!)}'
                      : 'Birthday',
                  style: AppTheme.text.body.copyWith(
                    color: _selectedBirthday != null
                        ? AppTheme.colors.primaryText
                        : AppTheme.colors.tertiaryText,
                  ),
                ),
                Icon(
                  CupertinoIcons.calendar,
                  size: 20,
                  color: AppTheme.colors.tertiaryText,
                ),
              ],
            ),
          ),
        ),
        SizedBox(height: AppTheme.spacing.space2),

        // Add wishlist link
        GestureDetector(
          onTap: () {
            setState(() {
              _isAddingLink = true;
            });
          },
          child: Padding(
            padding: EdgeInsets.symmetric(vertical: AppTheme.spacing.space1),
            child: Text(
              '+ Add a wishlist link',
              style: AppTheme.text.body.copyWith(
                color: AppTheme.colors.accent,
              ),
            ),
          ),
        ),
        SizedBox(height: AppTheme.spacing.space4),

        // Show Up button
        SizedBox(
          width: double.infinity,
          child: CupertinoButton(
            color: AppTheme.colors.accent,
            onPressed: (_isUploading || profileService.loading || _nameController.text.isEmpty)
                ? null
                : () async {
                    try {
                      // Upload photo to S3 first if needed
                      final s3PhotoUrl = await _uploadPhotoIfNeeded();

                      // Create profile with S3 URL
                      await profileService.createProfile(
                        name: _nameController.text,
                        birthday: _selectedBirthday,
                        photoUrl: s3PhotoUrl,
                      );
                    } catch (e) {
                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('Failed to create profile: ${e.toString()}'),
                            backgroundColor: Colors.red,
                          ),
                        );
                      }
                    }
                  },
            child: _isUploading
                ? const CupertinoActivityIndicator(color: Colors.white)
                : Text(
                    'Show Up',
                    style: AppTheme.text.button.copyWith(
                      color: AppTheme.colors.warmWhite,
                    ),
                  ),
          ),
        ),
      ],
    );
  }

  Widget _buildExistingProfileState(ProfileService profileService) {
    final profile = profileService.profile!;
    final userId = context.read<AuthService>().accessToken; // Need user ID from auth

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Avatar
        Center(
          child: _buildAvatar(
            photoUrl: profile['photo_url'],
            name: profile['name'],
          ),
        ),
        SizedBox(height: AppTheme.spacing.space3),

        // Name (editable)
        Center(
          child: _isEditingName
              ? CupertinoTextField(
                  controller: _nameController,
                  autofocus: true,
                  textAlign: TextAlign.center,
                  style: AppTheme.text.headingLarge,
                  decoration: null,
                  padding: EdgeInsets.zero,
                  onSubmitted: (value) async {
                    if (value.isNotEmpty) {
                      await profileService.updateProfile({'name': value});
                    }
                    setState(() {
                      _isEditingName = false;
                    });
                  },
                )
              : GestureDetector(
                  onTap: () {
                    _nameController.text = profile['name'] ?? '';
                    setState(() {
                      _isEditingName = true;
                    });
                  },
                  child: Text(
                    profile['name'] ?? 'Your name',
                    style: AppTheme.text.headingLarge,
                  ),
                ),
        ),
        SizedBox(height: AppTheme.spacing.space2),

        // Birthday
        if (profileService.birthday != null) ...[
          Center(
            child: Text(
              'Birthday — ${_formatDate(profileService.birthday!)}',
              style: AppTheme.text.body,
            ),
          ),
          SizedBox(height: AppTheme.spacing.space3),
        ],

        // Wishlist links
        if (profileService.wishlistLinks.isNotEmpty) ...[
          ...profileService.wishlistLinks.map((link) {
            return Dismissible(
              key: Key(link['id']),
              onDismissed: (_) async {
                await profileService.removeWishlistLink(link['id']);
              },
              child: GestureDetector(
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
              ),
            );
          }),
        ],

        // Add wishlist link
        if (_isAddingLink) ...[
          CupertinoTextField(
            controller: _linkLabelController,
            autofocus: true,
            style: AppTheme.text.body,
            placeholder: 'Label',
            placeholderStyle: AppTheme.text.body.copyWith(
              color: AppTheme.colors.tertiaryText,
            ),
            padding: EdgeInsets.symmetric(
              horizontal: AppTheme.spacing.space2,
              vertical: AppTheme.spacing.space1,
            ),
            decoration: null,
          ),
          CupertinoTextField(
            controller: _linkUrlController,
            style: AppTheme.text.body,
            placeholder: 'URL',
            placeholderStyle: AppTheme.text.body.copyWith(
              color: AppTheme.colors.tertiaryText,
            ),
            padding: EdgeInsets.symmetric(
              horizontal: AppTheme.spacing.space2,
              vertical: AppTheme.spacing.space1,
            ),
            decoration: null,
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              CupertinoButton(
                padding: EdgeInsets.zero,
                onPressed: () async {
                  if (_linkLabelController.text.isNotEmpty &&
                      _linkUrlController.text.isNotEmpty) {
                    await profileService.addWishlistLink(
                      _linkLabelController.text,
                      _linkUrlController.text,
                    );
                    _linkLabelController.clear();
                    _linkUrlController.clear();
                    setState(() {
                      _isAddingLink = false;
                    });
                  }
                },
                child: Icon(
                  CupertinoIcons.check_mark,
                  size: 20,
                  color: AppTheme.colors.secondaryText,
                ),
              ),
              CupertinoButton(
                padding: EdgeInsets.zero,
                onPressed: () {
                  setState(() {
                    _isAddingLink = false;
                  });
                },
                child: Icon(
                  CupertinoIcons.xmark,
                  size: 20,
                  color: AppTheme.colors.tertiaryText,
                ),
              ),
            ],
          ),
        ] else ...[
          GestureDetector(
            onTap: () {
              setState(() {
                _isAddingLink = true;
              });
            },
            child: Padding(
              padding: EdgeInsets.symmetric(vertical: AppTheme.spacing.space1),
              child: Text(
                '+ Add a wishlist link',
                style: AppTheme.text.body.copyWith(
                  color: AppTheme.colors.accent,
                ),
              ),
            ),
          ),
        ],
        SizedBox(height: AppTheme.spacing.space3),

        // Shared dates
        if (profileService.sharedDates.isNotEmpty) ...[
          ...profileService.sharedDates.map((date) {
            final dateObj = DateTime.parse(date['date']);
            return Dismissible(
              key: Key(date['id']),
              onDismissed: (_) async {
                await profileService.removeSharedDate(date['id']);
              },
              child: Padding(
                padding: EdgeInsets.only(bottom: AppTheme.spacing.space2),
                child: Text(
                  '${date['label']} — ${_formatDate(dateObj)}',
                  style: AppTheme.text.body,
                ),
              ),
            );
          }),
        ],

        // Add date
        GestureDetector(
          onTap: () {
            // Date adding functionality not yet implemented
          },
          child: Padding(
            padding: EdgeInsets.symmetric(vertical: AppTheme.spacing.space1),
            child: Icon(
              CupertinoIcons.plus,
              color: AppTheme.colors.accent,
              size: 20,
            ),
          ),
        ),

        Divider(
          color: AppTheme.colors.border,
          height: AppTheme.spacing.space5,
        ),

        // Share button
        Center(
          child: CupertinoButton(
            onPressed: () {
              // Need actual user ID from auth service
              final profileUrl = 'https://kindred.terryheath.com/profile/$userId';
              Share.share(profileUrl);
            },
            child: Text(
              'Share',
              style: AppTheme.text.button.copyWith(
                color: AppTheme.colors.accent,
              ),
            ),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final authService = context.watch<AuthService>();
    final profileService = context.watch<ProfileService>();

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
          child: ListView(
            controller: scrollController,
            padding: EdgeInsets.symmetric(
              horizontal: AppTheme.spacing.screenPadding,
            ),
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
              SizedBox(height: AppTheme.spacing.space3),

              // Content based on state
              if (!authService.isAuthenticated) ...[
                _buildUnauthenticatedState(authService),
              ] else if (!profileService.hasProfile) ...[
                _buildProfileCreationState(profileService),
              ] else ...[
                _buildExistingProfileState(profileService),
              ],

              SizedBox(height: AppTheme.spacing.space6),
            ],
          ),
        );
      },
    );
  }
}