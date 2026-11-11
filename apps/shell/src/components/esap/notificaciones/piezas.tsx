/**
 * Piezas compartidas de la configuración de notificaciones (EFDS-2406):
 * estilos de campo, interruptor, selector con buscador y estados vacío/cargando.
 */
import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { CANALES, type Canal } from '../../../services/api/notificacionesConfig.service';

export interface Opcion {
  id: string;
  nombre: string;
  detalle?: string;
}

export interface Catalogos {
  roles: Opcion[];
  dependencias: Opcion[];
  sedes: Opcion[];
}

export const campo =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors focus:border-[#1e5da8] focus:outline-none disabled:bg-slate-50 disabled:text-slate-400';
// Sin `w-full`: estos campos miden lo que dice su `style`, no el ancho de la fila.
export const campoChico = campo.replace('w-full ', '').replace('px-3 py-2', 'px-2 py-1.5 text-xs');
export const etiqueta = 'mb-1 block text-xs font-medium text-slate-700';
export const botonPrimario =
  'inline-flex items-center gap-2 rounded-lg bg-[#1e5da8] px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#174a87] hover:shadow active:scale-[0.98] disabled:opacity-60';
export const botonSecundario =
  'inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60';

export const fecha = (iso: string | null | undefined): string =>
  iso ? new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) : '—';

export const nombreCanal = (canal: Canal): string => CANALES.find((c) => c.id === canal)?.nombre ?? canal;

/** Interruptor accesible; el color dice el estado sin leer el texto. */
export function Interruptor({ activo, onCambio, deshabilitado, etiqueta: aria }: { activo: boolean; onCambio: (v: boolean) => void; deshabilitado?: boolean; etiqueta: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      aria-label={aria}
      disabled={deshabilitado}
      onClick={() => onCambio(!activo)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#1e5da8]/40 disabled:cursor-not-allowed disabled:opacity-50 ${activo ? 'bg-emerald-500' : 'bg-gray-300'}`}
    >
      {/* El Tailwind del shell está precompilado y no trae translate-x-5 ni la sombra base:
          la posición y la sombra de la perilla van en línea para que se vea en los dos estados. */}
      <span
        className="inline-block h-5 w-5 rounded-full bg-white transition-transform"
        style={{ transform: `translateX(${activo ? 22 : 2}px)`, boxShadow: '0 1px 3px rgba(15, 23, 42, 0.3)' }}
      />
    </button>
  );
}

/** Lista con buscador y casillas; muestra lo elegido como fichas. */
export function SelectorMultiple({ titulo, opciones, elegidos, onCambio, cargando }: { titulo: string; opciones: Opcion[]; elegidos: string[]; onCambio: (ids: string[]) => void; cargando: boolean }) {
  const [consulta, setConsulta] = useState('');
  const [abierto, setAbierto] = useState(false);
  const porId = useMemo(() => new Map(opciones.map((o) => [o.id, o])), [opciones]);
  const visibles = useMemo(() => {
    const q = consulta.trim().toLowerCase();
    return (q ? opciones.filter((o) => `${o.nombre} ${o.detalle ?? ''}`.toLowerCase().includes(q)) : opciones).slice(0, 80);
  }, [opciones, consulta]);
  const alternar = (id: string) => onCambio(elegidos.includes(id) ? elegidos.filter((x) => x !== id) : [...elegidos, id]);

  return (
    <div>
      <p className={etiqueta}>{titulo}</p>
      <div className="flex flex-wrap gap-1.5">
        {elegidos.map((id) => (
          <span key={id} className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-[#1e5da8]">
            {porId.get(id)?.nombre ?? id}
            <button type="button" aria-label={`Quitar ${porId.get(id)?.nombre ?? id}`} onClick={() => alternar(id)} className="text-[#1e5da8]/70 hover:text-[#1e5da8]">×</button>
          </span>
        ))}
        <button type="button" onClick={() => setAbierto((v) => !v)} className="rounded-full border border-dashed border-slate-300 px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:border-[#1e5da8] hover:text-[#1e5da8]">
          {abierto ? 'Cerrar' : elegidos.length ? 'Cambiar' : 'Agregar'}
        </button>
      </div>
      {abierto && (
        <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-2 h-3.5 w-3.5 text-slate-400" />
            <input value={consulta} onChange={(e) => setConsulta(e.target.value)} placeholder="Buscar…" className={`${campoChico} w-full pl-7`} />
          </div>
          <ul className="mt-2 max-h-44 space-y-0.5 overflow-y-auto">
            {cargando && <li className="px-2 py-1 text-xs text-slate-500">Cargando…</li>}
            {!cargando && visibles.length === 0 && <li className="px-2 py-1 text-xs text-slate-500">Sin resultados</li>}
            {visibles.map((o) => (
              <li key={o.id}>
                <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">
                  <input type="checkbox" checked={elegidos.includes(o.id)} onChange={() => alternar(o.id)} className="h-3.5 w-3.5 accent-[#1e5da8]" />
                  <span className="flex-1 truncate">{o.nombre}</span>
                  {o.detalle && <span className="text-[10px] text-slate-400">{o.detalle}</span>}
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export const Cargando = () => (
  <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl border border-slate-200 bg-white" />)}</div>
);

export const Vacio = ({ icono, titulo, detalle }: { icono: React.ReactNode; titulo: string; detalle: string }) => (
  <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-white px-6 py-12 text-center">
    <span className="flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-slate-50">{icono}</span>
    <div><p className="text-sm font-medium text-slate-800">{titulo}</p><p className="mt-1 text-xs text-slate-500">{detalle}</p></div>
  </div>
);

export const nombreCampo: Record<string, string> = {
  activo: 'Activo',
  canal: 'Canal',
  canal_defecto: 'Canal por defecto',
  correo_desvio: 'Buzón de desvío',
  obligatorio: 'Obligatorio',
  prioridad: 'Prioridad',
  nombre: 'Nombre',
  descripcion: 'Descripción',
  roles_adicionales: 'Roles adicionales',
  dependencias_adicionales: 'Dependencias adicionales',
  sedes_adicionales: 'Sedes adicionales',
};

export function valorLegible(campoNombre: string, valor: unknown): string {
  if (valor === null || valor === undefined) {
    return campoNombre === 'canal' ? 'Hereda del módulo' : campoNombre === 'prioridad' ? 'La del código' : campoNombre === 'correo_desvio' ? 'Sin buzón' : '—';
  }
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
  if (Array.isArray(valor)) return valor.length ? valor.join(', ') : 'Ninguno';
  if (campoNombre === 'canal' || campoNombre === 'canal_defecto') return nombreCanal(valor as Canal);
  return String(valor);
}
