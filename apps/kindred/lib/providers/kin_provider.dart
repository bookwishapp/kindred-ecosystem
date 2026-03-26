import 'package:flutter/foundation.dart';
import 'package:uuid/uuid.dart';
import '../models/kin_person.dart';
import '../services/kindred_api.dart';
import '../services/local_db.dart';

class KinProvider extends ChangeNotifier {
  final KindredApi _api;

  // Internal storage for kin list
  List<KinPerson> _kin = [];
  bool _isLoading = false;
  String? _error;

  // Internal storage for position overrides (local cache)
  final Map<String, double> _positionOverrides = {};

  // Natural positions based on ring intensity ranking (cached)
  final Map<String, double> _naturalPositions = {};

  // Track the last known kin list to detect changes
  List<KinPerson>? _lastKinList;

  KinProvider({required KindredApi api}) : _api = api {
    // Load kin data on initialization
    loadKin();
  }

  // Public getters
  List<KinPerson> get kin => _kin;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get hasError => _error != null;

  // Load kin from API
  Future<void> loadKin() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final kinList = await _api.getKin();

      // Load private dates for each kin person and populate allDates
      final kinWithDates = await Future.wait(kinList.map((person) async {
        final privateDates = await LocalDb.instance.getPrivateDates(person.id);

        // Combine birthday with private dates
        final allDates = <DateTime>[];
        if (person.birthday != null) {
          allDates.add(person.birthday!);
        }

        // Add private dates
        for (final dateMap in privateDates) {
          final dateStr = dateMap['date'] as String;
          allDates.add(DateTime.parse(dateStr));
        }

        return person.copyWith(allDates: allDates);
      }));

      _kin = kinWithDates;

      // Update natural positions based on current ring intensities
      _updateNaturalPositions(_kin);

      // Apply any cached position overrides
      _kin = _kin.map((person) {
        final override = _positionOverrides[person.id];
        if (override != null) {
          return person.copyWith(positionOverride: override);
        }
        return person.copyWith(clearPositionOverride: true);
      }).toList();

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;

      // Fall back to mock data for testing until auth is implemented
      final now = DateTime.now();
      _kin = [
        KinPerson(
          id: 'mock-1',
          name: 'Terry',
          photoUrl: 'https://i.pravatar.cc/150?img=1',
          type: KinPersonType.linked,
          linkedProfileId: 'profile-1',
          birthday: DateTime(now.year, now.month, now.day + 2), // 2 days away
          allDates: [DateTime(now.year, now.month, now.day + 2)],
        ),
        KinPerson(
          id: 'mock-2',
          name: 'Someone',
          photoUrl: 'https://i.pravatar.cc/150?img=2',
          type: KinPersonType.local,
          birthday: DateTime(now.year, now.month, now.day + 7), // 1 week
          allDates: [DateTime(now.year, now.month, now.day + 7)],
        ),
        KinPerson(
          id: 'mock-3',
          name: 'Another',
          photoUrl: 'https://i.pravatar.cc/150?img=3',
          type: KinPersonType.local,
          birthday: DateTime(now.year, now.month + 1, now.day), // 1 month
          allDates: [DateTime(now.year, now.month + 1, now.day)],
        ),
        KinPerson(
          id: 'mock-4',
          name: 'Held',
          photoUrl: 'https://i.pravatar.cc/150?img=4',
          type: KinPersonType.local,
          positionOverride: 0.15, // Manually positioned high
          birthday: DateTime(now.year, now.month + 3, now.day), // 3 months
          allDates: [DateTime(now.year, now.month + 3, now.day)],
        ),
        KinPerson(
          id: 'mock-5',
          name: 'Far',
          photoUrl: 'https://i.pravatar.cc/150?img=5',
          type: KinPersonType.local,
          birthday: DateTime(now.year + 1, now.month, now.day), // Next year
          allDates: [DateTime(now.year + 1, now.month, now.day)],
        ),
      ];

