import 'package:flutter/material.dart';
import 'package:flutter_colorpicker/flutter_colorpicker.dart'; // Asegúrate de tener este import
import 'package:google_fonts/google_fonts.dart';
import 'package:dashboard_unc/constants/app_colors.dart';
import 'package:dashboard_unc/models/metric_config.dart';
import 'package:dashboard_unc/providers/app_provider.dart';
import 'package:dashboard_unc/widgets/metric_chart.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

class DetailScreen extends StatefulWidget {
  final String metricId;

  const DetailScreen({super.key, required this.metricId});

  @override
  State<DetailScreen> createState() => _DetailScreenState();
}

class _DetailScreenState extends State<DetailScreen> {
  String _selectedRange = '24h';
  String? _filterByGroup; 
  bool _sortByGroup = false; 

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<AppProvider>(context);
    
    final metricIndex = provider.metrics.indexWhere((m) => m.id == widget.metricId);
    if (metricIndex == -1) return const Scaffold(body: Center(child: Text("Métrica no encontrada")));
    
    final metric = provider.metrics[metricIndex];
    final allData = provider.getDataFor(widget.metricId);
    
    // Lógica de Filtros de Fecha
    final now = DateTime.now();
    DateTime startPeriod;
    Duration gapThreshold;

    switch (_selectedRange) {
      case '24h': 
        startPeriod = now.subtract(const Duration(hours: 24));
        gapThreshold = const Duration(minutes: 60);
        break;
      case '7d': 
        startPeriod = now.subtract(const Duration(days: 7));
        gapThreshold = const Duration(hours: 6);
        break;
      case '30d': 
        startPeriod = now.subtract(const Duration(days: 30));
        gapThreshold = const Duration(days: 1);
        break;
      default: 
        startPeriod = allData.isNotEmpty ? allData.first.timestamp : now;
        gapThreshold = const Duration(days: 2);
    }

    List<DataPoint> dateFilteredData = allData.where((p) => p.timestamp.isAfter(startPeriod)).toList();

    // Estadísticas
    double current = allData.isNotEmpty ? allData.last.value : 0.0;
    DateTime? lastUpdate = allData.isNotEmpty ? allData.last.timestamp : null;
    double min = 0, max = 0, avg = 0;
    
