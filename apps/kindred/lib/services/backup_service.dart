import 'dart:convert';
import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:encrypt/encrypt.dart' as encrypt;
import 'package:pointycastle/pointycastle.dart';
import 'package:pointycastle/key_derivators/pbkdf2.dart';
import 'package:pointycastle/digests/sha256.dart';
import 'package:pointycastle/macs/hmac.dart';
import 'local_db.dart';
import 'kindred_api.dart';

class BackupService {
  static const String _salt = 'kindred-backup-v1';
  static const int _iterations = 10000;
  static const int _keyLength = 32; // 256 bits for AES-256

  /// Derive an encryption key from the access token using PBKDF2
  Uint8List _deriveKey(String token) {
    // Use first 32 chars of token as password (or full token if shorter)
    final password = token.substring(0, min(32, token.length));
    final passwordBytes = utf8.encode(password);
    final saltBytes = utf8.encode(_salt);

    // Setup PBKDF2 with SHA256
    final pbkdf2 = PBKDF2KeyDerivator(HMac(SHA256Digest(), 64));
    final params = Pbkdf2Parameters(saltBytes, _iterations, _keyLength);
    pbkdf2.init(params);

    // Derive key
    final key = Uint8List(_keyLength);
    pbkdf2.deriveKey(passwordBytes, 0, key, 0);

    return key;
  }

  /// Encrypt plaintext using AES-256-GCM
  String _encrypt(String plaintext, String token) {
    try {
      final key = _deriveKey(token);
      final encrypter = encrypt.Encrypter(
        encrypt.AES(encrypt.Key(key), mode: encrypt.AESMode.gcm),
      );

      // Generate random IV (12 bytes for GCM)
      final iv = encrypt.IV.fromSecureRandom(12);

      // Encrypt
      final encrypted = encrypter.encrypt(plaintext, iv: iv);

      // Combine IV and ciphertext for storage
      // Format: base64(iv + encrypted_bytes)
      final combined = base64.encode([...iv.bytes, ...encrypted.bytes]);
      return combined;
    } catch (e) {
      debugPrint('Encryption failed: $e');
      rethrow;
    }
  }

  /// Decrypt ciphertext using AES-256-GCM
  String _decrypt(String ciphertext, String token) {
    try {
      final key = _deriveKey(token);
      final encrypter = encrypt.Encrypter(
        encrypt.AES(encrypt.Key(key), mode: encrypt.AESMode.gcm),
      );

      // Decode the combined data
      final combined = base64.decode(ciphertext);

      // Extract IV (first 12 bytes) and encrypted data (rest)
      final iv = encrypt.IV(Uint8List.fromList(combined.sublist(0, 12)));
      final encryptedBytes = combined.sublist(12);

      // Decrypt
      final encrypted = encrypt.Encrypted(encryptedBytes);
      final decrypted = encrypter.decrypt(encrypted, iv: iv);

      return decrypted;
    } catch (e) {
      debugPrint('Decryption failed: $e');
      rethrow;
    }
  }

  /// Backup all private data to the server (encrypted)
  Future<void> backup({
    required String? userId,
    required String accessToken,
    required KindredApi api,
  }) async {
    if (userId == null) {
      debugPrint('Backup skipped: no user ID');
      return;
    }

    try {
      final db = LocalDb.instance;

      // Collect all local kin and their private data
      final allKin = await db.getLocalKin();
      final backup = <String, dynamic>{};

      for (final kin in allKin) {
        final id = kin['id'] as String;
        backup[id] = {
          'kin': kin,
          'notes': await db.getNotes(id),
          'dates': await db.getPrivateDates(id),
          'links': await db.getPrivateWishlistLinks(id),
        };
      }

      // Collect deleted IDs from a tombstone table (to be created)
      final deletedIds = await db.getDeletedKinIds();

      final fullBackup = {
        'version': 1,
        'created_at': DateTime.now().toIso8601String(),
        'deleted_ids': deletedIds,
        'data': backup,
      };

      // Serialize and encrypt
      final plaintext = jsonEncode(fullBackup);
      final encrypted = _encrypt(plaintext, accessToken);

      // Send to server
      await api.saveBackup(ciphertext: encrypted);
      debugPrint('Backup completed successfully');
    } catch (e) {
      // Backup failure should be silent - never block the UI
      debugPrint('Backup failed silently: $e');
    }
  }

  /// Restore encrypted backup from server
  Future<void> restore({
    required String? userId,
    required String accessToken,
    required KindredApi api,
  }) async {
    if (userId == null) {
      debugPrint('Restore skipped: no user ID');
      return;
    }

    try {
      // Fetch backup from server
      final backup = await api.getBackup();
      if (backup == null) {
        debugPrint('No backup found to restore');
        return;
      }

      final ciphertext = backup['ciphertext'] as String;

      // Decrypt
      final plaintext = _decrypt(ciphertext, accessToken);
      final fullBackup = jsonDecode(plaintext) as Map<String, dynamic>;

      final data = fullBackup['data'] as Map<String, dynamic>;

      // Restore to local db
      final db = LocalDb.instance;

      for (final entry in data.entries) {
        final kinId = entry.key;
        final kinBackup = entry.value as Map<String, dynamic>;

        // Restore kin person
        final kinData = kinBackup['kin'] as Map<String, dynamic>;

        // Check if this kin already exists locally
        final existing = await db.getLocalKin();
        final existingKin = existing.firstWhere(
          (k) => k['id'] == kinId,
          orElse: () => {},
        );

        if (existingKin.isEmpty) {
          // Kin doesn't exist, restore it
          await db.saveLocalKin(kinData);
        }
        // If kin exists, skip it (don't overwrite existing local data)

        // Restore notes (additive - never delete existing)
        final notes = kinBackup['notes'] as List<dynamic>;
        for (final note in notes) {
          final noteData = note as Map<String, dynamic>;
          // Check if note already exists
          final existingNotes = await db.getNotes(kinId);
          final exists = existingNotes.any((n) => n['id'] == noteData['id']);
          if (!exists) {
            // Add note with the same content but new ID (LocalDb generates it)
            await db.addNote(kinId, noteData['body'] as String);
          }
        }

        // Restore private dates (additive)
        final dates = kinBackup['dates'] as List<dynamic>;
        for (final date in dates) {
          final dateData = date as Map<String, dynamic>;
          final existingDates = await db.getPrivateDates(kinId);
          final exists = existingDates.any((d) => d['id'] == dateData['id']);
          if (!exists) {
            await db.addPrivateDate(
              kinId,
              dateData['label'] as String,
              DateTime.parse(dateData['date'] as String),
              (dateData['recurs_annually'] as int?) == 1,
            );
          }
        }

        // Restore private wishlist links (additive)
        final links = kinBackup['links'] as List<dynamic>;
        for (final link in links) {
          final linkData = link as Map<String, dynamic>;
          final existingLinks = await db.getPrivateWishlistLinks(kinId);
          final exists = existingLinks.any((l) => l['id'] == linkData['id']);
          if (!exists) {
            await db.addPrivateWishlistLink(
              kinId,
              linkData['label'] as String,
              linkData['url'] as String,
            );
          }
        }
      }

      // Honor deletions from backup
      final deletedIds =
          (fullBackup['deleted_ids'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [];
      for (final id in deletedIds) {
        await db.deleteLocalKin(id);
      }

      debugPrint('Restore completed successfully');
    } catch (e) {
      debugPrint('Restore failed: $e');
      // Don't rethrow - restore failure shouldn't block login
    }
  }
}
