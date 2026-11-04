/**
 * Una fila de aviso dentro de la configuración de notificaciones de un módulo
 * (EFDS-2406): interruptor, canal, prioridad, destinatarios adicionales y prueba.
 * Los obligatorios se muestran bloqueados; los avisos que solo mandan correo no
 * tienen campana, así que prioridad y destinatarios adicionales no aplican.
 */
import React, { useEffect, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronRight, Lock, Mail, MonitorSmartphone, Send, Users } from 'lucide-react';
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
import { botonSecundario, campo, campoChico, etiqueta, fecha, Interruptor, nombreCanal, SelectorMultiple, type Catalogos } from './piezas';

export function FilaEvento({ evento, modulo, catalogos, cargarCatalogos, onGuardar, onProbar }: {
  evento: EventoNotificaciones;
  modulo: ModuloNotificaciones;
  catalogos: Catalogos | null;
  cargarCatalogos: () => void;
  onGuardar: (clave: string, cambios: CambiosEvento) => Promise<void>;
  onProbar: (evento: EventoNotificaciones) => Promise<void>;
}) {
  const [abierta, setAbierta] = useState(false);
  const [descripcion, setDescripcion] = useState(evento.descripcion ?? '');
  const [probando, setProbando] = useState(false);
  useEffect(() => setDescripcion(evento.descripcion ?? ''), [evento.descripcion]);

  const canalEfectivo: Canal = evento.canal ?? modulo.canal_defecto;
  const apagadoPorModulo = !modulo.activo && !evento.obligatorio;
  const adicionales = evento.roles_adicionales.length + evento.dependencias_adicionales.length + evento.sedes_adicionales.length;
  const sinCampana = soloCorreo(evento);

  const abrir = () => {
    if (!abierta && !catalogos) cargarCatalogos();
    setAbierta((v) => !v);
  };

  return (
    <li className={`rounded-xl border bg-white shadow-sm ${evento.activo && !apagadoPorModulo ? 'border-slate-200' : 'border-slate-200 bg-slate-50/60'}`}>
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <button type="button" onClick={abrir} aria-expanded={abierta} aria-label={abierta ? 'Ocultar detalle' : 'Ver detalle'} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
          {abierta ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        <div className="min-w-0 flex-1 basis-64">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className={`text-sm font-medium ${evento.activo && !apagadoPorModulo ? 'text-slate-900' : 'text-slate-500'}`}>{evento.nombre}</p>
            {evento.obligatorio && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-100"><Lock className="h-3 w-3" />Obligatorio</span>
            )}
            {sinCampana && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">Solo correo</span>
            )}
            {evento.verificado_en && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-100" title={`Verificado el ${fecha(evento.verificado_en)} por ${evento.verificado_por ?? '—'}`}><CheckCircle2 className="h-3 w-3" />Verificado</span>
            )}
            {adicionales > 0 && !sinCampana && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600" title="Destinatarios adicionales"><Users className="h-3 w-3" />+{adicionales}</span>
            )}
          </div>
          <p className="truncate font-mono text-[11px] text-slate-400">{evento.clave}</p>
        </div>

        <div className="flex items-center gap-1 text-slate-400" title={sinCampana ? 'Este evento solo manda correo' : evento.envia_correo ? 'Este evento manda campana y correo' : 'Este evento solo manda campana'}>
          <MonitorSmartphone className={`h-4 w-4 ${!sinCampana && canalEfectivo !== 'correo' ? 'text-[#1e5da8]' : 'text-slate-300'}`} />
          <Mail className={`h-4 w-4 ${evento.envia_correo && canalEfectivo !== 'plataforma' ? 'text-[#1e5da8]' : 'text-slate-300'}`} />
        </div>

        {/* Cada control con su nombre a la vista: así se entiende sin abrir el detalle. */}
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className={etiqueta}>Canal</span>
            <select
              aria-label="Canal del evento"
              value={evento.canal ?? ''}
              onChange={(e) => onGuardar(evento.clave, { canal: (e.target.value || null) as Canal | null })}
              className={campoChico}
              style={{ width: '13rem' }}
            >
              <option value="">Hereda: {nombreCanal(modulo.canal_defecto)}</option>
              {CANALES.map((c) => (
                <option key={c.id} value={c.id} disabled={c.id === 'correo' && !evento.envia_correo}>{c.nombre}</option>
              ))}
            </select>
          </label>

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
                <option value="">Del código{evento.prioridad_codigo ? `: ${evento.prioridad_codigo}` : ''}</option>
                {PRIORIDADES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
          )}

          <div className="flex flex-col items-center gap-1 pb-0.5">
            <span className="text-[11px] font-medium text-slate-600">{evento.obligatorio ? 'Siempre activo' : evento.activo ? 'Activo' : 'Inactivo'}</span>
            <Interruptor
              activo={evento.activo}
              deshabilitado={evento.obligatorio}
              etiqueta={`${evento.activo ? 'Desactivar' : 'Activar'} ${evento.nombre}`}
              onCambio={(v) => onGuardar(evento.clave, { activo: v })}
            />
          </div>
        </div>
      </div>

      {abierta && (
        <div className="grid gap-4 border-t border-slate-100 px-4 py-4 md:grid-cols-2">
          <div className="space-y-3">
            <div>
              <label className={etiqueta} htmlFor={`desc-${modulo.codigo}-${evento.clave}`}>Descripción (qué lo dispara y a quién le llega)</label>
              <textarea
                id={`desc-${modulo.codigo}-${evento.clave}`}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                onBlur={() => { if ((evento.descripcion ?? '') !== descripcion) onGuardar(evento.clave, { descripcion: descripcion || null }); }}
                rows={3}
                className={campo}
                placeholder="Ejemplo: cuando se aprueba el PTA, al docente que lo creó."
              />
            </div>
            <label className="flex items-center gap-1.5 text-xs text-slate-600" title="Nadie puede apagarlo: ni el administrador ni el usuario">
              <input type="checkbox" checked={evento.obligatorio} onChange={(e) => onGuardar(evento.clave, { obligatorio: e.target.checked })} className="h-3.5 w-3.5 accent-[#1e5da8]" />
              Obligatorio (no se puede apagar)
            </label>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <dt className="text-slate-500">Último aviso recibido</dt><dd className="text-slate-800">{fecha(evento.visto_en)}</dd>
              <dt className="text-slate-500">Verificado</dt><dd className="text-slate-800">{evento.verificado_en ? `${fecha(evento.verificado_en)} · ${evento.verificado_por ?? ''}` : 'Todavía no'}</dd>
              <dt className="text-slate-500">Última edición</dt><dd className="text-slate-800">{evento.actualizado_por ? `${fecha(evento.actualizado_en)} · ${evento.actualizado_por}` : 'Sin cambios'}</dd>
            </dl>
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

          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Destinatarios adicionales</p>
            {sinCampana ? (
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                Este aviso solo manda correo a quien corresponde: la prioridad y los destinatarios adicionales no aplican.
              </p>
            ) : (
              <>
                <p className="text-xs text-slate-500">Se suman a quienes el módulo ya avisa; no los reemplazan.</p>
                <SelectorMultiple titulo="Roles" opciones={catalogos?.roles ?? []} elegidos={evento.roles_adicionales} cargando={!catalogos} onCambio={(ids) => onGuardar(evento.clave, { roles_adicionales: ids })} />
                <SelectorMultiple titulo="Dependencias" opciones={catalogos?.dependencias ?? []} elegidos={evento.dependencias_adicionales.map(String)} cargando={!catalogos} onCambio={(ids) => onGuardar(evento.clave, { dependencias_adicionales: ids.map(Number) })} />
                <SelectorMultiple titulo="Sedes (territorial)" opciones={catalogos?.sedes ?? []} elegidos={evento.sedes_adicionales.map(String)} cargando={!catalogos} onCambio={(ids) => onGuardar(evento.clave, { sedes_adicionales: ids.map(Number) })} />
              </>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
