import 'dart:io';
import 'package:flutter/cupertino.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:ui_kit/ui_kit.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../models/kin_person.dart';
import '../../providers/kin_provider.dart';
import '../../services/local_db.dart';
import '../../services/photo_service.dart';

class KinSheet extends StatefulWidget {
  final KinPerson person;

  const KinSheet({
    super.key,
    required this.person,
  });

  @override
  State<KinSheet> createState() => _KinSheetState();
}

class _KinSheetState extends State<KinSheet> {
  final LocalDb _db = LocalDb.instance;

  // Local data
  List<Map<String, dynamic>> _notes = [];
  List<Map<String, dynamic>> _privateDates = [];
  List<Map<String, dynamic>> _privateWishlistLinks = [];

  // Form states
  bool _isAddingNote = false;
  bool _isAddingDate = false;
  bool _isAddingLink = false;

  // Form controllers
  final TextEditingController _noteController = TextEditingController();
  final TextEditingController _dateLabelController = TextEditingController();
  DateTime? _selectedDate;
  final TextEditingController _linkLabelController = TextEditingController();
  final TextEditingController _linkUrlController = TextEditingController();

  @override
  void initState() {
    super.initState();
    // Skip loading local data on web for now (SQLite not configured for web)
    if (!kIsWeb) {
      _loadLocalData();
    }
  }

  @override
  void dispose() {
    _noteController.dispose();
    _dateLabelController.dispose();
    _linkLabelController.dispose();
    _linkUrlController.dispose();
    super.dispose();
  }

  Future<void> _loadLocalData() async {
    final notes = await _db.getNotes(widget.person.id);
    final dates = await _db.getPrivateDates(widget.person.id);
    final links = await _db.getPrivateWishlistLinks(widget.person.id);

    if (mounted) {
      setState(() {
        _notes = notes;
        _privateDates = dates;
        _privateWishlistLinks = links;
      });
    }
  }

  String _formatDate(DateTime date) {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return '${months[date.month - 1]} ${date.day}';
  }

  Widget _buildEmptyState(String text) {
    return Text(
      text,
      style: AppTheme.text.body.copyWith(
        color: AppTheme.colors.tertiaryText,
      ),
    );
  }

  Widget _buildSectionLabel(String label) {
    return Padding(
      padding: EdgeInsets.only(
        top: AppTheme.spacing.space4,
        bottom: AppTheme.spacing.space2,
      ),
      child: Text(
        label,
        style: AppTheme.text.caption.copyWith(
          color: AppTheme.colors.secondaryText,
        ),
      ),
    );
  }

  Widget _buildAvatarImage() {
    final photoUrl = widget.person.photoUrl!;
    if (photoUrl.startsWith('/')) {
      // Local file path
      return Image.file(
        File(photoUrl),
        fit: BoxFit.cover,
        errorBuilder: (context, error, stackTrace) {
          return Container(color: AppTheme.colors.surface);
        },
      );
    } else {
      // Network URL
      return CachedNetworkImage(
        imageUrl: photoUrl,
        fit: BoxFit.cover,
      );
    }
  }

  List<Widget> _buildProfileSection() {
    // Check if anything is shared
    final hasSharedContent = widget.person.birthday != null ||
        false; // Add wishlist check when implemented

    if (!hasSharedContent) {
      // Show single empty state for entire profile section
      return [_buildEmptyState('Nothing shared yet.')];
    } else {
      // Show individual sections
      final widgets = <Widget>[];

      if (widget.person.birthday != null) {
        widgets.add(
          Text(
            'Birthday — ${_formatDate(widget.person.birthday!)}',
            style: AppTheme.text.body,
          ),
        );
        widgets.add(SizedBox(height: AppTheme.spacing.space3));
      }

      // Wishlist links (shared) - placeholder for now
      // Will be shown here when implemented

      return widgets;
    }
  }

  Widget _buildNoteSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionLabel('your notes'),

