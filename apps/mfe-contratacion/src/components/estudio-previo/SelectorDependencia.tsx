import React, { useEffect, useState } from 'react';

import { contratacionService } from '../../services/contratacionService';
import { Dependencia } from '../../types';

interface Props {
  id: string;
  value: string;
  onChange: (nombre: string) => void;
  disabled?: boolean;
  invalido?: boolean;
}

/**
 * Elige el área solicitante del catálogo de dependencias en vez de escribirla
 * (EFDS-2065, reunión de validación del modelo del 17 sep).
 *
 * Con texto libre la misma dependencia queda escrita de varias formas
 * —«Vicerrectoría Académica», «VRA», «Vicerrectoria academica»— y el
 * expediente deja de servir para filtrar o reportar por área. El catálogo ya
 * existe y lo administra estructura organizacional: aquí solo se consulta.
 *
 * Guarda el nombre y no el identificador, igual que `SelectorPersona`: el
 * estudio previo es un documento y conserva qué área se nombró aunque esa
 * dependencia después se renombre o se reorganice.
 */
export function SelectorDependencia({ id, value, onChange, disabled, invalido }: Props) {
  const [dependencias, setDependencias] = useState<Dependencia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    contratacionService
      .dependencias()
      .then((d) => {
        if (vigente) setDependencias(d);
      })
      .catch((err: any) => {
        if (vigente) setError(err.message);
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, []);

  // El valor que ya trae el proceso puede no estar en el catálogo cargado
  // —una dependencia inactivada después de radicar, o un dato de antes de
  // este selector—: se ofrece igual para no borrar silenciosamente lo que el
  // expediente ya dice.
  const opciones =
    value && !dependencias.some((d) => d.nombre === value)
      ? [{ id: '_actual', nombre: value }, ...dependencias]
      : dependencias;

  const clase = `w-full px-2.5 py-1.5 text-[12.5px] rounded-md border transition-colors
    focus:outline-none focus:ring-2 disabled:bg-slate-50 disabled:text-slate-500 ${
      invalido
        ? 'border-red-400 bg-red-50 focus:ring-red-200'
        : 'border-gray-300 bg-white focus:border-[#003DA5] focus:ring-[#003DA5]/20'
    }`;

  if (error) {
    // El fallo se dice: un desplegable vacío sin motivo se lee como que la
    // ESAP no tiene dependencias, no como que la consulta falló.
    return (
      <p className="text-[11.5px] text-red-600 m-0" role="alert">
        No se pudo cargar el catálogo de dependencias: {error}
      </p>
    );
  }

  return (
    <select
      id={id}
      className={clase}
      value={value ?? ''}
      disabled={disabled || cargando}
      aria-invalid={invalido}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{cargando ? 'Cargando…' : 'Seleccione…'}</option>
      {opciones.map((d) => (
        <option key={d.id} value={d.nombre}>
          {d.nombre}
        </option>
      ))}
    </select>
  );
}
