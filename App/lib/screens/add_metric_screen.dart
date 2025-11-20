import 'package:flutter/material.dart';
import 'package:flutter_colorpicker/flutter_colorpicker.dart';
import 'package:dashboard_unc/models/metric_config.dart';
import 'package:dashboard_unc/providers/app_provider.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';

class AddMetricScreen extends StatefulWidget {
  const AddMetricScreen({super.key});

  @override
  State<AddMetricScreen> createState() => _AddMetricScreenState();
}

class _AddMetricScreenState extends State<AddMetricScreen> {
  int _step = 0;
  final _pathCtrl = TextEditingController();
  final _nameCtrl = TextEditingController();
  final _unitCtrl = TextEditingController();
  
  bool _loadingPath = false;
  Map<dynamic, dynamic>? _foundData;
  String? _selectedKey;
  Color _selectedColor = Colors.blue;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      // 1. ESTO ES NUEVO: Tocar afuera cierra el teclado
      onTap: () => FocusScope.of(context).unfocus(),
      child: Scaffold(
        appBar: AppBar(title: const Text("Nueva Métrica")),
        // Usamos Column + Expanded para asegurar que el Stepper ocupe todo
        body: Column(
          children: [
            Expanded(
              child: Stepper(
                type: StepperType.vertical,
                currentStep: _step,
                onStepContinue: _nextStep,
                onStepCancel: _step > 0 ? () => setState(() => _step--) : null,
                // Personalizamos los botones para asegurarnos que se vean bien
                controlsBuilder: (ctx, details) {
                  final isLastStep = _step == 2;
                  return Container(
                    margin: const EdgeInsets.only(top: 20, bottom: 20),
                    child: Row(
                      children: [
                        Expanded(
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: isLastStep ? Colors.green : Colors.blue,
                              padding: const EdgeInsets.symmetric(vertical: 16),
                            ),
                            onPressed: details.onStepContinue,
                            child: Text(
                              isLastStep ? "GUARDAR Y SALIR" : "CONTINUAR",
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ),
                        if (_step > 0) ...[
                          const SizedBox(width: 12),
                          TextButton(
                            onPressed: details.onStepCancel,
                            child: const Text("Atrás"),
                          ),
                        ]
                      ],
                    ),
                  );
                },
                steps: [
                  // PASO 1: Colección
                  Step(
                    title: const Text("Colección de Firestore"),
                    content: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text("Escribe el nombre de la colección (ej: 'lecturas_sensores')."),
                        TextField(
                          controller: _pathCtrl, 
                          decoration: const InputDecoration(
                            hintText: "ej: lecturas_sensores",
                            border: OutlineInputBorder(),
                            filled: true,
                          ),
                        ),
                        if (_loadingPath) const Padding(
                          padding: EdgeInsets.only(top: 10),
                          child: LinearProgressIndicator(),
                        ),
                        if (_foundData != null) 
                          Container(
                            margin: const EdgeInsets.only(top: 10),
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: Colors.green[50],
                              borderRadius: BorderRadius.circular(8)
                            ),
                            child: Row(
                              children: const [
                                Icon(Icons.check_circle, color: Colors.green),
                                SizedBox(width: 8),
                                Expanded(child: Text("¡Datos encontrados!", style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold))),
                              ],
                            ),
                          )
                      ],
                    ),
                    isActive: _step >= 0,
                  ),
                  
                  // PASO 2: Variable
                  Step(
                    title: const Text("Variable a Graficar"),
                    content: Column(
                      children: [
                        if (_foundData == null) 
                          const Text("No se encontraron datos.")
                        else 
                          ..._foundData!.keys.map((k) {
                            final val = _foundData![k];
                            final isNumeric = val is num || (val is String && double.tryParse(val) != null);
                            
                            if (!isNumeric) return const SizedBox.shrink();

                            return Container(
                              margin: const EdgeInsets.only(bottom: 8),
                              decoration: BoxDecoration(
                                border: Border.all(color: _selectedKey == k.toString() ? Colors.blue : Colors.grey.shade300),
                                borderRadius: BorderRadius.circular(8),
                                color: _selectedKey == k.toString() ? Colors.blue.withOpacity(0.05) : null,
                              ),
                              child: RadioListTile<String>(
                                title: Text(k.toString(), style: const TextStyle(fontWeight: FontWeight.bold)),
                                subtitle: Text("Valor actual: $val"),
                                value: k.toString(),
                                groupValue: _selectedKey,
                                onChanged: (v) => setState(() => _selectedKey = v),
                                activeColor: Colors.blue,
                              ),
                            );
                          }).toList()
                      ],
                    ),
                    isActive: _step >= 1,
                  ),

                  // PASO 3: Estilo (EL QUE DABA PROBLEMAS)
                  Step(
                    title: const Text("Estilo y Etiquetas"),
                    content: Column(
                      children: [
                        TextField(
                          controller: _nameCtrl, 
                          decoration: const InputDecoration(labelText: "Nombre visible (ej: Temperatura)"),
                        ),
                        TextField(
                          controller: _unitCtrl, 
                          decoration: const InputDecoration(labelText: "Unidad (ej: °C)"),
                        ),
                        const SizedBox(height: 20),
                        const Align(
                          alignment: Alignment.centerLeft,
                          child: Text("Selecciona un color:", style: TextStyle(fontWeight: FontWeight.bold)),
                        ),
                        const SizedBox(height: 10),
                        
                        // 2. ESTO ES NUEVO: Limitamos la altura del selector de color
                        // y lo envolvemos en un borde para que se vea ordenado
                        Container(
                          height: 200, // Altura fija para que no empuje los botones
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            border: Border.all(color: Colors.grey.shade300),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: BlockPicker(
                            pickerColor: _selectedColor,
                            onColorChanged: (c) {
                              setState(() => _selectedColor = c);
                              // Cerramos el teclado si estaba abierto al elegir color
                              FocusScope.of(context).unfocus();
                            },
                            // Hacemos los círculos un poco más chicos para que entren más
                            itemBuilder: (color, isCurrentColor, changeColor) {
                              return GestureDetector(
                                onTap: changeColor,
                                child: Container(
                                  margin: const EdgeInsets.all(5),
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: color,
                                    border: isCurrentColor ? Border.all(color: Colors.black, width: 3) : null,
                                    boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 2)]
                                  ),
                                  width: 40,
                                  height: 40,
                                ),
                              );
                            },
                          ),
                        ),
                      ],
                    ),
                    isActive: _step >= 2,
                  )
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _nextStep() async {
    // Lógica para esconder teclado al avanzar
    FocusScope.of(context).unfocus();

    if (_step == 0) {
      if (_pathCtrl.text.isEmpty) return;
      setState(() {
        _loadingPath = true;
        _foundData = null;
      });
      try {
        final prov = Provider.of<AppProvider>(context, listen: false);
        final data = await prov.firebaseService.peekCollection(_pathCtrl.text.trim());
        setState(() {
          _loadingPath = false;
          if (data != null) {
            _foundData = data;
            _step++;
          } else {
            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("No se encontraron documentos.")));
          }
        });
      } catch (e) {
        setState(() => _loadingPath = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error: $e")));
      }
    } else if (_step == 1) {
      if (_selectedKey == null) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Selecciona una variable")));
        return;
      }
      setState(() => _step++);
    } else {
      // Guardar
      if (_nameCtrl.text.isEmpty) {
         ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Ponle un nombre")));
         return;
      }
      final newMetric = MetricConfig(
        id: const Uuid().v4(),
        name: _nameCtrl.text,
        databasePath: _pathCtrl.text.trim(),
        dataKey: _selectedKey!,
        unit: _unitCtrl.text,
        colorValue: _selectedColor.value,
      );
      await Provider.of<AppProvider>(context, listen: false).addMetric(newMetric);
      if (mounted) Navigator.pop(context);
    }
  }
}