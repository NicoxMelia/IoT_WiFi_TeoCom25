import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_core/firebase_core.dart';

class FirebaseService {
  FirebaseFirestore? _firestore;
  bool get isInitialized => _firestore != null;

  Future<void> initialize(Map<String, dynamic> creds) async {
    print("!!! INICIALIZANDO CON: ${creds['projectId']} !!!");
    
    try {
      if (Firebase.apps.isEmpty) {
        await Firebase.initializeApp(
          options: FirebaseOptions(
            apiKey: creds['apiKey'],
            appId: creds['appId'],
            messagingSenderId: creds['messagingSenderId'],
            projectId: creds['projectId'],
          ),
        );
      } 
      
      _firestore = FirebaseFirestore.instance;
      print("!!! FIRESTORE CONECTADO !!!");
      
    } catch (e) {
      // Si ya estaba inicializada, solo conectamos Firestore
      try {
         _firestore = FirebaseFirestore.instance;
      } catch (e2) {
         throw Exception("Error Init: $e");
      }
    }
  }

  Stream<QuerySnapshot> getCollectionStream(String path) {
    if (_firestore == null) throw Exception("Firebase no init");
    return _firestore!.collection(path).limit(50).snapshots();
  }

  Future<Map<String, dynamic>?> peekCollection(String path) async {
    if (_firestore == null) _firestore = FirebaseFirestore.instance;

    try {
      final snap = await _firestore!.collection(path).limit(1).get();
      if (snap.docs.isNotEmpty) {
        return snap.docs.first.data();
      }
      return null;
    } catch (e) {
      print("Error PEEK: $e");
      return null;
    }
  }
}