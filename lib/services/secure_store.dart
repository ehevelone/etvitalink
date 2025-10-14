import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStore {
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  /// --- STRING ---
  Future<void> setString(String key, String value) async {
    await _storage.write(key: key, value: value);
  }

  Future<String?> getString(String key) async {
    return await _storage.read(key: key);
  }

  /// --- ALIAS for convenience ---
  Future<String?> get(String key) async {
    return await getString(key);
  }

  /// --- BOOL ---
  Future<void> setBool(String key, bool value) async {
    await _storage.write(key: key, value: value.toString());
  }

  Future<bool> getBool(String key) async {
    final value = await _storage.read(key: key);
    if (value == null) return false;
    return value.toLowerCase() == 'true';
  }

  /// --- REMOVE SINGLE ITEM ---
  Future<void> remove(String key) async {
    await _storage.delete(key: key);
  }

  /// --- CLEAR ALL ITEMS ---
  Future<void> clear() async {
    await _storage.deleteAll();
  }
}
