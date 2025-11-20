// src/App.jsx
import React, { useEffect, useState, useCallback } from "react";
import { db, ensureAnonymousSignIn } from "./services/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  onSnapshot,
} from "firebase/firestore";

import Header from "./components/Header";
import DateRange from "./components/DateRange";
import ChartCard from "./components/ChartCard";
import MetricChart from "./components/MetricChart";
import "./App.css";
import ornamental02 from "./assets/ornamentals/Elementos ornamentales-02recorte.png";

// === Configurables según tu BBDD ===
const COLLECTION = "lecturas_sensores"; // Cambiá si usás otro nombre
const TS_FIELD = "timestamp"; // Cambiá si tu campo tiempo es "ts" o "time"
const DEVICE_FIELD = "id_dispositivo"; // Cambiá/quitá si no lo usás

// Umbrales por defecto para disparar alertas.
const ALERT_RULES = [
  { id: "temp-range", label: "Temperatura", field: "temp", min: -10, max: 45, severity: "high" },
  { id: "hum-range", label: "Humedad", field: "hum", min: 20, max: 90, severity: "medium" },
  { id: "press-range", label: "Presión", field: "press", min: 930, max: 1040, severity: "medium" },
];

const METRIC_LIMITS = {
  temp: { min: -15, max: 60, label: "Temperatura" },
  hum: { min: 0, max: 100, label: "Humedad" },
  press: { min: 900, max: 1100, label: "Presión" },
};

const ALERT_SETTINGS = {
  lowBatteryThreshold: 20,
  staleDeviceMinutes: 90,
  summaryLimit: 6,
  historyLimit: 200,
};

const PEER_ALERT_SETTINGS = {
  windowMinutes: 15,
  minPeers: 2,
  thresholds: {
    temp: 8,
    hum: 25,
    press: 18,
  },
};

const REQUIRED_FIELDS = ["temp", "hum", "press"];
const BATTERY_FIELDS = ["battery", "bateria", "nivel_bateria", "batteryLevel", "bateria_porcentaje"];

const isNumber = (value) => typeof value === "number" && !Number.isNaN(value);

const parseTimestamp = (raw) => {
  if (raw?.toDate) return raw.toDate();
  if (typeof raw === "string" || typeof raw === "number") return new Date(raw);
  return new Date();
};

const resolveDeviceName = (doc) =>
  (DEVICE_FIELD && doc[DEVICE_FIELD]) ??
  doc.device ??
  doc.deviceId ??
  doc.device_id ??
  doc.dispositivo ??
  doc.nombre_dispositivo ??
  doc.nodo ??
  null;

const normalizePressure = (rawValue) => {
  if (!isNumber(rawValue)) return rawValue ?? null;
  const lowerPa = 900 * 100;
  const upperPa = 1100 * 100;
  if (rawValue >= lowerPa && rawValue <= upperPa) {
    return rawValue / 100;
  }
  return rawValue;
};

