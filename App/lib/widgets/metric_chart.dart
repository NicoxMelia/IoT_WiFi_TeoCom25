import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:dashboard_unc/models/metric_config.dart';

class MetricChart extends StatelessWidget {
  final List<DataPoint> data;
  final Color color;
  final bool showXLabels;
  final double? minX;
  final double? maxX;
  final Duration gapThreshold;

  const MetricChart({
    super.key, 
    required this.data, 
    required this.color,
    this.showXLabels = false,
    this.minX,
    this.maxX,
    this.gapThreshold = const Duration(hours: 1), // Default
  });

  @override
  Widget build(BuildContext context) {
    // Si no hay datos, mostramos algo vacío pero respetando los ejes si existen
    if (data.isEmpty && minX == null) return const Center(child: Text("Sin datos en este periodo"));

    // 1. Ordenar
    data.sort((a, b) => a.timestamp.compareTo(b.timestamp));

    // 2. Calcular segmentos (cortar líneas)
    List<List<FlSpot>> segments = [];
    if (data.isNotEmpty) {
      List<FlSpot> currentSegment = [];
      currentSegment.add(FlSpot(data[0].timestamp.millisecondsSinceEpoch.toDouble(), data[0].value));
      
      for (int i = 1; i < data.length; i++) {
        final prev = data[i-1];
        final curr = data[i];
        final diff = curr.timestamp.difference(prev.timestamp);
        
        // Si el salto de tiempo es mayor al umbral, cortamos segmento
        if (diff > gapThreshold) {
          segments.add(currentSegment);
          currentSegment = [];
        }
        currentSegment.add(FlSpot(curr.timestamp.millisecondsSinceEpoch.toDouble(), curr.value));
      }
      segments.add(currentSegment);
    }

    // 3. Calcular Límites Y
    double minY = 0;
    double maxY = 100;
    if (data.isNotEmpty) {
      minY = data.map((e) => e.value).reduce((curr, next) => curr < next ? curr : next);
      maxY = data.map((e) => e.value).reduce((curr, next) => curr > next ? curr : next);
      double buffer = (maxY - minY) * 0.1;
      if (buffer == 0) buffer = 1;
      minY -= buffer;
      maxY += buffer;
    }

    // 4. Construir gráfico
    return LineChart(
      LineChartData(
        minX: minX, // Forzamos inicio del eje (soluciona lo de 7d vs 30d)
        maxX: maxX, // Forzamos fin del eje (usualmente 'ahora')
        minY: minY,
        maxY: maxY,
        
        gridData: FlGridData(
          show: true,
          drawVerticalLine: showXLabels,
          horizontalInterval: (maxY - minY) / 4,
          getDrawingHorizontalLine: (v) => FlLine(color: Colors.grey.withOpacity(0.1)),
          getDrawingVerticalLine: (v) => FlLine(color: Colors.grey.withOpacity(0.1)),
        ),
        
        titlesData: FlTitlesData(
          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: showXLabels,
              interval: ((maxX ?? 0) - (minX ?? 0)) / 4, // Intervalo basado en el rango TOTAL seleccionado
              reservedSize: 30,
              getTitlesWidget: (value, meta) {
                final date = DateTime.fromMillisecondsSinceEpoch(value.toInt());
                // Formato dinámico
                String text;
                if (gapThreshold.inHours > 24) {
                  text = DateFormat('dd/MM').format(date); // Fecha corta
                } else {
                  text = DateFormat('HH:mm').format(date); // Hora
                }
                return Padding(
                  padding: const EdgeInsets.only(top: 8.0),
                  child: Text(text, style: TextStyle(color: Colors.grey[600], fontSize: 10)),
                );
              },
            ),
          ),
        ),
        
        borderData: FlBorderData(show: false),
        
        // 5. Mapear segmentos a líneas
        lineBarsData: segments.map((segment) {
          return LineChartBarData(
            spots: segment,
            isCurved: false, // Rectas
            color: color,
            barWidth: 2.5,
            isStrokeCapRound: true,
            dotData: const FlDotData(show: false),
            belowBarData: BarAreaData(
              show: true, 
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [color.withOpacity(0.2), color.withOpacity(0.0)],
              ),
            ),
          );
        }).toList(),
        
        lineTouchData: LineTouchData(
          touchTooltipData: LineTouchTooltipData(
             tooltipRoundedRadius: 8,
             getTooltipItems: (spots) {
               return spots.map((spot) {
                 final date = DateTime.fromMillisecondsSinceEpoch(spot.x.toInt());
                 return LineTooltipItem(
                   "${DateFormat('dd/MM HH:mm').format(date)}\n${spot.y.toStringAsFixed(2)}",
                   const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                 );
               }).toList();
             }
          )
        ),
      ),
    );
  }
}