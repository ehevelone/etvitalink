import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import '../services/api_service.dart';
import '../services/secure_store.dart';

class NotificationService {
  // Called on app launch AND on token refresh
  static Future<void> initFCM() async {
    final store = SecureStore();
    final role = await store.getString("role");
    final email = await store.getString(
      role == "agent" ? "agentEmail" : "userEmail",
    );

    if (email == null || email.isEmpty || role == null) {
      debugPrint("⚠ FCM skipped — no logged-in user/agent");
      return;
    }

    final token = await FirebaseMessaging.instance.getToken();
    if (token != null) {
      await _sendToBackend(email, token, role);
    }

    // LISTEN for token updates (this is the fix)
    FirebaseMessaging.instance.onTokenRefresh.listen((newToken) async {
      debugPrint("🔄 FCM REFRESH → $newToken");
      await _sendToBackend(email, newToken, role);
    });
  }

  static Future<void> _sendToBackend(
      String email, String token, String role) async {
    final res = await ApiService.registerDeviceToken(
      email: email,
      fcmToken: token,
      role: role,
    );
    debugPrint("📌 registerDeviceToken result: $res");
  }
}
