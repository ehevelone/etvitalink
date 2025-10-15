import 'package:flutter/material.dart';
import 'dart:convert';
import '../services/secure_store.dart';
import '../models.dart';
import '../services/data_repository.dart';
import 'qr_screen.dart';

class MenuScreen extends StatefulWidget {
  const MenuScreen({super.key});

  @override
  State<MenuScreen> createState() => _MenuScreenState();
}

class _MenuScreenState extends State<MenuScreen> {
  late final DataRepository _repo;
  Profile? _p;
  bool _loading = true;
  String _fallbackName = "User";

  @override
  void initState() {
    super.initState();
    _repo = DataRepository(SecureStore());
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    final p = await _repo.loadProfile();
    final store = SecureStore();

    String? storedName = await store.getString("userName");

    if (!mounted) return;
    setState(() {
      _p = p;
      _fallbackName = storedName?.isNotEmpty == true ? storedName! : "User";
      _loading = false;
    });
  }

  Future<void> _logout(BuildContext context) async {
    final store = SecureStore();
    await store.remove('loggedIn');
    await store.remove('agentLoggedIn');
    await store.remove('role');

    if (context.mounted) {
      Navigator.pushReplacementNamed(context, '/landing');
    }
  }

  void _showQr() {
    if (_p == null) return;
    final p = _p!;
    final e = p.emergency;

    final data = {
      "name": p.fullName,
      "dob": p.dob ?? "",
      "allergies": e.allergies,
      "conditions": e.conditions,
      "emergencyContactName": e.contact,
      "emergencyContactPhone": e.phone,
    };

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => QrScreen(
          data: jsonEncode(data),
          title: "Emergency Info",
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // ✅ Prefer Profile fullName, fallback to SecureStore userName
    final displayName =
        _p?.fullName?.isNotEmpty == true ? _p!.fullName : _fallbackName;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.green.shade700,
        title: Text(
          "Welcome $displayName",
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12.0),
            child: Image.asset(
              "assets/images/app_icon_big.png",
              height: 32,
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: Stack(
          children: [
            Center(
              child: Opacity(
                opacity: 0.18,
                child: Image.asset(
                  "assets/images/logo_icon.png",
                  width: MediaQuery.of(context).size.width * 0.9,
                  fit: BoxFit.contain,
                ),
              ),
            ),
            Column(
              children: [
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      Card(
                        child: ListTile(
                          leading: const Icon(Icons.person_pin_circle,
                              color: Colors.green),
                          title: const Text("My Agent"),
                          onTap: () =>
                              Navigator.pushNamed(context, '/my_agent_user'),
                        ),
                      ),
                      Card(
                        child: ListTile(
                          leading: const Icon(Icons.medical_information,
                              color: Colors.green),
                          title: const Text("Medications"),
                          onTap: () => Navigator.pushNamed(context, '/meds'),
                        ),
                      ),
                      Card(
                        child: ListTile(
                          leading: const Icon(Icons.people, color: Colors.green),
                          title: const Text("Doctors"),
                          onTap: () => Navigator.pushNamed(context, '/doctors'),
                        ),
                      ),
                      Card(
                        child: ListTile(
                          leading: const Icon(Icons.credit_card,
                              color: Colors.green),
                          title: const Text("Insurance Cards"),
                          onTap: () => Navigator.pushNamed(
                              context, '/insurance_cards_menu'),
                        ),
                      ),
                      Card(
                        child: ListTile(
                          leading: const Icon(Icons.policy, color: Colors.green),
                          title: const Text("Insurance Policies"),
                          onTap: () =>
                              Navigator.pushNamed(context, '/insurance_policies'),
                        ),
                      ),
                    ],
                  ),
                ),

                // ✅ SafeArea bottom buttons
                SafeArea(
                  top: false,
                  minimum: const EdgeInsets.only(bottom: 16),
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      children: [
                        Row(
                          children: [
                            Expanded(
                              flex: 2,
                              child: ElevatedButton.icon(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.red.shade900,
                                  foregroundColor: Colors.white,
                                  padding:
                                      const EdgeInsets.symmetric(vertical: 14),
                                ),
                                icon:
                                    const Icon(Icons.warning_amber_rounded),
                                label: const Text("Emergency Info"),
                                onPressed: () =>
                                    Navigator.pushNamed(context, '/emergency'),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              flex: 1,
                              child: ElevatedButton.icon(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.red.shade900,
                                  foregroundColor: Colors.white,
                                  padding:
                                      const EdgeInsets.symmetric(vertical: 14),
                                ),
                                icon: const Icon(Icons.qr_code),
                                label: const Text("QR"),
                                onPressed: _showQr,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.red.shade100,
                            foregroundColor: Colors.red,
                            minimumSize: const Size.fromHeight(50),
                          ),
                          icon: const Icon(Icons.logout),
                          label: const Text("Log Out"),
                          onPressed: () => _logout(context),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
