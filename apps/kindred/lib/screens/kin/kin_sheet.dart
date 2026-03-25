import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:ui_kit/ui_kit.dart';
import '../../models/kin_person.dart';
import '../../providers/kin_provider.dart';

class KinSheet extends StatelessWidget {
  final KinPerson person;

  const KinSheet({
    super.key,
    required this.person,
  });

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.4,
      maxChildSize: 0.85,
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
              Container(
                margin: EdgeInsets.only(top: AppTheme.spacing.space1),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppTheme.colors.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              SizedBox(height: AppTheme.spacing.space3),
              // Person name
              Text(
                person.name,
                style: AppTheme.text.headingLarge,
              ),
              SizedBox(height: AppTheme.spacing.space4),
              // Content
              Expanded(
                child: ListView(
                  controller: scrollController,
                  padding: EdgeInsets.symmetric(
                    horizontal: AppTheme.spacing.screenPadding,
                  ),
                  children: [
                    // Their profile section
                    if (person.birthday != null) ...[
                      Text(
                        'Birthday — ${_formatDate(person.birthday!)}',
                        style: AppTheme.text.body,
                      ),
                      SizedBox(height: AppTheme.spacing.space3),
                    ] else ...[
                      Text(
                        'Nothing shared yet.',
                        style: AppTheme.text.body.copyWith(
                          color: AppTheme.colors.secondaryText,
                        ),
                      ),
                      SizedBox(height: AppTheme.spacing.space3),
                    ],

                    // Divider
                    Divider(
                      color: AppTheme.colors.border,
                      height: AppTheme.spacing.space5,
                    ),

                    // Your notes section
                    Text(
                      'your notes',
                      style: AppTheme.text.caption.copyWith(
                        color: AppTheme.colors.secondaryText,
                      ),
                    ),
                    SizedBox(height: AppTheme.spacing.space2),
                    Text(
                      'Things you want to remember.',
                      style: AppTheme.text.body.copyWith(
                        color: AppTheme.colors.tertiaryText,
                      ),
                    ),

                    // "let go" option — only visible when manually positioned
                    if (person.positionOverride != null) ...[
                      SizedBox(height: AppTheme.spacing.space5),
                      GestureDetector(
                        onTap: () {
                          context.read<KinProvider>().releasePosition(person.id);
                          Navigator.pop(context);
                        },
                        child: Text(
                          'let go',
                          style: AppTheme.text.caption.copyWith(
                            color: AppTheme.colors.secondaryText,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  String _formatDate(DateTime date) {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return '${months[date.month - 1]} ${date.day}';
  }
}