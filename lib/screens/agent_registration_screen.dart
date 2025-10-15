import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:app_links/app_links.dart'; // ✅ deep link handling
import 'dart:async';
import '../services/secure_store.dart';
import '../services/api_service.dart';
import '../widgets/password_rules.dart';

/// 🔹 Automatically formats phone numbers as (123)456-7890
class PhoneNumberFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    var digits = newValue.text.replaceAll(RegExp(r'\D'), '');
    final buffer = StringBuffer();

    for (int i = 0; i < digits.length; i++) {
      if (i == 0) buffer.write('(');
      if (i == 3) buffer.write(')');
      if (i == 6) buffer.write('-');
      buffer.write(digits[i]);
    }

    return TextEditingValue(
      text: buffer.toString(),
      selection: TextSelection.collapsed(offset: buffer.length),
    );
  }
}

class AgentRegistrationScreen extends StatefulWidget {
  const AgentRegistrationScreen({super.key});

  @override
  State<AgentRegistrationScreen> createState() =>
      _AgentRegistrationScreenState();
}

class _AgentRegistrationScreenState extends State<AgentRegistrationScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _npnCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();
  final _codeCtrl = TextEditingController();
  final _agencyNameCtrl = TextEditingController();
  final _agencyAddressCtrl = TextEditingController();

  bool _loading = false;
  bool _showPassword = false;
  bool _showConfirm = false;

  StreamSubscription<Uri>? _linkSub;
  late final AppLinks _appLinks;

  @override
  void initState() {
    super.initState();
    _initDeepLinks();
  }

  // ✅ Handle deep links like vitalink://agent/onboard?unlockCode=XXXXX
  Future<void> _initDeepLinks() async {
    _appLinks = AppLinks();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      try {
        final Uri? initialLink = await _appLinks.getInitialLink();
        if (initialLink != null) {
          final params = initialLink.queryParameters;
          final code = params['unlockCode'] ?? params['code'];
          if (code != null && code.isNotEmpty) {
            setState(() => _codeCtrl.text = code);
          }
        }
      } catch (_) {}
      _linkSub = _appLinks.uriLinkStream.listen((Uri uri) {
        final params = uri.queryParameters;
        final code = params['unlockCode'] ?? params['code'];
        if (code != null && code.isNotEmpty) {
          setState(() => _codeCtrl.text = code);
        }
      });
    });
  }

  @override
  void dispose() {
    _linkSub?.cancel();
    super.dispose();
  }

  String? _validatePassword(String? pw) {
    if (pw == null || pw.isEmpty) return "Enter a password";
    if (pw.length < 10) return "Password must be at least 10 characters";
    if (!RegExp(r'[A-Z]').hasMatch(pw)) {
      return "Password must contain at least one uppercase letter";
    }
    if (!RegExp(r'[!@#\$%^&*(),.?\":{}|<>]').hasMatch(pw)) {
      return "Password must contain at least one special character";
    }
    return null;
  }

  Future<void> _tryRegister() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);

    try {
      final data = await ApiService.claimAgentUnlock(
        unlockCode: _codeCtrl.text.trim(),
        email: _emailCtrl.text.trim(),
        password: _passwordCtrl.text.trim(),
        npn: _npnCtrl.text.trim(),
        phone: _phoneCtrl.text.trim(),
        name: _nameCtrl.text.trim(),
      );

      if (data['success'] == true) {
        final store = SecureStore();
        await store.setString("agentName", _nameCtrl.text.trim());
        await store.setString("agentEmail", _emailCtrl.text.trim());
        await store.setString("agentPhone", _phoneCtrl.text.trim());
        await store.setString("agentId", _npnCtrl.text.trim());
        await store.setString("agencyName", _agencyNameCtrl.text.trim());
        await store.setString("agencyAddress", _agencyAddressCtrl.text.trim());
        await store.setBool("registered", true);
        await store.setBool("agentRegistered", true);
        await store.setBool("agentLoggedIn", true);
        await store.setString("role", "agent");

        if (data['promoCode'] != null &&
            data['promoCode'].toString().isNotEmpty) {
          await store.setString("agentPromoCode", data['promoCode'].toString());
        }

        // ✅ Save creds
        await store.setBool('rememberMeAgent', true);
        await store.setString('savedAgentEmail', _emailCtrl.text.trim());
        await store.setString('savedAgentPassword', _passwordCtrl.text.trim());

        if (!mounted) return;
        Navigator.pushReplacementNamed(context, '/agent_menu');
      } else {
        _showPopup("Registration Failed", data['error'] ?? "Unknown error ❌");
      }
    } catch (e) {
      _showPopup("Error", "Registration failed: $e");
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _showPopup(String title, String message) {
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
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Agent Registration")),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: ListView(
            children: [
              TextFormField(
                controller: _nameCtrl,
                decoration: const InputDecoration(labelText: "Full Name"),
                validator: (v) =>
                    v == null || v.isEmpty ? "Enter your name" : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _emailCtrl,
                decoration: const InputDecoration(labelText: "Email"),
                keyboardType: TextInputType.emailAddress,
                validator: (v) =>
                    v == null || !v.contains('@') ? "Enter a valid email" : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _npnCtrl,
                decoration: const InputDecoration(labelText: "NPN"),
                keyboardType: TextInputType.number,
                validator: (v) =>
                    v == null || v.isEmpty ? "Enter your NPN" : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _phoneCtrl,
                decoration: const InputDecoration(labelText: "Phone Number"),
                keyboardType: TextInputType.phone,
                inputFormatters: [PhoneNumberFormatter()],
                validator: (v) =>
                    v == null || v.isEmpty ? "Enter your phone number" : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _agencyNameCtrl,
                decoration: const InputDecoration(labelText: "Agency Name"),
                validator: (v) =>
                    v == null || v.isEmpty ? "Enter your agency name" : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _agencyAddressCtrl,
                decoration: const InputDecoration(labelText: "Agency Address"),
                validator: (v) =>
                    v == null || v.isEmpty ? "Enter your agency address" : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _passwordCtrl,
                obscureText: !_showPassword,
                decoration: InputDecoration(
                  labelText: "Password",
                  suffixIcon: IconButton(
                    icon: Icon(_showPassword
                        ? Icons.visibility_off
                        : Icons.visibility),
                    onPressed: () =>
                        setState(() => _showPassword = !_showPassword),
                  ),
                ),
                validator: _validatePassword,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _confirmCtrl,
                obscureText: !_showConfirm,
                decoration: InputDecoration(
                  labelText: "Confirm Password",
                  suffixIcon: IconButton(
                    icon: Icon(_showConfirm
                        ? Icons.visibility_off
                        : Icons.visibility),
                    onPressed: () =>
                        setState(() => _showConfirm = !_showConfirm),
                  ),
                ),
                validator: (v) =>
                    v != _passwordCtrl.text ? "Passwords don’t match" : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _codeCtrl,
                decoration: const InputDecoration(labelText: "Unlock Code"),
                validator: (v) =>
                    v == null || v.isEmpty ? "Enter unlock code" : null,
              ),
              const SizedBox(height: 24),
              _loading
                  ? const Center(child: CircularProgressIndicator())
                  : ElevatedButton.icon(
                      icon: const Icon(Icons.check),
                      label: const Text("Complete Registration"),
                      onPressed: _tryRegister,
                    ),
            ],
          ),
        ),
      ),
    );
  }
}
