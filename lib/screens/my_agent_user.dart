import 'package:flutter/material.dart';
import '../services/secure_store.dart';

class MyAgentUser extends StatefulWidget {
  const MyAgentUser({super.key});

  @override
  State<MyAgentUser> createState() => _MyAgentUserState();
}

class _MyAgentUserState extends State<MyAgentUser> {
  String? _agentName;
  String? _agentPhone;
  String? _agentEmail;
  String? _agencyName;
  String? _agencyAddress;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadAgent();
  }

  Future<void> _loadAgent() async {
    final store = SecureStore();
    final name = await store.getString("agentName");
    final phone = await store.getString("agentPhone");
    final email = await store.getString("agentEmail");
    final agencyName = await store.getString("agencyName");
    final agencyAddress = await store.getString("agencyAddress");

    if (!mounted) return;
    setState(() {
      _agentName = name ?? "Unknown Agent";
      _agentPhone = phone ?? "";
      _agentEmail = email ?? "";
      _agencyName = agencyName ?? "";
      _agencyAddress = agencyAddress ?? "";
      _loading = false;
    });
  }

  Future<void> _sendToAgent() async {
    Navigator.pushNamed(context, '/authorization_form'); // ✅ show form
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.blue.shade700,
        title: const Text(
          "My Agent",
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
      ),
      body: SafeArea(
        child: Stack(
          children: [
            // ✅ Background logo (same as agent page)
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

            // ✅ Foreground content
            Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Card(
                      elevation: 4,
                      margin: const EdgeInsets.only(bottom: 24),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            Text(
                              _agentName ?? "Unknown Agent",
                              style: const TextStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 8),
                            if (_agencyName?.isNotEmpty == true)
                              Text("🏢 ${_agencyName!}",
                                  style: const TextStyle(fontSize: 16)),
                            if (_agencyAddress?.isNotEmpty == true)
                              Text("📍 ${_agencyAddress!}",
                                  style: const TextStyle(fontSize: 16)),
                            const SizedBox(height: 8),
                            if (_agentPhone?.isNotEmpty == true)
                              Text("📞 ${_agentPhone!}",
                                  style: const TextStyle(fontSize: 16)),
                            if (_agentEmail?.isNotEmpty == true)
                              Text("📧 ${_agentEmail!}",
                                  style: const TextStyle(fontSize: 16)),
                          ],
                        ),
                      ),
                    ),

                    // ✅ Reload Info Button
                    ElevatedButton.icon(
                      onPressed: _loadAgent,
                      icon: const Icon(Icons.refresh),
                      label: const Text("Reload Info"),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.blue.shade600,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(
                            vertical: 12, horizontal: 24),
                        textStyle: const TextStyle(fontSize: 16),
                      ),
                    ),
                    const SizedBox(height: 20),

                    // ✅ Send Info Button
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        icon: const Icon(Icons.send),
                        label: const Text("Send My Info to Agent"),
                        onPressed: _sendToAgent,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.purple.shade600,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(
                              vertical: 14, horizontal: 20),
                          textStyle: const TextStyle(fontSize: 16),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
