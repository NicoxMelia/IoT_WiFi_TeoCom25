import 'dart:convert';
import 'package:dashboard_unc/models/metric_config.dart';
import 'package:shared_preferences/shared_preferences.dart';

class StorageService {
  static const String _kMetrics = 'saved_metrics';
  static const String _kCreds = 'firebase_creds'; // Restauramos esto

  // --- Credenciales Firebase ---
  Future<void> saveCredentials(Map<String, String> creds) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kCreds, jsonEncode(creds));
  }

  Future<Map<String, dynamic>?> getCredentials() async {
    final prefs = await SharedPreferences.getInstance();
    if (!prefs.containsKey(_kCreds)) return null;
    return jsonDecode(prefs.getString(_kCreds)!);
  }

  Future<void> clearAll() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
  }

  // --- Métricas Configuradas ---
  Future<void> saveMetrics(List<MetricConfig> metrics) async {
    final prefs = await SharedPreferences.getInstance();
    final List<String> list = metrics.map((m) => jsonEncode(m.toJson())).toList();
    await prefs.setStringList(_kMetrics, list);
  }

  Future<List<MetricConfig>> getMetrics() async {
    final prefs = await SharedPreferences.getInstance();
    if (!prefs.containsKey(_kMetrics)) return [];
    
    final list = prefs.getStringList(_kMetrics)!;
    return list.map((item) => MetricConfig.fromJson(jsonDecode(item))).toList();
  }
}