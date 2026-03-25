import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:ui_kit/ui_kit.dart';
import 'package:core/core.dart';
import 'router.dart';
import 'providers/kin_provider.dart';
import 'services/kindred_api.dart';
import 'widgets/app_shell.dart';

class KindredApp extends StatelessWidget {
  const KindredApp({super.key});

  @override
  Widget build(BuildContext context) {
    // Create services
    final secureStorage = SecureStorageService();
    final kindredApi = KindredApiFactory.create(
      storage: secureStorage,
      onUnauthorized: () {
        // Handle unauthorized - could navigate to login
        // For now, just log it
        debugPrint('User unauthorized - should redirect to login');
      },
    );

    return MultiProvider(
      providers: [
        // Provide the API service
        Provider<KindredApi>.value(value: kindredApi),
        Provider<SecureStorageService>.value(value: secureStorage),

        // Create KinProvider with the API
        ChangeNotifierProvider(
          create: (context) => KinProvider(api: kindredApi),
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