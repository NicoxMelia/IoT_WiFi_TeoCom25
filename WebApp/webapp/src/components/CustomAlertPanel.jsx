import React, { useEffect, useState } from "react";

const METRIC_LABELS = {
  temp: { label: "Temperatura", unit: "°C", placeholder: "Ej: 35" },
  hum: { label: "Humedad", unit: "%", placeholder: "Ej: 60" },
  press: { label: "Presión", unit: "hPa", placeholder: "Ej: 1000" },
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

export default function CustomAlertPanel({
  devices,
  rules,
  onSaveRule,
  onRemoveRule,
  metricLimits = {},
}) {
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
    const limits = metricLimits?.[metric] ?? {};
    const meta = METRIC_LABELS[metric];
    const unit = meta?.unit ?? "";

    if (target === null) {
      return { config: null };
    }

    if (limits.min !== undefined && target < limits.min) {
      return { error: `El objetivo de ${meta.label} debe ser ≥ ${limits.min}${unit}` };
    }
    if (limits.max !== undefined && target > limits.max) {
      return { error: `El objetivo de ${meta.label} debe ser ≤ ${limits.max}${unit}` };
    }

    if (form.mode === "target") {
      return { config: { target } };
    }

    if (delta === null || delta < 0) {
      return { error: `Ingresá un delta válido (≥ 0) para ${meta.label}` };
    }

    const lowerBound = target - delta;
    const upperBound = target + delta;
    if ((limits.min !== undefined && lowerBound < limits.min) || (limits.max !== undefined && upperBound > limits.max)) {
      const minText = limits.min !== undefined ? `${limits.min}${unit}` : "sin mínimo";
      const maxText = limits.max !== undefined ? `${limits.max}${unit}` : "sin máximo";
      return {
        error: `Ajustá el delta para que el rango de ${meta.label} quede dentro de ${minText} y ${maxText}`,
      };
    }

    return { config: { target, delta } };
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.device) {
      setError("Seleccioná un grupo");
      return;
    }
    const metricResults = {};
    for (const metric of Object.keys(METRIC_LABELS)) {
      const { config, error: configError } = buildMetricConfig(metric);
      if (configError) {
        setError(configError);
        return;
      }
      metricResults[metric] = config;
    }

    const hasMetric = Object.values(metricResults).some(Boolean);
    if (!hasMetric) {
      setError("Ingresá al menos un valor para temperatura, humedad o presión");
      return;
    }
    setError(null);
    onSaveRule?.({
      device: form.device,
      mode: form.mode,
      metrics: metricResults,
    });
    setForm((prev) => ({ ...emptyForm, device: prev.device || devices[0] || "" }));
  };

  const modeDescription =
    form.mode === "target"
      ? "Notificarme cuando llegue al valor objetivo"
      : "Notificarme cuando salga del rango objetivo ± delta";

  const renderMetricInputs = (metric) => {
    const meta = METRIC_LABELS[metric];
    const limits = metricLimits?.[metric] ?? {};
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
              placeholder={meta.placeholder}
              min={limits.min ?? undefined}
              max={limits.max ?? undefined}
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
