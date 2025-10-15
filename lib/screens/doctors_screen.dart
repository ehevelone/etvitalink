import 'package:flutter/material.dart';

import '../models.dart';
import '../services/data_repository.dart';

class DoctorsScreen extends StatefulWidget {
  const DoctorsScreen({super.key});

  @override
  State<DoctorsScreen> createState() => _DoctorsScreenState();
}

class _DoctorsScreenState extends State<DoctorsScreen> {
  late final DataRepository _repo;
  Profile? _p;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _repo = DataRepository();
    _load();
  }

  Future<void> _load() async {
    final p = await _repo.loadProfile();
    setState(() {
      _p = p ?? Profile(doctors: []);
      _loading = false;
    });
  }

  Future<void> _save() async {
    _p!.updatedAt = DateTime.now();
    await _repo.saveProfile(_p!);
    setState(() {});
  }

  Future<void> _addOrEdit({Doctor? existing, int? index}) async {
    final name = TextEditingController(text: existing?.name ?? '');
    final specialty = TextEditingController(text: existing?.specialty ?? '');
    final clinic = TextEditingController(text: existing?.clinic ?? '');
    final phone = TextEditingController(text: existing?.phone ?? '');

    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: Text(existing == null ? 'Add Doctor' : 'Edit Doctor'),
        content: SingleChildScrollView(
          child: Column(
            children: [
              TextField(controller: name, decoration: const InputDecoration(labelText: 'Name')),
              TextField(controller: specialty, decoration: const InputDecoration(labelText: 'Specialty')),
              TextField(controller: clinic, decoration: const InputDecoration(labelText: 'Clinic')),
              TextField(controller: phone, decoration: const InputDecoration(labelText: 'Phone')),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Save')),
        ],
      ),
    );

    if (ok != true) return;

    final doc = Doctor(
      name: name.text,
      specialty: specialty.text,
      clinic: clinic.text,
      phone: phone.text,
    );

    setState(() {
      if (existing == null) {
        _p!.doctors.add(doc);
      } else {
        _p!.doctors[index!] = doc;
      }
    });

    await _save();
  }

  Future<void> _delete(int i) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Remove doctor?'),
        content: Text(_p!.doctors[i].name),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          FilledButton.tonal(onPressed: () => Navigator.pop(context, true), child: const Text('Remove')),
        ],
      ),
    );

    if (ok == true) {
      setState(() {
        _p!.doctors.removeAt(i);
      });
      await _save();
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final docs = _p!.doctors;

    return Scaffold(
      appBar: AppBar(title: const Text("Doctors")),
      body: docs.isEmpty
          ? const Center(child: Text("No doctors added."))
          : ListView.separated(
              itemCount: docs.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (_, i) {
                final d = docs[i];
                return ListTile(
                  title: Text(d.name),
                  subtitle: Text([
                    if (d.specialty.isNotEmpty) d.specialty,
                    if (d.clinic.isNotEmpty) d.clinic,
                    if (d.phone.isNotEmpty) d.phone,
                  ].join(" • ")),
                  trailing: IconButton(
                    icon: const Icon(Icons.delete_outline),
                    onPressed: () => _delete(i),
                  ),
                  onTap: () => _addOrEdit(existing: d, index: i),
                );
              },
            ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _addOrEdit(),
        child: const Icon(Icons.add),
      ),
    );
  }
}
