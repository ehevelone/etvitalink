import 'package:flutter/material.dart';
import '../services/secure_store.dart';

class AgentSetupScreen extends StatefulWidget {
  const AgentSetupScreen({super.key});

  @override
  State<AgentSetupScreen> createState() => _AgentSetupScreenState();
}

class _AgentSetupScreenState extends State<AgentSetupScreen> {
  final _formKey = GlobalKey<FormState>();

  final _nameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _agencyCtrl = TextEditingController();
  final _licenseCtrl = TextEditingController();

  final _passwordCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();

  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _loadSavedData();
  }

  Future<void> _loadSavedData() async {
    final store = SecureStore();
    _nameCtrl.text = await store.getString('agentName') ?? '';
    _phoneCtrl.text = await store.getString('agentPhone') ?? '';
    _agencyCtrl.text = await store.getString('agentAgency') ?? '';
    _licenseCtrl.text = await store.getString('agentLicense') ?? '';
  }

  Future<void> _completeSetup() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _loading = true);

    try {
      final store = SecureStore();
      await store.setBool('agentSetupDone', true);
      await store.setString('role', 'agent');
      await store.setString('agentName', _nameCtrl.text.trim());
      await store.setString('agentPhone', _phoneCtrl.text.trim());
      await store.setString('agentAgency', _agencyCtrl.text.trim());
      await store.setString('agentLicense', _licenseCtrl.text.trim());

      if (_passwordCtrl.text.isNotEmpty) {
        await store.setString('agentPassword', _passwordCtrl.text.trim());
      }

      if (!mounted) return;
      // 🚀 After setup, go straight to Agent Menu
      Navigator.pushReplacementNamed(context, '/agent_menu');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Agent Setup")),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              children: [
                TextFormField(
                  controller: _nameCtrl,
                  decoration: const InputDecoration(labelText: "Full Name"),
                  validator: (v) =>
                      v == null || v.isEmpty ? "Enter your name" : null,
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
                  controller: _agencyCtrl,
                  decoration: const InputDecoration(labelText: "Agency"),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _licenseCtrl,
                  decoration: const InputDecoration(labelText: "License #"),
                ),
                const SizedBox(height: 24),
                const Divider(),
                const SizedBox(height: 12),
                const Text(
                  "Update Password (optional)",
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _passwordCtrl,
                  obscureText: true,
                  decoration: const InputDecoration(labelText: "New Password"),
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
                    : ElevatedButton(
                        onPressed: _completeSetup,
                        child: const Text("Finish Setup"),
                      ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
