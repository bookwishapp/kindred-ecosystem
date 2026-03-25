import 'package:go_router/go_router.dart';
import 'screens/kindred/kindred_screen.dart';
import 'screens/show_up/show_up_screen.dart';
import 'screens/add_kin/add_kin_screen.dart';
import 'widgets/app_shell.dart';

final router = GoRouter(
  initialLocation: '/',
  routes: [
    // Main app shell with bottom navigation
    ShellRoute(
      builder: (context, state, child) => AppShell(child: child),
      routes: [
        GoRoute(
          path: '/',
          builder: (context, state) => const KindredScreen(),
        ),
        GoRoute(
          path: '/show-up',
          builder: (context, state) => const ShowUpScreen(),
        ),
      ],
    ),
    // Add Kin screen (no bottom nav)
    GoRoute(
      path: '/add-kin',
      builder: (context, state) => const AddKinScreen(),
    ),
  ],
);