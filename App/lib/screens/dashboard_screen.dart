import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:dashboard_unc/constants/app_colors.dart';
import 'package:dashboard_unc/providers/app_provider.dart';
import 'package:dashboard_unc/screens/add_metric_screen.dart';
import 'package:dashboard_unc/screens/detail_screen.dart';
import 'package:dashboard_unc/widgets/metric_card.dart';
import 'package:provider/provider.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<AppProvider>(context);
    
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text(
          "Dashboard TeoCom", 
          style: GoogleFonts.poppins(color: AppColors.textPrimary, fontWeight: FontWeight.bold)
        ),
        actions: [
          // Botón de reset por si necesitas cambiar credenciales
          IconButton(
            icon: const Icon(Icons.logout, color: Colors.grey),
            tooltip: "Cerrar Sesión / Resetear",
            onPressed: () => _showResetDialog(context, provider),
          )
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text("Métrica", style: TextStyle(color: Colors.white)),
        onPressed: () {
          Navigator.push(context, MaterialPageRoute(builder: (_) => const AddMetricScreen()));
        },
      ),
      // Usamos Column para poner el Logo fijo arriba y la lista abajo
      body: Column(
        children: [
          
          // --- ZONA DEL LOGO ---
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 20),
            child: Center(
              child: Image.asset(
                'assets/images/Logo-UNC-azul.png',
                height: 70, // Altura fija controlada (se adapta el ancho automáticamente)
                fit: BoxFit.contain, // Asegura que se vea entero sin recortes
                errorBuilder: (context, error, stackTrace) {
                  // Por si acaso no cargaste la imagen aún, no rompe la app
                  return const SizedBox.shrink(); 
                },
              ),
            ),
          ),
          // ---------------------

          // --- ZONA DE TARJETAS ---
          Expanded(
            child: provider.metrics.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.dashboard_customize, size: 60, color: Colors.grey),
                        const SizedBox(height: 20),
                        Text(
                          "No tienes métricas.\nAgrega una con el botón +", 
                          textAlign: TextAlign.center, 
                          style: GoogleFonts.poppins(color: Colors.grey)
                        ),
                      ],
                    ),
                  )
                : GridView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 80), // Padding abajo para el FAB
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      mainAxisSpacing: 16,
                      crossAxisSpacing: 16,
                      childAspectRatio: 1.0, // Cuadradas para mejor estética
                    ),
                    itemCount: provider.metrics.length,
                    itemBuilder: (ctx, i) {
                      final metric = provider.metrics[i];
                      final lastVal = provider.getLastValue(metric.id);
                      return MetricCard(
                        config: metric,
                        lastData: lastVal,
                        onTap: () {
                          Navigator.push(context, MaterialPageRoute(builder: (_) => DetailScreen(metricId: metric.id)));
                        },
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  void _showResetDialog(BuildContext context, AppProvider provider) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text("Desconectar"),
        content: const Text("¿Quieres borrar la configuración y volver a la pantalla de inicio?"),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text("Cancelar")),
          TextButton(
              onPressed: () {
                Navigator.pop(ctx);
                provider.resetApp();
              },
              child: const Text("Desconectar", style: TextStyle(color: Colors.red))),
        ],
      ),
    );
  }
}