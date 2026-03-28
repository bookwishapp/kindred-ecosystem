import 'package:flutter/material.dart';
import 'package:uni_links/uni_links.dart';
import 'dart:async';
import 'auth_service.dart';
import '../screens/profile_preview/profile_preview_sheet.dart';

/// Service that handles deep links for the app
class DeepLinkService {
  final AuthService authService;
  final BuildContext? Function() contextProvider;

  StreamSubscription? _linkSubscription;

  DeepLinkService({
    required this.authService,
    required this.contextProvider,
  });

  /// Initialize deep link handling
  Future<void> initialize() async {
    // Handle the initial link if the app was launched from a link
    try {
      final initialLink = await getInitialLink();
      if (initialLink != null) {
        _handleDeepLink(initialLink);
      }
    } catch (e) {
      debugPrint('Failed to handle initial link: $e');
    }

    // Listen for links while the app is running
    _linkSubscription = linkStream.listen(
      (String? link) {
        if (link != null) {
          _handleDeepLink(link);
        }
      },
      onError: (e) {
        debugPrint('Failed to handle link: $e');
      },
    );
  }

  /// Clean up resources
  void dispose() {
    _linkSubscription?.cancel();
  }

  /// Handle incoming deep links
  void _handleDeepLink(String link) {
    debugPrint('Received deep link: $link');

    final uri = Uri.parse(link);

    // Check if this is a direct access token from auth redirect
    if (uri.scheme == 'kindred') {
      final accessToken = uri.queryParameters['access_token'];
      if (accessToken != null) {
        final userId = uri.queryParameters['user_id'];
        debugPrint('Handling access token from deep link');
        authService.handleAccessToken(accessToken, userId: userId);
        return;
      }
    }

    // Check if this is an auth verification link
    if (uri.scheme == 'kindred' &&
        uri.host == 'auth' &&
        uri.path == '/verify') {

      final token = uri.queryParameters['token'];
      if (token != null) {
        _handleAuthVerification(token);
      }
      return;
    }

    // Universal link: fromkindred.com/{username}
    if (uri.host == 'fromkindred.com' &&
        uri.pathSegments.length == 1 &&
        uri.pathSegments[0].isNotEmpty &&
        uri.pathSegments[0] != '.well-known') {
      debugPrint('Handling Universal Link profile for username: ${uri.pathSegments[0]}');
      _showProfilePreview(uri.pathSegments[0]);
      return;
    }

    // Custom scheme: kindred://profile/{username}
    if (uri.scheme == 'kindred' &&
        uri.pathSegments.isNotEmpty &&
        uri.pathSegments.first == 'profile' &&
        uri.pathSegments.length > 1) {
      debugPrint('Handling custom scheme profile for username: ${uri.pathSegments[1]}');
      _showProfilePreview(uri.pathSegments[1]);
      return;
    }
  }

  /// Handle authentication verification
  Future<void> _handleAuthVerification(String token) async {
    try {
      // Verify the token with the auth service
      await authService.verifyMagicLink(token);

      // Show success message if we have a context
      final context = contextProvider();
      if (context != null && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Successfully signed in!'),
            backgroundColor: Colors.green,
          ),
        );

        // Pop any open sheets to return to main screen
        Navigator.of(context).popUntil((route) => route.isFirst);
      }
    } catch (e) {
      debugPrint('Failed to verify magic link: $e');

      // Show error message if we have a context
      final context = contextProvider();
      if (context != null && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to sign in: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  /// Show profile preview sheet
  void _showProfilePreview(String username) {
    Future.delayed(const Duration(milliseconds: 300), () {
      final context = contextProvider();
      if (context != null && context.mounted) {
        showModalBottomSheet(
          context: context,
          useRootNavigator: true,
          isScrollControlled: true,
          backgroundColor: Colors.transparent,
          builder: (_) => ProfilePreviewSheet(username: username),
        );
      }
    });
  }
}