// lib/screens/landing_screen.dart
import 'package:flutter/material.dart';
import '../services/secure_store.dart';

class LandingScreen extends StatefulWidget {
  const LandingScreen({super.key});

  @override
  State<LandingScreen> createState() => _LandingScreenState();
}

class _LandingScreenState extends State<LandingScreen> {
  bool _loading = true;
  bool _isAgent = false;

  @override
  void initState() {
    super.initState();
    _checkStoredRole();
  }

  /// ✅ Checks if a role already exists (user or agent)
  Future<void> _checkStoredRole() async {
    final store = SecureStore();
    final role = await store.getString('role');
    final agentRegistered = await store.getBool('agentRegistered') ?? false;
    final userRegistered = await store.getBool('registered') ?? false;

    if (!mounted) return;

    // Auto-forward to Splash if we already have role info
    if (role != null || agentRegistered || userRegistered) {
      Navigator.pushReplacementNamed(context, '/splash');
      return;
    }

    setState(() => _loading = false);
  }

  /// ✅ Agent pressed “I’m an Agent”
  Future<void> _chooseAgent() async {
    final store = SecureStore();
    await store.setString('role', 'agent');
    Navigator.pushReplacementNamed(context, '/terms_agent');
  }

  /// ✅ User pressed “I’m a User”
  Future<void> _chooseUser() async {
    final store = SecureStore();
    await store.setString('role', 'user');
    Navigator.pushReplacementNamed(context, '/terms_user');
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        backgroundColor: Colors.black,
        body: Center(
          child: CircularProgressIndicator(color: Colors.white70),
        ),
      );
    }

    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Logo
                Image.asset(
                  'assets/images/vitalink-logo-1.png',
                  width: 220,
                  fit: BoxFit.contain,
                ),
                const SizedBox(height: 40),

                const Text(
                  "Welcome to VitaLink",
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  "Choose your path to continue",
                  style: TextStyle(
                    color: Colors.white70,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(height: 40),

                // User button
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blueAccent,
                    minimumSize: const Size(double.infinity, 55),
                  ),
                  icon: const Icon(Icons.person),
                  label: const Text(
                    "I'm a User",
                    style: TextStyle(fontSize: 18),
                  ),
                  onPressed: _chooseUser,
                ),
                const SizedBox(height: 20),

                // Agent button
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green,
                    minimumSize: const Size(double.infinity, 55),
                  ),
                  icon: const Icon(Icons.badge),
                  label: const Text(
                    "I'm an Agent",
                    style: TextStyle(fontSize: 18),
                  ),
                  onPressed: _chooseAgent,
                ),

                const SizedBox(height: 40),
                const Text(
                  "VitaLink simplifies Medicare and health management.",
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.white60, fontSize: 14),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
