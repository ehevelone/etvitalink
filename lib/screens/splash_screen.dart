import 'package:flutter/material.dart';
import 'dart:async';

import '../services/data_repository.dart';
import '../services/secure_store.dart';
import '../services/api_service.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  Timer? _timer;
  late final DataRepository _repo;

  @override
  void initState() {
    super.initState();
    _repo = DataRepository(SecureStore());
    _timer = Timer(const Duration(seconds: 2), _openNext);
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _openNext() async {
    final profile = await _repo.loadProfile();
    final store = SecureStore();

    // --- Flags ---
    final role = await store.getString('role');

    // User flags
    final termsAccepted = profile?.acceptedTerms ?? false;
    final registered = await store.getBool('registered') ?? false;
    final loggedIn = await store.getBool('loggedIn') ?? false;
    final setupDone = await store.getBool('setupDone') ?? false;

    // Agent stored credentials (for backend recheck)
    final agentEmail = await store.getString('agentEmail');
    final agentPassword = await store.getString('agentPassword'); // store this at login
    final agentTerms = await store.getBool('agentTerms') ?? false;
    final agentSetupDone = await store.getBool('agentSetupDone') ?? false;

    if (!mounted) return;

    // ============================================================
    // 🔹 AGENT FLOW — always verified from backend (not SecureStore)
    // ============================================================
    if (role == 'agent') {
      debugPrint("🔎 Checking backend for agent login status...");

      if (agentEmail != null && agentPassword != null) {
        final result = await ApiService.loginAgent(
          email: agentEmail,
          password: agentPassword,
        );

        if (result['success'] == true) {
          debugPrint("✅ Agent verified from backend.");

          // Refresh local flags from verified backend record
          await store.setBool("agentRegistered", true);
          await store.setBool("agentLoggedIn", true);
          await store.setString("agentName", result['name'] ?? '');
          await store.setString("agentPhone", result['phone'] ?? '');
          await store.setString("agentEmail", result['email'] ?? '');
          await store.setString("agentId", result['agentId']?.toString() ?? '');
          await store.setString("role", "agent");

          if (!mounted) return;
          Navigator.pushReplacementNamed(context, '/agent_menu');
          return;
        } else {
          debugPrint("⚠️ Agent backend check failed — redirecting to login.");
          Navigator.pushReplacementNamed(context, '/agent_login');
          return;
        }
      } else {
        debugPrint("⚠️ No stored agent credentials — redirecting to login.");
        Navigator.pushReplacementNamed(context, '/agent_login');
        return;
      }
    }

    // ============================================================
    // 🔹 USER FLOW — driven by local SecureStore flags
    // ============================================================
    if (role == 'user' || (role == null && registered)) {
      if (!termsAccepted) {
        Navigator.pushReplacementNamed(context, '/terms_user');
      } else if (!registered) {
        Navigator.pushReplacementNamed(context, '/registration');
      } else if (!loggedIn) {
        Navigator.pushReplacementNamed(context, '/login');
      } else if (!setupDone) {
        Navigator.pushReplacementNamed(context, '/account_setup');
      } else {
        Navigator.pushReplacementNamed(context, '/menu');
      }
      return;
    }

    // ============================================================
    // 🚨 DEFAULT — Nothing stored, back to landing
    // ============================================================
    debugPrint("🟡 No role detected — returning to landing screen.");
    Navigator.pushReplacementNamed(context, '/landing');
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: Colors.black,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Image(
              image: AssetImage('assets/images/vitalink-logo-1.png'),
              height: 120,
            ),
            SizedBox(height: 16),
            CircularProgressIndicator(color: Colors.white70),
          ],
        ),
      ),
    );
  }
}
