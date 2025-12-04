import 'package:flutter/services.dart';

class PhoneNumberFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
      TextEditingValue oldValue,
      TextEditingValue newValue) {
    var digits = newValue.text.replaceAll(RegExp(r'\D'), '');

    if (digits.length > 10) digits = digits.substring(0, 10);

    String formatted = digits;
    if (digits.length >= 1) {
      formatted = "(" + digits.substring(0, digits.length.clamp(0, 3));
    }
    if (digits.length >= 4) {
      formatted = "(" + digits.substring(0, 3) + ") " + digits.substring(3, digits.length.clamp(3, 6));
    }
    if (digits.length >= 7) {
      formatted = "(" +
          digits.substring(0, 3) +
          ") " +
          digits.substring(3, 6) +
          "-" +
          digits.substring(6);
    }

    return TextEditingValue(
      text: formatted,
      selection: TextSelection.collapsed(offset: formatted.length),
    );
  }
}
