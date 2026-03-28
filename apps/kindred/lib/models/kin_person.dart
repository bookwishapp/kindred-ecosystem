class KinPerson {
  final String id;
  final String name;
  final String? photoUrl;
  final KinPersonType type;
  final String? linkedProfileId;
  final double? positionOverride; // 0.0 = top, 1.0 = bottom. null = date-driven
  final DateTime? birthday;
  final List<DateTime> allDates; // birthday + private dates combined

  const KinPerson({
    required this.id,
    required this.name,
    this.photoUrl,
    required this.type,
    this.linkedProfileId,
    this.positionOverride,
    this.birthday,
    this.allDates = const [],
  });

  // Factory constructor to create from JSON
  factory KinPerson.fromJson(Map<String, dynamic> json) {
    final type = json['type'] == 'linked' ? KinPersonType.linked : KinPersonType.local;

    // Extract name and photo based on type
    String name;
    String? photoUrl;
    DateTime? birthday;

    if (type == KinPersonType.linked) {
      // For linked kin, profile data may be included or fetched separately
      if (json['profile'] != null) {
        final profile = json['profile'] as Map<String, dynamic>;
        name = profile['name'] ?? 'Unknown';
        photoUrl = profile['photo_url'];
        // Parse birthday if present
        if (profile['birthday'] != null) {
          birthday = DateTime.parse(profile['birthday']);
        }
      } else {
        // Profile will be fetched separately - use placeholders
        name = json['profile_name'] ?? 'Loading...';
        photoUrl = json['profile_photo_url'];
        if (json['profile_birthday'] != null) {
          birthday = DateTime.parse(json['profile_birthday']);
        }
      }
    } else {
      // For local kin, get data from local fields
      name = json['local_name'] ?? 'Unknown';
      photoUrl = json['local_photo_url'];
      // Parse birthday if present
      if (json['local_birthday'] != null) {
        birthday = DateTime.parse(json['local_birthday']);
      }
    }

    return KinPerson(
      id: json['id'] ?? '',
      name: name,
      photoUrl: photoUrl,
      type: type,
      linkedProfileId: json['linked_profile_id'],
      positionOverride: json['position_override']?.toDouble(),
      birthday: birthday,
      allDates: birthday != null ? [birthday] : [], // Initialize with birthday if present
    );
  }

  // Create a copy with optional field overrides
  KinPerson copyWith({
    String? id,
    String? name,
    String? photoUrl,
    KinPersonType? type,
    String? linkedProfileId,
    double? positionOverride,
    bool clearPositionOverride = false,
    DateTime? birthday,
    List<DateTime>? allDates,
  }) {
    return KinPerson(
      id: id ?? this.id,
      name: name ?? this.name,
      photoUrl: photoUrl ?? this.photoUrl,
      type: type ?? this.type,
      linkedProfileId: linkedProfileId ?? this.linkedProfileId,
      positionOverride: clearPositionOverride ? null : (positionOverride ?? this.positionOverride),
      birthday: birthday ?? this.birthday,
      allDates: allDates ?? this.allDates,
    );
  }

  // Returns days until next occurrence of any date (birthday or private dates)
  // Accounts for annual recurrence
  int? get daysUntilNextDate {
    if (allDates.isEmpty) return null;
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);

    int? closest;
    for (final date in allDates) {
      var next = DateTime(now.year, date.month, date.day);
      if (next.isBefore(today)) {
        next = DateTime(now.year + 1, date.month, date.day);
      }
      final days = next.difference(today).inDays;
      if (closest == null || days < closest) closest = days;
    }
    return closest;
  }

  // Ring intensity 0.0–1.0 based on proximity
  // 0 = no ring (>60 days), 1.0 = fully glowing (≤3 days)
  double get ringIntensity {
    final days = daysUntilNextDate;
    if (days == null) return 0.0;
    if (days <= 3) return 1.0;
    if (days <= 7) return 0.85;
    if (days <= 14) return 0.65;
    if (days <= 30) return 0.4;
    if (days <= 60) return 0.15;
    return 0.0;
  }

  bool get hasUpcomingDate => ringIntensity > 0;

  // Amber intensity for manually positioned avatars
  // Scales with how high they are: top = full, bottom = none
  double get amberIntensity {
    if (positionOverride == null) return 0.0;
    return (1.0 - positionOverride!) * 0.85;
  }

  // Unified urgency: whichever is stronger — date or intention
  double get urgencyScore {
    if (positionOverride != null) {
      return 1.0 - positionOverride!; // high position = high urgency
    }
    return ringIntensity;
  }

  // Size based on urgency score: 80px (bottom) to 110px (top)
  double get avatarSize {
    final size = 80.0 + (urgencyScore * 30.0);
    return size;
  }
}

enum KinPersonType { linked, local }