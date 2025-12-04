// lib/screens/menu_screen.dart
import 'package:flutter/material.dart';
import '../services/secure_store.dart';
import '../models.dart';
import '../services/data_repository.dart';
import '../widgets/safe_bottom_button.dart';

class MenuScreen extends StatefulWidget {
  const MenuScreen({super.key});

  @override
  State<MenuScreen> createState() => _MenuScreenState();
}

class _MenuScreenState extends State<MenuScreen> {
  late final DataRepository _repo;
  Profile? _p;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _repo = DataRepository(SecureStore());
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    final p = await _repo.loadProfile();
    if (!mounted) return;
    setState(() {
      _p = p;
      _loading = false;
    });
  }

  Future<void> _logout(BuildContext context) async {
    final store = SecureStore();
    await store.remove('userLoggedIn');
    await store.remove('rememberMe');
    await store.remove('role');
    await store.remove('authToken');
    await store.remove('device_token');

    if (!mounted) return;
    Navigator.pushNamedAndRemoveUntil(context, '/landing', (_) => false);
  }

  @override
  Widget build(BuildContext context) {
    final displayName =
        _p?.fullName?.isNotEmpty == true ? _p!.fullName : "User";

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.green.shade700,
        title: Text(
          "Welcome $displayName",
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: Image.asset("assets/images/app_icon_big.png", height: 32),
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
                ),
              ),
            ),

            _loading
                ? const Center(child: CircularProgressIndicator())
                : Column(
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
                                onTap: () => Navigator.pushNamed(
                                    context, '/my_agent_user'),
                              ),
                            ),
                            Card(
                              child: ListTile(
                                leading: const Icon(Icons.medical_information,
                                    color: Colors.green),
                                title: const Text("Medications"),
                                onTap: () =>
                                    Navigator.pushNamed(context, '/meds'),
                              ),
                            ),
                            Card(
                              child: ListTile(
                                leading: const Icon(Icons.people,
                                    color: Colors.green),
                                title: const Text("Doctors"),
                                onTap: () =>
                                    Navigator.pushNamed(context, '/doctors'),
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
                                leading: const Icon(Icons.policy,
                                    color: Colors.green),
                                title: const Text("Insurance Policies"),
                                onTap: () => Navigator.pushNamed(
                                    context, '/insurance_policies'),
                              ),
                            ),
                            Card(
                              child: ListTile(
                                leading: const Icon(Icons.person,
                                    color: Colors.green),
                                title: const Text("My Profile"),
                                onTap: () =>
                                    Navigator.pushNamed(context, '/my_profile'),
                              ),
                            ),
                          ],
                        ),
                      ),

                      SafeBottomButton(
                        label: "Add Family Member",
                        icon: Icons.group_add,
                        color: Colors.blue.shade700,
                        onPressed: () => Navigator.pushNamed(
                                context, '/new_profile')
                            .then((_) => _loadProfile()),
                      ),
                      SafeBottomButton(
                        label: "Switch Profile",
                        icon: Icons.swap_horiz,
                        color: Colors.grey.shade800,
                        onPressed: () => Navigator.pushNamed(
                                context, '/profile_picker')
                            .then((_) => _loadProfile()),
                      ),
                      SafeBottomButton(
                        label: "Emergency Info",
                        icon: Icons.warning_amber_rounded,
                        color: Colors.red.shade900,
                        onPressed: () => Navigator.pushNamed(
                            context, '/emergency'),
                      ),
                      SafeBottomButton(
                        label: "Log Out",
                        icon: Icons.logout,
                        color: Colors.red.shade100,
                        onPressed: () => _logout(context),
                      ),
                    ],
                  ),
          ],
        ),
      ),
    );
  }
}
