// lib/screens/splash_screen.dart
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'dart:async';

import '../services/secure_store.dart';
import '../services/api_service.dart';
import '../services/data_repository.dart';
import '../models.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  late final DataRepository _repo;

  @override
  void initState() {
    super.initState();
    _repo = DataRepository(SecureStore());

    // Delay routing until after first frame → avoids plugin init race conditions
    SchedulerBinding.instance.addPostFrameCallback((_) => _route());
  }

  Future<void> _route() async {
    final store = SecureStore();

    // ---------------------------------------------------------
    // LOAD ALL STORED VALUES IN PARALLEL WITH TIMEOUT PROTECTION
    // ---------------------------------------------------------
    String? role;
    bool registered = false;
    bool loggedIn = false;
    bool setupDone = false;
    bool termsAccepted = false;

    String? agentEmail;
    String? agentPassword;
    bool agentTerms = false;
    bool agentSetupDone = false;

    Profile? profile;

    try {
      final results = await Future.wait([
        store.getString('role'),
        store.getBool('registered'),
        store.getBool('loggedIn'),
        store.getBool('setupDone'),
        _repo.loadProfile(),
        store.getString('agentEmail'),
        store.getString('agentPassword'),
        store.getBool('agentTerms'),
        store.getBool('agentSetupDone'),
      ]).timeout(const Duration(seconds: 3));

      role = results[0] as String?;
      registered = (results[1] as bool?) ?? false;
      loggedIn = (results[2] as bool?) ?? false;
      setupDone = (results[3] as bool?) ?? false;
      profile = results[4] as Profile?;
      agentEmail = results[5] as String?;
      agentPassword = results[6] as String?;
      agentTerms = (results[7] as bool?) ?? false;
      agentSetupDone = (results[8] as bool?) ?? false;

      termsAccepted = profile?.acceptedTerms ?? false;
    } catch (e) {
      // If secure storage or repo fails → send to landing
      if (mounted) {
        Navigator.pushReplacementNamed(context, '/landing');
      }
      return;
    }

    if (!mounted) return;

    // Slight delay for smooth transition
    await Future.delayed(const Duration(milliseconds: 300));

    // ---------------------------------------------------------
    // 🔹 AGENT FLOW (FULL LOGIC)
    // ---------------------------------------------------------
    if (role == 'agent') {
      // Missing credentials → go to login
      if (agentEmail == null || agentPassword == null) {
        Navigator.pushReplacementNamed(context, '/agent_login');
        return;
      }

      // Verify with backend (timeout protected)
      try {
        final result = await ApiService.loginAgent(
          email: agentEmail,
          password: agentPassword,
        ).timeout(const Duration(seconds: 5));

        if (result['success'] == true) {
          // Save agent info
          await store.setBool("agentRegistered", true);
          await store.setBool("agentLoggedIn", true);
          await store.setString("agentName", result['name'] ?? '');
          await store.setString("agentPhone", result['phone'] ?? '');
          await store.setString("agentEmail", result['email'] ?? '');
          await store.setString("agentId", result['agentId']?.toString() ?? '');
          await store.setString("role", "agent");

          if (mounted) {
            Navigator.pushReplacementNamed(context, '/agent_menu');
          }
          return;
        } else {
          Navigator.pushReplacementNamed(context, '/agent_login');
          return;
        }
      } catch (_) {
        // Timeout or server offline → redirect to login
        Navigator.pushReplacementNamed(context, '/agent_login');
        return;
      }
    }

    // ---------------------------------------------------------
    // 🔹 USER FLOW (FULL LOGIC)
    // ---------------------------------------------------------
    if (role == 'user' || (role == null && registered)) {
      if (!termsAccepted) {
        Navigator.pushReplacementNamed(context, '/terms_user');
        return;
      }

      if (!registered) {
        Navigator.pushReplacementNamed(context, '/registration');
        return;
      }

      if (!loggedIn) {
        Navigator.pushReplacementNamed(context, '/login');
        return;
      }

      if (!setupDone) {
        Navigator.pushReplacementNamed(context, '/account_setup');
        return;
      }

      Navigator.pushReplacementNamed(context, '/menu');
      return;
    }

    // ---------------------------------------------------------
    // DEFAULT → NEW USER
    // ---------------------------------------------------------
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
