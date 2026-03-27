import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import 'package:uuid/uuid.dart';

/// Singleton service that manages the local SQLite database
class LocalDb {
  static final LocalDb instance = LocalDb._internal();
  static Database? _database;

  LocalDb._internal();

  Future<Database> get database async {
    _database ??= await _initDatabase();
    return _database!;
  }

  Future<Database> _initDatabase() async {
    final path = join(await getDatabasesPath(), 'kindred_local.db');
    return openDatabase(
      path,
      version: 3,
      onCreate: _onCreate,
      onUpgrade: _onUpgrade,
    );
  }

  Future<void> _onCreate(Database db, int version) async {
    // Notes table for private notes about kin
    await db.execute('''
      CREATE TABLE kin_notes (
        id TEXT PRIMARY KEY,
        kin_record_id TEXT NOT NULL,
        body TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    ''');

    // Private dates table for dates you keep about kin
    await db.execute('''
      CREATE TABLE kin_private_dates (
        id TEXT PRIMARY KEY,
        kin_record_id TEXT NOT NULL,
        label TEXT NOT NULL,
        date TEXT NOT NULL,
        recurs_annually INTEGER DEFAULT 1
      )
    ''');

    // Private wishlist links for things they might like
    await db.execute('''
      CREATE TABLE kin_private_wishlist_links (
        id TEXT PRIMARY KEY,
        kin_record_id TEXT NOT NULL,
        label TEXT NOT NULL,
        url TEXT NOT NULL
      )
    ''');

    // App settings table for tracking app state
    await db.execute('''
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    ''');

    // Kin people table for locally saved kin
    await db.execute('''
      CREATE TABLE IF NOT EXISTS kin_people (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        photo_url TEXT,
        birthday TEXT,
        position_override REAL,
        created_at TEXT NOT NULL
      )
    ''');
  }

  Future<void> _onUpgrade(Database db, int oldVersion, int newVersion) async {
    if (oldVersion < 2) {
      // Add app_settings table in version 2
      await db.execute('''
        CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )
      ''');
    }
    if (oldVersion < 3) {
      // Add kin_people table in version 3
      await db.execute('''
        CREATE TABLE IF NOT EXISTS kin_people (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          photo_url TEXT,
          birthday TEXT,
          position_override REAL,
          created_at TEXT NOT NULL
        )
      ''');
    }
  }

  // ========== Notes Methods ==========

  /// Get all notes for a kin person
  Future<List<Map<String, dynamic>>> getNotes(String kinRecordId) async {
    final db = await database;
    return db.query(
      'kin_notes',
      where: 'kin_record_id = ?',
      whereArgs: [kinRecordId],
      orderBy: 'created_at DESC',
    );
  }

  /// Add a new note about a kin person
  Future<void> addNote(String kinRecordId, String body) async {
    final db = await database;
    await db.insert('kin_notes', {
      'id': const Uuid().v4(),
      'kin_record_id': kinRecordId,
      'body': body,
      'created_at': DateTime.now().toIso8601String(),
    });
  }

  /// Delete a note by ID
  Future<void> deleteNote(String id) async {
    final db = await database;
    await db.delete(
      'kin_notes',
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  // ========== Private Dates Methods ==========

  /// Get all private dates for a kin person
  Future<List<Map<String, dynamic>>> getPrivateDates(String kinRecordId) async {
    final db = await database;
    return db.query(
      'kin_private_dates',
      where: 'kin_record_id = ?',
      whereArgs: [kinRecordId],
    );
  }

  /// Add a new private date for a kin person
  Future<void> addPrivateDate(
    String kinRecordId,
    String label,
    DateTime date,
    bool recursAnnually,
  ) async {
    final db = await database;
    await db.insert('kin_private_dates', {
      'id': const Uuid().v4(),
      'kin_record_id': kinRecordId,
      'label': label,
      'date': date.toIso8601String(),
      'recurs_annually': recursAnnually ? 1 : 0,
    });
  }

  /// Delete a private date by ID
  Future<void> deletePrivateDate(String id) async {
    final db = await database;
    await db.delete(
      'kin_private_dates',
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  // ========== Private Wishlist Links Methods ==========

  /// Get all private wishlist links for a kin person
  Future<List<Map<String, dynamic>>> getPrivateWishlistLinks(String kinRecordId) async {
    final db = await database;
    return db.query(
      'kin_private_wishlist_links',
      where: 'kin_record_id = ?',
      whereArgs: [kinRecordId],
    );
  }

  /// Add a new private wishlist link for a kin person
  Future<void> addPrivateWishlistLink(
    String kinRecordId,
    String label,
    String url,
  ) async {
    final db = await database;
    await db.insert('kin_private_wishlist_links', {
      'id': const Uuid().v4(),
      'kin_record_id': kinRecordId,
      'label': label,
      'url': url,
    });
  }

  /// Delete a private wishlist link by ID
  Future<void> deletePrivateWishlistLink(String id) async {
    final db = await database;
    await db.delete(
      'kin_private_wishlist_links',
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  // ========== App Settings Methods ==========

  /// Check if this is the first launch of the app
  Future<bool> isFirstLaunch() async {
    final db = await database;
    final settings = await db.query(
      'app_settings',
      where: 'key = ?',
      whereArgs: ['has_launched'],
    );
    return settings.isEmpty;
  }

  /// Mark that the app has been launched
  Future<void> markLaunched() async {
    final db = await database;
    await db.insert(
      'app_settings',
      {
        'key': 'has_launched',
        'value': 'true',
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  /// Get a setting value
  Future<String?> getSetting(String key) async {
    final db = await database;
    final results = await db.query(
      'app_settings',
      where: 'key = ?',
      whereArgs: [key],
    );
    if (results.isNotEmpty) {
      return results.first['value'] as String?;
    }
    return null;
  }

  /// Set a setting value
  Future<void> setSetting(String key, String value) async {
    final db = await database;
    await db.insert(
      'app_settings',
      {
        'key': key,
        'value': value,
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  /// Remove a setting
  Future<void> removeSetting(String key) async {
    final db = await database;
    await db.delete(
      'app_settings',
      where: 'key = ?',
      whereArgs: [key],
    );
  }

  // ========== Kin People Methods ==========

  /// Save a local kin person
  Future<void> saveLocalKin(Map<String, dynamic> kinData) async {
    final db = await database;
    await db.insert(
      'kin_people',
      kinData,
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  /// Get all local kin people
  Future<List<Map<String, dynamic>>> getLocalKin() async {
    final db = await database;
    return db.query('kin_people', orderBy: 'created_at DESC');
  }

  /// Delete a local kin person
  Future<void> deleteLocalKin(String id) async {
    final db = await database;
    await db.delete('kin_people', where: 'id = ?', whereArgs: [id]);
  }
}