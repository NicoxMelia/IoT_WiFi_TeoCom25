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

function buildQuery({ from, to, maxRows = 1000 } = {}) {
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

const normalizePrimitive = (value) => {
  if (value === "") return null;
  return value;
};

const normalizeMeasurement = (value) => {
  if (value === "" || value === "0" || value === 0) return null;
  return value;
};

export default function App() {
  const [rawData, setRawData] = useState([]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [range, setRange] = useState({ from: null, to: null });
  const [deviceFilter, setDeviceFilter] = useState("all");
  const [devices, setDevices] = useState([]);

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
          maxRows: 1000,
        });

        if (unsub) unsub();

        unsub = onSnapshot(
          q,
          (snap) => {
            if (!mounted) return;

            const rows = snap.docs.map((d) => {
              const doc = d.data();

              let date = new Date();
              const tsVal = doc[TS_FIELD];
              if (tsVal?.toDate) date = tsVal.toDate();
              else if (typeof tsVal === "string") date = new Date(tsVal);

              const deviceName = normalizePrimitive(
                (DEVICE_FIELD && doc[DEVICE_FIELD]) ??
                  doc.device ??
                  doc.deviceId ??
                  doc.device_id ??
                  doc.dispositivo ??
                  doc.nombre_dispositivo ??
                  doc.nodo ??
                  null
              );

              let pressValue = normalizeMeasurement(doc.presion ?? doc.press ?? null);
              try {
                if (typeof pressValue === "number") {
                  const lowerPa = 900 * 100;
                  const upperPa = 1100 * 100;
                  if (pressValue >= lowerPa && pressValue <= upperPa) {
                    pressValue = pressValue / 100;
                  }
                }
              } catch (normErr) {
                console.warn("No se pudo normalizar la presión", normErr);
              }

              const tempValue = normalizeMeasurement(doc.temperatura ?? doc.temp ?? null);
              const humValue = normalizeMeasurement(doc.humedad ?? doc.hum ?? null);

              return {
                id: d.id,
                device: deviceName,
                time: date.toLocaleString(),
                ts: +date,
                temp: tempValue,
                hum: humValue,
                press: pressValue,
              };
            });

            const uniqueDevices = Array.from(
              new Set(
                rows
                  .map((row) => (row.device ? String(row.device) : null))
                  .filter(Boolean)
              )
            ).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));

            setRawData(rows);
            setDevices(uniqueDevices);
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
  }, [range.from, range.to]);

  useEffect(() => {
    const filtered =
      deviceFilter === "all"
        ? rawData
        : rawData.filter((row) => String(row.device) === String(deviceFilter));
    setData(filtered);
  }, [deviceFilter, rawData]);

  const tempSeries = data.map((r) => ({ time: r.time, temp: r.temp }));
  const humSeries = data.map((r) => ({ time: r.time, hum: r.hum }));
  const pressSeries = data.map((r) => ({ time: r.time, press: r.press }));

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

        <div className="row row-3 charts">
          <ChartCard title="Temperatura (°C)">
            <MetricChart data={tempSeries} yKey="temp" unit="°C" min={-15} max={60} />
          </ChartCard>
          <ChartCard title="Humedad (%)">
            <MetricChart data={humSeries} yKey="hum" unit="%" min={0} max={100} />
          </ChartCard>
          <ChartCard title="Presión (hPa)">
            <MetricChart data={pressSeries} yKey="press" unit="hPa" min={900} max={1100} />
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
                        <td style={{ textAlign: "right" }}>{r.temp ?? "-"}</td>
                        <td style={{ textAlign: "right" }}>{r.hum ?? "-"}</td>
                        <td style={{ textAlign: "right" }}>{r.press ?? "-"}</td>
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
