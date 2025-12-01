import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:http/http.dart' as http;

import '../models.dart';
import '../services/data_repository.dart';
import '../services/secure_store.dart';
import 'insurance_policy_form.dart';
import 'declaration_page_viewer.dart';
import 'insurance_cards.dart';

class InsurancePolicyView extends StatefulWidget {
  final int index; // which policy to show

  const InsurancePolicyView({super.key, required this.index});

  @override
  State<InsurancePolicyView> createState() => _InsurancePolicyViewState();
}

class _InsurancePolicyViewState extends State<InsurancePolicyView> {
  late final DataRepository _repo;
  final ImagePicker _picker = ImagePicker();
  Profile? _p;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _repo = DataRepository(SecureStore());
    _load();
  }

  Future<void> _load() async {
    final p = await _repo.loadProfile();
    if (!mounted) return;
    setState(() {
      _p = p;
      _loading = false;
    });
  }

  Future<void> _save() async {
    if (_p != null) {
      _p!.updatedAt = DateTime.now();
      await _repo.saveProfile(_p!);
    }
  }

  void _showSnack(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), duration: const Duration(seconds: 2)),
    );
  }

  Future<void> _deletePolicy() async {
    if (_p == null) return;
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text("Delete Policy?"),
        content: const Text("This will permanently remove this policy."),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text("Cancel"),
          ),
          FilledButton.tonal(
            onPressed: () => Navigator.pop(context, true),
            child: const Text("Delete"),
          ),
        ],
      ),
    );

    if (ok == true) {
      setState(() {
        _p!.insurances.removeAt(widget.index);
      });
      await _save();
      _showSnack("Policy deleted");
      if (mounted) Navigator.pop(context); // back to list
    }
  }

  Future<void> _addDecPageFromGallery() async {
    if (_p == null) return;
    final img = await _picker.pickImage(source: ImageSource.gallery);
    if (img == null) return;

    setState(() {
      _p!.insurances[widget.index].decPagePaths.add(img.path);
    });

    await _save();
    _showSnack("Declaration page added from gallery");
  }

  Future<void> _addDecPageFromCamera() async {
    if (_p == null) return;
    final img = await _picker.pickImage(source: ImageSource.camera);
    if (img == null) return;

    setState(() {
      _p!.insurances[widget.index].decPagePaths.add(img.path);
    });

    await _save();
    _showSnack("Declaration page captured");
  }

  /// 📸 Scan card/policy → Netlify → merge or update
  Future<void> _scanPolicy() async {
    if (_p == null) return;
    try {
      final XFile? image = await _picker.pickImage(source: ImageSource.camera);
      if (image == null) return;

      final bytes = await File(image.path).readAsBytes();
      final base64Image = base64Encode(bytes);

      const url =
          "https://vitalink-app.netlify.app/.netlify/functions/parse_insurance";
      debugPrint("Calling: $url");

      final resp = await http.post(
        Uri.parse(url),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({"imageBase64": base64Image}),
      );

      if (resp.statusCode == 200) {
        final parsed = jsonDecode(resp.body);
        debugPrint("AI Parsed: $parsed");

        final newPolicy = Insurance(
          carrier: parsed['carrier'] ?? '',
          policy: parsed['policy'] ?? '',
          memberId: parsed['memberId'] ?? '',
          policyType: parsed['policyType'] ?? parsed['group'] ?? '',
          decPagePaths: [],
          cards: [],
        );

        // ✅ Duplicate check
        final existing = _p!.insurances.where((i) =>
            i.carrier.trim().toLowerCase() ==
                newPolicy.carrier.trim().toLowerCase() &&
            i.policy.trim() == newPolicy.policy.trim());
        if (existing.isNotEmpty) {
          final idx = _p!.insurances.indexOf(existing.first);
          final updated = await Navigator.push<Insurance>(
            context,
            MaterialPageRoute(
              builder: (_) => InsurancePolicyForm(
                policy: _p!.insurances[idx],
                allPolicies: _p!.insurances,
              ),
            ),
          );
          if (updated != null) {
            setState(() {
              _p!.insurances[idx] = updated;
            });
            await _save();
            _showSnack("Merged into existing policy");
          }
        } else {
          // Update current index
          final ins = _p!.insurances[widget.index];
          final updated = await Navigator.push<Insurance>(
            context,
            MaterialPageRoute(
              builder: (_) => InsurancePolicyForm(
                policy: Insurance(
                  carrier: parsed['carrier'] ?? ins.carrier,
                  policy: parsed['policy'] ?? ins.policy,
                  memberId: parsed['memberId'] ?? ins.memberId,
                  policyType: parsed['policyType'] ?? ins.policyType,
                  decPagePaths: ins.decPagePaths,
                  cards: ins.cards,
                ),
                allPolicies: _p!.insurances,
              ),
            ),
          );

          if (updated != null) {
            setState(() {
              _p!.insurances[widget.index] = updated;
            });
            await _save();
            _showSnack("Policy updated from scan");
          }
        }
      } else {
        debugPrint("Error: ${resp.statusCode} - ${resp.body}");
        _showSnack("Scan failed (${resp.statusCode})");
      }
    } catch (e) {
      debugPrint("Exception: $e");
      _showSnack("Error during scan");
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading || _p == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final ins = _p!.insurances[widget.index];
    final profileName =
        (_p!.fullName.isNotEmpty ? " – ${_p!.fullName}" : "");

    return Scaffold(
      appBar: AppBar(
        title: Text(
          (ins.carrier.isNotEmpty ? ins.carrier : "Insurance Policy") +
              profileName,
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit),
            tooltip: "Edit",
            onPressed: () async {
              final updated = await Navigator.push<Insurance>(
                context,
                MaterialPageRoute(
                  builder: (_) => InsurancePolicyForm(
                    policy: ins,
                    allPolicies: _p!.insurances,
                  ),
                ),
              );
              if (updated != null) {
                setState(() {
                  _p!.insurances[widget.index] = updated;
                });
                await _save();
                _showSnack("Policy updated");
              }
            },
          ),
          IconButton(
            icon: const Icon(Icons.delete_outline),
            tooltip: "Delete",
            onPressed: _deletePolicy,
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (ins.cards.isNotEmpty && ins.cards.first.frontImagePath != null)
            Column(
              children: [
                GestureDetector(
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => Scaffold(
                          appBar: AppBar(),
                          body: Center(
                            child: Image.file(
                              File(ins.cards.first.frontImagePath!),
                            ),
                          ),
                        ),
                      ),
                    );
                  },
                  child: Image.file(
                    File(ins.cards.first.frontImagePath!),
                    height: 180,
                    fit: BoxFit.contain,
                  ),
                ),
                const SizedBox(height: 16),
              ],
            ),

          ListTile(
            title: const Text("Carrier"),
            subtitle: Text(ins.carrier.isNotEmpty ? ins.carrier : "N/A"),
          ),
          ListTile(
            title: const Text("Policy #"),
            subtitle: Text(ins.policy.isNotEmpty ? ins.policy : "N/A"),
          ),
          ListTile(
            title: const Text("Member ID"),
            subtitle: Text(ins.memberId.isNotEmpty ? ins.memberId : "N/A"),
          ),
          ListTile(
            title: const Text("Policy Type"),
            subtitle: Text(ins.policyType.isNotEmpty ? ins.policyType : "N/A"),
          ),

          const Divider(),

          Row(
            children: [
              ElevatedButton.icon(
                icon: const Icon(Icons.camera_alt_outlined),
                label: const Text("Scan Policy"),
                onPressed: _scanPolicy,
              ),
              const SizedBox(width: 12),
              ElevatedButton.icon(
                icon: const Icon(Icons.credit_card),
                label: const Text("View Cards"),
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) =>
                          InsuranceCardsScreen(index: widget.index),
                    ),
                  );
                },
              ),
            ],
          ),

          const Divider(),

          const Padding(
            padding: EdgeInsets.symmetric(vertical: 8.0),
            child: Text(
              "Declaration Pages",
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
          ),
          Row(
            children: [
              ElevatedButton.icon(
                icon: const Icon(Icons.photo_library),
                label: const Text("Upload"),
                onPressed: _addDecPageFromGallery,
              ),
              const SizedBox(width: 12),
              ElevatedButton.icon(
                icon: const Icon(Icons.camera_alt),
                label: const Text("Camera"),
                onPressed: _addDecPageFromCamera,
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (ins.decPagePaths.isNotEmpty)
            Column(
              children: [
                for (final path in ins.decPagePaths)
                  Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    child: ListTile(
                      leading: const Icon(Icons.picture_as_pdf),
                      title: Text("Page: ${path.split('/').last}"),
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) =>
                                DeclarationPageViewer(path: path),
                          ),
                        );
                      },
                    ),
                  ),
              ],
            )
          else
            const Text("No declaration pages uploaded."),
        ],
      ),
    );
  }
}
