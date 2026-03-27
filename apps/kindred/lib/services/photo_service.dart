import 'package:flutter/cupertino.dart';
import 'package:image_picker/image_picker.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:url_launcher/url_launcher.dart';

class PhotoService {
  static final ImagePicker _picker = ImagePicker();

  static Future<void> _showPermissionDeniedDialog(
    BuildContext context,
    String permissionType,
  ) async {
    await showCupertinoDialog(
      context: context,
      builder: (BuildContext context) => CupertinoAlertDialog(
        title: Text('$permissionType Access Required'),
        content: Text(
          'Kindred needs access to your $permissionType to add photos of your Kin. '
          'Please enable $permissionType access in Settings.',
        ),
        actions: <CupertinoDialogAction>[
          CupertinoDialogAction(
            isDefaultAction: true,
            onPressed: () {
              Navigator.pop(context);
            },
            child: const Text('Cancel'),
          ),
          CupertinoDialogAction(
            onPressed: () async {
              Navigator.pop(context);
              await launchUrl(Uri.parse('app-settings:'));
            },
            child: const Text('Open Settings'),
          ),
        ],
      ),
    );
  }

  static Future<bool> _checkAndRequestPermission(
    BuildContext context,
    Permission permission,
    String permissionName,
  ) async {
    final status = await permission.status;

    if (status.isGranted) {
      return true;
    }

    if (status.isDenied) {
      final result = await permission.request();
      if (result.isGranted) {
        return true;
      }
    }

    if (status.isPermanentlyDenied || status.isDenied) {
      if (context.mounted) {
        await _showPermissionDeniedDialog(context, permissionName);
      }
      return false;
    }

    return false;
  }

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

    // Check permissions based on selected source
    bool hasPermission = false;
    if (source == 'camera') {
      hasPermission = await _checkAndRequestPermission(
        context,
        Permission.camera,
        'Camera',
      );
    } else {
      hasPermission = await _checkAndRequestPermission(
        context,
        Permission.photos,
        'Photo Library',
      );
    }

    if (!hasPermission) {
      return null;
    }

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

      // Check if this was a permission error and show dialog if needed
      if (e.toString().contains('permission') && context.mounted) {
        final permissionType = source == 'camera' ? 'Camera' : 'Photo Library';
        await _showPermissionDeniedDialog(context, permissionType);
      }
    }

    return null;
  }
}