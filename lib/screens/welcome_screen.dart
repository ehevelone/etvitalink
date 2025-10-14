import 'package:flutter/material.dart';

class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Welcome")),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text(
                "🎉 Welcome to VitaLink",
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 40),

              // User button
              ElevatedButton.icon(
                icon: const Icon(Icons.person),
                label: const Text("I’m a User"),
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size(220, 50),
                ),
                onPressed: () {
                  Navigator.pushNamed(context, '/registration');
                },
              ),
              const SizedBox(height: 20),

              // Agent button
              ElevatedButton.icon(
                icon: const Icon(Icons.badge),
                label: const Text("I’m an Agent"),
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size(220, 50),
                ),
                onPressed: () {
                  Navigator.pushNamed(context, '/agent_login'); // ✅ fixed
                },
              ),
              const SizedBox(height: 40),

              const Text(
                "Users: Unlock with promo code or purchase.\n"
                "Agents: Login to manage your codes.",
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
