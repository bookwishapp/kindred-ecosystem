import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:path/path.dart' as path;

class PhotoUploadService {
  final Dio _dio;
  final String baseUrl;
  final Future<String?> Function() tokenProvider;

  PhotoUploadService({
    required Dio dio,
    required this.baseUrl,
    required this.tokenProvider,
  }) : _dio = dio;

  /// Upload a photo to S3 using presigned URL
  /// Returns the public S3 URL if successful, null otherwise
  Future<String?> uploadPhoto(String localFilePath) async {
    try {
      final file = File(localFilePath);
      if (!await file.exists()) {
        debugPrint('File does not exist: $localFilePath');
        return null;
      }

      // Get file info
      final fileName = path.basename(localFilePath);
      final extension = path.extension(fileName).toLowerCase();

      // Determine content type
      String contentType;
      switch (extension) {
        case '.jpg':
        case '.jpeg':
          contentType = 'image/jpeg';
          break;
        case '.png':
          contentType = 'image/png';
          break;
        case '.gif':
          contentType = 'image/gif';
          break;
        case '.webp':
          contentType = 'image/webp';
          break;
        default:
          contentType = 'image/jpeg'; // Default fallback
      }

      // Step 1: Get presigned upload URL from backend
      final uploadUrlData = await _getUploadUrl(fileName, contentType);
      if (uploadUrlData == null) {
        return null;
      }

      // Step 2: Upload file directly to S3 using presigned URL
      final uploadSuccess = await _uploadToS3(
        uploadUrlData['uploadUrl'],
        file,
        contentType,
      );

      if (!uploadSuccess) {
        return null;
      }

      // Step 3: Return the public URL
      return uploadUrlData['publicUrl'];
    } catch (e) {
      debugPrint('Error uploading photo: $e');
      return null;
    }
  }

  /// Get presigned upload URL from backend
  Future<Map<String, dynamic>?> _getUploadUrl(
    String fileName,
    String contentType,
  ) async {
    try {
      final token = await tokenProvider();
      if (token == null) {
        debugPrint('No auth token available for upload');
        return null;
      }

      final response = await _dio.post(
        '$baseUrl/upload-url',
        data: {'contentType': contentType},
        options: Options(
          headers: {
            'Authorization': 'Bearer $token',
            'Content-Type': 'application/json',
          },
          validateStatus: (status) => status! < 500,
        ),
      );

      if (response.statusCode == 200) {
        return response.data;
      }

      debugPrint('Failed to get upload URL: ${response.data}');
      return null;
    } catch (e) {
      debugPrint('Error getting upload URL: $e');
      return null;
    }
  }

  /// Upload file to S3 using presigned URL
  Future<bool> _uploadToS3(
    String uploadUrl,
    File file,
    String contentType,
  ) async {
    try {
      // Read file as bytes
      final bytes = await file.readAsBytes();

      // Upload directly to S3 using presigned URL
      // Note: No Authorization header needed for presigned URLs
      final response = await _dio.put(
        uploadUrl,
        data: bytes,
        options: Options(
          headers: {
            'Content-Type': contentType,
            'Content-Length': bytes.length.toString(),
          },
          validateStatus: (status) => status! < 400,
          // Disable default transformations for binary data
          responseType: ResponseType.plain,
        ),
      );

      if (response.statusCode == 200) {
        debugPrint('Successfully uploaded to S3');
        return true;
      }

      debugPrint('S3 upload failed with status: ${response.statusCode}');
      return false;
    } catch (e) {
      debugPrint('Error uploading to S3: $e');
      return false;
    }
  }

  /// Upload photo and return public URL (convenience method)
  static Future<String?> upload({
    required String filePath,
    required Dio dio,
    required String baseUrl,
    required Future<String?> Function() tokenProvider,
  }) async {
    final service = PhotoUploadService(
      dio: dio,
      baseUrl: baseUrl,
      tokenProvider: tokenProvider,
    );
    return service.uploadPhoto(filePath);
  }
}
