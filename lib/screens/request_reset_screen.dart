// lib/screens/request_reset_screen.dart
import 'package:flutter/material.dart';
import '../services/api_service.dart';

class RequestResetScreen extends StatefulWidget {
  const RequestResetScreen({super.key});

  @override
  State<RequestResetScreen> createState() => _RequestResetScreenState();
}

class _RequestResetScreenState extends State<RequestResetScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();

  bool _loading = false;

  Future<void> _doRequest() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _loading = true);
    try {
      final data = await ApiService.requestPasswordReset(
        _emailCtrl.text.trim(), // ✅ matches ApiService signature
      );

      if (data['success'] == true) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Reset code sent ✅")),
        );

        // Go to reset screen with prefilled emailOrPhone
        Navigator.pushNamed(
          context,
          '/reset_password',
          arguments: _emailCtrl.text.trim(),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(data['error'] ?? "Request failed ❌")),
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Request Password Reset")),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            children: [
              TextFormField(
                controller: _emailCtrl,
                decoration:
                    const InputDecoration(labelText: "Email or Phone"),
                validator: (v) =>
                    v == null || v.isEmpty ? "Enter email or phone" : null,
              ),
              const SizedBox(height: 24),
              _loading
                  ? const Center(child: CircularProgressIndicator())
                  : ElevatedButton.icon(
                      icon: const Icon(Icons.send),
                      label: const Text("Send Reset Code"),
                      onPressed: _doRequest,
                    ),
            ],
          ),
        ),
      ),
    );
  }
}
