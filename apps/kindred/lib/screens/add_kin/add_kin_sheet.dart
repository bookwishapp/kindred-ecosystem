import 'dart:io';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:ui_kit/ui_kit.dart';
import '../../providers/kin_provider.dart';
import '../../services/local_db.dart';
import '../../services/photo_service.dart';

class AddKinSheet extends StatefulWidget {
  const AddKinSheet({super.key});

  @override
  State<AddKinSheet> createState() => _AddKinSheetState();
}

class _AddKinSheetState extends State<AddKinSheet> {
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _dateLabelController = TextEditingController();

  DateTime? _selectedBirthday;
  DateTime? _selectedDate;
  String? _localPhotoPath;

  final List<Map<String, dynamic>> _additionalDates = [];
  bool _isAddingDate = false;
  bool _isSaving = false;
  String? _errorMessage;

  @override
  void dispose() {
    _nameController.dispose();
    _dateLabelController.dispose();
    super.dispose();
  }

  String _formatDate(DateTime date) {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return '${months[date.month - 1]} ${date.day}';
  }

  Future<void> _pickPhoto() async {
    final path = await PhotoService.pickPhoto(context);
    if (path != null) {
      setState(() {
        _localPhotoPath = path;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.85,
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

              // Title
              Text('Keep someone', style: AppTheme.text.headingLarge),
              SizedBox(height: AppTheme.spacing.space4),

              // Photo picker
              Center(
                child: GestureDetector(
                  onTap: _pickPhoto,
                  child: Container(
                    width: 100,
                    height: 100,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppTheme.colors.surface,
                      border: Border.all(
                        color: AppTheme.colors.border,
                        width: 2,
                        strokeAlign: BorderSide.strokeAlignOutside,
                      ),
                    ),
                    child: ClipOval(
                      child: _localPhotoPath != null
                          ? Image.file(
                              File(_localPhotoPath!),
                              fit: BoxFit.cover,
                            )
                          : Center(
                              child: Icon(
                                CupertinoIcons.camera,
                                size: 32,
                                color: AppTheme.colors.tertiaryText,
                              ),
                            ),
                    ),
                  ),
                ),
              ),
              SizedBox(height: AppTheme.spacing.space4),

              // Name field
              CupertinoTextField(
                controller: _nameController,
                style: AppTheme.text.body,
                placeholder: 'Name',
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
                  border: Border.all(color: AppTheme.colors.border),
                ),
              ),
              SizedBox(height: AppTheme.spacing.space3),

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
                              initialDateTime:
                                  _selectedBirthday ??
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
                    border: Border.all(color: AppTheme.colors.border),
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

              // Additional dates
              if (_additionalDates.isNotEmpty) ...[
                ..._additionalDates.map((date) {
                  return Padding(
                    padding: EdgeInsets.only(bottom: AppTheme.spacing.space2),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(
                            '${date['label']} — ${_formatDate(date['date'])}',
                            style: AppTheme.text.body,
                          ),
                        ),
                        GestureDetector(
                          onTap: () {
                            setState(() {
                              _additionalDates.remove(date);
                            });
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
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
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
                                    initialDateTime:
                                        _selectedDate ?? DateTime.now(),
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
                    CupertinoButton(
                      padding: EdgeInsets.zero,
                      onPressed: () {
                        if (_dateLabelController.text.isNotEmpty &&
                            _selectedDate != null) {
                          setState(() {
                            _additionalDates.add({
                              'label': _dateLabelController.text,
                              'date': _selectedDate,
                            });
                            _dateLabelController.clear();
                            _selectedDate = null;
                            _isAddingDate = false;
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
                          _isAddingDate = false;
                          _dateLabelController.clear();
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
              ] else ...[
                // Add a date button
                GestureDetector(
                  onTap: () {
                    setState(() {
                      _isAddingDate = true;
                    });
                  },
                  child: Padding(
                    padding: EdgeInsets.symmetric(
                      vertical: AppTheme.spacing.space1,
                    ),
                    child: Icon(
                      CupertinoIcons.plus,
                      color: AppTheme.colors.accent,
                      size: 20,
                    ),
                  ),
                ),
              ],
              SizedBox(height: AppTheme.spacing.space5),

              // Error message
              if (_errorMessage != null) ...[
                Container(
                  padding: EdgeInsets.symmetric(
                    horizontal: AppTheme.spacing.space2,
                    vertical: AppTheme.spacing.space1,
                  ),
                  decoration: BoxDecoration(
                    color: AppTheme.colors.surface,
                    borderRadius: BorderRadius.circular(AppTheme.radius.sm),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        CupertinoIcons.exclamationmark_circle,
                        size: 16,
                        color: AppTheme.colors.error,
                      ),
                      SizedBox(width: AppTheme.spacing.space1),
                      Expanded(
                        child: Text(
                          _errorMessage!,
                          style: AppTheme.text.caption.copyWith(
                            color: AppTheme.colors.error,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                SizedBox(height: AppTheme.spacing.space2),
              ],

              // Keep button
              SizedBox(
                width: double.infinity,
                child: CupertinoButton(
                  color: AppTheme.colors.accent,
                  onPressed: _isSaving
                      ? null
                      : () async {
                          // Validate name
                          if (_nameController.text.trim().isEmpty) {
                            setState(() {
                              _errorMessage = 'Please enter a name';
                            });
                            return;
                          }

                          setState(() {
                            _isSaving = true;
                            _errorMessage = null;
                          });

                          try {
                            final kinProvider = context.read<KinProvider>();

                            // Add the kin person
                            await kinProvider.addKinLocal(
                              name: _nameController.text.trim(),
                              photoUrl: _localPhotoPath,
                              birthday: _selectedBirthday,
                            );

                            // Get the newly added person's ID
                            // The person should be the last one added to the list
                            final newPerson = kinProvider.kin.lastWhere(
                              (person) =>
                                  person.name == _nameController.text.trim(),
                              orElse: () => throw Exception(
                                'Could not find newly added person',
                              ),
                            );

                            // Add additional dates to LocalDb
                            for (final date in _additionalDates) {
                              await LocalDb.instance.addPrivateDate(
                                newPerson.id,
                                date['label'],
                                date['date'],
                                true, // recurs annually by default
                              );
                            }

                            // Reload kin to update dates
                            await kinProvider.loadKin();

                            // Dismiss sheet
                            if (mounted) {
                              Navigator.pop(context);
                            }
                          } catch (e) {
                            if (mounted) {
                              setState(() {
                                _errorMessage = 'That didn\'t work. Try again.';
                              });
                            }
                          } finally {
                            if (mounted) {
                              setState(() {
                                _isSaving = false;
                              });
                            }
                          }
                        },
                  child: _isSaving
                      ? const CupertinoActivityIndicator(color: Colors.white)
                      : Text(
                          'Keep',
                          style: AppTheme.text.button.copyWith(
                            color: AppTheme.colors.warmWhite,
                          ),
                        ),
                ),
              ),
              SizedBox(height: AppTheme.spacing.space2),

              // Cancel
              Center(
                child: GestureDetector(
                  onTap: () => Navigator.pop(context),
                  child: Text(
                    'Cancel',
                    style: AppTheme.text.caption.copyWith(
                      color: AppTheme.colors.tertiaryText,
                    ),
                  ),
                ),
              ),
              SizedBox(height: AppTheme.spacing.space6),
            ],
          ),
        );
      },
    );
  }
}
