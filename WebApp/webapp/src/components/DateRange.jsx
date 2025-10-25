import { format, parseISO } from "date-fns";

export default function DateRange({ from, to, onChange, onApply }) {
  const triggerPicker = (event) => {
    // On mobile/desktop open the native date picker immediately
    if (typeof event.currentTarget.showPicker === "function") {
      event.currentTarget.showPicker();
    }
  };

  const preventTyping = (event) => {
    if (event.key === "Tab" || event.key === "Shift") return;
    // Avoid manual typing so users always pick from the calendar
    event.preventDefault();
  };

  const handleFromChange = (event) => {
    const value = event.target.value;
    onChange({ from: value ? parseISO(value) : null, to });
  };

  const handleToChange = (event) => {
    const value = event.target.value;
    onChange({ from, to: value ? parseISO(value) : null });
  };

  return (
    <div className="card">
      <div className="section-title">Seleccione rango de fechas</div>
      <div className="controls">
        <div>
          <label>Desde</label>
          <input
            type="date"
            value={from ? format(from, "yyyy-MM-dd") : ""}
            inputMode="none"
            onFocus={triggerPicker}
            onClick={triggerPicker}
            onKeyDown={preventTyping}
            onChange={handleFromChange}
          />
        </div>
        <div>
          <label>Hasta</label>
          <input
            type="date"
            value={to ? format(to, "yyyy-MM-dd") : ""}
            inputMode="none"
            onFocus={triggerPicker}
            onClick={triggerPicker}
            onKeyDown={preventTyping}
            onChange={handleToChange}
          />
        </div>
        <div style={{ alignSelf: "end" }}>
          <button onClick={onApply}>Aplicar</button>
        </div>
      </div>
    </div>
  );
}
