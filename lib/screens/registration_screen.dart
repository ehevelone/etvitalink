import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../services/secure_store.dart';
import '../services/api_service.dart';
import '../widgets/password_rules.dart';
import '../widgets/safe_bottom_button.dart';
import 'qr_scanner_screen.dart'; // ← NEW scanner screen

class PhoneNumberFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    var digits = newValue.text.replaceAll(RegExp(r'\D'), '');
    final b = StringBuffer();
    for (int i = 0; i < digits.length; i++) {
      if (i == 0) b.write('(');
      if (i == 3) b.write(')');
      if (i == 6) b.write('-');
      b.write(digits[i]);
    }
    return TextEditingValue(
      text: b.toString(),
      selection: TextSelection.collapsed(offset: b.length),
    );
  }
}

class RegistrationScreen extends StatefulWidget {
  const RegistrationScreen({super.key});

  @override
  State<RegistrationScreen> createState() => _RegistrationScreenState();
}

class _RegistrationScreenState extends State<RegistrationScreen> {
  final _formKey = GlobalKey<FormState>();
  final _usernameCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _promoCtrl = TextEditingController();

  bool _loading = false;
  bool _showPassword = false;
  bool _showConfirm = false;
  bool _rememberMe = false;

  // -------------------------------
  // QR SCANNER → fills promo field
  // -------------------------------
  Future<void> _scanQr() async {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => QrScannerScreen(
          onScanned: (value) {
            setState(() => _promoCtrl.text = value);
          },
        ),
      ),
    );
  }

  String? _validatePassword(String? pw) {
    if (pw == null || pw.isEmpty) return "Enter a password";
    if (pw.length < 10) return "≥ 10 characters";
    if (!RegExp(r'[A-Z]').hasMatch(pw)) return "At least 1 uppercase letter";
    if (!RegExp(r'[!@#\$%^&*(),.?\":{}|<>]').hasMatch(pw)) {
      return "At least 1 special character";
    }
    return null;
  }

  Future<void> _registerLocal() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);

    try {
      final store = SecureStore();
      await store.setString('user_username', _usernameCtrl.text.trim());
      await store.setString('user_password', _passwordCtrl.text.trim());
      await store.setString('user_phone', _phoneCtrl.text.trim());
      await store.setString('user_promo', _promoCtrl.text.trim());
      await store.setBool('userLoggedIn', true);
      await store.setString('role', 'user');
      await store.setBool('rememberMe', _rememberMe);

      if (!mounted) return;
      Navigator.pushReplacementNamed(context, '/menu');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _goHome() async {
    final store = SecureStore();
    await store.remove('authToken');
    await store.remove('device_token');
    if (!mounted) return;
    Navigator.pushNamedAndRemoveUntil(context, '/landing', (_) => false);
  }

  @override
  Widget build(BuildContext context) {
    const linkColor = Color(0xFF79CAE3);

    return Scaffold(
      appBar: AppBar(
        title: const Text("User Registration"),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: _goHome,
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: ListView(
            children: [
              TextFormField(
                controller: _usernameCtrl,
                decoration: const InputDecoration(labelText: "Full Name"),
                validator: (v) => v == null || v.isEmpty ? "Enter your name" : null,
              ),
              const SizedBox(height: 12),

              TextFormField(
                controller: _phoneCtrl,
                decoration: const InputDecoration(labelText: "Phone Number"),
                keyboardType: TextInputType.phone,
                inputFormatters: [PhoneNumberFormatter()],
                validator: (v) => v == null || v.isEmpty
                    ? "Enter your phone number"
                    : !RegExp(r'^\(\d{3}\)\d{3}-\d{4}$').hasMatch(v.trim())
                        ? "Format must be (123)456-7890"
                        : null,
              ),
              const SizedBox(height: 12),

              TextFormField(
                controller: _passwordCtrl,
                obscureText: !_showPassword,
                decoration: InputDecoration(
                  labelText: "Password",
                  helperText: "≥ 10 characters • 1 uppercase • 1 special character",
                  suffixIcon: IconButton(
                    icon: Icon(_showPassword ? Icons.visibility_off : Icons.visibility),
                    onPressed: () => setState(() => _showPassword = !_showPassword),
                  ),
                ),
                validator: _validatePassword,
                onChanged: (_) => setState(() {}),
              ),

              const SizedBox(height: 8),
              PasswordRules(controller: _passwordCtrl),
              const SizedBox(height: 16),

              TextFormField(
                controller: _confirmCtrl,
                obscureText: !_showConfirm,
                decoration: InputDecoration(
                  labelText: "Confirm Password",
                  suffixIcon: IconButton(
                    icon: Icon(_showConfirm ? Icons.visibility_off : Icons.visibility),
                    onPressed: () => setState(() => _showConfirm = !_showConfirm),
                  ),
                ),
                validator: (v) => v != _passwordCtrl.text ? "Passwords don’t match" : null,
              ),

              const SizedBox(height: 12),

              TextFormField(
                controller: _promoCtrl,
                decoration: InputDecoration(
                  labelText: "Promo Code",
                  suffixIcon: IconButton(
                    icon: const Icon(Icons.qr_code),
                    onPressed: _scanQr,
                  ),
                ),
                validator: (v) => v == null || v.isEmpty ? "Enter your promo code" : null,
              ),

              const SizedBox(height: 16),

              CheckboxListTile(
                value: _rememberMe,
                onChanged: (v) => setState(() => _rememberMe = v ?? false),
                title: const Text("Remember me on this device"),
                controlAffinity: ListTileControlAffinity.leading,
              ),

              const SizedBox(height: 16),
            ],
          ),
        ),
      ),

      bottomNavigationBar: SafeBottomButton(
        label: "Complete Registration",
        icon: Icons.check,
        onPressed: _registerLocal,
        loading: _loading,
      ),
    );
  }
}
