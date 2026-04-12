import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'services/supabase_service.dart';
import 'features/ride/presentation/pages/driver_dashboard.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Load .env
  await dotenv.load(fileName: ".env");
  
  // Initialize Supabase
  await SupabaseService().initialize();
  
  runApp(
    const ProviderScope(
      child: MyApp(),
    ),
  );
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'PYU-GO Driver',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.green,
          primary: Colors.green,
        ),
        useMaterial3: true,
      ),
      // Basic auth check
      home: const AuthWrapper(),
    );
  }
}

class AuthWrapper extends StatelessWidget {
  const AuthWrapper({super.key});

  @override
  Widget build(BuildContext context) {
    final session = Supabase.instance.client.auth.currentSession;
    
    if (session == null) {
      return const Scaffold(
        body: Center(
          child: Text('Silakan login di aplikasi web terlebih dahulu.'),
        ),
      );
    }
    
    return const DriverDashboard();
  }
}
