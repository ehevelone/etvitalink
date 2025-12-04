import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;

/// OCR + AI Parser for Insurance Cards
class OcrService {
  static const _endpoint =
      "https://vitalink-app.netlify.app/.netlify/functions/parse-insurance";

  Future<Map<String, String>> processAndParse(String imagePath) async {
    final bytes = await File(imagePath).readAsBytes();
    final base64 = base64Encode(bytes);

    final response = await http.post(
      Uri.parse(_endpoint),
      headers: {"Content-Type": "application/json"},
      body: jsonEncode({"imageBase64": base64}),
    );

    if (response.statusCode == 200) {
      final decoded = jsonDecode(response.body);
      return Map<String, String>.from(decoded);
    } else {
      throw Exception("OCR API failed: ${response.body}");
    }
  }
}
