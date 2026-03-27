import 'package:core/core.dart';
import 'package:flutter/foundation.dart';

/// API service for Auth backend profile operations
class AuthApi {
  final ApiClient _apiClient;

  AuthApi({
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
    return await _apiClient.get('/profile');
  }

  Future<Map<String, dynamic>> createOrUpdateProfile({
    String? name,
    String? photoUrl,
    String? birthday,
  }) async {
    final data = <String, dynamic>{};
    if (name != null) data['name'] = name;
    if (photoUrl != null) data['photo_url'] = photoUrl;
    if (birthday != null) data['birthday'] = birthday;

    return await _apiClient.post('/profile', data: data);
  }

  Future<Map<String, dynamic>> getPublicProfile(String userId) async {
    return await _apiClient.get('/profile/$userId');
  }

  Future<void> deleteProfile() async {
    await _apiClient.delete('/profile');
  }

  // Upload URL endpoint
  Future<Map<String, dynamic>> getUploadUrl({String contentType = 'image/jpeg'}) async {
    return await _apiClient.post('/upload-url', data: {
      'contentType': contentType,
    });
  }
}

/// Factory for creating AuthApi instances
class AuthApiFactory {
  static AuthApi create({
    String? baseUrl,
    SecureStorageService? storage,
    Future<String?> Function()? tokenProvider,
    VoidCallback? onUnauthorized,
  }) {
    return AuthApi(
      baseUrl: baseUrl ?? _getBaseUrl(),
      storage: storage ?? SecureStorageService(),
      tokenProvider: tokenProvider,
      onUnauthorized: onUnauthorized,
    );
  }

  static String _getBaseUrl() {
    return const String.fromEnvironment(
      'AUTH_API_URL',
      defaultValue: 'https://auth.terryheath.com',
    );
  }
}