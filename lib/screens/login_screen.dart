import 'package:flutter/material.dart';
import '../services/secure_store.dart';
import '../services/data_repository.dart';
import '../models.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _usernameCtrl = TextEditingController();
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
    final savedRemember = await store.getBool('rememberMe') ?? false;
    final savedUser = await store.getString('savedUsername') ?? '';
    final savedPass = await store.getString('savedPassword') ?? '';

    if (savedRemember) {
      setState(() {
        _rememberMe = true;
        _usernameCtrl.text = savedUser;
        _passwordCtrl.text = savedPass;
      });
    }
  }

  Future<void> _doLogin() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);

    try {
      final store = SecureStore();
      final savedUser = await store.getString('user_username');
      final savedPass = await store.getString('user_password');

      if (savedUser == _usernameCtrl.text.trim() &&
          savedPass == _passwordCtrl.text.trim()) {
        // clear agent side flags so roles never overlap
        await store.remove('agentLoggedIn');

        await store.setBool('userLoggedIn', true);
        await store.setString('role', 'user');

        await store.setBool('rememberMe', _rememberMe);
        if (_rememberMe) {
          await store.setString('savedUsername', _usernameCtrl.text.trim());
          await store.setString('savedPassword', _passwordCtrl.text.trim());
        } else {
          await store.remove('savedUsername');
          await store.remove('savedPassword');
        }

        if (!mounted) return;
        Navigator.pushReplacementNamed(context, '/menu');
      } else {
        _showPopup("Login Failed", "Invalid credentials ❌");
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _logout() async {
    final store = SecureStore();
    await store.setBool('userLoggedIn', false);

    final remember = await store.getBool('rememberMe') ?? false;
    if (!remember) {
      await store.remove('savedUsername');
      await store.remove('savedPassword');
    }

    if (!mounted) return;
    Navigator.pushReplacementNamed(context, '/login');
  }

  void _showPopup(String title, String message, {bool showRegister = false}) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text("OK"),
          ),
          if (showRegister)
            TextButton(
              onPressed: () {
                Navigator.of(ctx).pop();
                Navigator.pushReplacementNamed(context, '/registration');
              },
              child: const Text("Register"),
            ),
        ],
      ),
    );
  }

  void _resetPasswordLocal() {
    showDialog(
      context: context,
      builder: (ctx) {
        final newPassCtrl = TextEditingController();
        final confirmCtrl = TextEditingController();
        bool showPass = false;

        return StatefulBuilder(
          builder: (ctx, setState) => AlertDialog(
            title: const Text("Reset Password"),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextFormField(
                  controller: newPassCtrl,
                  obscureText: !showPass,
                  decoration: InputDecoration(
                    labelText: "New Password",
                    suffixIcon: IconButton(
                      icon: Icon(
                          showPass ? Icons.visibility_off : Icons.visibility),
                      onPressed: () => setState(() => showPass = !showPass),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: confirmCtrl,
                  obscureText: !showPass,
                  decoration:
                      const InputDecoration(labelText: "Confirm Password"),
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(ctx).pop(),
                child: const Text("Cancel"),
              ),
              ElevatedButton(
                onPressed: () async {
                  if (newPassCtrl.text.length < 10) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                          content:
                              Text("Password must be at least 10 characters")),
                    );
                    return;
                  }
                  if (newPassCtrl.text != confirmCtrl.text) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text("Passwords don’t match ❌")),
                    );
                    return;
                  }
                  final store = SecureStore();
                  await store.setString('user_password', newPassCtrl.text.trim());
                  await store.setString('savedPassword', newPassCtrl.text.trim());
                  if (!mounted) return;
                  Navigator.of(ctx).pop();
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text("Password reset locally ✅")),
                  );
                },
                child: const Text("Save"),
              ),
            ],
          ),
        );
      },
    );
  }

  /// 🏠 Universal Back to Home Button
  Future<void> _goHome() async {
    final store = SecureStore();
    await store.remove('loggedIn');
    await store.remove('agentLoggedIn');
    await store.remove('role');
    if (!mounted) return;
    Navigator.pushNamedAndRemoveUntil(context, '/landing', (route) => false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      resizeToAvoidBottomInset: false,
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        title: const Text("User Login"),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: Stack(
        children: [
          Positioned.fill(
            child: Image.asset(
              'assets/images/logo_icon.png',
              fit: BoxFit.cover,
            ),
          ),
          Positioned.fill(
            child: Container(color: Colors.white.withOpacity(0.85)),
          ),
          Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Form(
                key: _formKey,
                child: Column(
                  children: [
                    const Text(
                      "👤 Users: Please log in with your username and password.",
                      style: TextStyle(fontSize: 16),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 24),
                    TextFormField(
                      controller: _usernameCtrl,
                      decoration:
                          const InputDecoration(labelText: "Username"),
                      validator: (v) =>
                          v == null || v.isEmpty ? "Enter your username" : null,
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
                        ? const CircularProgressIndicator()
                        : ElevatedButton.icon(
                            icon: const Icon(Icons.login),
                            onPressed: _doLogin,
                            label: const Text("Login"),
                          ),
                    const SizedBox(height: 12),
                    TextButton.icon(
                      icon: const Icon(Icons.logout),
                      onPressed: _logout,
                      label: const Text("Logout"),
                    ),
                    const SizedBox(height: 12),
                    TextButton.icon(
                      icon: const Icon(Icons.lock_reset),
                      onPressed: _resetPasswordLocal,
                      label: const Text("Forgot Password?"),
                    ),
                    const SizedBox(height: 12),
                    // 🏠 Add Back to Home button
                    TextButton.icon(
                      icon: const Icon(Icons.home),
                      label: const Text("Back to Home"),
                      onPressed: _goHome,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
