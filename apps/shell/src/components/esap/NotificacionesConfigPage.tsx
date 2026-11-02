/**
 * Configuración General > Notificaciones (EFDS-2406).
 *
 * Un interruptor por módulo y, dentro de cada uno, sus eventos: activo, canal,
 * prioridad, obligatorio, destinatarios adicionales y envío de prueba. Los
 * eventos aparecen solos: cada tipo de aviso se registra la primera vez que un
 * módulo lo manda. Entra quien tenga el permiso "Configuración de
 * Notificaciones" en Roles y Permisos; el backend lo exige también.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  Ban,
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  History,
  Lock,
  Mail,
  MonitorSmartphone,
  Search,
  Send,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  CANALES,
  MOTIVOS,
  PRIORIDADES,
  notificacionesConfigService,
  type CambioConfiguracion,
  type CambiosEvento,
  type Canal,
  type EnvioOmitido,
  type EventoNotificaciones,
  type ModuloNotificaciones,
  type PermisosNotificaciones,
  type Prioridad,
} from '../../services/api/notificacionesConfig.service';
import { rolesService } from '../../services/api/roles.service';
import { dependenciasService } from '../../services/api/dependencias.service';
import { estructuraService } from '../../services/api/estructura.service';
import { SIN_TRANSICION_CSS } from './centro-ayuda/estilosAnimacion';

type Vista = { tipo: 'modulo'; codigo: string } | { tipo: 'historial' } | { tipo: 'omitidas' };

interface Opcion {
  id: string;
  nombre: string;
  detalle?: string;
}

interface Catalogos {
  roles: Opcion[];
  dependencias: Opcion[];
  sedes: Opcion[];
}

const SIN_PERMISOS: PermisosNotificaciones = { gestionar: false, compuerta_encendida: true };

const campo =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors focus:border-[#1e5da8] focus:outline-none disabled:bg-slate-50 disabled:text-slate-400';
const campoChico = campo.replace('px-3 py-2', 'px-2 py-1.5 text-xs');
const etiqueta = 'mb-1 block text-xs font-medium text-slate-700';
const botonPrimario =
  'inline-flex items-center gap-2 rounded-lg bg-[#1e5da8] px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#174a87] hover:shadow active:scale-[0.98] disabled:opacity-60';
const botonSecundario =
  'inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60';

const fecha = (iso: string | null | undefined): string =>
  iso ? new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) : '—';

const nombreCanal = (canal: Canal): string => CANALES.find((c) => c.id === canal)?.nombre ?? canal;

const nombreCampo: Record<string, string> = {
  activo: 'Activo',
  canal: 'Canal',
  canal_defecto: 'Canal por defecto',
  obligatorio: 'Obligatorio',
  prioridad: 'Prioridad',
  nombre: 'Nombre',
  descripcion: 'Descripción',
  roles_adicionales: 'Roles adicionales',
  dependencias_adicionales: 'Dependencias adicionales',
  sedes_adicionales: 'Sedes adicionales',
};

function valorLegible(campo: string, valor: unknown): string {
  if (valor === null || valor === undefined) return campo === 'canal' ? 'Hereda del módulo' : campo === 'prioridad' ? 'La del código' : '—';
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
  if (Array.isArray(valor)) return valor.length ? valor.join(', ') : 'Ninguno';
  if (campo === 'canal' || campo === 'canal_defecto') return nombreCanal(valor as Canal);
  return String(valor);
}

/** Interruptor accesible; el color dice el estado sin leer el texto. */
function Interruptor({ activo, onCambio, deshabilitado, etiqueta: aria }: { activo: boolean; onCambio: (v: boolean) => void; deshabilitado?: boolean; etiqueta: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      aria-label={aria}
      disabled={deshabilitado}
      onClick={() => onCambio(!activo)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#1e5da8]/40 disabled:cursor-not-allowed disabled:opacity-50 ${activo ? 'bg-emerald-500' : 'bg-slate-300'}`}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${activo ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );
}

/** Lista con buscador y casillas; muestra lo elegido como fichas. */
function SelectorMultiple({ titulo, opciones, elegidos, onCambio, cargando }: { titulo: string; opciones: Opcion[]; elegidos: string[]; onCambio: (ids: string[]) => void; cargando: boolean }) {
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
            <input value={consulta} onChange={(e) => setConsulta(e.target.value)} placeholder="Buscar…" className={`${campoChico} pl-7`} />
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

function FilaEvento({ evento, modulo, catalogos, cargarCatalogos, onGuardar, onProbar }: {
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

        <div className="min-w-0 flex-1 basis-56">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className={`truncate text-sm font-medium ${evento.activo && !apagadoPorModulo ? 'text-slate-900' : 'text-slate-500'}`}>{evento.nombre}</p>
            {evento.obligatorio && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-100"><Lock className="h-3 w-3" />Obligatorio</span>
            )}
            {evento.verificado_en && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-100" title={`Verificado el ${fecha(evento.verificado_en)} por ${evento.verificado_por ?? '—'}`}><CheckCircle2 className="h-3 w-3" />Verificado</span>
            )}
            {adicionales > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600" title="Destinatarios adicionales"><Users className="h-3 w-3" />+{adicionales}</span>
            )}
          </div>
          <p className="truncate font-mono text-[11px] text-slate-400">{evento.clave}</p>
        </div>

        <div className="flex items-center gap-1 text-slate-400" title={evento.envia_correo ? 'Este evento manda campana y correo' : 'Este evento solo manda campana'}>
          <MonitorSmartphone className={`h-4 w-4 ${canalEfectivo !== 'correo' ? 'text-[#1e5da8]' : 'text-slate-300'}`} />
          <Mail className={`h-4 w-4 ${evento.envia_correo && canalEfectivo !== 'plataforma' ? 'text-[#1e5da8]' : 'text-slate-300'}`} />
        </div>

        <select
          aria-label="Canal del evento"
          value={evento.canal ?? ''}
          onChange={(e) => onGuardar(evento.clave, { canal: (e.target.value || null) as Canal | null })}
          className={`${campoChico} w-44`}
        >
          <option value="">Hereda: {nombreCanal(modulo.canal_defecto)}</option>
          {CANALES.map((c) => (
            <option key={c.id} value={c.id} disabled={c.id === 'correo' && !evento.envia_correo}>{c.nombre}</option>
          ))}
        </select>

        <select
          aria-label="Prioridad del evento"
          value={evento.prioridad ?? ''}
          onChange={(e) => onGuardar(evento.clave, { prioridad: (e.target.value || null) as Prioridad | null })}
          className={`${campoChico} w-36`}
        >
          <option value="">Del código{evento.prioridad_codigo ? `: ${evento.prioridad_codigo}` : ''}</option>
          {PRIORIDADES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>

        <label className="flex items-center gap-1.5 text-xs text-slate-600" title="Nadie puede apagarlo: ni el administrador ni el usuario">
          <input type="checkbox" checked={evento.obligatorio} onChange={(e) => onGuardar(evento.clave, { obligatorio: e.target.checked })} className="h-3.5 w-3.5 accent-[#1e5da8]" />
          Obligatorio
        </label>

        <Interruptor
          activo={evento.activo}
          deshabilitado={evento.obligatorio}
          etiqueta={`${evento.activo ? 'Desactivar' : 'Activar'} ${evento.nombre}`}
          onCambio={(v) => onGuardar(evento.clave, { activo: v })}
        />
      </div>

      {abierta && (
        <div className="grid gap-4 border-t border-slate-100 px-4 py-4 md:grid-cols-2">
          <div className="space-y-3">
            <div>
              <label className={etiqueta} htmlFor={`desc-${evento.clave}`}>Descripción (qué lo dispara y a quién le llega)</label>
              <textarea
                id={`desc-${evento.clave}`}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                onBlur={() => { if ((evento.descripcion ?? '') !== descripcion) onGuardar(evento.clave, { descripcion: descripcion || null }); }}
                rows={3}
                className={campo}
                placeholder="Ejemplo: cuando se aprueba el PTA, al docente que lo creó."
              />
            </div>
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
            <p className="text-xs text-slate-500">Se suman a quienes el módulo ya avisa; no los reemplazan.</p>
            <SelectorMultiple titulo="Roles" opciones={catalogos?.roles ?? []} elegidos={evento.roles_adicionales} cargando={!catalogos} onCambio={(ids) => onGuardar(evento.clave, { roles_adicionales: ids })} />
            <SelectorMultiple titulo="Dependencias" opciones={catalogos?.dependencias ?? []} elegidos={evento.dependencias_adicionales.map(String)} cargando={!catalogos} onCambio={(ids) => onGuardar(evento.clave, { dependencias_adicionales: ids.map(Number) })} />
            <SelectorMultiple titulo="Sedes (territorial)" opciones={catalogos?.sedes ?? []} elegidos={evento.sedes_adicionales.map(String)} cargando={!catalogos} onCambio={(ids) => onGuardar(evento.clave, { sedes_adicionales: ids.map(Number) })} />
          </div>
        </div>
      )}
    </li>
  );
}

function PanelHistorial({ cambios }: { cambios: CambioConfiguracion[] | null }) {
  if (cambios === null) return <Cargando />;
  if (cambios.length === 0) return <Vacio icono={<History className="h-6 w-6 text-slate-400" />} titulo="Sin cambios todavía" detalle="Cada cambio guardado desde esta consola queda aquí y en Auditoría." />;
  return (
    <ul className="space-y-2">
      {cambios.map((c) => (
        <li key={c.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-medium text-slate-900">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase text-slate-600">{c.entidad}</span>{' '}
              <span className="font-mono text-xs">{c.clave}</span>
            </p>
            <p className="text-xs text-slate-500">{fecha(c.fecha)} · {c.usuario ?? '—'}</p>
          </div>
          <ul className="mt-2 space-y-0.5 text-xs">
            {Object.keys(c.nuevo ?? {}).map((k) => (
              <li key={k} className="text-slate-700">
                <span className="text-slate-500">{nombreCampo[k] ?? k}:</span>{' '}
                <span className="line-through text-slate-400">{valorLegible(k, c.anterior?.[k])}</span>{' → '}
                <span className="font-medium">{valorLegible(k, c.nuevo?.[k])}</span>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

function PanelOmitidas({ omitidas }: { omitidas: EnvioOmitido[] | null }) {
  if (omitidas === null) return <Cargando />;
  if (omitidas.length === 0) return <Vacio icono={<Ban className="h-6 w-6 text-slate-400" />} titulo="Nada omitido" detalle="Aquí queda cada aviso que un módulo intentó mandar y la configuración no dejó pasar." />;
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
          <tr><th className="px-3 py-2">Fecha</th><th className="px-3 py-2">Módulo</th><th className="px-3 py-2">Evento</th><th className="px-3 py-2">Canal</th><th className="px-3 py-2">Destinatario</th><th className="px-3 py-2">Motivo</th></tr>
        </thead>
        <tbody>
          {omitidas.map((o) => (
            <tr key={o.id} className="border-t border-slate-100 text-slate-700">
              <td className="whitespace-nowrap px-3 py-2">{fecha(o.fecha)}</td>
              <td className="px-3 py-2">{o.codigo_modulo}</td>
              <td className="px-3 py-2"><span className="font-mono">{o.clave_evento}</span>{o.titulo && <span className="block text-slate-500">{o.titulo}</span>}</td>
              <td className="px-3 py-2">{o.canal}</td>
              <td className="max-w-[14rem] truncate px-3 py-2" title={o.destinatario ?? ''}>{o.destinatario ?? '—'}</td>
              <td className="px-3 py-2">{MOTIVOS[o.motivo] ?? o.motivo}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const Cargando = () => (
  <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl border border-slate-200 bg-white" />)}</div>
);

const Vacio = ({ icono, titulo, detalle }: { icono: React.ReactNode; titulo: string; detalle: string }) => (
  <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-white px-6 py-12 text-center">
    <span className="flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-slate-50">{icono}</span>
    <div><p className="text-sm font-medium text-slate-800">{titulo}</p><p className="mt-1 text-xs text-slate-500">{detalle}</p></div>
  </div>
);

export default function NotificacionesConfigPage() {
  const [permisos, setPermisos] = useState<PermisosNotificaciones | null>(null);
  const [modulos, setModulos] = useState<ModuloNotificaciones[] | null>(null);
  const [vista, setVista] = useState<Vista | null>(null);
  const [eventos, setEventos] = useState<EventoNotificaciones[] | null>(null);
  const [historial, setHistorial] = useState<CambioConfiguracion[] | null>(null);
  const [omitidas, setOmitidas] = useState<EnvioOmitido[] | null>(null);
  const [catalogos, setCatalogos] = useState<Catalogos | null>(null);
  const [consulta, setConsulta] = useState('');
  const [errorCarga, setErrorCarga] = useState(false);

  const cargarModulos = useCallback(async () => {
    setErrorCarga(false);
    try {
      const lista = await notificacionesConfigService.listarModulos();
      setModulos(lista);
      setVista((actual) => actual ?? (lista[0] ? { tipo: 'modulo', codigo: lista[0].codigo } : null));
    } catch {
      setErrorCarga(true);
    }
  }, []);

  useEffect(() => {
    notificacionesConfigService.misPermisos().then(setPermisos).catch(() => setPermisos(SIN_PERMISOS));
    cargarModulos();
  }, [cargarModulos]);

  const codigoActual = vista?.tipo === 'modulo' ? vista.codigo : null;
  useEffect(() => {
    if (!codigoActual) return;
    setEventos(null);
    notificacionesConfigService.listarEventos(codigoActual).then(setEventos).catch(() => setEventos([]));
  }, [codigoActual]);

  useEffect(() => {
    if (vista?.tipo === 'historial') { setHistorial(null); notificacionesConfigService.historial().then(setHistorial).catch(() => setHistorial([])); }
    if (vista?.tipo === 'omitidas') { setOmitidas(null); notificacionesConfigService.omitidas().then(setOmitidas).catch(() => setOmitidas([])); }
  }, [vista]);

  const cargarCatalogos = useCallback(() => {
    Promise.all([
      rolesService.getRoles({ limit: 500 } as any).then((r) => r.roles ?? []).catch(() => []),
      dependenciasService.listar().catch(() => []),
      estructuraService.sedes.listar().then((r: any) => (Array.isArray(r?.data) ? r.data : Array.isArray(r) ? r : [])).catch(() => []),
    ]).then(([roles, dependencias, sedes]) => {
      setCatalogos({
        roles: roles.filter((r: any) => r.code).map((r: any) => ({ id: String(r.code).toUpperCase(), nombre: r.name, detalle: r.code })),
        dependencias: dependencias.map((d: any) => ({ id: String(d.idDependencia), nombre: d.nomDependencia, detalle: d.codDependencia })),
        sedes: sedes.map((s: any) => ({ id: String(s.idSede ?? s.id), nombre: s.nomSede ?? s.nombre, detalle: s.codSede ?? s.codigo })),
      });
    });
  }, []);

  const moduloActual = modulos?.find((m) => m.codigo === codigoActual) ?? null;
  const p = permisos ?? SIN_PERMISOS;

  const guardarModulo = async (modulo: ModuloNotificaciones, cambios: Partial<ModuloNotificaciones>) => {
    setModulos((lista) => lista?.map((m) => (m.codigo === modulo.codigo ? { ...m, ...cambios } : m)) ?? null);
    try {
      const guardado = await notificacionesConfigService.actualizarModulo(modulo.codigo, cambios);
      setModulos((lista) => lista?.map((m) => (m.codigo === modulo.codigo ? { ...m, ...guardado } : m)) ?? null);
      if ('activo' in cambios) {
        toast.success(cambios.activo ? `${modulo.nombre} vuelve a notificar` : `${modulo.nombre} dejó de notificar`, {
          description: cambios.activo ? undefined : 'Solo salen sus eventos obligatorios. Lo omitido queda en la bitácora.',
        });
      } else {
        toast.success('Guardado');
      }
    } catch {
      cargarModulos();
    }
  };

  const guardarEvento = async (clave: string, cambios: CambiosEvento) => {
    try {
      const guardado = await notificacionesConfigService.actualizarEvento(clave, cambios);
      setEventos((lista) => lista?.map((e) => (e.clave === clave ? guardado : e)) ?? null);
      setModulos((lista) => lista?.map((m) => (m.codigo === guardado.codigo_modulo
        ? { ...m, eventos_activos: (eventos ?? []).filter((e) => (e.clave === clave ? guardado.activo : e.activo)).length }
        : m)) ?? null);
      toast.success('Guardado');
    } catch {
      // apiClient ya muestra el mensaje del servidor
    }
  };

  const probar = async (evento: EventoNotificaciones) => {
    try {
      const r = await notificacionesConfigService.probar(evento.clave);
      const correo = r.correo.estado === 'enviado' ? 'correo enviado'
        : r.correo.estado === 'omitido' ? `correo omitido (${MOTIVOS[r.correo.motivo ?? ''] ?? r.correo.motivo})`
          : r.correo.estado === 'error' ? `correo con error: ${r.correo.motivo}`
            : 'este evento no manda correo';
      if (r.plataforma.estado === 'enviado') {
        toast.success('Prueba enviada: mire la campana', { description: `Campana: recibida · ${correo}` });
      } else {
        toast.warning('La configuración omitió la prueba', { description: `Campana: ${MOTIVOS[r.plataforma.motivo ?? ''] ?? r.plataforma.motivo} · ${correo}` });
      }
      if (codigoActual) notificacionesConfigService.listarEventos(codigoActual).then(setEventos).catch(() => undefined);
    } catch {
      // apiClient ya muestra el mensaje del servidor
    }
  };

  const buscando = consulta.trim().length > 0;
  const visibles = useMemo(() => {
    const q = consulta.trim().toLowerCase();
    return q ? (eventos ?? []).filter((e) => `${e.nombre} ${e.clave} ${e.descripcion ?? ''}`.toLowerCase().includes(q)) : eventos ?? [];
  }, [eventos, consulta]);

  if (permisos && !permisos.gestionar) {
    return (
      <div className="flex h-full items-center justify-center p-8" style={{ backgroundColor: '#F8FAFC' }}>
        <div className="max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <Lock className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-3 text-sm font-medium text-slate-900">No tiene permiso para configurar las notificaciones</p>
          <p className="mt-1 text-xs text-slate-500">Pida el permiso «Configuración de Notificaciones» en Roles y Permisos.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col" style={{ minHeight: '100%', backgroundColor: '#F8FAFC' }}>
      <header className="border-b px-6 py-5 shadow-sm" style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3.5">
            <div className="flex-shrink-0 rounded-xl p-2.5 text-white shadow-sm" style={{ backgroundColor: '#003DA5' }}>
              <Bell className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold tracking-tight sm:text-xl" style={{ color: '#0F172A' }}>Notificaciones</h1>
              <p className="mt-0.5 text-xs font-medium" style={{ color: '#64748B' }}>Qué avisa cada módulo, por qué canal y a quién. Los eventos aparecen solos con el primer aviso.</p>
            </div>
          </div>
        </div>
        {permisos && !permisos.compuerta_encendida && (
          <div className="mx-auto mt-3 flex max-w-6xl items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            El interruptor general está apagado en el servidor (NOTIFICACIONES_COMPUERTA): todo sale como antes y esta configuración no se aplica.
          </div>
        )}
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-6xl">
          {modulos === null ? (
            errorCarga ? (
              <div className="rounded-xl border bg-white p-8 text-center text-sm text-slate-700">
                No se pudo cargar la configuración.{' '}
                <button onClick={cargarModulos} className="font-medium text-[#1e5da8] underline">Reintentar</button>
              </div>
            ) : <Cargando />
          ) : (
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
              <aside className="w-full flex-shrink-0 lg:w-72">
                <nav className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm" aria-label="Módulos">
                  <p className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Módulos · {modulos.length}</p>
                  <ul className="space-y-0.5">
                    {modulos.map((m) => {
                      const activa = codigoActual === m.codigo;
                      return (
                        <li key={m.codigo}>
                          <button
                            type="button"
                            onClick={() => { setVista({ tipo: 'modulo', codigo: m.codigo }); setConsulta(''); }}
                            aria-current={activa ? 'true' : undefined}
                            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${activa ? 'bg-blue-50 text-[#1e5da8]' : 'text-slate-600 hover:bg-slate-50'}`}
                          >
                            <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${m.activo ? 'bg-emerald-500' : 'bg-slate-300'}`} aria-label={m.activo ? 'Activo' : 'Inactivo'} />
                            <span className="min-w-0 flex-1">
                              <span className={`block truncate font-medium ${m.activo ? '' : 'text-slate-400'}`}>{m.nombre}</span>
                              <span className="block text-[11px] text-slate-400">{m.eventos_activos}/{m.eventos} eventos{m.omitidas_7d > 0 ? ` · ${m.omitidas_7d} omitidas` : ''}</span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="mt-2 space-y-0.5 border-t border-slate-100 pt-2">
                    {([['historial', 'Historial de cambios', <History key="h" className="h-4 w-4" />], ['omitidas', 'Avisos omitidos', <Ban key="b" className="h-4 w-4" />]] as const).map(([tipo, nombre, icono]) => (
                      <button
                        key={tipo}
                        type="button"
                        onClick={() => setVista({ tipo })}
                        aria-current={vista?.tipo === tipo ? 'true' : undefined}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${vista?.tipo === tipo ? 'bg-blue-50 text-[#1e5da8]' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        <span className="flex h-6 w-6 items-center justify-center">{icono}</span>
                        <span className="flex-1">{nombre}</span>
                      </button>
                    ))}
                  </div>
                </nav>
              </aside>

              <section className="min-w-0 flex-1">
                {vista?.tipo === 'historial' && <PanelHistorial cambios={historial} />}
                {vista?.tipo === 'omitidas' && <PanelOmitidas omitidas={omitidas} />}
                {vista?.tipo === 'modulo' && moduloActual && (
                  <>
                    <motion.div key={moduloActual.codigo} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }} className="mb-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm" style={SIN_TRANSICION_CSS}>
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-base font-semibold text-slate-900">{moduloActual.nombre}</h2>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${moduloActual.activo ? 'border border-emerald-100 bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                              {moduloActual.activo ? 'Notifica' : 'No notifica'}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            {moduloActual.activo
                              ? 'Sus eventos activos salen por el canal de cada uno.'
                              : 'Ningún evento sale, salvo los obligatorios. Lo que se intente mandar queda en «Avisos omitidos».'}
                            {moduloActual.actualizado_por && ` Último cambio: ${fecha(moduloActual.actualizado_en)} · ${moduloActual.actualizado_por}.`}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                          <div>
                            <label className={etiqueta} htmlFor="canal-defecto">Canal por defecto</label>
                            <select id="canal-defecto" value={moduloActual.canal_defecto} onChange={(e) => guardarModulo(moduloActual, { canal_defecto: e.target.value as Canal })} className={`${campoChico} w-44`}>
                              {CANALES.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                            </select>
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs font-medium text-slate-700">{moduloActual.activo ? 'Activo' : 'Inactivo'}</span>
                            <Interruptor activo={moduloActual.activo} etiqueta={`${moduloActual.activo ? 'Desactivar' : 'Activar'} las notificaciones de ${moduloActual.nombre}`} onCambio={(v) => guardarModulo(moduloActual, { activo: v })} />
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Eventos · {eventos?.length ?? '…'}</p>
                      <div className="relative w-full sm:w-72">
                        <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                        <input value={consulta} onChange={(e) => setConsulta(e.target.value)} placeholder="Buscar evento…" aria-label="Buscar evento" className={`${campoChico} pl-8`} />
                      </div>
                    </div>

                    {eventos === null ? <Cargando /> : visibles.length === 0 ? (
                      <Vacio
                        icono={<Bell className="h-6 w-6 text-slate-400" />}
                        titulo={buscando ? 'Ningún evento coincide' : 'Este módulo todavía no ha mandado avisos'}
                        detalle={buscando ? 'Pruebe con otra palabra o con la clave del evento.' : 'Cuando mande el primero, aparece aquí y se puede configurar.'}
                      />
                    ) : (
                      <ul className="space-y-2">
                        {visibles.map((e) => (
                          <FilaEvento key={e.clave} evento={e} modulo={moduloActual} catalogos={catalogos} cargarCatalogos={cargarCatalogos} onGuardar={guardarEvento} onProbar={probar} />
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
