import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:ui_kit/ui_kit.dart';
import 'package:core/core.dart';
import 'package:uni_links/uni_links.dart';
import 'router.dart';
import 'providers/kin_provider.dart';
import 'services/kindred_api.dart';
import 'services/auth_api.dart';
import 'services/auth_service.dart';
import 'services/profile_service.dart';
import 'services/deep_link_service.dart';
import 'services/backup_service.dart';
import 'widgets/app_shell.dart';

class KindredApp extends StatefulWidget {
  const KindredApp({super.key});

  @override
  State<KindredApp> createState() => _KindredAppState();
}

class _KindredAppState extends State<KindredApp> {
  late final SecureStorageService secureStorage;
  late final AuthService authService;
  late final ProfileService profileService;
  late final KindredApi kindredApi;
  late final AuthApi authApi;
  late final DeepLinkService deepLinkService;

  final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

  @override
  void initState() {
    super.initState();

    // Create services
    secureStorage = SecureStorageService();
    authService = AuthService(storage: secureStorage);

    // Create API with token provider from AuthService
    // Note: We don't set onUnauthorized here - 401s on data endpoints should fail silently
    // and not log the user out. Only auth endpoints should handle unauthorized state.
    kindredApi = KindredApiFactory.create(
      storage: secureStorage,
      tokenProvider: () async {
        // Try to get token from AuthService first (in memory)
        final token = authService.token;
        if (token != null) return token;

        // Fallback to loading from secure storage if not in memory yet
        return await secureStorage.getAuthToken();
      },
    );

    // Create Auth API for profile operations
    authApi = AuthApiFactory.create(
      storage: secureStorage,
      tokenProvider: () async {
        // Try to get token from AuthService first (in memory)
        final token = authService.token;
        if (token != null) return token;

        // Fallback to loading from secure storage if not in memory yet
        return await secureStorage.getAuthToken();
      },
    );

    // Create profile service
    profileService = ProfileService(api: authApi);

    // Set up restore callback for after successful auth
    authService.onAuthSuccess = (userId, accessToken) async {
      // First load the profile with the new token
      await profileService.loadProfile();

      // Then restore backup
      await BackupService().restore(
        userId: userId,
        accessToken: accessToken,
        api: kindredApi,
      );
    };

    // Create deep link service
    deepLinkService = DeepLinkService(
      authService: authService,
      contextProvider: () => navigatorKey.currentContext,
    );

    // Initialize services
    _initializeServices();
  }

  Future<void> _initializeServices() async {
    await authService.initialize();

    // Check for initial deep link (cold start)
    try {
      final initialUri = await getInitialUri();
      if (initialUri != null && initialUri.scheme == 'kindred') {
        final token = initialUri.queryParameters['access_token'];
        if (token != null) {
          debugPrint('Found access token in initial deep link');
          await authService.handleAccessToken(token);
        }
      }
    } catch (e) {
      debugPrint('Failed to handle initial deep link: $e');
    }

    await deepLinkService.initialize();
  }

  @override
  void dispose() {
    deepLinkService.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        // Provide core services
        Provider<SecureStorageService>.value(value: secureStorage),
        Provider<KindredApi>.value(value: kindredApi),
        Provider<AuthApi>.value(value: authApi),

        // Provide auth and profile services
        ChangeNotifierProvider<AuthService>.value(value: authService),
        ChangeNotifierProvider<ProfileService>.value(value: profileService),

        // Create KinProvider with the API and AuthService
        ChangeNotifierProvider(
          create: (context) => KinProvider(api: kindredApi, authService: authService),
        ),

        // Keep the existing bottom sheet provider
        ChangeNotifierProvider(create: (_) => BottomSheetVisibilityNotifier()),
      ],
      child: MaterialApp.router(
        title: 'Kindred',
        theme: AppTheme.theme,
        debugShowCheckedModeBanner: false,
        routerConfig: router,
      ),
    );
  }
}