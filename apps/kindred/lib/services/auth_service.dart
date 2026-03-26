import 'package:flutter/foundation.dart';
import 'package:dio/dio.dart';
import 'package:core/core.dart';

class AuthService extends ChangeNotifier {
  static const authBaseUrl = String.fromEnvironment(
    'AUTH_BASE_URL',
    defaultValue: 'https://auth.terryheath.com',
  );

  late final Dio _dio;
  final SecureStorageService _storage;

  String? _accessToken;
  bool _isLoading = false;
  String? _error;
  bool _magicLinkSent = false;

  AuthService({required SecureStorageService storage}) : _storage = storage {
    _dio = Dio(BaseOptions(
      baseUrl: authBaseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
    ));
    // Ensure baseUrl is set
    _dio.options.baseUrl = authBaseUrl;
  }

  // Getters
  String? get accessToken => _accessToken;
  String? get token => _accessToken; // Alias for compatibility
  bool get isAuthenticated => _accessToken != null;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get magicLinkSent => _magicLinkSent;

  // Initialize - load token from secure storage on app start
  Future<void> initialize() async {
    try {
      _accessToken = await _storage.getAuthToken();
      notifyListeners();
    } catch (e) {
      debugPrint('Failed to load auth token: $e');
    }
  }

  // Request magic link - POST to auth.terryheath.com/auth/request
  Future<void> requestMagicLink(String email) async {
    _isLoading = true;
    _error = null;
    _magicLinkSent = false;
    notifyListeners();

    try {
      debugPrint('Requesting magic link for: $email to $authBaseUrl/auth/request');
      await _dio.post('/auth/request', data: {
        'email': email,
        'redirect_uri': 'kindred://auth/verify',
        'app_name': 'Kindred',
      });
      debugPrint('Magic link request completed');

      _magicLinkSent = true;
      _isLoading = false;
      notifyListeners();
    } on DioException catch (e) {
      _error = e.response?.data?['error'] ?? 'Failed to send magic link';
      _isLoading = false;
      _magicLinkSent = false;
      notifyListeners();
      debugPrint('Magic link request failed: $_error');
      debugPrint('Status code: ${e.response?.statusCode}');
      debugPrint('Response data: ${e.response?.data}');
      debugPrint('Error type: ${e.type}');
      debugPrint('Error message: ${e.message}');
    }
  }

  // Verify token from deep link - GET auth.terryheath.com/auth/verify?token=TOKEN
  Future<void> verifyMagicLink(String token) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _dio.get('/auth/verify', queryParameters: {
        'token': token,
      });

      final data = response.data;
      if (data['access_token'] != null) {
        _accessToken = data['access_token'];

        // Save tokens to secure storage
        await _storage.saveAuthToken(data['access_token']);
        if (data['refresh_token'] != null) {
          await _storage.saveRefreshToken(data['refresh_token']);
        }
        if (data['user_id'] != null) {
          await _storage.saveUserId(data['user_id']);
        }

        _isLoading = false;
        _error = null;
        notifyListeners();
      } else {
        throw Exception('No access token received');
      }
    } on DioException catch (e) {
      _error = e.response?.data?['error'] ?? 'Failed to verify magic link';
      _isLoading = false;
      notifyListeners();

      // If 401, token might be expired or invalid
      if (e.response?.statusCode == 401) {
        await logout();
      }
      debugPrint('Magic link verification failed: $_error');
    }
  }

  // Refresh access token
  Future<void> refreshToken() async {
    try {
      final refreshToken = await _storage.getRefreshToken();
      if (refreshToken == null) {
        await logout();
        return;
      }

      final response = await _dio.post('/auth/refresh', data: {
        'refresh_token': refreshToken,
      });

      final data = response.data;
      if (data['access_token'] != null) {
        _accessToken = data['access_token'];
        await _storage.saveAuthToken(data['access_token']);

        if (data['refresh_token'] != null) {
          await _storage.saveRefreshToken(data['refresh_token']);
        }

        notifyListeners();
      } else {
        await logout();
      }
    } on DioException catch (e) {
      debugPrint('Token refresh failed: ${e.response?.data}');
      await logout();
    }
  }

  // Logout - clear tokens
  Future<void> logout() async {
    await _storage.clearAll();
    _accessToken = null;
    _magicLinkSent = false;
    _error = null;
    notifyListeners();
  }

  // Reset magic link sent state
  void resetMagicLinkState() {
    _magicLinkSent = false;
    notifyListeners();
  }
}