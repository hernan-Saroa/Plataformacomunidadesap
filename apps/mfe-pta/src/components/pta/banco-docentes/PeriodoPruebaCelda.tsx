import React from 'react';
import { diasRestantesTexto, formatFechaPrueba, type PeriodoPruebaInfo } from '../../../utils/rundPeriodoPrueba';

/** HU 2424 (CA-01): inicio, fecha de cumplimiento y días restantes del periodo de prueba, bajo la vinculación. */
export function PeriodoPruebaCelda({ info }: { info?: PeriodoPruebaInfo | null }) {
  if (!info) return null;
  if (!info.en_periodo_prueba) {
    // Ya tiene decisión registrada y dejó de estar en prueba (p. ej. pasó a Carrera 2).
    return info.decision ? (
      <div data-testid="periodo-prueba-decision" style={{ fontSize: 11, color: '#1D4ED8', marginTop: 3 }}>
        {info.decision.resultadoEtiqueta} · comité {formatFechaPrueba(info.decision.fechaComite)}
      </div>
    ) : null;
  }
  const pendiente = info.pendiente_decision;
  return (
    <div data-testid="periodo-prueba-celda" style={{ marginTop: 4, fontSize: 11, lineHeight: 1.45, color: pendiente ? '#92400E' : '#475569' }}>
      <div>Inicio: {formatFechaPrueba(info.inicio)}</div>
      <div>Cumple: {formatFechaPrueba(info.cumplimiento)}</div>
      <div style={{ fontWeight: 600 }}>{diasRestantesTexto(info.dias_restantes)}</div>
      {pendiente && (
        <span style={{ display: 'inline-block', marginTop: 3, padding: '1px 8px', borderRadius: 9999, background: '#FEF3C7', border: '1px solid #F59E0B', color: '#92400E', fontWeight: 700 }}>
          Pendiente de decisión del comité
        </span>
      )}
      {info.decision && (
        <div style={{ color: '#1D4ED8', marginTop: 3 }}>{info.decision.resultadoEtiqueta} · comité {formatFechaPrueba(info.decision.fechaComite)}</div>
      )}
    </div>
  );
}
