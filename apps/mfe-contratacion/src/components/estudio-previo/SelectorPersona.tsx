import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

import { contratacionService } from '../../services/contratacionService';
import { Persona } from '../../types';

interface Props {
  id: string;
  value: string;
  onChange: (nombre: string) => void;
  placeholder?: string;
  disabled?: boolean;
  invalido?: boolean;
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
        <span className={value ? 'text-slate-800 truncate' : 'text-gray-400'}>
          {value || placeholder}
        </span>
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
                  className="w-full px-3 py-1.5 text-left text-[12.5px] text-slate-700 hover:bg-blue-50 hover:text-[#003DA5]"
                >
                  <span className="block truncate">{persona.nombre}</span>
                  {persona.email && (
                    <span className="block text-[10.5px] text-gray-400 truncate">
                      {persona.email}
                    </span>
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
