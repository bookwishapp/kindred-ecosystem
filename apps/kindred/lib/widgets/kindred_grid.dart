import 'dart:math';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/kin_person.dart';
import '../providers/kin_provider.dart';
import 'avatar_ring.dart';

class KindredGrid extends StatelessWidget {
  final List<KinPerson> kin;
  final void Function(KinPerson) onAvatarTap;

  const KindredGrid({
    super.key,
    required this.kin,
    required this.onAvatarTap,
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        // Calculate available dimensions
        final availableHeight = constraints.maxHeight;
        final availableWidth = constraints.maxWidth;

        // Padding from edges
        const verticalPadding = 60.0; // Top and bottom padding
        const horizontalPadding = 40.0; // Left and right padding

        // Minimum spacing between avatars when many are present
        const minimumSpacing = 120.0;

        // Calculate Stack height - grows with more avatars
        // With few avatars: fills screen height
        // With many avatars: extends beyond screen for scrolling
        final stackHeight = kin.length > 1
            ? (availableHeight > ((kin.length * minimumSpacing) + (verticalPadding * 2))
                ? availableHeight
                : (kin.length * minimumSpacing) + (verticalPadding * 2))
            : availableHeight;

        // Calculate the usable area for positioning avatars
        final usableHeight = stackHeight - (verticalPadding * 2);

        return SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          child: SizedBox(
            height: stackHeight,
            width: availableWidth,
            child: Stack(
              children: List.generate(kin.length, (index) {
            final person = kin[index];

            // Calculate vertical position
            // Use manual override if present, otherwise use natural position
            final provider = Provider.of<KinProvider>(context, listen: true);
            double verticalProgress = provider.getDisplayPosition(person.id);

            // Calculate the top position for this avatar
            final topPosition = verticalPadding + (verticalProgress * usableHeight);

            // Get avatar size from person's urgency score
            final avatarSize = person.avatarSize;

            // Create consistent random horizontal position based on person id
            final random = Random(person.id.hashCode);
            // Position avatar anywhere from 15% to 85% of screen width
            final horizontalPosition = 0.15 + (random.nextDouble() * 0.7); // Range: 0.15 to 0.85

            // Calculate left position based on percentage of screen width
            final leftPosition = (availableWidth * horizontalPosition) - (avatarSize / 2);

            return Positioned(
              top: topPosition - (avatarSize / 2), // Center avatar vertically in its zone
              left: leftPosition.clamp(horizontalPadding, availableWidth - horizontalPadding - avatarSize),
              child: _FloatingAvatar(
                person: person,
                index: index,
                availableHeight: usableHeight,
                onTap: () => onAvatarTap(person),
              ),
              );
            }),
          ),
        ),
      );
      },
    );
  }

}

class _FloatingAvatar extends StatefulWidget {
  final KinPerson person;
  final int index;
  final double availableHeight;
  final VoidCallback onTap;

  const _FloatingAvatar({
    required this.person,
    required this.index,
    required this.availableHeight,
    required this.onTap,
  });

  @override
  State<_FloatingAvatar> createState() => __FloatingAvatarState();
}

class __FloatingAvatarState extends State<_FloatingAvatar>
    with SingleTickerProviderStateMixin {
  late AnimationController _floatController;
  late Animation<double> _floatAnimation;
  double _dragStartY = 0;
  double _avatarStartPosition = 0;

  @override
  void initState() {
    super.initState();

    // Create unique animation timing for each avatar
    final duration = 3000 + (widget.index * 200);
    final delay = widget.index * 300;

    _floatController = AnimationController(
      duration: Duration(milliseconds: duration),
      vsync: this,
    );

    _floatAnimation = Tween<double>(
      begin: -8,
      end: 8,
    ).animate(CurvedAnimation(
      parent: _floatController,
      curve: Curves.easeInOut,
    ));

    // Start animation with delay
    Future.delayed(Duration(milliseconds: delay), () {
      if (mounted) {
        _floatController.repeat(reverse: true);
      }
    });
  }

  @override
  void dispose() {
    _floatController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: widget.onTap,
      onVerticalDragStart: (details) {
        _dragStartY = details.globalPosition.dy;
        // Get current display position (manual or natural)
        final provider = context.read<KinProvider>();
        _avatarStartPosition = provider.getDisplayPosition(widget.person.id);
      },
      onVerticalDragUpdate: (details) {
        final screenHeight = MediaQuery.of(context).size.height;
        final dragDelta = (details.globalPosition.dy - _dragStartY) / screenHeight;
        final newPosition = (_avatarStartPosition + dragDelta).clamp(0.0, 1.0);
        context.read<KinProvider>().setPosition(widget.person.id, newPosition);
      },
      onVerticalDragEnd: (details) {
        // Get current display position for snapping
        final provider = context.read<KinProvider>();
        final currentPosition = provider.getDisplayPosition(widget.person.id);
        provider.snapPosition(widget.person.id, currentPosition);
      },
      child: AnimatedBuilder(
        animation: _floatAnimation,
        builder: (context, child) {
          return Transform.translate(
            offset: Offset(
              0,
              _floatAnimation.value
            ),
            child: AvatarRing(
              person: widget.person,
              size: widget.person.avatarSize,
              onTap: widget.onTap,
            ),
          );
        },
      ),
    );
  }
}