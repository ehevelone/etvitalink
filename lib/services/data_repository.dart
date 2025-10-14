import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:vitalink/models.dart';
import 'secure_store.dart';

class DataRepository {
  static const _profileKey = 'profile';
  final SecureStore store;

  DataRepository([SecureStore? s]) : store = s ?? SecureStore();

  /// Save profile as JSON
  Future<void> saveProfile(Profile profile) async {
    final jsonString = jsonEncode(profile.toJson());
    await store.setString(_profileKey, jsonString);
  }

  /// Load profile from JSON
  Future<Profile?> loadProfile() async {
    final jsonString = await store.getString(_profileKey);
    if (jsonString == null) return null;

    try {
      final data = jsonDecode(jsonString);
      return Profile.fromJson(data);
    } catch (_) {
      return Profile();
    }
  }

  /// Wipe profile completely
  Future<void> clearProfile() async {
    await store.remove(_profileKey);
  }

  /// Generate a single promo code for this agent
  Future<String?> generatePromoCode() async {
    final profile = await loadProfile();
    if (profile == null) {
      throw Exception("No profile loaded");
    }

    final agentId = profile.agentId;
    if (agentId == null) {
      throw Exception("No agentId found in profile");
    }

    final url = Uri.parse(
      "https://vitalink-app.netlify.app/.netlify/functions/generate_promo_batch",
    );

    final response = await http.post(
      url,
      headers: {"Content-Type": "application/json"},
      body: jsonEncode({
        "prefix": "AGENT",
        "count": 1,
        "maxUses": null,
        "agentId": agentId,
      }),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      if (data["created"] != null && data["created"].isNotEmpty) {
        return data["created"][0];
      }
    }
    throw Exception("Failed to generate promo code: ${response.body}");
  }

  /// 🔧 Save medications list into profile
  Future<void> saveMeds(List<Medication> meds) async {
    final profile = await loadProfile() ?? Profile();
    profile.meds = meds;
    await saveProfile(profile);
  }

  /// 🔧 Save doctors list into profile
  Future<void> saveDoctors(List<Doctor> doctors) async {
    final profile = await loadProfile() ?? Profile();
    profile.doctors = doctors;
    await saveProfile(profile);
  }
}
