import 'package:flutter/material.dart';

class SafeBottomButton extends StatelessWidget {
  final String label;
  final IconData? icon;
  final VoidCallback onPressed;
  final bool loading;
  final Color? color;

  const SafeBottomButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.loading = false,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      minimum: const EdgeInsets.all(16),
      child: SizedBox(
        width: double.infinity,
        child: ElevatedButton.icon(
          onPressed: loading ? null : onPressed,
          icon: icon != null ? Icon(icon) : const Icon(Icons.arrow_forward),
          label: loading
              ? const SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                )
              : Text(label),
          style: ElevatedButton.styleFrom(
            backgroundColor: color ?? Theme.of(context).primaryColor,
            padding: const EdgeInsets.symmetric(vertical: 14),
            textStyle: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ),
    );
  }
}