const extractBatteryValue = (doc) => {
  for (const field of BATTERY_FIELDS) {
    const candidate = doc[field];
    if (candidate === undefined || candidate === null) continue;
    if (isNumber(candidate)) return candidate;
    const parsed = Number(candidate);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const normalizeReading = (docSnapshot) => {
  const doc = docSnapshot.data();
  const date = parseTimestamp(doc[TS_FIELD]);
  return {
    id: docSnapshot.id,
    device: resolveDeviceName(doc),
    time: date.toLocaleString(),
    ts: +date,
    temp: doc.temperatura ?? doc.temp ?? null,
    hum: doc.humedad ?? doc.hum ?? null,
    press: normalizePressure(doc.presion ?? doc.press ?? null),
    battery: extractBatteryValue(doc),
  };
};

const extractDeviceNames = (rows) => {
  const devices = new Set();
  rows.forEach((row) => {
    if (row.device) devices.add(String(row.device));
  });
  return Array.from(devices).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
};

const sanitizeMetricValue = (value, limits) => {
  if (!isNumber(value)) {
    return { value: null, sanitized: false };
  }
  const outOfBounds =
    (limits?.min !== undefined && value < limits.min) ||
    (limits?.max !== undefined && value > limits.max);
  if (outOfBounds) {
    return { value: null, sanitized: true };
  }
  return { value, sanitized: false };
};

const detectMissingFields = (row) => {
  const missing = REQUIRED_FIELDS.filter((field) => row[field] === null || row[field] === undefined);
  if (missing.length === 0) return null;
  return {
    id: `missing-${row.id}`,
    kind: "missing-fields",
    severity: "medium",
    title: "Datos incompletos",
    message: `Campos sin valor: ${missing.join(", ")}`,
    device: row.device ?? "Dispositivo sin nombre",
    time: row.time,
    ts: row.ts,
  };
};

const detectMetricBreaches = (row) => {
  const alerts = [];
  ALERT_RULES.forEach((rule) => {
    const value = row[rule.field];
    if (!isNumber(value)) return;
    if (rule.min !== undefined && value < rule.min) {
      alerts.push({
        id: `${rule.id}-low-${row.id}`,
        kind: rule.id,
        severity: rule.severity,
        title: `${rule.label} baja`,
        message: `${value} está por debajo de ${rule.min}`,
        device: row.device ?? "Dispositivo sin nombre",
        time: row.time,
        ts: row.ts,
      });
    } else if (rule.max !== undefined && value > rule.max) {
      alerts.push({
        id: `${rule.id}-high-${row.id}`,
        kind: rule.id,
        severity: rule.severity,
        title: `${rule.label} alta`,
        message: `${value} supera ${rule.max}`,
        device: row.device ?? "Dispositivo sin nombre",
        time: row.time,
        ts: row.ts,
      });
    }
  });
  return alerts;
};

const detectLowBattery = (row) => {
  if (!isNumber(row.battery) || ALERT_SETTINGS.lowBatteryThreshold === null) return null;
  if (row.battery > ALERT_SETTINGS.lowBatteryThreshold) return null;
  return {
    id: `battery-${row.id}`,
    kind: "battery",
    severity: "high",
    title: "Batería baja",
    message: `${row.battery}% disponible`,
    device: row.device ?? "Dispositivo sin nombre",
    time: row.time,
    ts: row.ts,
  };
};

const detectStaleDevices = (rows, allowStaleCheck) => {
  if (!allowStaleCheck || !ALERT_SETTINGS.staleDeviceMinutes) return [];
  const latestByDevice = new Map();
  rows.forEach((row) => {
    if (!row.device) return;
    const current = latestByDevice.get(row.device);
    if (!current || row.ts > current) {
      latestByDevice.set(row.device, row.ts);
    }
  });
  const cutoff = Date.now() - ALERT_SETTINGS.staleDeviceMinutes * 60 * 1000;
  const alerts = [];
  latestByDevice.forEach((ts, device) => {
    if (ts < cutoff) {
      alerts.push({
        id: `stale-${device}`,
        kind: "stale",
        severity: "high",
        title: "Posible sensor caído",
        message: `Sin lecturas desde ${new Date(ts).toLocaleString()}`,
        device,
        time: new Date(ts).toLocaleString(),
        ts,
      });
    }
  });
  return alerts;
};

const detectTableRangeBreaches = (row) => {
  const alerts = [];
  Object.entries(METRIC_LIMITS).forEach(([key, { min, max, label }]) => {
    const value = row[key];
    if (!isNumber(value)) return;
    if (min !== undefined && value < min) {
      alerts.push({
        id: `table-${key}-low-${row.id}`,
        kind: `table-${key}`,
        severity: "medium",
        title: `${label} fuera de tabla`,
        message: `${value} está por debajo del mínimo (${min}) de la tabla (omitido en las gráficas)`,
        device: row.device ?? "Dispositivo sin nombre",
        time: row.time,
        ts: row.ts,
      });
    } else if (max !== undefined && value > max) {
      alerts.push({
        id: `table-${key}-high-${row.id}`,
        kind: `table-${key}`,
        severity: "medium",
        title: `${label} fuera de tabla`,
        message: `${value} supera el máximo (${max}) de la tabla (omitido en las gráficas)`,
        device: row.device ?? "Dispositivo sin nombre",
        time: row.time,
        ts: row.ts,
      });
    }
  });
  return alerts;
};

const detectPeerDeviation = (rows) => {
  if (!rows.length) return [];
  const alerts = [];
  const recentRows = rows.slice(-150);
  const windowMs = (PEER_ALERT_SETTINGS.windowMinutes ?? 10) * 60 * 1000;
  recentRows.forEach((row, idx) => {
    Object.keys(METRIC_LIMITS).forEach((key) => {
      const value = row[key];
      if (!isNumber(value)) return;
      const threshold = PEER_ALERT_SETTINGS.thresholds?.[key];
      if (threshold === undefined) return;
      const peers = [];
      for (let i = 0; i < recentRows.length; i += 1) {
        if (i === idx) continue;
        const peer = recentRows[i];
        if (!peer.device || peer.device === row.device) continue;
        if (!isNumber(peer[key])) continue;
        if (Math.abs(peer.ts - row.ts) <= windowMs) {
          peers.push(peer[key]);
        }
      }
      if (peers.length < (PEER_ALERT_SETTINGS.minPeers ?? 2)) return;
      const avg = peers.reduce((sum, current) => sum + current, 0) / peers.length;
      if (Math.abs(value - avg) >= threshold) {
        alerts.push({
          id: `peer-${key}-${row.id}`,
          kind: `peer-${key}`,
          severity: "medium",
          title: `${METRIC_LIMITS[key]?.label ?? key} atípica`,
          message: `${value.toFixed(1)} difiere del promedio (${avg.toFixed(1)}) de otros sensores cercanos`,
          device: row.device ?? "Dispositivo sin nombre",
          time: row.time,
          ts: row.ts,
        });
      }
    });
  });
  return alerts;
};

const buildAlerts = (rows, { allowStaleCheck } = { allowStaleCheck: true }) => {
  if (!rows.length) return [];
  const alerts = [];
  const recentRows = rows.slice(-150);
  recentRows.forEach((row) => {
    const missing = detectMissingFields(row);
    if (missing) alerts.push(missing);
    alerts.push(...detectMetricBreaches(row));
    alerts.push(...detectTableRangeBreaches(row));
    const lowBattery = detectLowBattery(row);
    if (lowBattery) alerts.push(lowBattery);
  });
  alerts.push(...detectStaleDevices(rows, allowStaleCheck));
  alerts.push(...detectPeerDeviation(rows));
  return alerts
    .sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0))
    .slice(0, ALERT_SETTINGS.historyLimit);
};