    if (dateFilteredData.isNotEmpty) {
      min = dateFilteredData.first.value;
      max = dateFilteredData.first.value;
      double sum = 0;
      int count = 0;
      for (var p in dateFilteredData) {
        if (p.value < min) min = p.value;
        if (p.value > max) max = p.value;
        if (metric.ignoreZeros) {
          if (p.value != 0) { sum += p.value; count++; }
        } else {
          sum += p.value; count++;
        }
      }
      avg = count > 0 ? sum / count : 0.0;
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        title: Text(metric.name, style: GoogleFonts.poppins(color: AppColors.textPrimary, fontWeight: FontWeight.bold)),
        leading: const BackButton(color: AppColors.textPrimary),
        actions: [
          // 1. BOTÓN REFRESH
          IconButton(
            icon: const Icon(Icons.refresh, color: AppColors.primary),
            tooltip: "Forzar actualización",
            onPressed: () {
              provider.refreshMetric(metric.id);
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Actualizando datos..."), duration: Duration(seconds: 1)));
            },
          ),
          // 2. BOTÓN EDITAR
          IconButton(
            icon: const Icon(Icons.edit, color: Colors.blue),
            tooltip: "Editar configuración",
            onPressed: () => _showEditDialog(context, metric, provider),
          ),
          // 3. BOTÓN BORRAR
          IconButton(
            icon: const Icon(Icons.delete_forever, color: Colors.red),
            tooltip: "Eliminar métrica",
            onPressed: () => _confirmDelete(context, provider),
          )
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Tarjeta Principal
            Center(
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: metric.color,
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [BoxShadow(color: metric.color.withOpacity(0.4), blurRadius: 20, offset: const Offset(0, 10))]
                ),
                child: Column(
                  children: [
                    Text("Valor Actual", style: GoogleFonts.poppins(color: Colors.white.withOpacity(0.8), fontSize: 14)),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(current.toStringAsFixed(2), style: GoogleFonts.poppins(fontSize: 48, fontWeight: FontWeight.bold, color: Colors.white)),
                        Padding(
                          padding: const EdgeInsets.only(bottom: 10, left: 5),
                          child: Text(metric.unit, style: GoogleFonts.poppins(fontSize: 20, color: Colors.white.withOpacity(0.9))),
                        ),
                      ],
                    ),
                    if (lastUpdate != null)
                      Text("Actualizado: ${DateFormat('dd/MM HH:mm').format(lastUpdate)}", style: GoogleFonts.poppins(color: Colors.white, fontSize: 12)),
                  ],
                ),
              ),
            ),
            
            const SizedBox(height: 24),
            // Filtros Tiempo
            Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _rangeButton("24h", "24h"),
                  _rangeButton("7d", "7 Días"),
                  _rangeButton("30d", "Mes"),
                  _rangeButton("all", "Histórico"),
                ],
              ),
            ),

            const SizedBox(height: 24),
            // Gráfico
            Container(
              height: 300,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(24), boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 10)]),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text("Tendencia", style: GoogleFonts.poppins(fontWeight: FontWeight.bold, fontSize: 16)),
                  const SizedBox(height: 20),
                  Expanded(
                    child: MetricChart(
                      data: dateFilteredData, 
                      color: metric.color, 
                      showXLabels: true,
                      minX: _selectedRange != 'all' ? startPeriod.millisecondsSinceEpoch.toDouble() : null,
                      maxX: now.millisecondsSinceEpoch.toDouble(),
                      gapThreshold: gapThreshold,
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),
            // Estadísticas
            Row(
              children: [
                Expanded(child: _statCard("Mínimo", min.toStringAsFixed(1), metric.unit, Colors.blue, Icons.arrow_downward)),
                const SizedBox(width: 12),
                Expanded(child: _statCard("Máximo", max.toStringAsFixed(1), metric.unit, Colors.red, Icons.arrow_upward)),
              ],
            ),
            const SizedBox(height: 12),
            GestureDetector(
              onTap: () => _showAvgConfigDialog(context, metric, provider),
              child: Stack(
                children: [
                  _statCard(
                    metric.ignoreZeros ? "Promedio (Sin ceros)" : "Promedio (General)", 
                    avg.toStringAsFixed(2), metric.unit, Colors.orange, Icons.functions
                  ),
                  Positioned(top: 10, right: 10, child: Icon(Icons.settings, size: 16, color: Colors.grey[400]))
                ],
              ),
            ),
            
            const SizedBox(height: 30),
            // Tabla
            Text("Historial de Mediciones", style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 10),
            _buildHistoryTable(dateFilteredData, metric.unit),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  // --- DIÁLOGO DE EDICIÓN (NUEVO) ---
  void _showEditDialog(BuildContext context, MetricConfig metric, AppProvider provider) {
    final nameCtrl = TextEditingController(text: metric.name);
    final unitCtrl = TextEditingController(text: metric.unit);
    Color tempColor = metric.color;

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text("Editar Métrica"),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameCtrl,
                decoration: const InputDecoration(labelText: "Nombre"),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: unitCtrl,
                decoration: const InputDecoration(labelText: "Unidad"),
              ),
              const SizedBox(height: 20),
              const Text("Color"),
              const SizedBox(height: 10),
              BlockPicker(
                pickerColor: tempColor,
                onColorChanged: (c) => tempColor = c,
                availableColors: const [
                  Colors.red, Colors.pink, Colors.purple, Colors.deepPurple,
                  Colors.indigo, Colors.blue, Colors.lightBlue, Colors.cyan,
                  Colors.teal, Colors.green, Colors.lightGreen, Colors.lime,
                  Colors.orange, Colors.deepOrange, Colors.brown, Colors.blueGrey,
                ],
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text("Cancelar")),
          ElevatedButton(
            onPressed: () {
              if (nameCtrl.text.isNotEmpty) {
                // Actualizamos usando el método copyWith
                final updated = metric.copyWith( // Asumiendo que agregaste el copyWith en el modelo en pasos anteriores
                  name: nameCtrl.text,
                  unit: unitCtrl.text,
                  colorValue: tempColor.value
                ); // Si no tienes copyWith en el modelo, crea uno nuevo con el mismo ID
                
                /* Si no tienes copyWith, usa esto:
                final updated = MetricConfig(
                  id: metric.id,
                  name: nameCtrl.text,
                  unit: unitCtrl.text,
                  colorValue: tempColor.value,
                  databasePath: metric.databasePath,
                  dataKey: metric.dataKey,
                  ignoreZeros: metric.ignoreZeros
                ); 
                */

                provider.updateMetric(updated);
                Navigator.pop(ctx);
                
                // Actualizar estado local para que se refleje instantáneamente en la pantalla sin salir
                setState(() {}); 
              }
            },
            child: const Text("Guardar"),
          ),
        ],
      ),
    );
  }

  // --- WIDGETS AUXILIARES (Igual que antes) ---

  Widget _buildHistoryTable(List<DataPoint> data, String unit) {
    if (data.isEmpty) return const Center(child: Text("Sin datos para mostrar"));

    List<DataPoint> tableData = data;
    if (_filterByGroup != null) {
      tableData = data.where((d) => d.group == _filterByGroup).toList();
    }

    if (_sortByGroup) {
      tableData.sort((a, b) => a.group.compareTo(b.group));
    } else {
      tableData = List.from(tableData.reversed);
    }
    
    final uniqueGroups = data.map((e) => e.group).toSet().toList()..sort();

    return Container(
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 5, offset: Offset(0, 2))]),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12),
            child: Row(
              children: [
                Expanded(flex: 2, child: Text("Fecha", style: GoogleFonts.poppins(fontWeight: FontWeight.w600, color: Colors.grey))),
                Expanded(
                  flex: 2,
                  child: PopupMenuButton<String>(
                    tooltip: "Filtrar por Grupo",
                    onSelected: (value) {
                      setState(() {
                        if (value == 'SORT_TOGGLE') {
                          _sortByGroup = !_sortByGroup;
                        } else if (value == 'CLEAR') {
                          _filterByGroup = null;
                        } else {
                          _filterByGroup = value;
                        }
                      });
                    },
                    itemBuilder: (ctx) => [
                      const PopupMenuItem(value: 'SORT_TOGGLE', child: Row(children: [Icon(Icons.sort_by_alpha, size: 18), SizedBox(width: 8), Text("Ordenar por nombre")])),
                      const PopupMenuDivider(),
                      PopupMenuItem(value: 'CLEAR', child: Row(children: [Icon(Icons.check_circle_outline, size: 18, color: _filterByGroup == null ? Colors.blue : Colors.grey), const SizedBox(width: 8), const Text("Ver Todos")])),
                      ...uniqueGroups.map((g) => PopupMenuItem(value: g, child: Row(children: [Icon(Icons.check, size: 18, color: _filterByGroup == g ? Colors.blue : Colors.transparent), const SizedBox(width: 8), Text(g)]))),
                    ],
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Flexible(child: Text(_filterByGroup ?? "Grupo", style: GoogleFonts.poppins(fontWeight: FontWeight.bold, color: _filterByGroup != null ? Colors.blue : Colors.grey), overflow: TextOverflow.ellipsis)),
                        Icon(Icons.arrow_drop_down, size: 16, color: _filterByGroup != null ? Colors.blue : Colors.grey)
                      ],
                    ),
                  ),
                ),
                Expanded(flex: 1, child: Text("Valor", textAlign: TextAlign.end, style: GoogleFonts.poppins(fontWeight: FontWeight.w600, color: Colors.grey))),
              ],
            ),
          ),
          const Divider(height: 1),
          if (tableData.isEmpty) const Padding(padding: EdgeInsets.all(20), child: Text("No hay mediciones")),
          ListView.separated(
            shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
            itemCount: tableData.length > 50 ? 50 : tableData.length,
            separatorBuilder: (ctx, i) => const Divider(height: 1, indent: 16, endIndent: 16),
            itemBuilder: (ctx, i) {
              final point = tableData[i];
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: Row(
                  children: [
                    Expanded(flex: 2, child: Text(DateFormat('dd/MM HH:mm').format(point.timestamp), style: GoogleFonts.robotoMono(color: AppColors.textPrimary, fontSize: 12))),
                    Expanded(flex: 2, child: Center(child: Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2), decoration: BoxDecoration(color: Colors.grey[100], borderRadius: BorderRadius.circular(8)), child: Text(point.group, style: GoogleFonts.poppins(fontSize: 11, color: Colors.black87), overflow: TextOverflow.ellipsis)))),
                    Expanded(flex: 1, child: Text(point.value.toStringAsFixed(2), textAlign: TextAlign.end, style: GoogleFonts.poppins(fontWeight: FontWeight.bold, color: point.value == 0 ? Colors.red : AppColors.textPrimary, fontSize: 14))),
                  ],
                ),
              );
            },
          ),
          if (tableData.length > 50) Padding(padding: const EdgeInsets.all(8.0), child: Text("Mostrando 50 de ${tableData.length} resultados", style: TextStyle(color: Colors.grey[400], fontSize: 10)))
        ],
      ),
    );
  }

  void _showAvgConfigDialog(BuildContext context, MetricConfig metric, AppProvider provider) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text("Configurar Promedio"),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(title: const Text("Incluir Ceros"), leading: Radio<bool>(value: false, groupValue: metric.ignoreZeros, onChanged: (val) { provider.updateMetric(metric.copyWith(ignoreZeros: val)); Navigator.pop(ctx); })),
            ListTile(title: const Text("Ignorar Ceros"), leading: Radio<bool>(value: true, groupValue: metric.ignoreZeros, onChanged: (val) { provider.updateMetric(metric.copyWith(ignoreZeros: val)); Navigator.pop(ctx); })),
          ],
        ),
      ),
    );
  }

  Widget _rangeButton(String id, String label) {
    final isSelected = _selectedRange == id;
    return GestureDetector(
      onTap: () => setState(() => _selectedRange = id),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(color: isSelected ? AppColors.primary : Colors.transparent, borderRadius: BorderRadius.circular(10)),
        child: Text(label, style: TextStyle(color: isSelected ? Colors.white : Colors.grey, fontWeight: isSelected ? FontWeight.bold : FontWeight.normal, fontSize: 12)),
      ),
    );
  }

  Widget _statCard(String label, String val, String unit, Color color, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 5)]),
      child: Row(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(label, style: GoogleFonts.poppins(color: Colors.grey, fontSize: 12), overflow: TextOverflow.ellipsis),
            Text("$val $unit", style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
          ])),
        ],
      ),
    );
  }

  void _confirmDelete(BuildContext context, AppProvider provider) {
      showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text("Borrar métrica"),
        content: const Text("¿Seguro que quieres quitar esta métrica del dashboard?"),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text("Cancelar")),
          TextButton(onPressed: () { Navigator.pop(ctx); provider.removeMetric(widget.metricId); Navigator.pop(context); }, child: const Text("Borrar", style: TextStyle(color: Colors.red))),
        ],
      ),
    );
  }
}