      // Update natural positions for mock data
      _updateNaturalPositions(_kin);

      // Apply any cached position overrides (keeps drag positions between reloads)
      _kin = _kin.map((person) {
        final override = _positionOverrides[person.id];
        if (override != null) {
          return person.copyWith(positionOverride: override);
        }
        return person.copyWith(clearPositionOverride: person.id == 'mock-4' ? false : true);
      }).toList();

      notifyListeners();
    }

    // Merge in any local-only kin from database
    try {
      final localKinData = await LocalDb.instance.getLocalKin();
      final existingIds = _kin.map((k) => k.id).toSet();

      for (final data in localKinData) {
        if (!existingIds.contains(data['id'])) {
          final localPerson = KinPerson(
            id: data['id'],
            name: data['name'],
            photoUrl: data['photo_url'],
            type: KinPersonType.local,
            birthday: data['birthday'] != null
                ? DateTime.parse(data['birthday'])
                : null,
            allDates: data['birthday'] != null
                ? [DateTime.parse(data['birthday'])]
                : [],
          );
          _kin.add(localPerson);
        }
      }
      _updateNaturalPositions(_kin);
      notifyListeners();
    } catch (e) {
      debugPrint('Failed to load local kin: $e');
    }
  }

  // Calculate and cache natural positions based on ring intensity
  void _updateNaturalPositions(List<KinPerson> kinList) {
    // Only recalculate if the kin list has changed
    if (_lastKinList != null &&
        _lastKinList!.length == kinList.length &&
        _lastKinList!.every((person) =>
          kinList.any((p) => p.id == person.id && p.ringIntensity == person.ringIntensity))) {
      return; // No changes, keep existing natural positions
    }

    _lastKinList = List.from(kinList);
    _naturalPositions.clear();

    // Sort by ring intensity to determine natural positions
    final sortedByIntensity = List.from(kinList);
    sortedByIntensity.sort((a, b) => b.ringIntensity.compareTo(a.ringIntensity));

    // Assign natural positions based on intensity ranking
    for (int i = 0; i < sortedByIntensity.length; i++) {
      final person = sortedByIntensity[i];
      if (sortedByIntensity.length > 1) {
        _naturalPositions[person.id] = i / (sortedByIntensity.length - 1);
      } else {
        _naturalPositions[person.id] = 0.0;
      }
    }
  }

  // Sort: positionOverride first (ascending), then by natural position
  List<KinPerson> get sortedKin {
    // Sort by position (manual overrides first, then by natural position)
    final list = List<KinPerson>.from(_kin);
    list.sort((a, b) {
      final posA = a.positionOverride ?? _naturalPositions[a.id] ?? 0.0;
      final posB = b.positionOverride ?? _naturalPositions[b.id] ?? 0.0;
      return posA.compareTo(posB);
    });
    return list;
  }

  // Get the display position for an avatar (manual or natural)
  double getDisplayPosition(String id) {
    // Check if this person has a position override
    final person = _kin.firstWhere((p) => p.id == id, orElse: () => KinPerson(
      id: id,
      name: 'Unknown',
      type: KinPersonType.local,
    ));

    return person.positionOverride ?? _naturalPositions[id] ?? 0.0;
  }

  // Called during drag — updates position in real time (local only)
  void setPosition(String id, double position) {
    if (position >= 0.95) {
      // Dragged to bottom — release override, return to natural sort
      _positionOverrides.remove(id);
    } else {
      _positionOverrides[id] = position.clamp(0.0, 1.0);
    }

    // Update the local list immediately for smooth dragging
    _kin = _kin.map((person) {
      if (person.id == id) {
        if (position >= 0.95) {
          return person.copyWith(clearPositionOverride: true);
        } else {
          return person.copyWith(positionOverride: position.clamp(0.0, 1.0));
        }
      }
      return person;
    }).toList();

    notifyListeners();
  }

  // Called on drag end — snaps to nearest 0.05 increment and saves to API
  Future<void> snapPosition(String id, double position) async {
    double? finalPosition;

    if (position >= 0.95) {
      // Release the override
      _positionOverrides.remove(id);
      finalPosition = null;
    } else {
      // Snap to nearest 0.05
      final snapped = (position / 0.05).round() * 0.05;
      finalPosition = snapped.clamp(0.0, 0.9);
      _positionOverrides[id] = finalPosition;
    }

    // Update local list immediately
    _kin = _kin.map((person) {
      if (person.id == id) {
        if (finalPosition == null) {
          return person.copyWith(clearPositionOverride: true);
        } else {
          return person.copyWith(positionOverride: finalPosition);
        }
      }
      return person;
    }).toList();

    notifyListeners();

    // Save to API in the background
    try {
      await _api.updateKin(
        id: id,
        positionOverride: finalPosition,
      );
    } catch (e) {
      // Log error but don't disrupt the UI
      debugPrint('Failed to save position: $e');
      // Could show a snackbar here if we had context
    }
  }

  // Release manual position override — return to natural position
  Future<void> releasePosition(String id) async {
    _positionOverrides.remove(id);

    // Update local list immediately
    _kin = _kin.map((person) {
      if (person.id == id) {
        return person.copyWith(clearPositionOverride: true);
      }
      return person;
    }).toList();

    notifyListeners();

    // Save to API in the background
    try {
      await _api.updateKin(
        id: id,
        positionOverride: null,
      );
    } catch (e) {
      debugPrint('Failed to release position: $e');
    }
  }

  // Add a new linked kin
  Future<void> addKinLinked(String linkedProfileId) async {
    try {
      await _api.addKinLinked(linkedProfileId: linkedProfileId);
      await loadKin(); // Reload the list
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      rethrow;
    }
  }

  // Add a new local kin
  Future<void> addKinLocal({
    required String name,
    String? photoUrl,
    DateTime? birthday,
  }) async {
    try {
      await _api.addKinLocal(
        localName: name,
        localPhotoUrl: photoUrl,
        localBirthday: birthday?.toIso8601String(),
      );
      await loadKin(); // Reload the list
    } catch (e) {
      // If API fails (e.g., not authenticated), save locally only
      debugPrint('API failed, adding to local state only: $e');

      // Create a new local-only kin person with generated ID
      final newPerson = KinPerson(
        id: const Uuid().v4(), // Generate local ID
        name: name,
        photoUrl: photoUrl,
        type: KinPersonType.local,
        birthday: birthday,
        allDates: birthday != null ? [birthday] : [],
      );

      // Add to local list
      _kin = [..._kin, newPerson];

      // Update natural positions for the new list
      _updateNaturalPositions(_kin);

      // Save to local database
      await LocalDb.instance.saveLocalKin({
        'id': newPerson.id,
        'name': newPerson.name,
        'photo_url': newPerson.photoUrl,
        'birthday': newPerson.birthday?.toIso8601String(),
        'position_override': null,
        'created_at': DateTime.now().toIso8601String(),
      });

      notifyListeners();
      // Don't rethrow - silently handle the error
    }
  }

  // Delete a kin
  Future<void> deleteKin(String id) async {
    try {
      await _api.deleteKin(id);
      await loadKin(); // Reload the list
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      rethrow;
    }
  }

  // Update kin details (for local kin)
  Future<void> updateKinDetails({
    required String id,
    String? localName,
    String? localPhotoUrl,
    DateTime? localBirthday,
  }) async {
    try {
      await _api.updateKin(
        id: id,
        localName: localName,
        localPhotoUrl: localPhotoUrl,
        localBirthday: localBirthday?.toIso8601String(),
      );
      await loadKin(); // Reload the list
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      rethrow;
    }
  }

  // Legacy method - kept for compatibility but should be removed later
  void holdAtTop(String id) {
    setPosition(id, 0.0);
  }
}