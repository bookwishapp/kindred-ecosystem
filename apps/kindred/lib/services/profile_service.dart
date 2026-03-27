import 'package:flutter/foundation.dart';
import '../services/auth_api.dart';
import '../services/local_db.dart';

class ProfileService extends ChangeNotifier {
  final AuthApi _api;
  Map<String, dynamic>? _profile;
  bool _loading = false;
  String? _error;
  final LocalDb _db = LocalDb.instance;

  ProfileService({required AuthApi api}) : _api = api {
    // Load cached profile on initialization
    _loadCachedProfile();
  }

  // Getters
  Map<String, dynamic>? get profile => _profile;
  bool get hasProfile => _profile != null;
  bool get loading => _loading;
  String? get error => _error;

  String? get name => _profile?['name'];
  String? get photoUrl => _profile?['photo_url'];
  DateTime? get birthday {
    if (_profile?['birthday'] != null) {
      return DateTime.tryParse(_profile!['birthday']);
    }
    return null;
  }


  // Load cached profile from local storage
  Future<void> _loadCachedProfile() async {
    try {
      final name = await _db.getSetting('profile_name');
      final photoUrl = await _db.getSetting('profile_photo_url');
      final birthday = await _db.getSetting('profile_birthday');

      if (name != null) {
        _profile = {
          'name': name,
          if (photoUrl != null) 'photo_url': photoUrl,
          if (birthday != null) 'birthday': birthday,
        };
        notifyListeners();
      }
    } catch (e) {
      debugPrint('Failed to load cached profile: $e');
    }

    // After loading cache, sync with API in background
    loadProfile();
  }

  // Save profile to cache
  Future<void> _saveToCache() async {
    if (_profile == null) return;

    try {
      if (_profile!['name'] != null) {
        await _db.setSetting('profile_name', _profile!['name']);
      }
      if (_profile!['photo_url'] != null) {
        await _db.setSetting('profile_photo_url', _profile!['photo_url']);
      }
      if (_profile!['birthday'] != null) {
        await _db.setSetting('profile_birthday', _profile!['birthday']);
      }
    } catch (e) {
      debugPrint('Failed to cache profile: $e');
    }
  }

  // Load profile from API
  Future<void> loadProfile() async {
    _loading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _api.getMyProfile();
      _profile = response['profile'];
      _loading = false;

      // Cache the profile after successful load
      await _saveToCache();

      notifyListeners();
    } catch (e) {
      // If 404, profile doesn't exist yet
      if (e.toString().contains('404')) {
        _profile = null;
      } else {
        _error = e.toString();
      }
      _loading = false;
      notifyListeners();
    }
  }

  // Create or update profile
  Future<void> saveProfile({
    String? name,
    DateTime? birthday,
    String? photoUrl,
  }) async {
    _loading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _api.createOrUpdateProfile(
        name: name,
        birthday: birthday?.toIso8601String(),
        photoUrl: photoUrl,
      );
      _profile = response['profile'];
      _loading = false;

      // Cache the profile after successful save
      await _saveToCache();

      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _loading = false;
      notifyListeners();
      rethrow;
    }
  }


  // Clear profile (for logout)
  void clearProfile() {
    _profile = null;
    _error = null;
    notifyListeners();
  }
}