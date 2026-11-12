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
  /**
   * Devuelve el código del módulo para abrir su configuración. Si todavía no
   * está en la configuración, lo agrega en pantalla con los valores por defecto;
   * el primer cambio que se guarde lo crea en el servidor.
   */
  asegurar: (codigoAuth: string, nombre: string) => string;
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

  const asegurar = useCallback((codigoAuth: string, nombre: string) => {
    const existente = porCodigo(codigoAuth);
    if (existente) return existente.codigo;
    const codigo = codigoAuth.trim().toLowerCase();
    const nuevo: ModuloNotificaciones = {
      codigo, nombre, activo: true, canal_defecto: 'ambos', correo_desvio: null, orden: 500,
      actualizado_en: new Date().toISOString(), actualizado_por: null, eventos: 0, eventos_activos: 0, omitidas_7d: 0,
      sin_registrar: true,
    };
    setModulos((lista) => (lista ? [...lista, nuevo] : [nuevo]));
    return codigo;
  }, [porCodigo]);

  return { permisos, modulos, puede: permisos?.gestionar === true, recargar, mezclar, porCodigo, asegurar };
}

/**
 * Notificaciones del módulo en la tabla: un botón «Configurar» igual en todas
 * las filas (todo módulo se puede configurar, aunque aún no haya mandado avisos)
 * y debajo su estado. Un módulo que todavía no está en la configuración se ve
 * con los valores por defecto: activas y aún sin avisos.
 */
export function EstadoNotificaciones({ modulo, nombre, onAbrir }: { modulo: ModuloNotificaciones | undefined; nombre: string; onAbrir: () => void }) {
  const activo = modulo?.activo ?? true;
  const eventos = modulo?.eventos ?? 0;
  const avisos = eventos === 0 ? 'aún sin avisos' : `${eventos} ${eventos === 1 ? 'aviso' : 'avisos'}`;
  return (
    <div className="inline-flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={onAbrir}
        aria-label={`Configurar notificaciones de ${nombre}`}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-700 hover:bg-gray-50 rounded-lg text-xs font-semibold transition-all border border-gray-300 active:scale-95"
      >
        {activo ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
        <span>Configurar</span>
      </button>
      <span className={`text-[11px] font-medium ${activo ? 'text-emerald-700' : 'text-amber-700'}`}>
        {activo ? 'Activas' : 'Apagadas'} · <span className="font-normal text-gray-500">{avisos}</span>
      </span>
    </div>
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
