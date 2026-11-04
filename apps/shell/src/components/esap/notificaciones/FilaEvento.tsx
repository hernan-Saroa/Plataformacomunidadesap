/**
 * Una fila de aviso dentro de la configuración de notificaciones de un módulo
 * (EFDS-2406). A la vista solo lo que se usa a diario: nombre, canal con dos
 * íconos (campana y correo, función 3) e interruptor (función 2). En «Más
 * opciones» quedan los destinatarios adicionales (función 4), el candado de
 * obligatorio (función 5) y el envío de prueba (15). La prioridad (función 7,
 * opcional en la historia) no se ofrece en la pantalla.
 */
import React, { useState } from 'react';
import { Bell, ChevronDown, ChevronRight, Lock, LockOpen, Mail, Send } from 'lucide-react';
import {
  soloCorreo,
  type CambiosEvento,
  type Canal,
  type EventoNotificaciones,
  type ModuloNotificaciones,
} from '../../../services/api/notificacionesConfig.service';
import { botonSecundario, etiqueta, Interruptor, SelectorMultiple, type Catalogos } from './piezas';

/** Botón de un canal: prendido en azul, apagado en gris, bloqueado si el aviso no usa ese canal. */
function BotonCanal({ prendido, bloqueado, titulo, onClick, children }: {
  prendido: boolean; bloqueado: boolean; titulo: string; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={prendido}
      aria-label={titulo}
      title={titulo}
      disabled={bloqueado}
      onClick={onClick}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
        prendido ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100' : 'border-gray-200 bg-white text-gray-300 hover:bg-gray-50'
      } ${bloqueado ? 'cursor-not-allowed opacity-40' : ''}`}
    >
      {children}
    </button>
  );
}

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

  // El canal se elige con dos íconos. Siempre queda al menos uno prendido:
  // para que el aviso no salga por ningún lado está el interruptor.
  const canal: Canal = evento.canal ?? modulo.canal_defecto;
  const campana = !sinCampana && canal !== 'correo';
  const correo = evento.envia_correo && canal !== 'plataforma';
  const guardarCanal = (conCampana: boolean, conCorreo: boolean) => {
    if (!conCampana && !conCorreo) return;
    onGuardar(evento.clave, { canal: conCampana && conCorreo ? 'ambos' : conCampana ? 'plataforma' : 'correo' });
  };

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
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-200"><Lock className="h-3 w-3" />Obligatorio</span>
            )}
            {apagadoPorModulo && (
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">Apagado con el módulo</span>
            )}
          </div>
          <button type="button" onClick={abrir} aria-expanded={abierta} className="mt-0.5 inline-flex items-center gap-0.5 text-[11px] text-slate-500 hover:text-slate-700">
            {abierta ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Más opciones
          </button>
        </div>

        <div className="flex items-center gap-1">
          <BotonCanal
            prendido={campana}
            bloqueado={apagadoPorModulo || sinCampana || !evento.envia_correo}
            titulo={sinCampana ? 'Este aviso no usa la campana' : campana ? 'Quitar la campana' : 'Avisar también en la campana'}
            onClick={() => guardarCanal(!campana, correo)}
          >
            <Bell className="h-4 w-4" />
          </BotonCanal>
          <BotonCanal
            prendido={correo}
            bloqueado={apagadoPorModulo || !evento.envia_correo || sinCampana}
            titulo={!evento.envia_correo ? 'Este aviso no manda correo' : correo ? 'Quitar el correo' : 'Avisar también por correo'}
            onClick={() => guardarCanal(campana, !correo)}
          >
            <Mail className="h-4 w-4" />
          </BotonCanal>
        </div>

        {/* Con el módulo apagado los avisos se ven apagados y bloqueados; al prenderlo
            vuelven a su estado propio, que no se toca. Los obligatorios siguen encendidos. */}
        <Interruptor
          activo={evento.obligatorio || encendido}
          deshabilitado={evento.obligatorio || apagadoPorModulo}
          etiqueta={apagadoPorModulo ? `${evento.nombre}: apagado con el módulo` : `${evento.activo ? 'Desactivar' : 'Activar'} ${evento.nombre}`}
          onCambio={(v) => onGuardar(evento.clave, { activo: v })}
        />
      </div>

      {abierta && (
        <div className="space-y-4 border-t border-slate-100 px-4 py-4">
          {sinCampana ? (
            <p className="text-xs text-slate-500">Este aviso solo manda correo a quien corresponde, así que no admite destinatarios adicionales.</p>
          ) : (
            <div className="space-y-3">
              <p className={etiqueta}>Destinatarios adicionales (se suman a quienes el módulo ya avisa)</p>
              <SelectorMultiple titulo="Roles" opciones={catalogos?.roles ?? []} elegidos={evento.roles_adicionales} cargando={!catalogos} onCambio={(ids) => onGuardar(evento.clave, { roles_adicionales: ids })} />
              <SelectorMultiple titulo="Dependencias" opciones={catalogos?.dependencias ?? []} elegidos={evento.dependencias_adicionales.map(String)} cargando={!catalogos} onCambio={(ids) => onGuardar(evento.clave, { dependencias_adicionales: ids.map(Number) })} />
              <SelectorMultiple titulo="Territoriales" opciones={catalogos?.sedes ?? []} elegidos={evento.sedes_adicionales.map(String)} cargando={!catalogos} onCambio={(ids) => onGuardar(evento.clave, { sedes_adicionales: ids.map(Number) })} />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            {/* Obligatorio = nadie lo puede apagar (función 5): para avisos como un código de firma. */}
            <button
              type="button"
              aria-pressed={evento.obligatorio}
              onClick={() => onGuardar(evento.clave, { obligatorio: !evento.obligatorio })}
              title={evento.obligatorio ? 'Quitar obligatorio: se podrá apagar' : 'Marcar obligatorio: nadie lo podrá apagar'}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                evento.obligatorio ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {evento.obligatorio ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
              {evento.obligatorio ? 'Obligatorio' : 'Marcar obligatorio'}
            </button>
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
