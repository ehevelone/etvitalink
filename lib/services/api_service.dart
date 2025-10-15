import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

class ApiService {
  static const String _baseUrl =
      "https://vitalink-app.netlify.app/.netlify/functions";

  // 🔹 Upload & parse insurance card
  static Future<Map<String, dynamic>> parseInsurance(File image) async {
    final bytes = await image.readAsBytes();
    final base64 = base64Encode(bytes);
    try {
      final res = await http.post(
        Uri.parse("$_baseUrl/parse_insurance"),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({"imageBase64": base64}),
      );
      return jsonDecode(res.body);
    } catch (e) {
      return {"success": false, "error": e.toString()};
    }
  }

  // 🔹 Agent unlock claim
  static Future<Map<String, dynamic>> claimAgentUnlock({
    required String unlockCode,
    required String email,
    required String password,
    required String npn,
    String? phone,
    String? name,
  }) async {
    try {
      final res = await http.post(
        Uri.parse("$_baseUrl/claim_agent_unlock"),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({
          "unlockCode": unlockCode,
          "email": email,
          "password": password,
          "npn": npn,
          "phone": phone,
          "name": name,
        }),
      );
      return jsonDecode(res.body);
    } catch (e) {
      return {"success": false, "error": e.toString()};
    }
  }

  // 🔹 Agent login
  static Future<Map<String, dynamic>> loginAgent({
    required String email,
    required String password,
  }) async {
    try {
      final res = await http.post(
        Uri.parse("$_baseUrl/check_agent"),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({"email": email, "password": password}),
      );
      return jsonDecode(res.body);
    } catch (e) {
      return {"success": false, "error": e.toString()};
    }
  }

  // 🔹 User login
  static Future<Map<String, dynamic>> loginUser({
    required String username,
    required String password,
  }) async {
    try {
      final res = await http.post(
        Uri.parse("$_baseUrl/check_user"),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({"username": username, "password": password}),
      );
      return jsonDecode(res.body);
    } catch (e) {
      return {"success": false, "error": e.toString()};
    }
  }

  // 🔹 Verify promo code (used by agents & users)
  static Future<Map<String, dynamic>> verifyPromo({
    required String username,
    required String promoCode,
  }) async {
    try {
      final res = await http.post(
        Uri.parse("$_baseUrl/vpc"), // ✅ your backend verify endpoint
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({"username": username, "promoCode": promoCode}),
      );
      return jsonDecode(res.body);
    } catch (e) {
      debugPrint("❌ verifyPromo error: $e");
      return {"success": false, "error": e.toString()};
    }
  }

  // 🔹 Issue new agent unlock (Admin / Agent Menu)
  static Future<Map<String, dynamic>> issueAgentCode({
    required String masterKey,
    String? requestedEmail,
    String? requestedName,
    String? requestedNpn,
  }) async {
    try {
      final res = await http.post(
        Uri.parse("$_baseUrl/generate_agent_unlock"),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({
          "masterKey": masterKey,
          "email": requestedEmail,
          "name": requestedName,
          "npn": requestedNpn,
        }),
      );
      return jsonDecode(res.body);
    } catch (e) {
      return {"success": false, "error": e.toString()};
    }
  }

  // 🔹 Request password reset (email only)
  static Future<Map<String, dynamic>> requestPasswordReset(String email) async {
    try {
      final res = await http.post(
        Uri.parse("$_baseUrl/request_reset"),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({"emailOrPhone": email}),
      );
      return jsonDecode(res.body);
    } catch (e) {
      return {"success": false, "error": e.toString()};
    }
  }

  // 🔹 Complete password reset
  static Future<Map<String, dynamic>> resetPassword({
    required String emailOrPhone,
    required String code,
    required String newPassword,
  }) async {
    try {
      final res = await http.post(
        Uri.parse("$_baseUrl/reset_password"),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({
          "emailOrPhone": emailOrPhone,
          "code": code,
          "newPassword": newPassword,
        }),
      );
      return jsonDecode(res.body);
    } catch (e) {
      return {"success": false, "error": e.toString()};
    }
  }

  // ✅ NEW BELOW ------------------------------------------------------

  // 🔹 Get latest promo code for the logged-in agent
  static Future<Map<String, dynamic>> getAgentPromoCode(String email) async {
    try {
      final res = await http.post(
        Uri.parse("$_baseUrl/get_agent_promo"),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({"email": email}),
      );
      return jsonDecode(res.body);
    } catch (e) {
      debugPrint("❌ getAgentPromoCode error: $e");
      return {"success": false, "error": e.toString()};
    }
  }

  // 🔹 Verify promo code (for registration & MyAgentAgent)
  static Future<Map<String, dynamic>> verifyPromoCode(
      String username, String promoCode) async {
    try {
      final res = await http.post(
        Uri.parse("$_baseUrl/vpc"),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({"username": username, "promoCode": promoCode}),
      );
      return jsonDecode(res.body);
    } catch (e) {
      debugPrint("❌ verifyPromoCode error: $e");
      return {"success": false, "error": e.toString()};
    }
  }
}
