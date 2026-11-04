/**
 * Una fila de aviso dentro de la configuración de notificaciones de un módulo
 * (EFDS-2406). A la vista solo lo que se usa a diario: nombre, canal (función 3)
 * e interruptor (función 2). En «Más opciones» quedan los destinatarios
 * adicionales (función 4), marcarlo obligatorio (función 5), la prioridad
 * (función 7) y el envío de prueba (función 15).
 */
import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Lock, Send } from 'lucide-react';
import {
  CANALES,
  PRIORIDADES,
  soloCorreo,
  type CambiosEvento,
  type Canal,
  type EventoNotificaciones,
  type ModuloNotificaciones,
  type Prioridad,
} from '../../../services/api/notificacionesConfig.service';
import { botonSecundario, campoChico, etiqueta, Interruptor, SelectorMultiple, type Catalogos } from './piezas';

export function FilaEvento({ evento, modulo, catalogos, cargarCatalogos, onGuardar, onProbar }: {
  evento: EventoNotificaciones;
  modulo: ModuloNotificaciones;
  catalogos: Catalogos | null;
  cargarCatalogos: () => void;
  onGuardar: (clave: string, cambios: CambiosEvento) => Promise<void>;
  onProbar: (evento: EventoNotificaciones) => Promise<void>;
}) {
  const [abierta, setAbierta] = useState(false);
  const [probando, setProbando] = useState(false);

  const apagadoPorModulo = !modulo.activo && !evento.obligatorio;
  const encendido = evento.activo && !apagadoPorModulo;
  const sinCampana = soloCorreo(evento);

  const abrir = () => {
    if (!abierta && !catalogos && !sinCampana) cargarCatalogos();
    setAbierta((v) => !v);
  };

  return (
    <li className={`rounded-xl border border-slate-200 shadow-sm ${encendido ? 'bg-white' : 'bg-slate-50/60'}`}>
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1 basis-56">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className={`text-sm font-medium ${encendido ? 'text-slate-900' : 'text-slate-500'}`}>{evento.nombre}</p>
            {evento.obligatorio && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-100"><Lock className="h-3 w-3" />Obligatorio</span>
            )}
          </div>
          <button type="button" onClick={abrir} aria-expanded={abierta} className="mt-0.5 inline-flex items-center gap-0.5 text-[11px] text-slate-500 hover:text-slate-700">
            {abierta ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Más opciones
          </button>
        </div>

        <select
          aria-label="Canal del evento"
          value={evento.canal ?? modulo.canal_defecto}
          onChange={(e) => onGuardar(evento.clave, { canal: e.target.value as Canal })}
          className={campoChico}
          style={{ width: '12rem' }}
        >
          {CANALES.map((c) => (
            <option key={c.id} value={c.id} disabled={(c.id === 'correo' && !evento.envia_correo) || (c.id === 'plataforma' && sinCampana)}>{c.nombre}</option>
          ))}
        </select>

        <Interruptor
          activo={evento.activo}
          deshabilitado={evento.obligatorio}
          etiqueta={`${evento.activo ? 'Desactivar' : 'Activar'} ${evento.nombre}`}
          onCambio={(v) => onGuardar(evento.clave, { activo: v })}
        />
      </div>

      {abierta && (
        <div className="space-y-4 border-t border-slate-100 px-4 py-4">
          {sinCampana ? (
            <p className="text-xs text-slate-500">Este aviso solo manda correo a quien corresponde, así que no admite destinatarios adicionales ni prioridad.</p>
          ) : (
            <div className="space-y-3">
              <p className={etiqueta}>Destinatarios adicionales (se suman a quienes el módulo ya avisa)</p>
              <SelectorMultiple titulo="Roles" opciones={catalogos?.roles ?? []} elegidos={evento.roles_adicionales} cargando={!catalogos} onCambio={(ids) => onGuardar(evento.clave, { roles_adicionales: ids })} />
              <SelectorMultiple titulo="Dependencias" opciones={catalogos?.dependencias ?? []} elegidos={evento.dependencias_adicionales.map(String)} cargando={!catalogos} onCambio={(ids) => onGuardar(evento.clave, { dependencias_adicionales: ids.map(Number) })} />
              <SelectorMultiple titulo="Territoriales" opciones={catalogos?.sedes ?? []} elegidos={evento.sedes_adicionales.map(String)} cargando={!catalogos} onCambio={(ids) => onGuardar(evento.clave, { sedes_adicionales: ids.map(Number) })} />
            </div>
          )}

          <div className="flex flex-wrap items-end gap-4">
            {!sinCampana && (
              <label className="block">
                <span className={etiqueta}>Prioridad</span>
                <select
                  aria-label="Prioridad del evento"
                  value={evento.prioridad ?? ''}
                  onChange={(e) => onGuardar(evento.clave, { prioridad: (e.target.value || null) as Prioridad | null })}
                  className={campoChico}
                  style={{ width: '10rem' }}
                >
                  <option value="">La del módulo{evento.prioridad_codigo ? ` (${evento.prioridad_codigo})` : ''}</option>
                  {PRIORIDADES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
            )}
            <label className="flex items-center gap-1.5 pb-2 text-xs text-slate-600">
              <input type="checkbox" checked={evento.obligatorio} onChange={(e) => onGuardar(evento.clave, { obligatorio: e.target.checked })} className="h-3.5 w-3.5 accent-[#1e5da8]" />
              Obligatorio (nadie lo puede apagar)
            </label>
            <button
              type="button"
              className={botonSecundario}
              disabled={probando}
              onClick={async () => { setProbando(true); try { await onProbar(evento); } finally { setProbando(false); } }}
            >
              <Send className="h-3.5 w-3.5" />
              {probando ? 'Enviando…' : 'Enviarme una prueba'}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
