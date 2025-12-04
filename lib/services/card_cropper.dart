import 'dart:io';
import 'dart:typed_data';
import 'package:google_mlkit_object_detection/google_mlkit_object_detection.dart';
import 'package:image/image.dart' as img;

class CardCropper {
  static Future<File?> autoCropCard(File file) async {
    try {
      // 🔹 Init ML Kit detector
      final options = ObjectDetectorOptions(
        classifyObjects: false,
        multipleObjects: false,
        mode: DetectionMode.single, // ✅ correct enum for ^0.12.0
      );
      final objectDetector = ObjectDetector(options: options);

      final inputImage = InputImage.fromFile(file);
      final objects = await objectDetector.processImage(inputImage);
      objectDetector.close();

      if (objects.isEmpty) {
        return null; // nothing detected → fallback
      }

      // 🔹 Get bounding box of first detected object
      final rect = objects.first.boundingBox;

      // 🔹 Load original file into image package
      final bytes = await file.readAsBytes();
      final original = img.decodeImage(bytes);
      if (original == null) return null;

      // 🔹 Clamp bounding box to safe values
      final x = rect.left.clamp(0, original.width.toDouble()).toInt();
      final y = rect.top.clamp(0, original.height.toDouble()).toInt();
      final w = rect.width.clamp(1, (original.width - x).toDouble()).toInt();
      final h = rect.height.clamp(1, (original.height - y).toDouble()).toInt();

      // 🔹 Crop image
      final cropped = img.copyCrop(original, x: x, y: y, width: w, height: h);

      // 🔹 Encode as JPEG
      final croppedBytes =
          Uint8List.fromList(img.encodeJpg(cropped, quality: 90));

      // 🔹 Save to new file
      final newPath = file.path
          .replaceAll(".jpg", "_cropped.jpg")
          .replaceAll(".png", "_cropped.jpg");
      final newFile = await File(newPath).writeAsBytes(croppedBytes);

      return newFile;
    } catch (e) {
      return null; // if anything fails, fall back to manual crop
    }
  }
}
