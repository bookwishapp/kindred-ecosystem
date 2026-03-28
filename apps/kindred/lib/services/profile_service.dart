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

  List<Map<String, dynamic>> get wishlistLinks {
    if (_profile?['wishlist_links'] != null) {
      return List<Map<String, dynamic>>.from(_profile!['wishlist_links']);
    }
    return [];
  }

  List<Map<String, dynamic>> get sharedDates {
    if (_profile?['dates'] != null) {
      return List<Map<String, dynamic>>.from(_profile!['dates']);
    }
    return [];
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
    String? username,
    DateTime? birthday,
    String? photoUrl,
  }) async {
    _loading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _api.createOrUpdateProfile(
        name: name,
        username: username,
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


  // Add wishlist link
  Future<void> addWishlistLink(String label, String url) async {
    try {
      final linkData = await _api.addWishlistLink(label: label, url: url);

      // Update local profile with new link
      if (_profile != null) {
        final links = List<Map<String, dynamic>>.from(
          _profile!['wishlist_links'] ?? [],
        );
        links.add(linkData);
        _profile!['wishlist_links'] = links;
        notifyListeners();
      }
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      rethrow;
    }
  }

  // Remove wishlist link
  Future<void> removeWishlistLink(String linkId) async {
    try {
      await _api.deleteWishlistLink(linkId);

      // Update local profile
      if (_profile != null && _profile!['wishlist_links'] != null) {
        final links = List<Map<String, dynamic>>.from(
          _profile!['wishlist_links'],
        );
        links.removeWhere((link) => link['id'] == linkId);
        _profile!['wishlist_links'] = links;
        notifyListeners();
      }
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      rethrow;
    }
  }

  // Add shared date
  Future<void> addSharedDate(
    String label,
    DateTime date, {
    bool recursAnnually = true,
  }) async {
    try {
      final dateData = await _api.addSharedDate(
        label: label,
        date: date.toIso8601String(),
        recursAnnually: recursAnnually,
      );

      // Update local profile with new date
      if (_profile != null) {
        final dates = List<Map<String, dynamic>>.from(
          _profile!['dates'] ?? [],
        );
        dates.add(dateData);
        _profile!['dates'] = dates;
        notifyListeners();
      }
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      rethrow;
    }
  }

  // Remove shared date
  Future<void> removeSharedDate(String dateId) async {
    try {
      await _api.deleteSharedDate(dateId);

      // Update local profile
      if (_profile != null && _profile!['dates'] != null) {
        final dates = List<Map<String, dynamic>>.from(
          _profile!['dates'],
        );
        dates.removeWhere((date) => date['id'] == dateId);
        _profile!['dates'] = dates;
        notifyListeners();
      }
    } catch (e) {
      _error = e.toString();
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