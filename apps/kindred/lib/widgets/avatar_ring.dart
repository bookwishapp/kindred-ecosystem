import 'dart:io';
import 'package:flutter/material.dart';
import 'package:ui_kit/ui_kit.dart';
import '../models/kin_person.dart';

class AvatarRing extends StatefulWidget {
  final KinPerson person;
  final double size;
  final VoidCallback onTap;

  const AvatarRing({
    super.key,
    required this.person,
    required this.size,
    required this.onTap,
  });

  @override
  State<AvatarRing> createState() => _AvatarRingState();
}

class _AvatarRingState extends State<AvatarRing>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 2000),
      vsync: this,
    );
    _pulseAnimation = Tween<double>(
      begin: 1.0,
      end: 1.04,
    ).animate(CurvedAnimation(
      parent: _pulseController,
      curve: Curves.easeInOut,
    ));

    if (widget.person.ringIntensity > 0) {
      _pulseController.repeat(reverse: true);
    }
  }

  @override
  void didUpdateWidget(AvatarRing oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.person.ringIntensity > 0 && !_pulseController.isAnimating) {
      _pulseController.repeat(reverse: true);
    } else if (widget.person.ringIntensity == 0 && _pulseController.isAnimating) {
      _pulseController.stop();
      _pulseController.value = 0;
    }
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  Widget _buildImage(String photoUrl) {
    // Check if it's a local file path
    if (photoUrl.startsWith('/') || photoUrl.startsWith('file://')) {
      final file = File(photoUrl.replaceFirst('file://', ''));
      return Image.file(
        file,
        fit: BoxFit.cover,
        errorBuilder: (context, error, stackTrace) {
          // Fallback to network image in case of error
          return Image.network(
            photoUrl,
            fit: BoxFit.cover,
            errorBuilder: (context, error, stackTrace) {
              // If both fail, show placeholder
              return Container(
                color: AppTheme.colors.surface,
                child: Center(
                  child: Text(
                    widget.person.name.isNotEmpty
                        ? widget.person.name[0].toUpperCase()
                        : '',
                    style: AppTheme.text.headingLarge.copyWith(
                      color: AppTheme.colors.secondaryText,
                    ),
                  ),
                ),
              );
            },
          );
        },
      );
    } else {
      // It's a network URL
      return Image.network(
        photoUrl,
        fit: BoxFit.cover,
        errorBuilder: (context, error, stackTrace) {
          // If network load fails, show placeholder
          return Container(
            color: AppTheme.colors.surface,
            child: Center(
              child: Text(
                widget.person.name.isNotEmpty
                    ? widget.person.name[0].toUpperCase()
                    : '',
                style: AppTheme.text.headingLarge.copyWith(
                  color: AppTheme.colors.secondaryText,
                ),
              ),
            ),
          );
        },
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final totalSize = widget.size + 12; // Ring + gap on each side

    return GestureDetector(
      onTap: widget.onTap,
      child: SizedBox(
        width: totalSize,
        height: totalSize,
        child: AnimatedBuilder(
          animation: _pulseAnimation,
          builder: (context, child) {
            return Transform.scale(
              scale: widget.person.ringIntensity > 0 ? _pulseAnimation.value : 1.0,
              child: CustomPaint(
                painter: RingPainter(
                  ringIntensity: widget.person.ringIntensity,
                  amberIntensity: widget.person.amberIntensity,
                ),
                child: Center(
                  child: Container(
                    width: widget.size,
                    height: widget.size,
                    decoration: BoxDecoration(
                      color: widget.person.photoUrl == null
                          ? AppTheme.colors.surface
                          : null,
                      shape: BoxShape.circle,
                    ),
                    child: widget.person.photoUrl != null
                        ? ClipOval(
                            child: _buildImage(widget.person.photoUrl!),
                          )
                        : Center(
                            child: Text(
                              widget.person.name.isNotEmpty
                                  ? widget.person.name[0].toUpperCase()
                                  : '',
                              style: AppTheme.text.headingLarge.copyWith(
                                color: AppTheme.colors.secondaryText,
                              ),
                            ),
                          ),
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

class RingPainter extends CustomPainter {
  final double ringIntensity;
  final double amberIntensity;

  RingPainter({
    required this.ringIntensity,
    required this.amberIntensity,
  });

  @override
  void paint(Canvas canvas, Size size) {
    // Calculate ring dimensions
    const ringWidth = 3.0;
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.width / 2) - (ringWidth / 2);

    Paint? ringPaint;

    // Determine which ring to show
    if (ringIntensity > 0) {
      // Date-triggered ring (teal) - takes priority
      ringPaint = Paint()
        ..color = AppTheme.colors.warmAccent.withValues(alpha: ringIntensity * 0.9)
        ..style = PaintingStyle.stroke
        ..strokeWidth = ringWidth;
    } else if (amberIntensity > 0) {
      // Manually positioned ring (amber) - only when no date ring
      ringPaint = Paint()
        ..color = const Color(0xFFE8A84C).withValues(alpha: amberIntensity)
        ..style = PaintingStyle.stroke
        ..strokeWidth = ringWidth;
    }

    // Draw the ring if applicable
    if (ringPaint != null) {
      canvas.drawCircle(center, radius, ringPaint);
    }
  }

  @override
  bool shouldRepaint(RingPainter oldDelegate) {
    return oldDelegate.ringIntensity != ringIntensity ||
        oldDelegate.amberIntensity != amberIntensity;
  }
}