import 'package:flutter/material.dart';
import '../services/secure_store.dart';
import '../services/api_service.dart';

class AgentLoginScreen extends StatefulWidget {
  const AgentLoginScreen({super.key});

  @override
  State<AgentLoginScreen> createState() => _AgentLoginScreenState();
}

class _AgentLoginScreenState extends State<AgentLoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  bool _loading = false;
  bool _rememberMe = false;
  bool _showPassword = false;

  @override
  void initState() {
    super.initState();
    _loadSavedCreds();
  }

  Future<void> _loadSavedCreds() async {
    final store = SecureStore();
    final savedRemember = await store.getBool('rememberMeAgent') ?? false;
    final savedEmail = await store.getString('savedAgentEmail') ?? '';
    final savedPass = await store.getString('savedAgentPassword') ?? '';

    if (savedRemember) {
      setState(() {
        _rememberMe = true;
        _emailCtrl.text = savedEmail;
        _passwordCtrl.text = savedPass;
      });
    }
  }

  Future<void> _doLogin() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);

    try {
      final data = await ApiService.loginAgent(
        email: _emailCtrl.text.trim(),
        password: _passwordCtrl.text.trim(),
      );

      if (data['success'] == true) {
        final store = SecureStore();

        // clear user flags so agent and user don’t overlap
        await store.remove('loggedIn');
        await store.remove('userLoggedIn');

        await store.setBool('agentLoggedIn', true);
        await store.setString('role', data['role'] ?? 'agent');
        await store.setString('agentId', data['agentId'].toString());
        await store.setString('agentEmail', data['email'] ?? '');
        await store.setString('agentName', data['name'] ?? '');
        await store.setString('agentPhone', data['phone'] ?? '');

        // ✅ Remember-me logic
        if (_rememberMe) {
          await store.setBool('rememberMeAgent', true);
          await store.setString('savedAgentEmail', _emailCtrl.text.trim());
          await store.setString('savedAgentPassword', _passwordCtrl.text.trim());
        } else {
          await store.setBool('rememberMeAgent', false);
          await store.remove('savedAgentEmail');
          await store.remove('savedAgentPassword');
        }

        if (!mounted) return;
        Navigator.pushReplacementNamed(context, '/logo');
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(data['error'] ?? "Login failed ❌")),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Error: $e")),
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _goHome() async {
    // optional: wipe flags so they don’t get stuck in splash
    final store = SecureStore();
    await store.remove('loggedIn');
    await store.remove('agentLoggedIn');
    await store.remove('role');

    if (!mounted) return;
    Navigator.pushNamedAndRemoveUntil(
      context,
      '/landing',
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Agent Login")),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: ListView(
            children: [
              TextFormField(
                controller: _emailCtrl,
                decoration: const InputDecoration(labelText: "Agent Email"),
                validator: (v) =>
                    v == null || v.isEmpty ? "Enter your email" : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _passwordCtrl,
                obscureText: !_showPassword,
                decoration: InputDecoration(
                  labelText: "Password",
                  suffixIcon: IconButton(
                    icon: Icon(
                      _showPassword
                          ? Icons.visibility_off
                          : Icons.visibility,
                    ),
                    onPressed: () =>
                        setState(() => _showPassword = !_showPassword),
                  ),
                ),
                validator: (v) =>
                    v == null || v.isEmpty ? "Enter password" : null,
              ),
              const SizedBox(height: 12),
              CheckboxListTile(
                value: _rememberMe,
                onChanged: (v) => setState(() => _rememberMe = v ?? false),
                title: const Text("Remember me on this device"),
                controlAffinity: ListTileControlAffinity.leading,
              ),
              const SizedBox(height: 24),
              _loading
                  ? const Center(child: CircularProgressIndicator())
                  : ElevatedButton.icon(
                      icon: const Icon(Icons.login),
                      label: const Text("Login as Agent"),
                      onPressed: _doLogin,
                    ),
              const SizedBox(height: 12),
              TextButton.icon(
                icon: const Icon(Icons.lock_reset),
                label: const Text("Forgot Password?"),
                onPressed: () {
                  Navigator.pushNamed(context, '/agent_request_reset');
                },
              ),
              const SizedBox(height: 12),
              // 🏠 NEW Back to Home button
              TextButton.icon(
                icon: const Icon(Icons.home),
                label: const Text("Back to Home"),
                onPressed: _goHome,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