        if (_notes.isEmpty && !_isAddingNote) ...[
          GestureDetector(
            onTap: () {
              setState(() {
                _isAddingNote = true;
              });
            },
            child: _buildEmptyState('Things you want to remember.'),
          ),
        ] else ...[
          // Existing notes
          ..._notes.map((note) {
            return Padding(
              padding: EdgeInsets.only(bottom: AppTheme.spacing.space2),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Text(
                      note['body'],
                      style: AppTheme.text.body,
                    ),
                  ),
                  SizedBox(width: AppTheme.spacing.space2),
                  GestureDetector(
                    onTap: () async {
                      await _db.deleteNote(note['id']);
                      _loadLocalData();
                    },
                    child: Icon(
                      CupertinoIcons.xmark,
                      size: 16,
                      color: AppTheme.colors.tertiaryText,
                    ),
                  ),
                ],
              ),
            );
          }),
        ],

        // Add note form
        if (_isAddingNote) ...[
          Row(
            children: [
              Expanded(
                child: CupertinoTextField(
                  controller: _noteController,
                  autofocus: true,
                  style: AppTheme.text.body,
                  placeholder: 'Write a note...',
                  placeholderStyle: AppTheme.text.body.copyWith(
                    color: AppTheme.colors.tertiaryText,
                  ),
                  decoration: null,
                  padding: EdgeInsets.zero,
                ),
              ),
              CupertinoButton(
                padding: EdgeInsets.zero,
                onPressed: () async {
                  if (_noteController.text.trim().isNotEmpty) {
                    await _db.addNote(widget.person.id, _noteController.text.trim());
                    _noteController.clear();
                    setState(() {
                      _isAddingNote = false;
                    });
                    _loadLocalData();
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
                  _noteController.clear();
                  setState(() {
                    _isAddingNote = false;
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
        ] else if (_notes.isNotEmpty) ...[
          GestureDetector(
            onTap: () {
              setState(() {
                _isAddingNote = true;
              });
            },
            child: Padding(
              padding: EdgeInsets.only(top: AppTheme.spacing.space2),
              child: Icon(
                CupertinoIcons.plus,
                size: 20,
                color: AppTheme.colors.tertiaryText,
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildPrivateDatesSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionLabel('dates you keep'),

        if (_privateDates.isEmpty && !_isAddingDate) ...[
          _buildEmptyState('Nothing marked.'),
        ] else ...[
          // Existing dates
          ..._privateDates.map((date) {
            final dateObj = DateTime.parse(date['date']);
            return Padding(
              padding: EdgeInsets.only(bottom: AppTheme.spacing.space2),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      '${date['label']} — ${_formatDate(dateObj)}',
                      style: AppTheme.text.body,
                    ),
                  ),
                  GestureDetector(
                    onTap: () async {
                      await _db.deletePrivateDate(date['id']);
                      _loadLocalData();
                    },
                    child: Icon(
                      CupertinoIcons.xmark,
                      size: 16,
                      color: AppTheme.colors.tertiaryText,
                    ),
                  ),
                ],
              ),
            );
          }),
        ],

        // Add date form
        if (_isAddingDate) ...[
          Column(
            children: [
              Row(
                children: [
                  Expanded(
                    child: CupertinoTextField(
                      controller: _dateLabelController,
                      autofocus: true,
                      style: AppTheme.text.body,
                      placeholder: 'Label',
                      placeholderStyle: AppTheme.text.body.copyWith(
                        color: AppTheme.colors.tertiaryText,
                      ),
                      decoration: null,
                      padding: EdgeInsets.zero,
                    ),
                  ),
                  CupertinoButton(
                    padding: EdgeInsets.zero,
                    onPressed: () {
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
                                  initialDateTime: _selectedDate ?? DateTime.now(),
                                  minimumDate: DateTime(1900),
                                  maximumDate: DateTime(2100),
                                  onDateTimeChanged: (DateTime newDate) {
                                    setState(() {
                                      _selectedDate = newDate;
                                    });
                                  },
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                    child: Text(
                      _selectedDate != null
                        ? _formatDate(_selectedDate!)
                        : 'Select date',
                      style: AppTheme.text.body.copyWith(
                        color: AppTheme.colors.accent,
                      ),
                    ),
                  ),
                ],
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  CupertinoButton(
                    padding: EdgeInsets.zero,
                    onPressed: () async {
                      if (_dateLabelController.text.trim().isNotEmpty && _selectedDate != null) {
                        await _db.addPrivateDate(
                          widget.person.id,
                          _dateLabelController.text.trim(),
                          _selectedDate!,
                          true,
                        );
                        _dateLabelController.clear();
                        setState(() {
                          _isAddingDate = false;
                          _selectedDate = null;
                        });
                        _loadLocalData();
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
                      _dateLabelController.clear();
                      setState(() {
                        _isAddingDate = false;
                        _selectedDate = null;
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
            ],
          ),
        ] else ...[
          GestureDetector(
            onTap: () {
              setState(() {
                _isAddingDate = true;
              });
            },
            child: Padding(
              padding: EdgeInsets.only(top: AppTheme.spacing.space2),
              child: Icon(
                CupertinoIcons.plus,
                size: 20,
                color: AppTheme.colors.tertiaryText,
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildPrivateWishlistSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionLabel('things they might like'),

        if (_privateWishlistLinks.isEmpty && !_isAddingLink) ...[
          _buildEmptyState('You\'ll remember this later.'),
        ] else ...[
          // Existing links
          ..._privateWishlistLinks.map((link) {
            return Padding(
              padding: EdgeInsets.only(bottom: AppTheme.spacing.space2),
              child: Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: () async {
                        final uri = Uri.tryParse(link['url']);
                        if (uri != null) {
                          await launchUrl(uri, mode: LaunchMode.externalApplication);
                        }
                      },
                      child: Text(
                        link['label'],
                        style: AppTheme.text.body.copyWith(
                          color: AppTheme.colors.accent,
                          decoration: TextDecoration.underline,
                        ),
                      ),
                    ),
                  ),
                  GestureDetector(
                    onTap: () async {
                      await _db.deletePrivateWishlistLink(link['id']);
                      _loadLocalData();
                    },
                    child: Icon(
                      CupertinoIcons.xmark,
                      size: 16,
                      color: AppTheme.colors.tertiaryText,
                    ),
                  ),
                ],
              ),
            );
          }),
        ],

        // Add link form
        if (_isAddingLink) ...[
          Column(
            children: [
              CupertinoTextField(
                controller: _linkLabelController,
                autofocus: true,
                style: AppTheme.text.body,
                placeholder: 'Label',
                placeholderStyle: AppTheme.text.body.copyWith(
                  color: AppTheme.colors.tertiaryText,
                ),
                decoration: null,
                padding: EdgeInsets.symmetric(
                  horizontal: AppTheme.spacing.space2,
                  vertical: AppTheme.spacing.space1,
                ),
              ),
              CupertinoTextField(
                controller: _linkUrlController,
                style: AppTheme.text.body,
                placeholder: 'URL',
                placeholderStyle: AppTheme.text.body.copyWith(
                  color: AppTheme.colors.tertiaryText,
                ),
                decoration: null,
                padding: EdgeInsets.symmetric(
                  horizontal: AppTheme.spacing.space2,
                  vertical: AppTheme.spacing.space1,
                ),
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  CupertinoButton(
                    padding: EdgeInsets.zero,
                    onPressed: () async {
                      if (_linkLabelController.text.trim().isNotEmpty &&
                          _linkUrlController.text.trim().isNotEmpty) {
                        await _db.addPrivateWishlistLink(
                          widget.person.id,
                          _linkLabelController.text.trim(),
                          _linkUrlController.text.trim(),
                        );
                        _linkLabelController.clear();
                        _linkUrlController.clear();
                        setState(() {
                          _isAddingLink = false;
                        });
                        _loadLocalData();
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
                      _linkLabelController.clear();
                      _linkUrlController.clear();
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
              padding: EdgeInsets.only(top: AppTheme.spacing.space2),
              child: Icon(
                CupertinoIcons.plus,
                size: 20,
                color: AppTheme.colors.tertiaryText,
              ),
            ),
          ),
        ],
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
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
            padding: EdgeInsets.zero,
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

              // Avatar
              Center(
                child: GestureDetector(
                  onTap: widget.person.type == KinPersonType.local
                      ? () async {
                          final photoPath = await PhotoService.pickPhoto(context);
                          if (photoPath != null && mounted) {
                            final kinProvider = context.read<KinProvider>();
                            await kinProvider.updateKinPhoto(widget.person.id, photoPath);
                          }
                        }
                      : null,
                  child: Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppTheme.colors.surface,
                      border: widget.person.type == KinPersonType.local
                          ? Border.all(
                              color: AppTheme.colors.border,
                              width: 2,
                              strokeAlign: BorderSide.strokeAlignOutside,
                            )
                          : null,
                    ),
                    child: widget.person.photoUrl != null
                        ? ClipOval(
                            child: _buildAvatarImage(),
                          )
                        : Center(
                            child: Text(
                              widget.person.name.isNotEmpty
                                  ? widget.person.name[0].toUpperCase()
                                  : '?',
                              style: AppTheme.text.heading.copyWith(
                                color: AppTheme.colors.secondaryText,
                              ),
                            ),
                          ),
                  ),
                ),
              ),
              SizedBox(height: AppTheme.spacing.space3),

              // Name
              Center(
                child: Text(
                  widget.person.name,
                  style: AppTheme.text.headingLarge,
                  textAlign: TextAlign.center,
                ),
              ),

              // "release" option — only visible when manually positioned
              if (widget.person.positionOverride != null) ...[
                SizedBox(height: AppTheme.spacing.space1),
                Center(
                  child: GestureDetector(
                    onTap: () {
                      context.read<KinProvider>().releasePosition(widget.person.id);
                      Navigator.pop(context);
                    },
                    child: Text(
                      'release',
                      style: AppTheme.text.caption.copyWith(
                        color: AppTheme.colors.secondaryText,
                      ),
                    ),
                  ),
                ),
              ],

              SizedBox(height: AppTheme.spacing.space3),

              // Content sections with horizontal padding
              Padding(
                padding: EdgeInsets.symmetric(
                  horizontal: AppTheme.spacing.screenPadding,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Divider(
                      color: AppTheme.colors.border,
                      height: AppTheme.spacing.space4,
                    ),

                    // === THEIR PROFILE ===
                    ..._buildProfileSection(),

                    Divider(
                      color: AppTheme.colors.border,
                      height: AppTheme.spacing.space5,
                    ),

                    // === YOUR NOTES ===
                    _buildNoteSection(),

                    Divider(
                      color: AppTheme.colors.border,
                      height: AppTheme.spacing.space5,
                    ),

                    // === DATES YOU KEEP ===
                    _buildPrivateDatesSection(),

                    Divider(
                      color: AppTheme.colors.border,
                      height: AppTheme.spacing.space5,
                    ),

                    // === THINGS THEY MIGHT LIKE ===
                    _buildPrivateWishlistSection(),

                    // Options section
                    SizedBox(height: AppTheme.spacing.space4),

                    // "Invite to Show Up" option - only for local kin
                    if (widget.person.type == KinPersonType.local) ...[
                      Center(
                        child: GestureDetector(
                          onTap: () async {
                            await Share.share(
                              'I keep track of the people I care about in Kindred. Show up: https://fromkindred.com',
                            );
                          },
                          child: Text(
                            'Invite to Show Up',
                            style: AppTheme.text.caption.copyWith(
                              color: AppTheme.colors.secondaryText,
                            ),
                          ),
                        ),
                      ),
                      SizedBox(height: AppTheme.spacing.space2),
                    ],

                    // "let go" option - available for ALL kin types
                    Center(
                      child: GestureDetector(
                        onTap: () {
                          showCupertinoDialog(
                            context: context,
                            builder: (BuildContext context) => CupertinoAlertDialog(
                              content: const Text('Let them go?'),
                              actions: [
                                CupertinoDialogAction(
                                  onPressed: () => Navigator.pop(context),
                                  isDefaultAction: true,
                                  child: const Text('Keep them'),
                                ),
                                CupertinoDialogAction(
                                  onPressed: () {
                                    Navigator.pop(context); // Close dialog
                                    Navigator.of(context, rootNavigator: true).pop('delete'); // Return result to parent using root navigator
                                  },
                                  isDestructiveAction: true,
                                  child: const Text('Let go'),
                                ),
                              ],
                            ),
                          );
                        },
                        child: Text(
                          'let go',
                          style: AppTheme.text.caption.copyWith(
                            color: AppTheme.colors.secondaryText,
                          ),
                        ),
                      ),
                    ),

                    SizedBox(height: AppTheme.spacing.space6),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}