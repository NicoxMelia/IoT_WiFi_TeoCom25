import React, { useEffect, useMemo, useState } from "react";

const METRIC_LABELS = {
  temp: { label: "Temperatura", unit: "°C" },
  hum: { label: "Humedad", unit: "%" },
  press: { label: "Presión", unit: "hPa" },
};

const emptyForm = {
  device: "",
  mode: "target",
  tempTarget: "",
  tempDelta: "",
  humTarget: "",
  humDelta: "",
  pressTarget: "",
  pressDelta: "",
};

const parseNumber = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export default function CustomAlertPanel({ devices, rules, onSaveRule, onRemoveRule }) {
  const [form, setForm] = useState(() => ({ ...emptyForm }));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!form.device && devices.length) {
      setForm((prev) => ({ ...prev, device: devices[0] }));
    }
  }, [devices, form.device]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const buildMetricConfig = (metric) => {
    const target = parseNumber(form[`${metric}Target`]);
    const delta = parseNumber(form[`${metric}Delta`]);
    if (form.mode === "target") {
      return target !== null ? { target } : null;
    }
    if (target !== null && delta !== null && delta >= 0) {
      return { target, delta };
    }
    return null;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.device) {
      setError("Seleccioná un grupo");
      return;
    }
    const metrics = {
      temp: buildMetricConfig("temp"),
      hum: buildMetricConfig("hum"),
      press: buildMetricConfig("press"),
    };
    const hasMetric = Object.values(metrics).some(Boolean);
    if (!hasMetric) {
      setError("Ingresá al menos un valor para temperatura, humedad o presión");
      return;
    }
    setError(null);
    onSaveRule?.({
      device: form.device,
      mode: form.mode,
      metrics,
    });
    setForm((prev) => ({ ...emptyForm, device: prev.device || devices[0] || "" }));
  };

  const modeDescription =
    form.mode === "target"
      ? "Notificarme cuando llegue al valor objetivo"
      : "Notificarme cuando salga del rango objetivo ± delta";

  const renderMetricInputs = (metric) => {
    const meta = METRIC_LABELS[metric];
    return (
      <div key={metric} className="custom-alert__metric">
        <span>{meta.label}</span>
        <div className="custom-alert__inputs">
          <label>
            Objetivo {meta.unit}
            <input
              type="number"
              name={`${metric}Target`}
              value={form[`${metric}Target`]}
              onChange={handleChange}
              placeholder="Ej: 35"
            />
          </label>
          {form.mode === "delta" ? (
            <label>
              Delta {meta.unit}
              <input
                type="number"
                min="0"
                name={`${metric}Delta`}
                value={form[`${metric}Delta`]}
                onChange={handleChange}
                placeholder="Ej: 2"
              />
            </label>
          ) : null}
        </div>
      </div>
    );
  };

  const ruleSummary = (rule) => {
    const parts = [];
    Object.entries(rule.metrics).forEach(([metric, cfg]) => {
      if (!cfg) return;
      const meta = METRIC_LABELS[metric];
      if (rule.mode === "target" && cfg.target !== null) {
        parts.push(`${meta.label}: ${cfg.target}${meta.unit}`);
      } else if (rule.mode === "delta" && cfg.target !== null && cfg.delta !== null) {
        parts.push(
          `${meta.label}: ${cfg.target}±${cfg.delta}${meta.unit}`
        );
      }
    });
    return parts.join(" | ") || "Sin umbrales";
  };

  const emptyState = !rules?.length;

  return (
    <div className="card custom-alert-card">
      <div className="section-title">Alarmas personalizadas</div>
      <p className="custom-alert__description">
        Configurá alertas adicionales para un dispositivo. {modeDescription}
      </p>
      <form className="custom-alert__form" onSubmit={handleSubmit}>
        <div className="custom-alert__row">
          <label>
            Grupo / Dispositivo
            <select name="device" value={form.device} onChange={handleChange} required>
              <option value="" disabled>
                Seleccioná…
              </option>
              {devices.map((device) => (
                <option key={`alert-device-${device}`} value={device}>
                  {device}
                </option>
              ))}
            </select>
          </label>
          <label className="custom-alert__mode">
            <input
              type="radio"
              name="mode"
              value="target"
              checked={form.mode === "target"}
              onChange={handleChange}
            />
            <span>Notificar por valor objetivo</span>
          </label>
          <label className="custom-alert__mode">
            <input
              type="radio"
              name="mode"
              value="delta"
              checked={form.mode === "delta"}
              onChange={handleChange}
            />
            <span>Notificar cuando este fuera del rango objetivo</span>
          </label>
        </div>
        <div className="custom-alert__metrics">
          {Object.keys(METRIC_LABELS).map((metric) => renderMetricInputs(metric))}
        </div>
        {error ? <div className="custom-alert__error">{error}</div> : null}
        <div className="custom-alert__actions">
          <button type="submit">Agregar alarma</button>
        </div>
      </form>
      <div className="custom-alert__list">
        <h4>Alarmas configuradas</h4>
        {emptyState ? (
          <div className="custom-alert__empty">No hay alarmas configuradas.</div>
        ) : (
          <ul>
            {rules.map((rule) => (
              <li key={rule.id} className="custom-alert__rule">
                <div>
                  <strong>{rule.device}</strong>
                  <div className="custom-alert__rule-meta">
                    {rule.mode === "target" ? "Modo: llegar" : "Modo: delta"}
                  </div>
                  <div className="custom-alert__rule-summary">{ruleSummary(rule)}</div>
                </div>
                <button type="button" onClick={() => onRemoveRule?.(rule.id)}>
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
