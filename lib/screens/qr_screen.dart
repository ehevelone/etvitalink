import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../services/data_repository.dart';
import '../services/secure_store.dart';
import '../models.dart';

class QrScreen extends StatefulWidget {
  final String data;
  final String? title;

  const QrScreen({super.key, required this.data, this.title});

  @override
  State<QrScreen> createState() => _QrScreenState();
}

class _QrScreenState extends State<QrScreen> {
  late final DataRepository _repo;
  Profile? _p;
  bool _loading = true;
  Map<String, dynamic>? _decoded;

  @override
  void initState() {
    super.initState();
    _repo = DataRepository(SecureStore());
    _load();

    // decode data for small text summary only
    try {
      _decoded = jsonDecode(widget.data);
    } catch (_) {
      _decoded = null;
    }
  }

  Future<void> _load() async {
    final p = await _repo.loadProfile();
    if (!mounted) return;
    setState(() {
      _p = p;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final titleText = _p?.fullName.isNotEmpty == true
        ? "${widget.title ?? "QR Code"} – ${_p!.fullName}"
        : widget.title ?? "QR Code";

    return Scaffold(
      appBar: AppBar(title: Text(titleText)),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(18),
              children: [
                // QR image
                GestureDetector(
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => FullscreenQr(data: widget.data),
                      ),
                    );
                  },
                  child: Center(
                    child: QrImageView(
                      data: widget.data,
                      size: 260,
                      backgroundColor: Colors.white,
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                if (_decoded != null) ..._summarySection(_decoded!),
              ],
            ),
    );
  }

  // Only show short emergency summary
  List<Widget> _summarySection(Map<String, dynamic> d) {
    Widget tile(String label, String value) => ListTile(
          dense: true,
          title: Text(label),
          subtitle: Text(value.isNotEmpty ? value : "N/A"),
        );

    return [
      const Text(
        "Quick Emergency Summary",
        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
      ),
      const Divider(),
      if (d["name"] != null) tile("Name", d["name"]),
      if (d["dob"] != null) tile("Date of Birth", d["dob"]),
      if (d["bloodType"] != null) tile("Blood Type", d["bloodType"]),
      if (d["emergencyContactName"] != null) tile("Emergency Contact", d["emergencyContactName"]),
      if (d["emergencyContactPhone"] != null) tile("Emergency Phone", d["emergencyContactPhone"]),
      if (d["allergies"] != null) tile("Allergies", d["allergies"]),
      if (d["conditions"] != null) tile("Medical Conditions", d["conditions"]),
      const SizedBox(height: 20),
      const Text(
        "⚠ Full medical / medication / doctor / insurance card info is embedded in the QR only.\nScanning device will receive full data.",
        textAlign: TextAlign.center,
        style: TextStyle(fontSize: 13, color: Colors.black54),
      ),
    ];
  }
}

class FullscreenQr extends StatelessWidget {
  final String data;
  const FullscreenQr({super.key, required this.data});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Center(
        child: QrImageView(
          data: data,
          size: 390,
          eyeStyle: const QrEyeStyle(color: Colors.white, eyeShape: QrEyeShape.square),
          dataModuleStyle: const QrDataModuleStyle(color: Colors.white, dataModuleShape: QrDataModuleShape.square),
        ),
      ),
    );
  }
}
