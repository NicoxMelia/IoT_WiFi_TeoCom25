import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:dashboard_unc/constants/app_colors.dart';
import 'package:dashboard_unc/providers/app_provider.dart';
import 'package:provider/provider.dart';

class SetupScreen extends StatefulWidget {
  const SetupScreen({super.key});
  @override
  State<SetupScreen> createState() => _SetupScreenState();
}

class _SetupScreenState extends State<SetupScreen> {
  final _formKey = GlobalKey<FormState>();
  
  // Controladores de texto (Empiezan vacíos)
  final _apiKeyCtrl = TextEditingController();
  final _appIdCtrl = TextEditingController();
  final _msgIdCtrl = TextEditingController();
  final _projIdCtrl = TextEditingController();

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => FocusScope.of(context).unfocus(), // Ocultar teclado al tocar fuera
      child: Scaffold(
        backgroundColor: AppColors.background,
        body: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Card(
              elevation: 4,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Form(
                  key: _formKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.security, size: 60, color: Colors.blue),
                      const SizedBox(height: 16),
                      Text(
                        "Configuración Inicial", 
                        style: GoogleFonts.poppins(fontSize: 22, fontWeight: FontWeight.bold)
                      ),
                      const SizedBox(height: 8),
                      Text(
                        "Ingresa las credenciales de tu proyecto Firebase (Web App) para conectar.", 
                        textAlign: TextAlign.center, 
                        style: GoogleFonts.poppins(color: Colors.grey, fontSize: 12)
                      ),
                      const SizedBox(height: 24),

                      // Campos de texto limpios
                      _input(_apiKeyCtrl, "API Key"),
                      _input(_appIdCtrl, "App ID"),
                      _input(_msgIdCtrl, "Messaging Sender ID"),
                      _input(_projIdCtrl, "Project ID"),
                      
                      const SizedBox(height: 24),
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.blue,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12)
                            )
                          ),
                          onPressed: _submit,
                          child: const Text(
                            "GUARDAR Y CONECTAR", 
                            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)
                          ),
                        ),
                      )
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _input(TextEditingController ctrl, String label) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: TextFormField(
        controller: ctrl,
        decoration: InputDecoration(
          labelText: label,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          isDense: true,
        ),
        validator: (v) => v!.isEmpty ? "Este campo es requerido" : null,
      ),
    );
  }

  void _submit() async {
    if (_formKey.currentState!.validate()) {
      // Recolectamos los datos ingresados por el usuario
      final creds = {
        'apiKey': _apiKeyCtrl.text.trim(),
        'appId': _appIdCtrl.text.trim(),
        'messagingSenderId': _msgIdCtrl.text.trim(),
        'projectId': _projIdCtrl.text.trim(),
      };
      
      try {
        // Intentamos conectar y guardar
        await Provider.of<AppProvider>(context, listen: false).login(creds);
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text("Error de conexión: $e"),
            backgroundColor: Colors.red,
          )
        );
      }
    }
  }
}