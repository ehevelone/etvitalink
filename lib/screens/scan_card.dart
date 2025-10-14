import 'package:flutter/material.dart';
import 'package:google_mlkit_document_scanner/google_mlkit_document_scanner.dart';

class ScanCard extends StatefulWidget {
  const ScanCard({super.key});

  @override
  State<ScanCard> createState() => _ScanCardState();
}

class _ScanCardState extends State<ScanCard> {
  bool _scanning = false;

  Future<void> _startScan() async {
    setState(() => _scanning = true);

    DocumentScanner? scanner;
    try {
      final options = DocumentScannerOptions(
        documentFormat: DocumentFormat.jpeg, // ✅ valid in v0.4.0
        mode: ScannerMode.full,              // full-screen scanner UI
        pageLimit: 1,
        isGalleryImport: true,
      );
      scanner = DocumentScanner(options: options);

      final result = await scanner.scanDocument();

      if (!mounted) return;

      if (result != null && result.images.isNotEmpty) {
        // ✅ Return cropped image path to caller
        Navigator.pop(context, result.images.first);
      } else {
        Navigator.pop(context, null); // user canceled
      }
    } catch (e) {
      debugPrint("❌ Document scan failed: $e");
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("Scan failed: $e")),
        );
      }
      Navigator.pop(context, null);
    } finally {
      try {
        await scanner?.close(); // release resources
      } catch (_) {}
      if (mounted) setState(() => _scanning = false);
    }
  }

  @override
  void initState() {
    super.initState();
    // Auto-start scan when page opens
    WidgetsBinding.instance.addPostFrameCallback((_) => _startScan());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Scan Insurance Card")),
      body: Center(
        child: _scanning
            ? const CircularProgressIndicator()
            : const Text("Preparing scanner..."),
      ),
    );
  }
}
