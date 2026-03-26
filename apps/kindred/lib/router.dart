import 'package:go_router/go_router.dart';
import 'screens/kindred/kindred_screen.dart';
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
      ],
    ),
  ],
);