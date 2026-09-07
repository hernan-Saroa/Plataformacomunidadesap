import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';

import { contratacionService } from '../../services/contratacionService';
import { Persona } from '../../types';

interface Props {
  id: string;
  value: string;
  onChange: (nombre: string) => void;
  /**
   * La persona completa, para quien necesite además su identificador.
   *
   * El estudio previo guarda solo el nombre —es un documento y conserva a quién
   * se nombró—, pero el comité evaluador (EFDS-1156) necesita el `id_person`
   * para saber después qué cuenta corresponde a cada evaluador designado.
   * Opcional para no obligar a los usos que no lo necesitan.
   */
  onSeleccionar?: (persona: Persona) => void;
  placeholder?: string;
  disabled?: boolean;
  invalido?: boolean;
}

/** Iniciales de nombre y apellido, como en los equipos de Control Interno. */
function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  // Primer nombre y primer apellido: en "Ana María Torres Ruiz" el apellido
  // está en la posición 2, no en la última.
  return (partes[0][0] + (partes[2]?.[0] ?? partes[1][0])).toUpperCase();
}

/**
 * Elige un funcionario de auth.personas en vez de escribir su nombre.
 *
 * Con texto libre el mismo jefe queda escrito de varias formas —"Jefe de
 * area", "JEFE DE ÁREA", "J. de área"— y el expediente deja de servir para
 * filtrar o reportar por responsable.
 *
 * Guarda el nombre y no el identificador porque el estudio previo es un
 * documento: debe conservar a quién se nombró aunque esa persona cambie de
 * cargo o salga de la entidad.
 */
export function SelectorPersona({
  id,
  value,
  onChange,
  onSeleccionar,
  placeholder = 'Busca por nombre…',
  disabled,
  invalido,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const [termino, setTermino] = useState('');
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const contenedor = useRef<HTMLDivElement>(null);

  // Un clic fuera cierra la lista: sin esto queda abierta sobre el resto del
  // formulario y tapa los campos siguientes.
  useEffect(() => {
    if (!abierto) return;
    const alClicar = (e: MouseEvent) => {
      if (!contenedor.current?.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', alClicar);
    return () => document.removeEventListener('mousedown', alClicar);
  }, [abierto]);

  // La consulta espera a que el usuario deje de escribir: sin esto cada tecla
  // dispara una petición y las respuestas llegan desordenadas.
  useEffect(() => {
    if (!abierto) return;
    const t = setTimeout(async () => {
      setCargando(true);
      setError(null);
      try {
        setPersonas(await contratacionService.personas(termino));
      } catch (err: any) {
        setError(err.message);
        setPersonas([]);
      } finally {
        setCargando(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [termino, abierto]);

  const vacio = useMemo(
    () => !cargando && !error && personas.length === 0,
    [cargando, error, personas.length],
  );

  const elegir = (persona: Persona) => {
    onChange(persona.nombre);
    onSeleccionar?.(persona);
    setAbierto(false);
    setTermino('');
  };

  return (
    <div ref={contenedor} className="relative">
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setAbierto((a) => !a)}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-[12.5px] text-left
          rounded-lg border bg-white disabled:bg-gray-50 disabled:text-gray-400
          focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 ${
            invalido ? 'border-red-500' : 'border-gray-300 focus:border-[#003DA5]'
          }`}
      >
        {value ? (
          <span className="flex items-center gap-2 min-w-0">
            <span
              aria-hidden="true"
              className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center
                text-[10px] font-bold bg-[#003DA5] text-white"
            >
              {iniciales(value)}
            </span>
            <span className="text-slate-800 truncate">{value}</span>
          </span>
        ) : (
          <span className="text-gray-400">{placeholder}</span>
        )}
        <span className="flex items-center gap-1 flex-shrink-0">
          {value && !disabled && (
            // Limpiar sin tener que borrar a mano un nombre largo.
            <span
              role="button"
              tabIndex={0}
              aria-label="Quitar selección"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  onChange('');
                }
              }}
              className="p-0.5 rounded text-gray-400 hover:text-red-600"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </span>
      </button>

      {abierto && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b border-gray-100 px-2.5 py-2">
            <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <input
              autoFocus
              value={termino}
              onChange={(e) => setTermino(e.target.value)}
              placeholder="Escribe para filtrar…"
              className="w-full text-[12.5px] outline-none"
            />
          </div>

          <ul role="listbox" className="max-h-52 overflow-y-auto m-0 p-0 list-none">
            {cargando && <li className="px-3 py-2 text-[11.5px] text-gray-400">Buscando…</li>}

            {error && (
              // El fallo se dice: un listado vacío sin motivo deja al usuario
              // sin saber si no hay resultados o si la consulta falló.
              <li role="alert" className="px-3 py-2 text-[11.5px] font-bold text-red-600">
                {error}
              </li>
            )}

            {vacio && (
              <li className="px-3 py-2 text-[11.5px] text-gray-400">
                {termino ? 'Sin coincidencias' : 'No hay personas registradas'}
              </li>
            )}

            {personas.map((persona) => (
              <li key={persona.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={persona.nombre === value}
                  onClick={() => elegir(persona)}
                  className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-left hover:bg-blue-50 ${
                    persona.nombre === value ? 'bg-blue-50' : ''
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center
                      text-[10px] font-bold ${
                        persona.nombre === value
                          ? 'bg-[#003DA5] text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                  >
                    {iniciales(persona.nombre)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] text-slate-700 truncate">
                      {persona.nombre}
                    </span>
                    {persona.email && (
                      <span className="block text-[10.5px] text-gray-400 truncate">
                        {persona.email}
                      </span>
                    )}
                  </span>
                  {persona.nombre === value && (
                    <Check className="w-3.5 h-3.5 text-[#003DA5] flex-shrink-0" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
