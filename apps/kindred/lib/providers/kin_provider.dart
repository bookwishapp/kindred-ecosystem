import 'package:flutter/foundation.dart';
import '../models/kin_person.dart';
import '../services/kindred_api.dart';

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
      _kin = kinList;

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

      // Fall back to empty list on error
      _kin = [];
      notifyListeners();
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
      _error = e.toString();
      notifyListeners();
      rethrow;
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