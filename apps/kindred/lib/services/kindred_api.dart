import 'package:core/core.dart';
import 'package:flutter/foundation.dart';
import '../models/kin_person.dart';

/// API service for Kindred backend
class KindredApi {
  final ApiClient _apiClient;

  KindredApi({
    required String baseUrl,
    required SecureStorageService storage,
    Future<String?> Function()? tokenProvider,
    VoidCallback? onUnauthorized,
  }) : _apiClient = ApiClient(
         baseUrl: baseUrl,
         tokenProvider: tokenProvider ?? storage.getAuthToken,
         onUnauthorized: onUnauthorized,
       );

  // Profile endpoints
  Future<Map<String, dynamic>> getMyProfile() async {
    return await _apiClient.get('/profiles/me');
  }

  Future<Map<String, dynamic>> createProfile({
    required String name,
    String? photoUrl,
    String? birthday,
    String? bio,
  }) async {
    return await _apiClient.post(
      '/profiles',
      data: {
        'name': name,
        if (photoUrl != null) 'photo_url': photoUrl,
        if (birthday != null) 'birthday': birthday,
        if (bio != null) 'bio': bio,
      },
    );
  }

  Future<Map<String, dynamic>> updateProfile({
    String? name,
    String? photoUrl,
    String? birthday,
    String? bio,
  }) async {
    final data = <String, dynamic>{};
    if (name != null) data['name'] = name;
    if (photoUrl != null) data['photo_url'] = photoUrl;
    if (birthday != null) data['birthday'] = birthday;
    if (bio != null) data['bio'] = bio;

    return await _apiClient.put('/profiles/me', data: data);
  }

  Future<Map<String, dynamic>> addWishlistLink({
    required String label,
    required String url,
  }) async {
    return await _apiClient.post(
      '/profiles/me/wishlist-links',
      data: {'label': label, 'url': url},
    );
  }

  Future<void> deleteWishlistLink(String id) async {
    await _apiClient.delete('/profiles/me/wishlist-links/$id');
  }

  Future<Map<String, dynamic>> addProfileDate({
    required String label,
    required String date,
    bool recursAnnually = true,
  }) async {
    return await _apiClient.post(
      '/profiles/me/dates',
      data: {'label': label, 'date': date, 'recurs_annually': recursAnnually},
    );
  }

  Future<void> deleteProfileDate(String id) async {
    await _apiClient.delete('/profiles/me/dates/$id');
  }

  Future<Map<String, dynamic>> getProfile(String userId) async {
    return await _apiClient.get('/profiles/$userId');
  }

  Future<void> deleteProfile() async {
    await _apiClient.delete('/profiles/me');
  }

  // Kin endpoints
  Future<List<KinPerson>> getKin() async {
    final response = await _apiClient.get('/kin');
    final kinList = response as List<dynamic>;
    return kinList.map((json) => KinPerson.fromJson(json)).toList();
  }

  Future<Map<String, dynamic>> addKinLinked({
    required String linkedProfileId,
  }) async {
    return await _apiClient.post(
      '/kin',
      data: {'type': 'linked', 'linked_profile_id': linkedProfileId},
    );
  }

  Future<Map<String, dynamic>> addKinLocal({
    required String localName,
    String? localPhotoUrl,
    String? localBirthday,
  }) async {
    return await _apiClient.post(
      '/kin',
      data: {
        'type': 'local',
        'local_name': localName,
        if (localPhotoUrl != null) 'local_photo_url': localPhotoUrl,
        if (localBirthday != null) 'local_birthday': localBirthday,
      },
    );
  }

  Future<Map<String, dynamic>> updateKin({
    required String id,
    double? positionOverride,
    String? localName,
    String? localPhotoUrl,
    String? localBirthday,
  }) async {
    final data = <String, dynamic>{};
    if (positionOverride != null) data['position_override'] = positionOverride;
    if (localName != null) data['local_name'] = localName;
    if (localPhotoUrl != null) data['local_photo_url'] = localPhotoUrl;
    if (localBirthday != null) data['local_birthday'] = localBirthday;

    return await _apiClient.put('/kin/$id', data: data);
  }

  Future<void> deleteKin(String id) async {
    await _apiClient.delete('/kin/$id');
  }

  Future<Map<String, dynamic>> addKinDate({
    required String kinId,
    required String label,
    required String date,
    bool recursAnnually = true,
  }) async {
    return await _apiClient.post(
      '/kin/$kinId/dates',
      data: {'label': label, 'date': date, 'recurs_annually': recursAnnually},
    );
  }

  Future<void> deleteKinDate({
    required String kinId,
    required String dateId,
  }) async {
    await _apiClient.delete('/kin/$kinId/dates/$dateId');
  }

  // Health check
  Future<Map<String, dynamic>> healthCheck() async {
    return await _apiClient.get('/health');
  }

  // Backup endpoints
  Future<void> saveBackup({required String ciphertext}) async {
    await _apiClient.post(
      '/backup',
      data: {'ciphertext': ciphertext, 'version': 1},
    );
  }

  Future<Map<String, dynamic>?> getBackup() async {
    final response = await _apiClient.get('/backup');
    return response['backup'] as Map<String, dynamic>?;
  }
}

/// Factory for creating KindredApi instances
class KindredApiFactory {
  static KindredApi create({
    String? baseUrl,
    SecureStorageService? storage,
    Future<String?> Function()? tokenProvider,
    VoidCallback? onUnauthorized,
  }) {
    return KindredApi(
      baseUrl: baseUrl ?? _getBaseUrl(),
      storage: storage ?? SecureStorageService(),
      tokenProvider: tokenProvider,
      onUnauthorized: onUnauthorized,
    );
  }

  static String _getBaseUrl() {
    return const String.fromEnvironment(
      'KINDRED_API_URL',
      defaultValue: 'https://api.fromkindred.com',
    );
  }
}
