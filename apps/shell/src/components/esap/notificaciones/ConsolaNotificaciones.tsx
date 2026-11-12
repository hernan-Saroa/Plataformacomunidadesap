/**
 * Piezas con las que Gestión de módulos incorpora la consola de notificaciones
 * (EFDS-2406): el estado de notificaciones por módulo, la ventana de
 * configuración y el bloque de remitentes que no están en el menú.
 *
 * Todo depende de `GET /configuracion/permisos`: sin `gestionar: true` no se
 * pide ni se muestra nada (el acceso lo da el permiso, no un rol).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Bell, BellOff, X } from 'lucide-react';
import {
  notificacionesConfigService,
  type ModuloNotificaciones,
  type PermisosNotificaciones,
} from '../../../services/api/notificacionesConfig.service';
import { PanelAvisosModulo } from './PanelAvisosModulo';

/** Los códigos de auth y de notificaciones se cruzan sin distinguir mayúsculas ni `_`/`-`. */
export const claveModulo = (codigo: string): string => codigo.trim().toLowerCase().replace(/_/g, '-');

export interface ConsolaNotificaciones {
  permisos: PermisosNotificaciones | null;
  /** `null` mientras carga; vacío si no hay permiso o falló la carga. */
  modulos: ModuloNotificaciones[] | null;
  puede: boolean;
  recargar: () => Promise<void>;
  mezclar: (codigo: string, cambios: Partial<ModuloNotificaciones>) => void;
  porCodigo: (codigoAuth: string) => ModuloNotificaciones | undefined;
}

export function useConsolaNotificaciones(): ConsolaNotificaciones {
  const [permisos, setPermisos] = useState<PermisosNotificaciones | null>(null);
  const [modulos, setModulos] = useState<ModuloNotificaciones[] | null>(null);

  const recargar = useCallback(async () => {
    try {
      setModulos(await notificacionesConfigService.listarModulos());
    } catch {
      setModulos([]);
    }
  }, []);

  useEffect(() => {
    let vigente = true;
    notificacionesConfigService.misPermisos()
      .then((p) => {
        if (!vigente) return;
        setPermisos(p);
        if (p?.gestionar) recargar(); else setModulos([]);
      })
      .catch(() => { if (vigente) { setPermisos({ gestionar: false, compuerta_encendida: true }); setModulos([]); } });
    return () => { vigente = false; };
  }, [recargar]);

  const mezclar = useCallback((codigo: string, cambios: Partial<ModuloNotificaciones>) => {
    setModulos((lista) => lista?.map((m) => (m.codigo === codigo ? { ...m, ...cambios } : m)) ?? null);
  }, []);

  const porCodigo = useCallback(
    (codigoAuth: string) => modulos?.find((m) => claveModulo(m.codigo) === claveModulo(codigoAuth)),
    [modulos],
  );

  return { permisos, modulos, puede: permisos?.gestionar === true, recargar, mezclar, porCodigo };
}

/**
 * Estado de las notificaciones del módulo en la tabla. Lo que se puede abrir se
 * ve como botón y dice «Configurar»; un módulo que no notifica es texto plano.
 * Antes ambos decían «Sin avisos» y solo los distinguía una campanita, y un
 * módulo que sí notifica pero aún no había mandado avisos parecía no notificar.
 */
export function EstadoNotificaciones({ modulo, nombre, onAbrir }: { modulo: ModuloNotificaciones | undefined; nombre: string; onAbrir: () => void }) {
  if (!modulo) {
    return (
      <span className="text-[11px] italic text-gray-400" title="Este módulo no manda notificaciones. Si empieza a mandarlas, aparece aquí para configurarlas.">
        No notifica
      </span>
    );
  }
  const color = modulo.activo
    ? 'border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
    : 'border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-200';
  const avisos = modulo.eventos === 0 ? 'Aún sin avisos' : `${modulo.eventos} ${modulo.eventos === 1 ? 'aviso' : 'avisos'}`;
  return (
    <button
      type="button"
      onClick={onAbrir}
      aria-label={`Configurar notificaciones de ${nombre}`}
      title="Configurar sus notificaciones"
      className="inline-flex cursor-pointer flex-col items-center gap-1 rounded-lg p-1 hover:bg-gray-50"
    >
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${color}`}>
        {modulo.activo ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
        {modulo.activo ? 'Activas' : 'Apagadas'}
      </span>
      <span className="text-[11px] text-gray-500">
        {avisos} · <span className="font-medium text-blue-700">Configurar</span>
      </span>
    </button>
  );
}

export function AvisoCompuerta({ permisos }: { permisos: PermisosNotificaciones | null }) {
  if (!permisos?.gestionar || permisos.compuerta_encendida) return null;
  return (
    <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
      El interruptor general de notificaciones está apagado en el servidor (NOTIFICACIONES_COMPUERTA): todo sale como antes y la configuración de notificaciones no se aplica.
    </div>
  );
}

/** Ventana con la configuración de notificaciones de un módulo. */
export function ModalNotificacionesModulo({ modulo, onCerrar, onModulo, onRecargar }: {
  modulo: ModuloNotificaciones;
  onCerrar: () => void;
  onModulo: (cambios: Partial<ModuloNotificaciones>) => void;
  onRecargar: () => void;
}) {
  return (
    // z-[9999]: la barra superior y el menú del backoffice van por encima de z-50 y tapaban el encabezado del modal.
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in" role="dialog" aria-modal="true" aria-label={`Notificaciones de ${modulo.nombre}`}>
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-gradient-to-r from-[#003DA5] to-[#1e5da8] px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-200" />
            <h3 className="font-bold text-lg">Notificaciones de {modulo.nombre}</h3>
          </div>
          <button onClick={onCerrar} aria-label="Cerrar" className="text-white/70 hover:text-white p-1 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50">
          <PanelAvisosModulo modulo={modulo} onModulo={onModulo} onRecargar={onRecargar} />
        </div>
      </div>
    </div>
  );
}

/** Remitentes de notificaciones que no son un módulo del menú (sistema, otros, o que no cruzan por código). */
export function BloqueOtrosRemitentes({ remitentes, onConfigurar }: {
  remitentes: ModuloNotificaciones[];
  onConfigurar: (codigo: string) => void;
}) {
  const orden = useMemo(() => [...remitentes].sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, 'es')), [remitentes]);
  if (orden.length === 0) return null;
  return (
    <section className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden" aria-label="Otros remitentes de notificaciones">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/80">
        <h2 className="text-sm font-bold text-gray-900">Otros remitentes de notificaciones</h2>
        <p className="text-xs text-gray-500">Avisos que no pertenecen a un módulo del menú. Se configuran igual que los de un módulo.</p>
      </div>
      <ul className="divide-y divide-gray-100">
        {orden.map((m) => (
          <li key={m.codigo} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-blue-50/30 transition-colors">
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 leading-tight">{m.nombre}</p>
            </div>
            <EstadoNotificaciones modulo={m} nombre={m.nombre} onAbrir={() => onConfigurar(m.codigo)} />
          </li>
        ))}
      </ul>
    </section>
  );
}
