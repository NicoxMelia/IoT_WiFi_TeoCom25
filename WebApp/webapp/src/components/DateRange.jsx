import { format, parseISO } from "date-fns";

export default function DateRange({ from, to, onChange, onApply }) {
  return (
    <div className="card">
      <div className="section-title">Seleccione rango de fechas</div>
      <div className="controls">
        <div>
          <label>Desde</label>
          <input
            type="date"
            value={from ? format(from, "yyyy-MM-dd") : ""}
            onChange={(e) => onChange({ from: parseISO(e.target.value), to })}
          />
        </div>
        <div>
          <label>Hasta</label>
          <input
            type="date"
            value={to ? format(to, "yyyy-MM-dd") : ""}
            onChange={(e) => onChange({ from, to: parseISO(e.target.value) })}
          />
        </div>
        <div style={{ alignSelf: "end" }}>
          <button onClick={onApply}>Aplicar</button>
        </div>
      </div>
    </div>
  );
}
