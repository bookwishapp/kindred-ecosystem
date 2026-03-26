import 'package:flutter/foundation.dart';
import '../services/kindred_api.dart';

class ProfileService extends ChangeNotifier {
  final KindredApi _api;
  Map<String, dynamic>? _profile;
  bool _loading = false;
  String? _error;

  ProfileService({required KindredApi api}) : _api = api;

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

  // Load profile from API
  Future<void> loadProfile() async {
    _loading = true;
    _error = null;
    notifyListeners();

    try {
      final profileData = await _api.getMyProfile();
      _profile = profileData;
      _loading = false;
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

  // Create profile
  Future<void> createProfile({
    required String name,
    DateTime? birthday,
    String? photoUrl,
  }) async {
    _loading = true;
    _error = null;
    notifyListeners();

    try {
      final profileData = await _api.createProfile(
        name: name,
        birthday: birthday?.toIso8601String(),
        photoUrl: photoUrl,
      );
      _profile = profileData;
      _loading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _loading = false;
      notifyListeners();
      rethrow;
    }
  }

  // Update profile
  Future<void> updateProfile(
    Map<String, dynamic> updates,
  ) async {
    _loading = true;
    _error = null;
    notifyListeners();

    try {
      final profileData = await _api.updateProfile(
        name: updates['name'],
        photoUrl: updates['photo_url'],
        birthday: updates['birthday'],
        bio: updates['bio'],
      );
      _profile = profileData;
      _loading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _loading = false;
      notifyListeners();
      rethrow;
    }
  }

  // Add wishlist link
  Future<void> addWishlistLink(
    String label,
    String url,
  ) async {
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
      final dateData = await _api.addProfileDate(
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
      await _api.deleteProfileDate(dateId);

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