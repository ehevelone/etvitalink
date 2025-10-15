import 'dart:io';
import 'package:flutter/material.dart';

import '../models.dart';
import '../services/data_repository.dart';
import '../services/secure_store.dart';

class InsuranceCardsScreen extends StatefulWidget {
  final int index; // policy index

  const InsuranceCardsScreen({super.key, required this.index});

  @override
  State<InsuranceCardsScreen> createState() => _InsuranceCardsScreenState();
}

class _InsuranceCardsScreenState extends State<InsuranceCardsScreen> {
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
    if (!mounted) return;
    setState(() {
      _p = p;
      _loading = false;
    });
  }

  Future<void> _save() async {
    if (_p == null) return;
    _p!.updatedAt = DateTime.now();
    await _repo.saveProfile(_p!);
  }

  Future<void> _deleteCard(InsuranceCard card) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text("Delete Card?"),
        content: const Text("This will permanently remove this card."),
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
        // remove from orphan cards
        _p?.orphanCards.removeWhere((c) =>
            c.frontImagePath == card.frontImagePath &&
            c.backImagePath == card.backImagePath);

        // also remove from the current policy if it exists
        if (_p != null && widget.index < _p!.insurances.length) {
          final ins = _p!.insurances[widget.index];
          ins.cards.removeWhere((c) =>
              c.frontImagePath == card.frontImagePath &&
              c.backImagePath == card.backImagePath);
        }
      });
      await _save();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Card deleted")),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    if (_p == null || widget.index >= _p!.insurances.length) {
      return const Scaffold(
        body: Center(child: Text("No insurance policy found")),
      );
    }

    final ins = _p!.insurances[widget.index];

    return Scaffold(
      appBar: AppBar(
        title: Text(
          ins.carrier.isNotEmpty ? "${ins.carrier} – Cards" : "Insurance Cards",
        ),
      ),
      body: ins.cards.isEmpty
          ? const Center(child: Text("No cards for this policy"))
          : ListView.builder(
              itemCount: ins.cards.length,
              itemBuilder: (context, index) {
                final card = ins.cards[index];
                final hasImage = (card.frontImagePath?.isNotEmpty ?? false);

                return Card(
                  child: ListTile(
                    leading: hasImage
                        ? Image.file(
                            File(card.frontImagePath!),
                            width: 60,
                            fit: BoxFit.cover,
                          )
                        : const Icon(Icons.credit_card, size: 40),
                    title: Text("Card ${index + 1}"),
                    subtitle: Text("Source: ${card.source}"),
                    trailing: IconButton(
                      icon: const Icon(Icons.delete_outline),
                      onPressed: () => _deleteCard(card),
                    ),
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => Scaffold(
                            appBar: AppBar(title: const Text("Card Viewer")),
                            body: Center(child: CardDetailViewer(card: card)),
                          ),
                        ),
                      );
                    },
                  ),
                );
              },
            ),
    );
  }
}

/// ✅ Widget to toggle between front/back images with a tap
class CardDetailViewer extends StatefulWidget {
  final InsuranceCard card;
  const CardDetailViewer({super.key, required this.card});

  @override
  State<CardDetailViewer> createState() => _CardDetailViewerState();
}

class _CardDetailViewerState extends State<CardDetailViewer> {
  bool showingFront = true;

  @override
  Widget build(BuildContext context) {
    final front = widget.card.frontImagePath;
    final back = widget.card.backImagePath;
    final hasBack = back != null && back.isNotEmpty;

    final file = File(showingFront ? front! : back!);

    return GestureDetector(
      onTap: hasBack ? () => setState(() => showingFront = !showingFront) : null,
      child: Stack(
        alignment: Alignment.center,
        children: [
          Image.file(file, fit: BoxFit.contain),
          if (hasBack)
            Positioned(
              bottom: 20,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.black54,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  showingFront ? "Tap to view back" : "Tap to view front",
                  style: const TextStyle(color: Colors.white),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
