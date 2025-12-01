// lib/screens/splash_screen.dart
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import '../services/secure_store.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    SchedulerBinding.instance.addPostFrameCallback((_) => _route());
  }

  Future<void> _route() async {
    final store = SecureStore();

    String? role;
    bool userLoggedIn = false;
    bool agentLoggedIn = false;

    try {
      role = await store.getString('role').timeout(const Duration(seconds: 2));
      userLoggedIn =
          await store.getBool('userLoggedIn').timeout(const Duration(seconds: 2)) ?? false;
      agentLoggedIn =
          await store.getBool('agentLoggedIn').timeout(const Duration(seconds: 2)) ?? false;
    } catch (_) {
      if (mounted) {
        Navigator.pushReplacementNamed(context, '/landing');
      }
      return;
    }

    await Future.delayed(const Duration(milliseconds: 300));
    if (!mounted) return;

    // FIRST TIME / LOGGED OUT
    if (role == null || (!userLoggedIn && !agentLoggedIn)) {
      Navigator.pushReplacementNamed(context, '/landing');
      return;
    }

    // USER flow
    if (role == 'user') {
      Navigator.pushReplacementNamed(context, userLoggedIn ? '/menu' : '/login');
      return;
    }

    // AGENT flow
    if (role == 'agent') {
      Navigator.pushReplacementNamed(
          context, agentLoggedIn ? '/agent_menu' : '/agent_login');
      return;
    }

    // fallback
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
