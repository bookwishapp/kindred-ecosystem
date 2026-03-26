import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

/// Exception thrown when API calls fail
class ApiException implements Exception {
  final int? statusCode;
  final String message;

  ApiException({this.statusCode, required this.message});

  @override
  String toString() => 'ApiException: $message${statusCode != null ? ' (Status: $statusCode)' : ''}';
}

/// Thin wrapper around Dio for making API calls
class ApiClient {
  final Dio _dio;
  final String baseUrl;
  final Future<String?> Function()? tokenProvider;
  final VoidCallback? onUnauthorized;

  ApiClient({
    required this.baseUrl,
    this.tokenProvider,
    this.onUnauthorized,
    Dio? dio,
  }) : _dio = dio ?? Dio() {
    _dio.options.baseUrl = baseUrl;
    _dio.options.connectTimeout = const Duration(seconds: 30);
    _dio.options.receiveTimeout = const Duration(seconds: 30);

    // Add request interceptor for auth token
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          if (tokenProvider != null) {
            final token = await tokenProvider!();
            if (token != null) {
              options.headers['Authorization'] = 'Bearer $token';
            }
          }
          handler.next(options);
        },
        onError: (error, handler) {
          if (error.response?.statusCode == 401 && onUnauthorized != null) {
            onUnauthorized!();
          }
          handler.next(error);
        },
      ),
    );
  }

  /// Make a GET request
  Future<dynamic> get(
    String path, {
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    try {
      final response = await _dio.get(
        path,
        queryParameters: queryParameters,
        options: options,
      );
      return response.data;
    } on DioException catch (e) {
      String errorMessage = 'Network error';

      if (e.response?.data != null) {
        final responseData = e.response!.data;
        if (responseData is Map && responseData['message'] != null) {
          errorMessage = responseData['message'].toString();
        } else if (responseData is String) {
          errorMessage = responseData;
        }
      } else if (e.message != null) {
        errorMessage = e.message!;
      }

      throw ApiException(
        statusCode: e.response?.statusCode,
        message: errorMessage,
      );
    }
  }

  /// Make a POST request
  Future<dynamic> post(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    try {
      final response = await _dio.post(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
      );
      return response.data;
    } on DioException catch (e) {
      String errorMessage = 'Network error';

      if (e.response?.data != null) {
        final responseData = e.response!.data;
        if (responseData is Map && responseData['message'] != null) {
          errorMessage = responseData['message'].toString();
        } else if (responseData is String) {
          errorMessage = responseData;
        }
      } else if (e.message != null) {
        errorMessage = e.message!;
      }

      throw ApiException(
        statusCode: e.response?.statusCode,
        message: errorMessage,
      );
    }
  }

  /// Make a PUT request
  Future<dynamic> put(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    try {
      final response = await _dio.put(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
      );
      return response.data;
    } on DioException catch (e) {
      String errorMessage = 'Network error';

      if (e.response?.data != null) {
        final responseData = e.response!.data;
        if (responseData is Map && responseData['message'] != null) {
          errorMessage = responseData['message'].toString();
        } else if (responseData is String) {
          errorMessage = responseData;
        }
      } else if (e.message != null) {
        errorMessage = e.message!;
      }

      throw ApiException(
        statusCode: e.response?.statusCode,
        message: errorMessage,
      );
    }
  }

  /// Make a DELETE request
  Future<dynamic> delete(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    try {
      final response = await _dio.delete(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
      );
      return response.data;
    } on DioException catch (e) {
      String errorMessage = 'Network error';

      if (e.response?.data != null) {
        final responseData = e.response!.data;
        if (responseData is Map && responseData['message'] != null) {
          errorMessage = responseData['message'].toString();
        } else if (responseData is String) {
          errorMessage = responseData;
        }
      } else if (e.message != null) {
        errorMessage = e.message!;
      }

      throw ApiException(
        statusCode: e.response?.statusCode,
        message: errorMessage,
      );
    }
  }
}