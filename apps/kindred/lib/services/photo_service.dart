import 'package:flutter/cupertino.dart';
import 'package:image_picker/image_picker.dart';

class PhotoService {
  static final ImagePicker _picker = ImagePicker();

  static Future<String?> pickPhoto(BuildContext context) async {
    // Show CupertinoActionSheet
    final String? source = await showCupertinoModalPopup<String>(
      context: context,
      builder: (BuildContext context) => CupertinoActionSheet(
        actions: <CupertinoActionSheetAction>[
          CupertinoActionSheetAction(
            onPressed: () {
              Navigator.pop(context, 'camera');
            },
            child: const Text('Take a photo'),
          ),
          CupertinoActionSheetAction(
            onPressed: () {
              Navigator.pop(context, 'gallery');
            },
            child: const Text('Choose from library'),
          ),
        ],
        cancelButton: CupertinoActionSheetAction(
          isDefaultAction: true,
          onPressed: () {
            Navigator.pop(context);
          },
          child: const Text('Cancel'),
        ),
      ),
    );

    if (source == null) return null;

    try {
      final XFile? image = await _picker.pickImage(
        source: source == 'camera' ? ImageSource.camera : ImageSource.gallery,
        maxWidth: 800,
        maxHeight: 800,
        imageQuality: 85,
      );

      if (image != null) {
        // For now, return the local file path
        // S3 upload will be added in a future session
        return image.path;
      }
    } catch (e) {
      debugPrint('Error picking image: $e');
    }

    return null;
  }
}