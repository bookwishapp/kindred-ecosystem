import 'package:flutter/foundation.dart';
import 'package:uuid/uuid.dart';
import '../models/kin_person.dart';
import '../services/kindred_api.dart';
import '../services/auth_api.dart';
import '../services/local_db.dart';
import '../services/backup_service.dart';
import '../services/auth_service.dart';

class KinProvider extends ChangeNotifier {
  final KindredApi _api;
  final AuthService? _authService;
  final AuthApi? _authApi;

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

  KinProvider({
    required KindredApi api,
    AuthService? authService,
    AuthApi? authApi,
  }) : _api = api,
       _authService = authService,
       _authApi = authApi {
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

      // For linked kin, fetch profile data from auth service
      final kinWithProfiles = await Future.wait(
        kinList.map((person) async {
          if (person.type == KinPersonType.linked &&
              person.linkedProfileId != null) {
            try {
              // Fetch profile from auth service
              final profile = await _authApi?.getPublicProfile(
                person.linkedProfileId!,
              );
              if (profile != null) {
                // Update person with profile data
                final profileData = profile['profile'] as Map<String, dynamic>?;
                if (profileData != null) {
                  return person.copyWith(
                    name: profileData['name'] ?? person.name,
                    photoUrl: profileData['photo_url'],
                    birthday: profileData['birthday'] != null
                        ? DateTime.parse(profileData['birthday'])
                        : person.birthday,
                    wishlistLinks: List<Map<String, dynamic>>.from(
                      profileData['wishlist_links'] ?? [],
                    ),
                    sharedDates: List<Map<String, dynamic>>.from(
                      profileData['shared_dates'] ?? [],
                    ),
                  );
                }
              }
            } catch (e) {
              debugPrint(
                'Failed to fetch profile for ${person.linkedProfileId}: $e',
              );
            }
          }
          return person;
        }),
      );

      // Load private dates for each kin person and populate allDates
      final kinWithDates = await Future.wait(
        kinWithProfiles.map((person) async {
          final privateDates = await LocalDb.instance.getPrivateDates(
            person.id,
          );

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
        }),
      );

      // Backfill photo_url from sqflite for kin whose server record has no photo
      final kinWithPhotos = await Future.wait(
        kinWithDates.map((person) async {
          if (person.photoUrl != null) return person;
          final localData = await LocalDb.instance.getLocalKin();
          debugPrint(
            'BACKFILL CHECK: person=${person.id}, localRecords=${localData.length}, match=${localData.where((d) => d['id'] == person.id).firstOrNull?['photo_url']}',
          );
          final match = localData
              .where((d) => d['id'] == person.id)
              .firstOrNull;
          if (match != null && match['photo_url'] != null) {
            return person.copyWith(photoUrl: match['photo_url'] as String);
          }
          return person;
        }),
      );
      _kin = kinWithPhotos;

      // Calculate natural positions based on ring intensities (which depend on allDates)
      _updateNaturalPositions(_kin);

      // Apply any cached position overrides while preserving allDates
      _kin = _kin.map((person) {
        final override = _positionOverrides[person.id];
        if (override != null) {
          return person.copyWith(
            positionOverride: override,
            allDates: person.allDates, // Explicitly preserve dates
          );
        }
        return person.copyWith(
          clearPositionOverride: true,
          allDates: person.allDates, // Explicitly preserve dates
        );
      }).toList();

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;

      // If API fails, start with empty list (will load from local SQLite below)
      _kin = [];
      debugPrint('API failed, loading from local storage: $e');
      notifyListeners();
    }

    // Always merge in local-only kin from database (whether API succeeded or failed)
    try {
      final localKinData = await LocalDb.instance.getLocalKin();
      final existingIds = _kin.map((k) => k.id).toSet();

      for (final data in localKinData) {
        if (!existingIds.contains(data['id'])) {
          // Load private dates for local kin
          final privateDates = await LocalDb.instance.getPrivateDates(
            data['id'],
          );

          // Combine birthday with private dates
          final allDates = <DateTime>[];
          if (data['birthday'] != null) {
            allDates.add(DateTime.parse(data['birthday']));
          }

          // Add private dates
          for (final dateMap in privateDates) {
            final dateStr = dateMap['date'] as String;
            allDates.add(DateTime.parse(dateStr));
          }

          final localPerson = KinPerson(
            id: data['id'],
            name: data['name'],
            photoUrl: data['photo_url'],
            type: KinPersonType.local,
            birthday: data['birthday'] != null
                ? DateTime.parse(data['birthday'])
                : null,
            allDates: allDates,
          );
          _kin.add(localPerson);
        }
      }

      // Calculate natural positions based on ring intensities (which depend on allDates)
      _updateNaturalPositions(_kin);

      // Apply any cached position overrides to the merged list while preserving allDates
      _kin = _kin.map((person) {
        final override = _positionOverrides[person.id];
        if (override != null) {
          return person.copyWith(
            positionOverride: override,
            allDates: person.allDates, // Explicitly preserve dates
          );
        }
        return person.copyWith(
          clearPositionOverride: true,
          allDates: person.allDates, // Explicitly preserve dates
        );
      }).toList();

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
        _lastKinList!.every(
          (person) => kinList.any(
            (p) => p.id == person.id && p.ringIntensity == person.ringIntensity,
          ),
        )) {
      return; // No changes, keep existing natural positions
    }

