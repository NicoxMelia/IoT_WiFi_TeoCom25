import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from "recharts";

export default function MetricChart({ data, xKey = "time", yKey, unit }) {
  return (
    <div style={{ width: "100%", height: 280 }}>
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip formatter={(v) => `${v} ${unit ?? ""}`} />
          <Line type="monotone" dataKey={yKey} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
