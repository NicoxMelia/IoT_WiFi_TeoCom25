import {
  format,
  parseISO,
  addDays,
  differenceInCalendarDays,
  isAfter,
  isBefore,
  startOfDay,
} from "date-fns";

const normalizeToDay = (value) => {
  if (!value) return null;
  const base = value instanceof Date ? value : new Date(value);
  return startOfDay(base);
};

export default function DateRange({
  from,
  to,
  onChange,
  onApply,
  minDate = new Date(2010, 0, 1),
  maxDate = new Date(),
  maxSpanDays = null,
}) {
  const minBound = normalizeToDay(minDate) ?? startOfDay(new Date(2010, 0, 1));
  const maxBound = normalizeToDay(maxDate) ?? startOfDay(new Date());
  const hasSpanLimit = Number.isFinite(maxSpanDays) && maxSpanDays > 0;

  const clamp = (value) => {
    const day = normalizeToDay(value);
    if (!day) return null;
    if (isBefore(day, minBound)) return minBound;
    if (isAfter(day, maxBound)) return maxBound;
    return day;
  };

  const safeFrom = clamp(from);
  const safeTo = clamp(to);

  const adjustRange = ({ nextFrom = safeFrom, nextTo = safeTo, changed } = {}) => {
    let f = clamp(nextFrom);
    let t = clamp(nextTo);

    if (f && t) {
      if (changed === "from" && isAfter(f, t)) {
        t = f;
      } else if (changed === "to" && isBefore(t, f)) {
        f = t;
      } else if (isAfter(f, t)) {
        f = t;
      }

      if (hasSpanLimit) {
        const span = differenceInCalendarDays(t, f);
        if (span > maxSpanDays) {
          if (changed === "from") {
            f = clamp(addDays(t, -maxSpanDays));
          } else {
            t = clamp(addDays(f, maxSpanDays));
          }
        }
      }
    }

    return { from: f, to: t };
  };

  const handleFromChange = (event) => {
    const value = event.target.value;
    const picked = value ? parseISO(value) : null;
    const { from: nf, to: nt } = adjustRange({ nextFrom: picked, changed: "from" });
    onChange({ from: nf, to: nt });
  };

  const handleToChange = (event) => {
    const value = event.target.value;
    const picked = value ? parseISO(value) : null;
    const { from: nf, to: nt } = adjustRange({ nextTo: picked, changed: "to" });
    onChange({ from: nf, to: nt });
  };

  const pickMax = (...dates) => new Date(Math.max(...dates.map((d) => d.getTime())));
  const pickMin = (...dates) => new Date(Math.min(...dates.map((d) => d.getTime())));

  let fromMinDate = minBound;
  let fromMaxDate = safeTo ? pickMin(safeTo, maxBound) : maxBound;
  if (hasSpanLimit && safeTo) {
    const spanMin = clamp(addDays(safeTo, -maxSpanDays));
    fromMinDate = pickMax(minBound, spanMin);
  }

  let toMinDate = safeFrom ? pickMax(safeFrom, minBound) : minBound;
  let toMaxDate = maxBound;
  if (hasSpanLimit && safeFrom) {
    const spanMax = clamp(addDays(safeFrom, maxSpanDays));
    toMaxDate = pickMin(maxBound, spanMax);
  }

  const triggerPicker = (event) => {
    if (typeof event.currentTarget.showPicker === "function") {
      event.currentTarget.showPicker();
    }
  };

  const preventTyping = (event) => {
    if (event.key === "Tab" || event.key === "Shift") return;
    event.preventDefault();
  };

  const fmt = (d) => (d ? format(d, "yyyy-MM-dd") : "");
  const spanMsg = hasSpanLimit ? `Rango máximo: ${maxSpanDays} día(s).` : null;

  return (
    <div className="card">
      <div className="section-title">Seleccione rango de fechas</div>
      <div className="controls">
        <div>
          <label>Desde</label>
          <input
            type="date"
            value={safeFrom ? fmt(safeFrom) : ""}
            inputMode="none"
            min={fmt(fromMinDate)}
            max={fmt(fromMaxDate)}
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
            value={safeTo ? fmt(safeTo) : ""}
            inputMode="none"
            min={fmt(toMinDate)}
            max={fmt(toMaxDate)}
            onFocus={triggerPicker}
            onClick={triggerPicker}
            onKeyDown={preventTyping}
            onChange={handleToChange}
          />
        </div>
        <div style={{ alignSelf: "end" }}>
          <button onClick={onApply}>Aplicar</button>
          {spanMsg ? (
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>{spanMsg}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
