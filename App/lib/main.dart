import 'package:flutter/material.dart';
import 'package:dashboard_unc/providers/app_provider.dart';
import 'package:dashboard_unc/screens/dashboard_screen.dart';
import 'package:dashboard_unc/screens/setup_screen.dart'; // Asegúrate de tener este import
import 'package:provider/provider.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // NOTA: Ya no inicializamos Firebase aquí.
  // Lo hace el AppProvider cuando lee las credenciales guardadas.
  
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AppProvider()),
      ],
      child: MaterialApp(
        title: 'IoT Dashboard',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          primarySwatch: Colors.blue,
          useMaterial3: true,
          scaffoldBackgroundColor: const Color(0xFFF0F2F5),
        ),
        home: const RootSwitch(),
      ),
    );
  }
}

class RootSwitch extends StatelessWidget {
  const RootSwitch({super.key});

  @override
  Widget build(BuildContext context) {
    final app = Provider.of<AppProvider>(context);

    // 1. Estamos leyendo el disco
    if (app.isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    // 2. ¿Ya tenemos credenciales guardadas y válidas?
    if (app.isConfigured) {
      return const DashboardScreen();
    }

    // 3. Si no, mostramos Setup
    return const SetupScreen();
  }
}