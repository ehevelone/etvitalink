import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../services/data_repository.dart';
import '../services/secure_store.dart';
import '../models.dart';

class QrScreen extends StatefulWidget {
  final String data;
  final String? title; // ✅ optional title

  const QrScreen({super.key, required this.data, this.title});

  @override
  State<QrScreen> createState() => _QrScreenState();
}

class _QrScreenState extends State<QrScreen> {
  late final DataRepository _repo;
  Profile? _p;
  bool _loading = true;
  Map<String, dynamic>? _decoded; // ✅ parsed JSON for plain text

  @override
  void initState() {
    super.initState();
    _repo = DataRepository(SecureStore());
    _load();

    // Try decoding QR payload → show readable fallback
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
        : (widget.title ?? "QR Code");

    return Scaffold(
      appBar: AppBar(title: Text(titleText)),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
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
                      version: QrVersions.auto,
                      size: 240,
                      backgroundColor: Colors.white,
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                if (_decoded != null) ...[
                  const Text(
                    "Emergency Information (plain text):",
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                  const Divider(),
                  ..._decoded!.entries.map((entry) {
                    final key = entry.key;
                    final val = entry.value;
                    return ListTile(
                      title: Text(key),
                      subtitle: Text(val.toString()),
                    );
                  }),
                ],
              ],
            ),
    );
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
          version: QrVersions.auto,
          size: 400,
          eyeStyle: const QrEyeStyle(
            eyeShape: QrEyeShape.square,
            color: Colors.white,
          ),
          dataModuleStyle: const QrDataModuleStyle(
            dataModuleShape: QrDataModuleShape.square,
            color: Colors.white,
          ),
        ),
      ),
    );
  }
}
