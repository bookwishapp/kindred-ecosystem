import 'package:flutter_test/flutter_test.dart';
import 'package:kindred/app.dart';

void main() {
  testWidgets('KindredApp loads successfully', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const KindredApp());

    // Wait for any animations or async operations
    await tester.pumpAndSettle();

    // Verify that the app loads without errors
    // The actual app content will depend on auth state and data loading
    expect(find.byType(KindredApp), findsOneWidget);
  });
}
