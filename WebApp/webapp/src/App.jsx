// src/App.jsx (solo esta parte)
import React, { useEffect, useState, useCallback } from "react";
import { db, ensureAnonymousSignIn } from "./services/firebase";
import { collection, query, where, orderBy, getDocs, Timestamp, limit } from "firebase/firestore";

import Header from "./components/Header";
import DateRange from "./components/DateRange";
import ChartCard from "./components/ChartCard";
import MetricChart from "./components/MetricChart";
import "./App.css";

// Fetch measurements from Firestore using optional date range.
// This function will try common collection and field names used in the project
// and also in your Firestore (e.g. `lecturas_sensores` with `timestamp`, `temperatura`, ...).
async function fetchData({ from, to, maxRows = 1000 } = {}) {
  const candidateCollections = ["lecturas_sensores", "measurements"];

  for (const colName of candidateCollections) {
    const colRef = collection(db, colName);
    // sample the collection to detect if it exists and which fields are used
    const sampleSnap = await getDocs(query(colRef, limit(1)));
    if (sampleSnap.empty) continue;

    // detect timestamp field and measurement field names
    const sampleData = sampleSnap.docs[0].data();
    const tsField = sampleData.ts ? "ts" : sampleData.timestamp ? "timestamp" : sampleData.time ? "time" : null;
    const tempField = sampleData.temperatura ? "temperatura" : sampleData.temp ? "temp" : null;
    const humField = sampleData.humedad ? "humedad" : sampleData.hum ? "hum" : null;
    const pressField = sampleData.presion ? "presion" : sampleData.press ? "press" : null;

    // build query using detected tsField when available; otherwise just limit
    let q;
    const fromTs = from && tsField ? Timestamp.fromDate(new Date(from.setHours(0, 0, 0, 0))) : null;
    const toTs = to && tsField ? Timestamp.fromDate(new Date(to.setHours(23, 59, 59, 999))) : null;

    try {
      if (tsField) {
        if (fromTs && toTs) {
          q = query(colRef, where(tsField, ">=", fromTs), where(tsField, "<=", toTs), orderBy(tsField), limit(maxRows));
        } else if (fromTs) {
          q = query(colRef, where(tsField, ">=", fromTs), orderBy(tsField), limit(maxRows));
        } else if (toTs) {
          q = query(colRef, where(tsField, "<=", toTs), orderBy(tsField), limit(maxRows));
        } else {
          q = query(colRef, orderBy(tsField), limit(maxRows));
        }
      } else {
        q = query(colRef, limit(maxRows));
      }

      const snap = await getDocs(q);
      const rows = snap.docs.map((d) => {
        const data = d.data();
        // normalize timestamp -> Date
        let date = new Date();
        if (tsField && data[tsField] && typeof data[tsField].toDate === "function") {
          date = data[tsField].toDate();
        } else if (data.timestamp && typeof data.timestamp.toDate === "function") {
          date = data.timestamp.toDate();
        } else if (data.ts && typeof data.ts.toDate === "function") {
          date = data.ts.toDate();
        } else if (data.timestamp && typeof data.timestamp === "string") {
          date = new Date(data.timestamp);
        }

        return {
          id: d.id,
          time: date.toLocaleString(),
          ts: date.getTime(),
          temp: (tempField && data[tempField] !== undefined) ? data[tempField] : (data.temp ?? null),
          hum: (humField && data[humField] !== undefined) ? data[humField] : (data.hum ?? null),
          press: (pressField && data[pressField] !== undefined) ? data[pressField] : (data.press ?? null),
        };
      });

      return rows;
    } catch (err) {
      // If query fails for this collection (e.g. requires index or orderBy on missing field), try next
      console.warn(`fetchData: query on ${colName} failed:`, err);
      continue;
    }
  }

  // no candidate collection had data
  return [];
}

export default function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [range, setRange] = useState({ from: null, to: null });

  const load = useCallback(async ({ from, to } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchData({ from, to, maxRows: 1000 });
      setData(rows);
    } catch (err) {
      console.error(err);
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // initial load (recent data)
    // If Firestore rules require auth, try anonymous sign-in first.
    let mounted = true;
    (async () => {
      try {
        await ensureAnonymousSignIn();
      } catch (err) {
        // If anonymous sign-in fails, we'll still attempt load and surface the error
        console.warn("Anonymous sign-in failed:", err);
      }
      if (mounted) load();
    })();
    return () => { mounted = false; };
  }, [load]);

  function onApply() {
    load(range);
  }

  const tempSeries = data.map((r) => ({ time: r.time, temp: r.temp }));
  const humSeries = data.map((r) => ({ time: r.time, hum: r.hum }));
  const pressSeries = data.map((r) => ({ time: r.time, press: r.press }));

  return (
    <div className="container">
      <Header />
      <div className="row row-2">
        <div>
          <DateRange
            from={range.from}
            to={range.to}
            onChange={(r) => setRange(r)}
            onApply={onApply}
          />
        </div>
        <div className="card">
          <div className="section-title">Resumen</div>
          <div>
            <strong>Registros:</strong> {data.length}
            <br />
            {loading ? <em>Cargando...</em> : null}
            {error ? <div style={{ color: "red" }}>{error}</div> : null}
          </div>
        </div>
      </div>

  <div className="row row-3 charts">
        <ChartCard title="Temperatura (°C)">
          <MetricChart
            data={tempSeries}
            yKey="temp"
            unit="°C"
            min={-15}
            max={60}
          />
        </ChartCard>
        <ChartCard title="Humedad (%)">
          <MetricChart
            data={humSeries}
            yKey="hum"
            unit="%"
            min={0}
            max={100}
          />
        </ChartCard>
        <ChartCard title="Presión (hPa)">
          <MetricChart
            data={pressSeries}
            yKey="press"
            unit="hPa"
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
                  <th style={{ textAlign: "right" }}>Temperatura</th>
                  <th style={{ textAlign: "right" }}>Humedad</th>
                  <th style={{ textAlign: "right" }}>Presión</th>
                </tr>
              </thead>
              <tbody>
                {data.slice().reverse().map((r) => (
                  <tr key={r.id}>
                    <td>{r.time}</td>
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
  );
}
