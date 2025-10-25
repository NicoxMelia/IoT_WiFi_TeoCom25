import {
    LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  } from "recharts";

  export default function MetricChart({ data, xKey = "time", yKey, unit, min, max }) {
    const domain = [
      typeof min === "number" ? min : "auto",
      typeof max === "number" ? max : "auto",
    ];
  return (
    <div style={{ width: "100%", height: 280, margin: "-10px auto" }}>
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} domain={domain} allowDataOverflow />
          <Tooltip formatter={(v) => `${v} ${unit ?? ""}`} />
          <Line
            type="monotone"
            dataKey={yKey}
            stroke="#2d6363"                 // color de la línea
            dot={{ r: 3, fill: "#2d6363" }}  // dots normales (si quieres mostrarlos)
            activeDot={{
                
              r: 6,
              fill: "#d38129",
              stroke: "#1d4036",
              strokeWidth: 2,
              
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
