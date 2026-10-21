import React, { useEffect, useState } from 'react';

import { contratacionService } from '../../services/contratacionService';
import { Cargo } from '../../types';

interface Props {
  id: string;
  /** Id del cargo elegido; vacío es «todos los cargos». */
  value: string;
  onChange: (idCargo: string) => void;
  /** El área solicitante: se ofrecen los cargos que esa dependencia tiene. */
  dependencia?: string;
  disabled?: boolean;
}

/**
 * Acota por cargo a quién se ofrece en un `SelectorPersona`.
 *
 * El catálogo de cargos y qué cargos tiene cada dependencia los administra
 * estructura organizacional (auth.cargos, auth.dependencias_cargos): aquí solo
 * se consultan. No se guarda en el estudio previo —ahí queda el nombre de la
 * persona—, así que «todos los cargos» es una opción y no un hueco por llenar:
 * a quien gestión de personas aún no le asignó cargo se le sigue pudiendo
 * nombrar.
 */
export function SelectorCargo({ id, value, onChange, dependencia, disabled }: Props) {
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError(null);
    contratacionService
      .cargos(dependencia ?? '')
      .then((c) => {
        if (vigente) setCargos(c);
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
  }, [dependencia]);

  if (error) {
    // El fallo se dice: sin el catálogo el filtro no aparece, pero la persona
    // se sigue pudiendo elegir sin él.
    return (
      <p className="text-[11.5px] text-red-600 m-0" role="alert">
        No se pudo cargar el catálogo de cargos: {error}
      </p>
    );
  }

  return (
    <select
      id={id}
      aria-label="Cargo"
      className="w-full px-2.5 py-1.5 text-[12.5px] rounded-md border transition-colors
        focus:outline-none focus:ring-2 disabled:bg-slate-50 disabled:text-slate-500
        border-gray-300 bg-white focus:border-[#003DA5] focus:ring-[#003DA5]/20"
      value={value}
      disabled={disabled || cargando}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{cargando ? 'Cargando cargos…' : 'Todos los cargos'}</option>
      {cargos.map((c) => (
        <option key={c.id} value={c.id}>
          {c.nombre}
        </option>
      ))}
    </select>
  );
}
