import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../models.dart';
import '../services/data_repository.dart';
import '../services/secure_store.dart';

class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({super.key});

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  late final DataRepository _repo;
  Profile? _p;
  bool _loading = true;

  final _nameCtrl = TextEditingController();
  final _dobCtrl = TextEditingController();
  final _bloodCtrl = TextEditingController();
  final _contactCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _allergiesCtrl = TextEditingController();
  final _conditionsCtrl = TextEditingController();

  bool _organDonor = false; // ⭐ NEW FIELD

  @override
  void initState() {
    super.initState();
    _repo = DataRepository(SecureStore());
    _load();
  }

  Future<void> _load() async {
    final profile = await _repo.loadProfile();
    if (!mounted) return;

    setState(() {
      _p = profile ?? Profile();
      _loading = false;

      if (_p != null) {
        final e = _p!.emergency;
        _nameCtrl.text = _p!.fullName;
        _dobCtrl.text = _p!.dob ?? '';
        _bloodCtrl.text = e.bloodType;
        _contactCtrl.text = e.contact;
        _phoneCtrl.text = e.phone;
        _allergiesCtrl.text = e.allergies;
        _conditionsCtrl.text = e.conditions;
        _organDonor = e.organDonor; // ⭐
      }
    });
  }

  Future<void> _save() async {
    if (_p == null) return;

    setState(() => _loading = true);

    _p = _p!.copyWith(
      fullName: _nameCtrl.text.trim(),
      dob: _dobCtrl.text.trim(),
      emergency: _p!.emergency.copyWith(
        bloodType: _bloodCtrl.text.trim(),
        contact: _contactCtrl.text.trim(),
        phone: _phoneCtrl.text.trim(),
        allergies: _allergiesCtrl.text.trim(),
        conditions: _conditionsCtrl.text.trim(),
        organDonor: _organDonor, // ⭐
      ),
    );

    await _repo.saveProfile(_p!);

    if (!mounted) return;
    Navigator.pop(context);
  }

  String _formatPhone(String raw) {
    final digits = raw.replaceAll(RegExp(r'\D'), '');
    if (digits.length < 10) return raw;
    return "(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6, 10)}";
  }

  Future<void> _pickDob() async {
    final initial = DateTime.tryParse(_dobCtrl.text) ?? DateTime(1990);
    final date = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(1900),
      lastDate: DateTime.now(),
    );
    if (date != null) {
      setState(() {
        _dobCtrl.text =
            "${date.month.toString().padLeft(2, '0')}/"
            "${date.day.toString().padLeft(2, '0')}/"
            "${date.year}";
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text("Edit Profile")),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            TextField(
              controller: _nameCtrl,
              decoration: const InputDecoration(labelText: "Full Name"),
            ),
            const SizedBox(height: 12),

            TextField(
              controller: _dobCtrl,
              readOnly: true,
              decoration: const InputDecoration(
                labelText: "Date of Birth (MM/DD/YYYY)",
                suffixIcon: Icon(Icons.calendar_today),
              ),
              onTap: _pickDob,
            ),
            const SizedBox(height: 12),

            TextField(
              controller: _bloodCtrl,
              decoration: const InputDecoration(labelText: "Blood Type"),
            ),
            const SizedBox(height: 12),

            TextField(
              controller: _contactCtrl,
              decoration: const InputDecoration(labelText: "Emergency Contact"),
            ),
            const SizedBox(height: 12),

            TextField(
              controller: _phoneCtrl,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(labelText: "Emergency Phone"),
              inputFormatters: [
                FilteringTextInputFormatter.digitsOnly,
                LengthLimitingTextInputFormatter(10),
              ],
              onChanged: (value) {
                final digits = value.replaceAll(RegExp(r'\D'), '');
                if (digits.length == 10) {
                  final formatted = _formatPhone(digits);
                  _phoneCtrl.value = TextEditingValue(
                    text: formatted,
                    selection: TextSelection.collapsed(offset: formatted.length),
                  );
                }
              },
            ),
            const SizedBox(height: 12),

            TextField(
              controller: _allergiesCtrl,
              decoration: const InputDecoration(labelText: "Allergies"),
            ),
            const SizedBox(height: 12),

            TextField(
              controller: _conditionsCtrl,
              decoration: const InputDecoration(labelText: "Conditions"),
            ),
            const SizedBox(height: 24),

            // ⭐ Organ Donor Toggle
            SwitchListTile(
              value: _organDonor,
              onChanged: (v) => setState(() => _organDonor = v),
              title: const Text("Organ Donor"),
              activeColor: Colors.red,
            ),
            const SizedBox(height: 20),

            ElevatedButton(
              onPressed: _save,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 14),
                minimumSize: const Size.fromHeight(48),
              ),
              child: const Text("Save"),
            ),
          ],
        ),
      ),
    );
  }
}
