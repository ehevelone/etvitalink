import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:flutter/services.dart';
import '../services/secure_store.dart';
import '../services/api_service.dart';

class MyAgentAgent extends StatefulWidget {
  const MyAgentAgent({super.key});

  @override
  State<MyAgentAgent> createState() => _MyAgentAgentState();
}

class _MyAgentAgentState extends State<MyAgentAgent> {
  bool _loading = true;

  String? _agentName;
  String? _agentEmail;
  String? _agentPhone;
  String? _agencyName;
  String? _agencyAddress;
  String? _promoCode;
  String? _deepLink;
  bool _active = false;

  @override
  void initState() {
    super.initState();
    _loadAgentInfo();
  }

  Future<void> _loadAgentInfo() async {
    final store = SecureStore();

    final name = await store.getString("agentName");
    final email = await store.getString("agentEmail");
    final phone = await store.getString("agentPhone");
    final agencyName = await store.getString("agencyName");
    final agencyAddress = await store.getString("agencyAddress");

    try {
      final res = await ApiService.getAgentPromoCode(email ?? "");

      if (res['success'] == true) {
        final code = res['code'];
        await store.setString("agentPromoCode", code);

        setState(() {
          _agentName = name?.isNotEmpty == true ? name : "Unknown Agent";
          _agentEmail = email ?? "";
          _agentPhone = phone ?? "";
          _agencyName = agencyName ?? "";
          _agencyAddress = agencyAddress ?? "";
          _promoCode = code;
          _deepLink =
              "https://vitalink-app.netlify.app/onboard?code=$code";
          _active = res['active'] ?? false;
          _loading = false;
        });
      } else {
        throw Exception(res['error'] ?? "Failed to fetch code");
      }
    } catch (e) {
      debugPrint("⚠️ Failed to load promo code: $e");
      final code = await store.getString("agentPromoCode");
      setState(() {
        _agentName = name?.isNotEmpty == true ? name : "Unknown Agent";
        _agentEmail = email ?? "";
        _agentPhone = phone ?? "";
        _agencyName = agencyName ?? "";
        _agencyAddress = agencyAddress ?? "";
        _promoCode = code ?? "";
        _deepLink = code != null
            ? "https://vitalink-app.netlify.app/onboard?code=$code"
            : null;
        _loading = false;
      });
    }
  }

  Future<void> _verifyCode() async {
    final store = SecureStore();
    final email = await store.getString("agentEmail");
    final code = await store.getString("agentPromoCode");

    if (email == null || code == null || email.isEmpty || code.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("No promo code found ❌")),
      );
      return;
    }

    setState(() => _loading = true);
    try {
      final res = await ApiService.verifyPromoCode(email, code);

      if (res['success'] == true && res['agent'] != null) {
        final agent = res['agent'];
        setState(() {
          _active = agent['active'] == true;
          _promoCode = res['code'];
          _deepLink =
              "https://vitalink-app.netlify.app/onboard?code=${res['code']}";
        });

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Agent verified ✅")),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(res['error'] ?? "Code invalid ❌")),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Error verifying code: $e")),
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _copyInviteLink() async {
    if (_deepLink == null) return;
    await Clipboard.setData(ClipboardData(text: _deepLink!));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text("Invite link copied 📋")),
    );
  }

  Future<void> _goToAuthorizationForm() async {
    await Navigator.pushNamed(context, '/authorization_form');
    await _loadAgentInfo();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.blue.shade700,
        title: const Text(
          "My Agent Profile",
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
      ),
      body: SafeArea(
        child: Stack(
          children: [
            // ✅ Faded background (matches menu)
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

            // ✅ Centered content
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

                    // ✅ Verify & QR Button
                    ElevatedButton.icon(
                      onPressed: _verifyCode,
                      icon: const Icon(Icons.qr_code_2),
                      label: const Text("Verify & Show Invite QR"),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.blue.shade600,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(
                            vertical: 12, horizontal: 24),
                        textStyle: const TextStyle(fontSize: 16),
                      ),
                    ),
                    const SizedBox(height: 20),

                    // ✅ Centered QR + Copy Link
                    if (_promoCode != null && _deepLink != null)
                      Card(
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16)),
                        margin: const EdgeInsets.symmetric(vertical: 8),
                        elevation: 4,
                        child: Padding(
                          padding: const EdgeInsets.all(20),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                _promoCode!,
                                style: const TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 1.2,
                                ),
                              ),
                              const SizedBox(height: 12),
                              QrImageView(
                                data: _deepLink!,
                                version: QrVersions.auto,
                                size: 200,
                                backgroundColor: Colors.white,
                              ),
                              const SizedBox(height: 16),
                              ElevatedButton.icon(
                                onPressed: _copyInviteLink,
                                icon: const Icon(Icons.copy),
                                label: const Text("Copy Invite Link"),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.grey.shade700,
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(
                                      vertical: 10, horizontal: 18),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),

                    const SizedBox(height: 30),

                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        icon: const Icon(Icons.assignment),
                        label: const Text("Send My Information"),
                        onPressed: _goToAuthorizationForm,
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
