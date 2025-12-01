// lib/screens/profile_agent_screen.dart
import 'package:flutter/material.dart';
import '../services/secure_store.dart';
import '../services/api_service.dart';

class ProfileAgentScreen extends StatefulWidget {
  const ProfileAgentScreen({super.key});

  @override
  State<ProfileAgentScreen> createState() => _ProfileAgentScreenState();
}

class _ProfileAgentScreenState extends State<ProfileAgentScreen> {
  final _formKey = GlobalKey<FormState>();

  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _npnCtrl = TextEditingController();
  final _agencyNameCtrl = TextEditingController();
  final _agencyAddressCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();

  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _loadLocalProfile();
  }

  Future<void> _loadLocalProfile() async {
    final store = SecureStore();

    final name = await store.getString('agentName') ?? '';
    final email = await store.getString('agentEmail') ?? '';
    final phone = await store.getString('agentPhone') ?? '';
    final npn =
        await store.getString('agentLicense') ?? await store.getString('agentNpn') ?? '';
    final agencyName =
        await store.getString('agencyName') ?? await store.getString('agentAgency') ?? '';
    final agencyAddress = await store.getString('agencyAddress') ?? '';

    setState(() {
      _nameCtrl.text = name;
      _emailCtrl.text = email;
      _phoneCtrl.text = phone;
      _npnCtrl.text = npn;
      _agencyNameCtrl.text = agencyName;
      _agencyAddressCtrl.text = agencyAddress;
    });
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _loading = true);
    final store = SecureStore();

    final name = _nameCtrl.text.trim();
    final email = _emailCtrl.text.trim(); // read-only, just in case
    final phone = _phoneCtrl.text.trim();
    final npn = _npnCtrl.text.trim();
    final agencyName = _agencyNameCtrl.text.trim();
    final agencyAddress = _agencyAddressCtrl.text.trim();
    final newPassword = _passwordCtrl.text.trim();

    try {
      final res = await ApiService.updateAgentProfile(
        email: email,
        name: name,
        phone: phone,
        npn: npn.isNotEmpty ? npn : null,
        agencyName: agencyName.isNotEmpty ? agencyName : null,
        agencyAddress: agencyAddress.isNotEmpty ? agencyAddress : null,
        password: newPassword.isNotEmpty ? newPassword : null,
      );

      if (res['success'] != true) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(res['error'] ?? "Failed to update profile ❌"),
          ),
        );
        return;
      }

      // Update local storage so MyAgent, menus, etc see new info
      await store.setString('agentName', name);
      await store.setString('agentPhone', phone);
      await store.setString('agentEmail', email);
      await store.setString('agentLicense', npn);
      await store.setString('agentAgency', agencyName);
      await store.setString('agencyName', agencyName);
      await store.setString('agencyAddress', agencyAddress);

      if (newPassword.isNotEmpty) {
        await store.setString('agentPassword', newPassword);
      }

      await store.setString('role', 'agent');

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Agent profile updated ✅")),
      );
      Navigator.pop(context);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("My Agent Profile")),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              children: [
                const Text(
                  "Agent Profile",
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _nameCtrl,
                  decoration: const InputDecoration(labelText: "Full Name"),
                  validator: (v) =>
                      v == null || v.isEmpty ? "Enter your name" : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _emailCtrl,
                  enabled: false, // keep email read-only for now
                  decoration: const InputDecoration(
                    labelText: "Email (contact admin to change)",
                  ),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _phoneCtrl,
                  decoration: const InputDecoration(labelText: "Phone"),
                  validator: (v) =>
                      v == null || v.isEmpty ? "Enter your phone" : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _npnCtrl,
                  decoration:
                      const InputDecoration(labelText: "License / NPN #"),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _agencyNameCtrl,
                  decoration: const InputDecoration(labelText: "Agency Name"),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _agencyAddressCtrl,
                  decoration: const InputDecoration(labelText: "Agency Address"),
                  maxLines: 2,
                ),
                const SizedBox(height: 24),
                const Divider(),
                const SizedBox(height: 12),
                const Text(
                  "Change Password (optional)",
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _passwordCtrl,
                  obscureText: true,
                  decoration:
                      const InputDecoration(labelText: "New Password"),
                  validator: (v) {
                    if (v != null && v.isNotEmpty && v.length < 6) {
                      return "Min 6 characters";
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _confirmCtrl,
                  obscureText: true,
                  decoration:
                      const InputDecoration(labelText: "Confirm Password"),
                  validator: (v) {
                    if (_passwordCtrl.text.isNotEmpty &&
                        v != _passwordCtrl.text) {
                      return "Passwords don’t match";
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 24),
                _loading
                    ? const CircularProgressIndicator()
                    : ElevatedButton.icon(
                        icon: const Icon(Icons.save),
                        label: const Text("Save Changes"),
                        onPressed: _saveProfile,
                      ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
