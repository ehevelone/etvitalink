import 'dart:async';
import 'package:flutter/material.dart';
import '../models.dart';
import '../services/data_repository.dart';
import '../services/secure_store.dart';

class LogoScreen extends StatefulWidget {
  const LogoScreen({super.key});

  @override
  State<LogoScreen> createState() => _LogoScreenState();
}

class _LogoScreenState extends State<LogoScreen> {
  Timer? _timer;
  late final DataRepository _repo;
  Profile? _p;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _repo = DataRepository(SecureStore());
    _loadProfile();

    // Auto navigate after 15 seconds if idle
    _timer = Timer(const Duration(seconds: 15), _openMenu);
  }

  Future<void> _loadProfile() async {
    final p = await _repo.loadProfile();
    if (!mounted) return;
    setState(() {
      _p = p;
      _loading = false;
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  /// ✅ Decide which menu based on stored role
  Future<void> _openMenu() async {
    _timer?.cancel();

    final store = SecureStore();
    final role = await store.getString('role') ?? 'user';

    if (!mounted) return;
    if (role == 'agent') {
      Navigator.pushReplacementNamed(context, '/agent_menu');
    } else {
      Navigator.pushReplacementNamed(context, '/menu');
    }
  }

  void _openEmergencyView() {
    _timer?.cancel();
    Navigator.pushReplacementNamed(context, '/emergency_view');
  }

  void _openEmergencyScreen() {
    _timer?.cancel();
    Navigator.pushReplacementNamed(context, '/emergency');
  }

  @override
  Widget build(BuildContext context) {
    final hasName = !_loading && _p?.fullName.isNotEmpty == true;
    final name = hasName ? _p!.fullName : null;

    return Scaffold(
      backgroundColor: Colors.black,
      body: InkWell(
        onTap: _openMenu, // ✅ quick enter to menu
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // App logo
              Image.asset(
                'assets/images/vitalink-logo-1.png',
                width: 220,
                fit: BoxFit.contain,
              ),
              const SizedBox(height: 24),

              // Profile greeting or spinner
              if (_loading)
                const CircularProgressIndicator(color: Colors.white70)
              else if (hasName) ...[
                Text(
                  "Welcome, $name",
                  style: const TextStyle(color: Colors.white, fontSize: 18),
                ),
                const SizedBox(height: 8),
              ],

              const Text(
                'Tap anywhere to open',
                style: TextStyle(color: Colors.white70, fontSize: 16),
              ),

              const SizedBox(height: 48),

              // Emergency QR shortcut (for responders)
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.red,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 24,
                    vertical: 12,
                  ),
                ),
                icon: const Icon(Icons.qr_code),
                label: const Text("911 Emergency QR"),
                onPressed: _openEmergencyView,
              ),

              const SizedBox(height: 12),

              // Emergency info shortcut (for user details)
              OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.white,
                  side: const BorderSide(color: Colors.white70),
                ),
                icon: const Icon(Icons.assignment),
                label: const Text("My Emergency Info"),
                onPressed: _openEmergencyScreen,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
