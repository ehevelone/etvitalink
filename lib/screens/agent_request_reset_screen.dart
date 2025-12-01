import 'package:flutter/material.dart';
import '../services/api_service.dart';

class AgentRequestResetScreen extends StatefulWidget {
  const AgentRequestResetScreen({super.key});

  @override
  State<AgentRequestResetScreen> createState() =>
      _AgentRequestResetScreenState();
}

class _AgentRequestResetScreenState extends State<AgentRequestResetScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  bool _loading = false;

  Future<void> _doRequest() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _loading = true);
    try {
      final data = await ApiService.requestPasswordReset(
        _emailCtrl.text.trim(),
      );

      if (data['success'] == true) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              "Reset code sent to ${data['sentTo'] ?? _emailCtrl.text} (expires in 20 min) ✅",
            ),
          ),
        );

        // 👉 Proceed to agent reset page
        Navigator.pushNamed(
          context,
          '/agent_reset_password',
          arguments: _emailCtrl.text.trim(),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(data['error'] ?? "Failed to send reset code ❌"),
          ),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Server error: $e")),
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Agent Password Reset"),
        backgroundColor: Colors.blue.shade700,
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: ListView(
            children: [
              const SizedBox(height: 12),
              const Center(
                child: Text(
                  "VitaLink Agent Portal",
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(height: 24),
              const Text(
                "Enter your registered agent email below to receive a 6-digit reset code.",
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 14, color: Colors.black54),
              ),
              const SizedBox(height: 24),
              TextFormField(
                controller: _emailCtrl,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(
                  labelText: "Agent Email Address",
                  border: OutlineInputBorder(),
                ),
                validator: (v) =>
                    v == null || v.isEmpty ? "Enter your email address" : null,
              ),
              const SizedBox(height: 24),
              _loading
                  ? const Center(child: CircularProgressIndicator())
                  : ElevatedButton.icon(
                      icon: const Icon(Icons.mark_email_read),
                      label: const Text("Send Reset Code"),
                      onPressed: _doRequest,
                    ),
              const SizedBox(height: 12),
              TextButton(
                onPressed: () {
                  Navigator.pushReplacementNamed(context, '/agent_login');
                },
                child: const Text("Back to Agent Login"),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