const summarizeAlerts = (alerts) => {
  const latestByKey = new Map();
  alerts.forEach((alert) => {
    const deviceKey = alert.device ?? "Dispositivo sin nombre";
    const key = `${deviceKey}|${alert.kind}`;
    const current = latestByKey.get(key);
    if (!current || (alert.ts ?? 0) > (current.ts ?? 0)) {
      latestByKey.set(key, alert);
    }
  });
  return Array.from(latestByKey.values())
    .sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0))
    .slice(0, ALERT_SETTINGS.summaryLimit);
};

function buildQuery({ from, to, device, maxRows = 1000 } = {}) {
  const colRef = collection(db, COLLECTION);
  const parts = [];

  if (from instanceof Date) {
    const d0 = new Date(from);
    d0.setHours(0, 0, 0, 0);
    parts.push(where(TS_FIELD, ">=", Timestamp.fromDate(d0)));
  }
  if (to instanceof Date) {
    const d1 = new Date(to);
    d1.setHours(23, 59, 59, 999);
    parts.push(where(TS_FIELD, "<=", Timestamp.fromDate(d1)));
  }

  return query(colRef, orderBy(TS_FIELD, "asc"), ...parts, limit(maxRows));
}

export default function App() {
  const [rawData, setRawData] = useState([]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [range, setRange] = useState({ from: null, to: null });
  const [deviceFilter, setDeviceFilter] = useState("all");
  const [devices, setDevices] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [showAlertHistory, setShowAlertHistory] = useState(false);
  const [excludedDevices, setExcludedDevices] = useState([]);

  const onApply = useCallback(() => {}, []);
  const onDeviceChange = useCallback((nextDevice) => {
    setDeviceFilter(nextDevice);
  }, []);

  useEffect(() => {
    let mounted = true;
    let unsub = null;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        try {
          await ensureAnonymousSignIn?.();
        } catch (_) {
          // Ignorar fallo silencioso
        }

        const q = buildQuery({
          from: range.from || undefined,
          to: range.to || undefined,
          device: deviceFilter,
          maxRows: 1000,
        });

        if (unsub) unsub();

        unsub = onSnapshot(
          q,
          (snap) => {
            if (!mounted) return;

            const rows = snap.docs.map((docSnapshot) => normalizeReading(docSnapshot));

            setRawData(rows);
            setDevices((prev) => {
              const merged = new Set(prev);
              extractDeviceNames(rows).forEach((name) => merged.add(name));
              return Array.from(merged).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
            });
            setLoading(false);
          },
          (err) => {
            if (!mounted) return;
            console.error(err);
            setError(String(err));
            setLoading(false);
          }
        );
      } catch (err) {
        if (!mounted) return;
        console.error(err);
        setError(String(err));
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      if (unsub) unsub();
    };
  }, [range.from, range.to, deviceFilter]);

  useEffect(() => {
    const baseRows =
      deviceFilter === "all"
        ? rawData
        : rawData.filter((row) => String(row.device) === String(deviceFilter));

    const exclusionSet = new Set((excludedDevices ?? []).map((name) => String(name)));
    const filtered = exclusionSet.size
      ? baseRows.filter((row) => {
          if (!row.device) return true;
          return !exclusionSet.has(String(row.device));
        })
      : baseRows;

    const enhanced = filtered.map((row) => {
      const chartValues = {};
      const sanitizedFlags = {};
      Object.entries(METRIC_LIMITS).forEach(([key, limits]) => {
        const { value, sanitized } = sanitizeMetricValue(row[key], limits);
        chartValues[key] = value;
        sanitizedFlags[key] = sanitized;
      });
      return {
        ...row,
        chartValues,
        sanitizedFlags,
      };
    });
    setData(enhanced);
    setAlerts(buildAlerts(enhanced, { allowStaleCheck: !range.from && !range.to }));
  }, [deviceFilter, rawData, excludedDevices, range.from, range.to]);

  const tempSeries = data.map((r) => ({ time: r.time, temp: r.chartValues?.temp ?? null }));
  const humSeries = data.map((r) => ({ time: r.time, hum: r.chartValues?.hum ?? null }));
  const pressSeries = data.map((r) => ({ time: r.time, press: r.chartValues?.press ?? null }));

  return (
    <div className="page-background">
      <img src={ornamental02} alt="" className="page-background__image" aria-hidden="true" />
      <div className="container">
        <Header />

        <div className="row row-2">
          <div>
            <DateRange
              from={range.from}
              to={range.to}
              onChange={(r) => setRange(r)}
              onApply={onApply}
              deviceValue={deviceFilter}
              deviceOptions={devices}
              onDeviceChange={onDeviceChange}
              excludedDevices={excludedDevices}
              onExcludedChange={(list) => setExcludedDevices(list)}
            />
          </div>

          <div className="card">
            <div className="section-title">Resumen</div>
            <div>
              <strong>Registros:</strong> {data.length}
              <br />
              {loading ? <em>Cargando…</em> : null}
              {error ? <div style={{ color: "red" }}>{error}</div> : null}
            </div>
          </div>
        </div>

        <div className="card alert-panel">
          <div className="alert-panel__header">
            <div className="section-title">Alertas</div>
            <button
              type="button"
              className="alert-toggle"
              onClick={() => setShowAlertHistory((prev) => !prev)}
            >
              {showAlertHistory ? "Ver últimas por tipo" : "Ver historial completo"}
            </button>
          </div>
          <div className="alert-feed">
            {alerts.length === 0 ? (
              <div className="alert alert--empty">Sin alertas activas</div>
            ) : (
              (showAlertHistory ? alerts : summarizeAlerts(alerts)).map((alert) => (
                <div key={alert.id} className={`alert alert--${alert.severity}`}>
                  <div className="alert__title">{alert.title}</div>
                  <div className="alert__meta">
                    <span>{alert.device}</span>
                    <span>{alert.time}</span>
                  </div>
                  <div>{alert.message}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="row row-3 charts">
          <ChartCard title="Temperatura (°C)">
            <MetricChart
              data={tempSeries}
              yKey="temp"
              unit="°C"
              min={METRIC_LIMITS.temp.min}
              max={METRIC_LIMITS.temp.max}
            />
          </ChartCard>
          <ChartCard title="Humedad (%)">
            <MetricChart
              data={humSeries}
              yKey="hum"
              unit="%"
              min={METRIC_LIMITS.hum.min}
              max={METRIC_LIMITS.hum.max}
            />
          </ChartCard>
          <ChartCard title="Presión (hPa)">
            <MetricChart
              data={pressSeries}
              yKey="press"
              unit="hPa"
              min={METRIC_LIMITS.press.min}
              max={METRIC_LIMITS.press.max}
            />
          </ChartCard>
        </div>

        <div className="card table-card">
          <div className="section-title">Últimos registros</div>
          {data.length === 0 ? (
            <div>No hay datos.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th style={{ textAlign: "right" }}>Grupo:</th>
                    <th style={{ textAlign: "right" }}>Temperatura:</th>
                    <th style={{ textAlign: "right" }}>Humedad:</th>
                    <th style={{ textAlign: "right" }}>Presión:</th>
                  </tr>
                </thead>
                <tbody>
                  {data
                    .slice()
                    .reverse()
                    .map((r) => (
                      <tr key={r.id}>
                        <td>{r.time}</td>
                        <td style={{ textAlign: "right" }}>{r.device ?? "-"}</td>
                        <td style={{ textAlign: "right" }}>
                          {r.temp ?? "-"}
                          {r.sanitizedFlags?.temp ? (
                            <span className="value-flag" title="Dato descartado de las gráficas por estar fuera de rango">
                              MOD
                            </span>
                          ) : null}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {r.hum ?? "-"}
                          {r.sanitizedFlags?.hum ? (
                            <span className="value-flag" title="Dato descartado de las gráficas por estar fuera de rango">
                              MOD
                            </span>
                          ) : null}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {r.press ?? "-"}
                          {r.sanitizedFlags?.press ? (
                            <span className="value-flag" title="Dato descartado de las gráficas por estar fuera de rango">
                              MOD
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
