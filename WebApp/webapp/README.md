# WebApp — IoT WiFi TeoCom25

Panel React (Vite) que se conecta en tiempo real a Firestore para visualizar
las lecturas de los nodos IoT del proyecto TeoCom25.

## Stack

- Vite + React 19
- Firebase (Firestore + Auth anónima)
- Recharts para gráficos
- date-fns para manipular fechas

## Scripts útiles

```powershell
npm install
npm run dev      # http://localhost:5173 con hot reload
npm run lint
npm run build
npm run preview  # sirve la carpeta dist/ para QA
```

## Configuración principal

- `src/services/firebase.js`: inicializa Firebase y expone `db` y
	`ensureAnonymousSignIn`. Cambiá `firebaseConfig` si apuntás a otro proyecto.
- `src/App.jsx` define constantes clave:
	- `COLLECTION`, `TS_FIELD`, `DEVICE_FIELD`: nombres de tu colección, campo de
		timestamp y campo identificador del nodo.
	- `ALERT_RULES`: lista de umbrales para temperatura, humedad y presión. Podés
		agregar/quitar objetos para monitorear más métricas.
	- `ALERT_SETTINGS`: parámetros globales como porcentaje mínimo de batería,
		límite de minutos sin lecturas (sensor caído) y cantidad máxima de alertas
		visibles.

Los datos se normalizan en `normalizeReading`. Si agregás nuevos sensores,
extendé esa función para mapearlos y dejalos listos para graficar.

## Alertas configurables

El resumen tiene un feed de alertas con tres tipos predeterminados:

1. **Fuera de rango**: comparan cada lectura con los `min/max` definidos en
	 `ALERT_RULES`.
2. **Batería baja**: si el campo `battery/bateria/...` está por debajo de
	 `ALERT_SETTINGS.lowBatteryThreshold`.
3. **Sensor caído**: cuando no se reciben lecturas de un dispositivo durante
	 `ALERT_SETTINGS.staleDeviceMinutes` (sólo cuando se está viendo el rango en
	 tiempo real).

Cada alerta incluye dispositivo, hora de la última lectura y mensajes listos
para mostrar o reenviar a otra integración.

## Docker

```powershell
docker build -t iot-webapp .
docker run --rm -p 8080:80 iot-webapp
```

El `Dockerfile` realiza un build de Vite y sirve la carpeta `dist/` con Nginx.

## Próximos pasos sugeridos

1. Agregar tests con Vitest + React Testing Library.
2. Internacionalizar textos (ej. i18next) para cubrir múltiples idiomas.
3. Exportar datos a CSV o agregar paginación cuando la colección sea muy
	 grande.
