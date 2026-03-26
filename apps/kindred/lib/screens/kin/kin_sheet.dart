import 'package:flutter/cupertino.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:ui_kit/ui_kit.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../models/kin_person.dart';
import '../../providers/kin_provider.dart';
import '../../services/local_db.dart';

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
                child: TextField(
                  controller: _noteController,
                  autofocus: true,
                  style: AppTheme.text.body,
                  decoration: InputDecoration(
                    hintText: 'Write a note...',
                    hintStyle: AppTheme.text.body.copyWith(
                      color: AppTheme.colors.tertiaryText,
                    ),
                    border: InputBorder.none,
                  ),
                ),
              ),
              IconButton(
                icon: const Icon(CupertinoIcons.check_mark, size: 20),
                color: AppTheme.colors.secondaryText,
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
              ),
              IconButton(
                icon: const Icon(CupertinoIcons.xmark, size: 20),
                color: AppTheme.colors.tertiaryText,
                onPressed: () {
                  _noteController.clear();
                  setState(() {
                    _isAddingNote = false;
                  });
                },
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
                    child: TextField(
                      controller: _dateLabelController,
                      autofocus: true,
                      style: AppTheme.text.body,
                      decoration: InputDecoration(
                        hintText: 'Label',
                        hintStyle: AppTheme.text.body.copyWith(
                          color: AppTheme.colors.tertiaryText,
                        ),
                        border: InputBorder.none,
                      ),
                    ),
                  ),
                  TextButton(
                    onPressed: () async {
                      final picked = await showDatePicker(
                        context: context,
                        initialDate: _selectedDate ?? DateTime.now(),
                        firstDate: DateTime(1900),
                        lastDate: DateTime(2100),
                      );
                      if (picked != null) {
                        setState(() {
                          _selectedDate = picked;
                        });
                      }
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
                  IconButton(
                    icon: const Icon(CupertinoIcons.check_mark, size: 20),
                    color: AppTheme.colors.secondaryText,
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
                  ),
                  IconButton(
                    icon: const Icon(CupertinoIcons.xmark, size: 20),
                    color: AppTheme.colors.tertiaryText,
                    onPressed: () {
                      _dateLabelController.clear();
                      setState(() {
                        _isAddingDate = false;
                        _selectedDate = null;
                      });
                    },
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
              TextField(
                controller: _linkLabelController,
                autofocus: true,
                style: AppTheme.text.body,
                decoration: InputDecoration(
                  hintText: 'Label',
                  hintStyle: AppTheme.text.body.copyWith(
                    color: AppTheme.colors.tertiaryText,
                  ),
                  border: InputBorder.none,
                ),
              ),
              TextField(
                controller: _linkUrlController,
                style: AppTheme.text.body,
                decoration: InputDecoration(
                  hintText: 'URL',
                  hintStyle: AppTheme.text.body.copyWith(
                    color: AppTheme.colors.tertiaryText,
                  ),
                  border: InputBorder.none,
                ),
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  IconButton(
                    icon: const Icon(CupertinoIcons.check_mark, size: 20),
                    color: AppTheme.colors.secondaryText,
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
                  ),
                  IconButton(
                    icon: const Icon(CupertinoIcons.xmark, size: 20),
                    color: AppTheme.colors.tertiaryText,
                    onPressed: () {
                      _linkLabelController.clear();
                      _linkUrlController.clear();
                      setState(() {
                        _isAddingLink = false;
                      });
                    },
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
                child: Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: AppTheme.colors.surface,
                  ),
                  child: widget.person.photoUrl != null
                      ? ClipOval(
                          child: CachedNetworkImage(
                            imageUrl: widget.person.photoUrl!,
                            fit: BoxFit.cover,
                          ),
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
              SizedBox(height: AppTheme.spacing.space3),

              // Name
              Center(
                child: Text(
                  widget.person.name,
                  style: AppTheme.text.headingLarge,
                  textAlign: TextAlign.center,
                ),
              ),

              // "let go" option — only visible when manually positioned
              if (widget.person.positionOverride != null) ...[
                SizedBox(height: AppTheme.spacing.space1),
                Center(
                  child: GestureDetector(
                    onTap: () {
                      context.read<KinProvider>().releasePosition(widget.person.id);
                      Navigator.pop(context);
                    },
                    child: Text(
                      'let go',
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

                    // Dates (shared)
                    if (widget.person.birthday != null) ...[
                      Text(
                        'Birthday — ${_formatDate(widget.person.birthday!)}',
                        style: AppTheme.text.body,
                      ),
                    ] else ...[
                      _buildEmptyState('Nothing shared yet.'),
                    ],

                    SizedBox(height: AppTheme.spacing.space3),

                    // Wishlist links (shared) - placeholder for now
                    _buildEmptyState('Nothing here yet.'),

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