    _lastKinList = List.from(kinList);
    _naturalPositions.clear();

    // Sort by ring intensity to determine natural positions
    final sortedByIntensity = List.from(kinList);
    sortedByIntensity.sort(
      (a, b) => b.ringIntensity.compareTo(a.ringIntensity),
    );

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
    final person = _kin.firstWhere(
      (p) => p.id == id,
      orElse: () =>
          KinPerson(id: id, name: 'Unknown', type: KinPersonType.local),
    );

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
      await _api.updateKin(id: id, positionOverride: finalPosition);
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
      await _api.updateKin(id: id, positionOverride: null);
    } catch (e) {
      debugPrint('Failed to release position: $e');
    }
  }

  // Add a new linked kin
  Future<void> addKinLinked(String linkedProfileId) async {
    try {
      await _api.addKinLinked(linkedProfileId: linkedProfileId);
      await loadKin(); // Reload the list
      _triggerBackup(); // Backup after adding linked kin
    } catch (e) {
      _error = 'Could not keep this person right now.';
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
      // Generate a temporary local ID first
      final tempId = const Uuid().v4();

      // Save to sqflite immediately with temp ID
      await LocalDb.instance.saveLocalKin({
        'id': tempId,
        'name': name,
        'photo_url': photoUrl,
        'birthday': birthday?.toIso8601String(),
        'position_override': null,
        'created_at': DateTime.now().toIso8601String(),
      });
      debugPrint(
        'SQFLITE SAVE: tempId=$tempId, photo=${photoUrl != null ? "present" : "null"}',
      );

      // Try to sync to server
      final response = await _api.addKinLocal(
        localName: name,
        localPhotoUrl: null,
        localBirthday: birthday?.toIso8601String(),
      );

      final serverId = response['id'] as String;

      // Re-save under server ID and remove temp record
      await LocalDb.instance.saveLocalKin({
        'id': serverId,
        'name': name,
        'photo_url': photoUrl,
        'birthday': birthday?.toIso8601String(),
        'position_override': null,
        'created_at': DateTime.now().toIso8601String(),
      });
      await LocalDb.instance.deleteLocalKin(tempId);
      debugPrint('SQFLITE UPDATE: serverId=$serverId, photo saved');

      await loadKin();
      _triggerBackup();
    } catch (e) {
      // API failed — sqflite record already saved with temp ID, just load
      debugPrint('API failed, using local-only record: $e');
      await loadKin();
      _triggerBackup();
    }
  }

  // Delete a kin
  Future<void> deleteKin(String id) async {
    // Always delete locally first
    await LocalDb.instance.deleteLocalKin(id);
    await LocalDb.instance.addKinTombstone(id);
    _kin.removeWhere((p) => p.id == id);
    _positionOverrides.remove(id);
    _naturalPositions.remove(id);
    _updateNaturalPositions(_kin);
    notifyListeners();
    _triggerBackup();

    // Best-effort server delete — failure doesn't restore the person
    try {
      await _api.deleteKin(id);
    } catch (e) {
      debugPrint('Server delete failed (may be local-only kin): $e');
    }
  }

  // Update kin details (for local kin)
  Future<void> updateKinDetails({
    required String id,
    String? localName,
    DateTime? localBirthday,
  }) async {
    try {
      await _api.updateKin(
        id: id,
        localName: localName,
        localBirthday: localBirthday?.toIso8601String(),
      );
      await loadKin(); // Reload the list
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      rethrow;
    }
  }

  // Update photo for a local kin person
  Future<void> updateKinPhoto(String id, String photoPath) async {
    // Update in local database
    await LocalDb.instance.updateKinPhoto(id, photoPath);
    debugPrint('PHOTO UPDATE: id=$id, path=$photoPath');

    // Update in memory
    _kin = _kin.map((person) {
      if (person.id == id) {
        return person.copyWith(photoUrl: photoPath);
      }
      return person;
    }).toList();

    notifyListeners();
  }

  // Delete a local kin person
  Future<void> deleteLocalKin(String id) async {
    try {
      // Delete from database
      await LocalDb.instance.deleteLocalKin(id);

      // Remove from memory
      _kin.removeWhere((person) => person.id == id);

      // Update natural positions
      _updateNaturalPositions(_kin);

      notifyListeners();
      _triggerBackup(); // Backup after deleting kin
    } catch (e) {
      debugPrint('Failed to delete local kin: $e');
      rethrow;
    }
  }

  // Legacy method - kept for compatibility but should be removed later
  void holdAtTop(String id) {
    setPosition(id, 0.0);
  }

  // Trigger backup after data changes (fire-and-forget)
  void _triggerBackup() {
    if (_authService == null || !_authService.isAuthenticated) {
      debugPrint('Backup skipped: not authenticated');
      return;
    }

    // Fire and forget - backup failure should never block UI
    BackupService()
        .backup(
          userId: _authService.userId,
          accessToken: _authService.accessToken!,
          api: _api,
        )
        .catchError((e) => debugPrint('Backup failed silently: $e'));
  }
}
