/**
 * SelectorResponsable - Lista desplegable con búsqueda de usuarios activos del proceso Gestión Legal.
 * No admite texto libre: el valor siempre es el usuario elegido de la lista.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { Input } from '@esap-mfe/shared-ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@esap-mfe/shared-ui/popover';
import { legalService } from '../../../../services/api/legal.service';
import {
  ResponsableOpcion, mapearResponsables, filtrarResponsables, detalleOpcion, MENSAJE_SIN_RESPONSABLES,
} from './responsablesIndicador';

/** Carga los usuarios activos del proceso legal. `null` mientras carga o si la consulta falla. */
export function useResponsablesProcesoLegal(habilitado = true) {
  const [responsables, setResponsables] = useState<ResponsableOpcion[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!habilitado) return;
    let activo = true;
    legalService.getUsuariosResponsablesIndicador()
      .then(usuarios => { if (activo) { setResponsables(mapearResponsables(usuarios)); setError(false); } })
      .catch(() => { if (activo) setError(true); });
    return () => { activo = false; };
  }, [habilitado]);

  return { responsables, error };
}

interface SelectorResponsableProps {
  id?: string;
  opciones: ResponsableOpcion[] | null;
  error?: boolean;
  /** id del usuario seleccionado ('' = ninguno). */
  valor: string;
  /** Nombre a mostrar cuando el valor no está en las opciones (p. ej. responsable inactivo). */
  nombreActual?: string;
  onChange: (responsable: ResponsableOpcion) => void;
  className?: string;
}

export function SelectorResponsable({ id = 'responsable', opciones, error, valor, nombreActual, onChange, className }: SelectorResponsableProps) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const disparadorRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { if (!abierto) setBusqueda(''); }, [abierto]);

  const seleccionado = opciones?.find(o => o.id === valor) ?? null;
  const visibles = useMemo(() => filtrarResponsables(opciones ?? [], busqueda), [opciones, busqueda]);

  const etiqueta = seleccionado
    ? seleccionado.nombreCompleto
    : opciones === null
      ? (error ? 'No se pudo cargar la lista de responsables' : 'Cargando responsables...')
      : '-- Seleccione un responsable --';

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          ref={disparadorRef}
          role="combobox"
          aria-expanded={abierto}
          aria-haspopup="listbox"
          className={`w-full flex items-center justify-between px-3 py-2 text-left border-2 border-gray-300 rounded-lg bg-white focus:outline-none ${className ?? ''}`}
        >
          <span className={seleccionado ? 'text-gray-900' : 'text-gray-500'}>{etiqueta}</span>
          <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-[18rem] p-2 z-[1100]">
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            aria-label="Buscar responsable"
            placeholder="Buscar por nombre, documento o correo..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation();
                setAbierto(false);
                disparadorRef.current?.focus();
              }
            }}
            className="pl-8"
            autoFocus
          />
        </div>
        <ul role="listbox" aria-label="Responsables" className="max-h-60 overflow-y-auto">
          {visibles.map(r => (
            <li key={r.id} role="option" aria-selected={r.id === valor}>
              <button
                type="button"
                onClick={() => { onChange(r); setAbierto(false); }}
                className={`w-full text-left px-2 py-1.5 rounded hover:bg-gray-100 ${r.id === valor ? 'bg-green-50' : ''}`}
              >
                <span className="block text-sm font-semibold text-gray-900">{r.nombreCompleto}</span>
                <span className="block text-xs text-gray-600">{detalleOpcion(r) || 'Sin cargo ni dependencia registrados'}</span>
                <span className="block text-xs text-gray-500">{[r.documento && `Doc. ${r.documento}`, r.email].filter(Boolean).join(' · ')}</span>
              </button>
            </li>
          ))}
        </ul>
        {opciones !== null && visibles.length === 0 && (
          <p role="status" className="px-2 py-3 text-sm text-gray-600">{MENSAJE_SIN_RESPONSABLES}</p>
        )}
        {nombreActual && !seleccionado && opciones !== null && (
          <p className="px-2 pt-2 text-xs text-amber-700 border-t mt-2">
            Responsable actual (fuera de la lista): {nombreActual}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
