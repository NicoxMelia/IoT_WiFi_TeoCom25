import 'dart:async';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:dashboard_unc/models/metric_config.dart';
import 'package:dashboard_unc/services/firebase_service.dart';
import 'package:dashboard_unc/services/storage_service.dart';

class AppProvider with ChangeNotifier {
  final StorageService _storage = StorageService();
  final FirebaseService _firebase = FirebaseService();

  bool _isLoading = true;
  bool _isConfigured = false; // Restaurado
  
  List<MetricConfig> _metrics = [];
  final Map<String, List<DataPoint>> _dataCache = {};
  final Map<String, StreamSubscription> _subscriptions = {};

  bool get isLoading => _isLoading;
  bool get isConfigured => _isConfigured; // Restaurado
  List<MetricConfig> get metrics => _metrics;
  FirebaseService get firebaseService => _firebase;

  AppProvider() {
    _init();
  }

  Future<void> _init() async {
    final creds = await _storage.getCredentials();
    if (creds != null) {
      try {
        await _firebase.initialize(creds);
        _metrics = await _storage.getMetrics();
        _isConfigured = true;
        _startListeners();
      } catch (e) {
        print("Error login automático: $e");
        _isConfigured = false;
      }
    } else {
      _isConfigured = false;
    }
    _isLoading = false;
    notifyListeners();
  }

  // Restaurado: Método para hacer login desde SetupScreen
  Future<void> login(Map<String, String> creds) async {
    _isLoading = true;
    notifyListeners();
    try {
      await _firebase.initialize(creds); // Probamos conexión
      await _storage.saveCredentials(creds); // Si funciona, guardamos
      _isConfigured = true;
      _metrics = await _storage.getMetrics(); // Cargamos métricas si había
      _startListeners();
    } catch (e) {
      _isConfigured = false;
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> addMetric(MetricConfig config) async {
    _metrics.add(config);
    await _storage.saveMetrics(_metrics);
    _setupSingleListener(config);
    notifyListeners();
  }

  Future<void> removeMetric(String id) async {
    _metrics.removeWhere((m) => m.id == id);
    await _storage.saveMetrics(_metrics);
    _subscriptions[id]?.cancel();
    _subscriptions.remove(id);
    _dataCache.remove(id);
    notifyListeners();
  }

  Future<void> updateMetric(MetricConfig updatedMetric) async {
    final index = _metrics.indexWhere((m) => m.id == updatedMetric.id);
    if (index != -1) {
      _metrics[index] = updatedMetric; // Reemplazamos en memoria
      await _storage.saveMetrics(_metrics); // Guardamos en disco
      notifyListeners(); // Actualizamos UI
    }
  }

  Future<void> resetApp() async {
    for (var s in _subscriptions.values) s.cancel();
    _subscriptions.clear();
    _dataCache.clear();
    _metrics.clear();
    await _storage.clearAll();
    _isConfigured = false;
    notifyListeners();
  }

    void refreshMetric(String id) {
    // 1. Cancelar suscripción actual
    if (_subscriptions.containsKey(id)) {
      _subscriptions[id]?.cancel();
      _subscriptions.remove(id);
    }
    
    // 2. Limpiar caché local temporalmente
    _dataCache.remove(id);
    notifyListeners(); // Esto hará que la pantalla muestre "Cargando..." o vacío brevemente

    // 3. Volver a conectar
    final metricIndex = _metrics.indexWhere((m) => m.id == id);
    if (metricIndex != -1) {
      _setupSingleListener(_metrics[metricIndex]);
    }
  }

  void _startListeners() {
    for (var m in _metrics) _setupSingleListener(m);
  }

  void _setupSingleListener(MetricConfig m) {
    if (_subscriptions.containsKey(m.id)) return;
    if (!_dataCache.containsKey(m.id)) _dataCache[m.id] = [];

    final stream = _firebase.getCollectionStream(m.databasePath);
    
    _subscriptions[m.id] = stream.listen((QuerySnapshot snapshot) {
      List<DataPoint> newPoints = [];

      for (var doc in snapshot.docs) {
        final val = doc.data() as Map<String, dynamic>;
        final targetVal = val[m.dataKey];
        
        // 1. Detectar FECHA
        DateTime date = DateTime.now();
        if (val['timestamp'] is Timestamp) {
          date = (val['timestamp'] as Timestamp).toDate();
        } else if (val['ts'] is Timestamp) {
          date = (val['ts'] as Timestamp).toDate();
        } else if (val['timestamp'] is String) {
          date = DateTime.tryParse(val['timestamp']) ?? DateTime.now();
        } else if (val['timestamp'] is num) {
          final num ts = val['timestamp'];
          date = DateTime.fromMillisecondsSinceEpoch(ts < 10000000000 ? (ts * 1000).toInt() : ts.toInt());
        }

        // 2. Detectar GRUPO (Personalización)
        String groupName = "N/A";
        if (val['id_dispositivo'] != null) {
          groupName = val['id_dispositivo'].toString();
        } else if (val['grupo'] != null) {
          groupName = val['grupo'].toString();
        } else if (val['group'] != null) {
          groupName = val['group'].toString();
        }

        // 3. Detectar VALOR
        if (targetVal != null) {
           double? finalVal;
           if (targetVal is num) finalVal = targetVal.toDouble();
           if (targetVal is String) finalVal = double.tryParse(targetVal);

           if (finalVal != null) {
             newPoints.add(DataPoint(date, finalVal, group: groupName));
           }
        }
      }
      
      newPoints.sort((a, b) => a.timestamp.compareTo(b.timestamp));
      _dataCache[m.id] = newPoints;
      notifyListeners();
    });
  }

  List<DataPoint> getDataFor(String metricId) => _dataCache[metricId] ?? [];
  
  DataPoint? getLastValue(String metricId) {
    final list = _dataCache[metricId];
    if (list != null && list.isNotEmpty) return list.last;
    return null;
  }
}