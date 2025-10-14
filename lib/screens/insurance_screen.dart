import 'package:flutter/material.dart';

import '../models.dart';
import '../services/data_repository.dart';
import '../services/secure_store.dart';

class InsuranceScreen extends StatefulWidget {
  const InsuranceScreen({super.key});

  @override
  State<InsuranceScreen> createState() => _InsuranceScreenState();
}

class _InsuranceScreenState extends State<InsuranceScreen> {
  late final DataRepository _repo;
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
    setState(() {
      _p = p;
      _loading = false;
    });
  }

  Future<void> _save() async {
    if (_p == null) return;
    _p!.updatedAt = DateTime.now();
    await _repo.saveProfile(_p!);
    setState(() {});
  }

  Future<void> _addOrEdit({Insurance? existing, int? index}) async {
    final carrier = TextEditingController(text: existing?.carrier ?? '');
    final policy = TextEditingController(text: existing?.policy ?? '');
    final memberId = TextEditingController(text: existing?.memberId ?? '');
    final policyType = TextEditingController(text: existing?.policyType ?? '');

    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: Text(existing == null ? "Add Insurance Policy" : "Edit Insurance Policy"),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: carrier, decoration: const InputDecoration(labelText: "Carrier")),
            TextField(controller: policy, decoration: const InputDecoration(labelText: "Policy #")),
            TextField(controller: memberId, decoration: const InputDecoration(labelText: "Member ID")),
            TextField(controller: policyType, decoration: const InputDecoration(labelText: "Policy Type")),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text("Cancel")),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text("Save")),
        ],
      ),
    );

    if (ok != true) return;

    final ins = Insurance(
      carrier: carrier.text,
      policy: policy.text,
      memberId: memberId.text,
      policyType: policyType.text,
    );

    setState(() {
      if (existing == null) {
        _p!.insurances.add(ins);
      } else {
        _p!.insurances[index!] = ins;
      }
    });

    await _save();
  }

  Future<void> _delete(int i) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text("Remove insurance policy?"),
        content: Text(_p!.insurances[i].carrier),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text("Cancel")),
          FilledButton.tonal(onPressed: () => Navigator.pop(context, true), child: const Text("Remove")),
        ],
      ),
    );

    if (ok == true) {
      setState(() => _p!.insurances.removeAt(i));
      await _save();
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    if (_p == null) return const Scaffold(body: Center(child: Text("No profile found")));

    final insurances = _p!.insurances;

    return Scaffold(
      appBar: AppBar(title: const Text("Insurance Policies")),
      body: Column(
        children: [
          ElevatedButton.icon(
            onPressed: () => _addOrEdit(),
            icon: const Icon(Icons.add_card),
            label: const Text("Add Insurance Policy"),
          ),
          Expanded(
            child: insurances.isEmpty
                ? const Center(child: Text("No insurance policies yet. Tap + to add."))
                : ListView.builder(
                    itemCount: insurances.length,
                    itemBuilder: (_, i) {
                      final ins = insurances[i];
                      return ListTile(
                        title: Text(ins.carrier.isNotEmpty ? ins.carrier : "Unnamed Policy"),
                        subtitle: Text("${ins.policyType} – ${ins.policy}"),
                        onTap: () => _addOrEdit(existing: ins, index: i),
                        trailing: IconButton(
                          icon: const Icon(Icons.delete_outline),
                          onPressed: () => _delete(i),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _addOrEdit(),
        child: const Icon(Icons.add),
      ),
    );
  }
}
