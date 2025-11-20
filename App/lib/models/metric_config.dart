import 'package:flutter/material.dart';

class MetricConfig {
  final String id;
  final String name;
  final String databasePath; // Colección de Firestore
  final String dataKey;      // Campo (ej: temperatura)
  final String unit;         // Unidad (ej: °C)
  final int colorValue;      // Color en formato int
  final bool ignoreZeros;    // Configuración para promedios

  MetricConfig({
    required this.id,
    required this.name,
    required this.databasePath,
    required this.dataKey,
    required this.unit,
    required this.colorValue,
    this.ignoreZeros = false, // Por defecto: NO ignorar ceros
  });

  // Getter para usar el color fácilmente en la UI
  Color get color => Color(colorValue);

  // Método vital para editar una métrica sin perder su ID ni datos que no cambian
  MetricConfig copyWith({
    String? name,
    String? unit,
    int? colorValue,
    bool? ignoreZeros,
    // Estos usualmente no se editan, pero los dejo por si acaso
    String? databasePath,
    String? dataKey,
  }) {
    return MetricConfig(
      id: this.id, // El ID nunca cambia
      name: name ?? this.name,
      databasePath: databasePath ?? this.databasePath,
      dataKey: dataKey ?? this.dataKey,
      unit: unit ?? this.unit,
      colorValue: colorValue ?? this.colorValue,
      ignoreZeros: ignoreZeros ?? this.ignoreZeros,
    );
  }

  // Serialización para guardar en SharedPreferences
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'databasePath': databasePath,
      'dataKey': dataKey,
      'unit': unit,
      'colorValue': colorValue,
      'ignoreZeros': ignoreZeros,
    };
  }

  // Deserialización para leer de memoria
  factory MetricConfig.fromJson(Map<String, dynamic> json) {
    return MetricConfig(
      id: json['id'],
      name: json['name'],
      databasePath: json['databasePath'],
      dataKey: json['dataKey'],
      unit: json['unit'],
      colorValue: json['colorValue'],
      ignoreZeros: json['ignoreZeros'] ?? false, // Si es null (métricas viejas), asume false
    );
  }
}

// Clase para los puntos de datos individuales
class DataPoint {
  final DateTime timestamp;
  final double value;
  final String group; // Nuevo campo para "id_dispositivo" o grupo

  DataPoint(this.timestamp, this.value, {this.group = "--"});
}