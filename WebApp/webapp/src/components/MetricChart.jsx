import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

export default function MetricChart({
  data,
  xKey = "time",
  yKey,
  unit,
  min,
  max,
  color = "#2d6363",
  showDots = false,
}) {
  const domain = [
    typeof min === "number" ? min : "auto",
    typeof max === "number" ? max : "auto",
  ];

  const dotProps = showDots ? { r: 3, fill: color } : false;
  const activeDot = {
    r: 6,
    fill: "#d38129",
    stroke: "#1d4036",
    strokeWidth: 2,
  };

  return (
    <div style={{ width: "100%", height: 260, userSelect: "none" }}>
      <ResponsiveContainer>
        <LineChart
          data={data}
          margin={{ top: 12, right: 12, left: -10, bottom: 6 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} tick={{ fontSize: 12 }} tickMargin={8} />
          <YAxis
            tick={{ fontSize: 12 }}
            domain={domain}
            allowDataOverflow
            width={42}
          />
          <Tooltip formatter={(v) => `${v ?? ""} ${unit ?? ""}`} cursor={false} />
          <Line
            type="monotone"
            dataKey={yKey}
            stroke={color}
            strokeWidth={2}
            dot={dotProps}
            activeDot={activeDot}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
