/**
 * Configuración de notificaciones de un módulo (EFDS-2406): interruptor del
 * módulo (aparte de su estado en el menú), canal por defecto, buzón de desvío
 * y la lista de avisos. Se usa dentro de Gestión de módulos, tanto para los
 * módulos del menú como para los "otros remitentes" que no están en el menú.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Bell, Mail, Search } from 'lucide-react';
import { toast } from 'sonner';
import {
  DOMINIO_DESVIO,
  MOTIVOS,
  notificacionesConfigService,
  validarCorreoDesvio,
  type CambiosEvento,
  type EventoNotificaciones,
  type ModuloNotificaciones,
} from '../../../services/api/notificacionesConfig.service';
import { rolesService } from '../../../services/api/roles.service';
import { dependenciasService } from '../../../services/api/dependencias.service';
import { estructuraService } from '../../../services/api/estructura.service';
import { SIN_TRANSICION_CSS } from '../centro-ayuda/estilosAnimacion';
import { FilaEvento } from './FilaEvento';
import { botonSecundario, campo, campoChico, Cargando, etiqueta, Interruptor, Vacio, type Catalogos, type Opcion } from './piezas';

interface Props {
  modulo: ModuloNotificaciones;
  /** El padre mezcla el cambio en su lista (contadores, interruptor, buzón). */
  onModulo: (cambios: Partial<ModuloNotificaciones>) => void;
  /** Se llama si el guardado falla, para que el padre vuelva a pedir la lista. */
  onRecargar: () => void;
}

export function PanelAvisosModulo({ modulo, onModulo, onRecargar }: Props) {
  const [eventos, setEventos] = useState<EventoNotificaciones[] | null>(null);
  const [catalogos, setCatalogos] = useState<Catalogos | null>(null);
  const [consulta, setConsulta] = useState('');
  const [desvio, setDesvio] = useState(modulo.correo_desvio ?? '');
  const [errorDesvio, setErrorDesvio] = useState<string | null>(null);
  const [guardandoDesvio, setGuardandoDesvio] = useState(false);
  const codigo = modulo.codigo;

  useEffect(() => { setDesvio(modulo.correo_desvio ?? ''); setErrorDesvio(null); }, [modulo.correo_desvio, codigo]);

  /** La lista de eventos manda sobre los contadores del módulo: así no quedan desfasados. */
  const recibirEventos = useCallback((lista: EventoNotificaciones[]) => {
    setEventos(lista);
    onModulo({ eventos: lista.length, eventos_activos: lista.filter((e) => e.activo).length });
  }, [onModulo]);

  useEffect(() => {
    setEventos(null);
    setConsulta('');
    let vigente = true;
    notificacionesConfigService.listarEventos(codigo)
      .then((lista) => { if (vigente) recibirEventos(lista); })
      .catch(() => { if (vigente) setEventos([]); });
    return () => { vigente = false; };
    // Solo al cambiar de módulo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigo]);

  const cargarCatalogos = useCallback(() => {
    Promise.all([
      rolesService.getRoles({ limit: 500 } as any).then((r) => r.roles ?? []).catch(() => []),
      dependenciasService.listar().catch(() => []),
      estructuraService.sedes.listar().then((r: any) => (Array.isArray(r?.data) ? r.data : Array.isArray(r) ? r : [])).catch(() => []),
    ]).then(([roles, dependencias, sedes]) => {
      const porNombre = (a: Opcion, b: Opcion) => a.nombre.localeCompare(b.nombre, 'es');
      setCatalogos({
        roles: roles.filter((r: any) => r.code).map((r: any) => ({ id: String(r.code).toUpperCase(), nombre: r.name, detalle: r.code })).sort(porNombre),
        dependencias: dependencias.map((d: any) => ({ id: String(d.idDependencia), nombre: d.nomDependencia, detalle: d.codDependencia })).sort(porNombre),
        sedes: sedes.map((s: any) => ({ id: String(s.idSede ?? s.id), nombre: s.nomSede ?? s.nombre, detalle: s.codSede ?? s.codigo })).sort(porNombre),
      });
    });
  }, []);

  const guardarModulo = async (cambios: Partial<ModuloNotificaciones>) => {
    onModulo(cambios);
    try {
      const guardado = await notificacionesConfigService.actualizarModulo(codigo, cambios);
      onModulo({ ...cambios, ...guardado });
      if ('activo' in cambios) {
        toast.success(cambios.activo ? `${modulo.nombre} vuelve a notificar` : `${modulo.nombre} dejó de notificar`, {
          description: cambios.activo ? undefined : 'Solo salen sus avisos obligatorios. Lo omitido queda en la bitácora.',
        });
      } else {
        toast.success('Guardado');
      }
    } catch {
      onRecargar();
    }
  };

  const guardarDesvio = async () => {
    const error = validarCorreoDesvio(desvio);
    setErrorDesvio(error);
    if (error) return;
    setGuardandoDesvio(true);
    try {
      const correo = desvio.trim().toLowerCase();
      const guardado = await notificacionesConfigService.actualizarModulo(codigo, { correo_desvio: correo || null });
      onModulo({ ...guardado, correo_desvio: correo || null });
      toast.success(correo ? 'Buzón de desvío guardado' : 'Buzón de desvío quitado');
    } catch {
      // apiClient ya muestra el mensaje del servidor
    } finally {
      setGuardandoDesvio(false);
    }
  };

  const guardarEvento = async (clave: string, cambios: CambiosEvento) => {
    try {
      const guardado = await notificacionesConfigService.actualizarEvento(codigo, clave, cambios);
      recibirEventos((eventos ?? []).map((e) => (e.clave === clave ? guardado : e)));
      toast.success('Guardado');
    } catch {
      // apiClient ya muestra el mensaje del servidor
    }
  };

  const probar = async (evento: EventoNotificaciones) => {
    try {
      const r = await notificacionesConfigService.probar(codigo, evento.clave);
      const correo = r.correo.estado === 'enviado' ? 'correo enviado'
        : r.correo.estado === 'omitido' ? `correo omitido (${MOTIVOS[r.correo.motivo ?? ''] ?? r.correo.motivo})`
          : r.correo.estado === 'error' ? `correo con error: ${r.correo.motivo}`
            : 'este evento no manda correo';
      if (r.plataforma.estado === 'enviado') {
        toast.success('Prueba enviada: mire la campana', { description: `Campana: recibida · ${correo}` });
      } else {
        toast.warning('La configuración omitió la prueba', { description: `Campana: ${MOTIVOS[r.plataforma.motivo ?? ''] ?? r.plataforma.motivo} · ${correo}` });
      }
      notificacionesConfigService.listarEventos(codigo).then(recibirEventos).catch(() => undefined);
    } catch {
      // apiClient ya muestra el mensaje del servidor
    }
  };

  const buscando = consulta.trim().length > 0;
  const visibles = useMemo(() => {
    const q = consulta.trim().toLowerCase();
    return q ? (eventos ?? []).filter((e) => `${e.nombre} ${e.clave} ${e.descripcion ?? ''}`.toLowerCase().includes(q)) : eventos ?? [];
  }, [eventos, consulta]);

  const desvioCambiado = desvio.trim().toLowerCase() !== (modulo.correo_desvio ?? '');

  return (
    <div>
      <motion.div key={codigo} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }} className="mb-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm" style={SIN_TRANSICION_CSS}>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">{modulo.activo ? 'Notificaciones activas' : 'Notificaciones apagadas'}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {modulo.activo ? 'Cada aviso sale si su interruptor está encendido.' : 'No sale ningún aviso, salvo los obligatorios.'}
            </p>
          </div>
          <Interruptor activo={modulo.activo} etiqueta={`${modulo.activo ? 'Desactivar' : 'Activar'} las notificaciones de ${modulo.nombre}`} onCambio={(v) => guardarModulo({ activo: v })} />
        </div>

        <div className="mt-4 border-t border-slate-100 pt-4">
          <label className={etiqueta} htmlFor={`desvio-${codigo}`}>Buzón para lo apagado (opcional)</label>
          <div className="flex flex-wrap items-start gap-2">
            <div className="relative min-w-0 flex-1 basis-64">
              <Mail className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                id={`desvio-${codigo}`}
                type="email"
                value={desvio}
                onChange={(e) => { setDesvio(e.target.value); setErrorDesvio(null); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); guardarDesvio(); } }}
                placeholder={`buzon@${DOMINIO_DESVIO}`}
                aria-invalid={errorDesvio ? true : undefined}
                aria-describedby={`desvio-ayuda-${codigo}`}
                className={`${campo} pl-9`}
              />
            </div>
            <button type="button" className={botonSecundario} style={{ minHeight: '2.375rem' }} disabled={guardandoDesvio || !desvioCambiado} onClick={guardarDesvio}>
              {guardandoDesvio ? 'Guardando…' : 'Guardar buzón'}
            </button>
          </div>
          {errorDesvio && <p role="alert" className="mt-1 text-xs text-red-600">{errorDesvio}</p>}
          <p id={`desvio-ayuda-${codigo}`} className="mt-1 text-xs text-slate-500">
            Lo que no sale por estar apagado llega aquí. Vacío: no llega a ningún lado.
          </p>
        </div>
      </motion.div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Avisos · {eventos?.length ?? '…'}</p>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
          <input value={consulta} onChange={(e) => setConsulta(e.target.value)} placeholder="Buscar aviso…" aria-label="Buscar aviso" className={`${campoChico} w-full pl-8`} />
        </div>
      </div>

      {eventos === null ? <Cargando /> : visibles.length === 0 ? (
        <Vacio
          icono={<Bell className="h-6 w-6 text-slate-400" />}
          titulo={buscando ? 'Ningún aviso coincide' : 'Aún no hay avisos de este módulo'}
          detalle={buscando
            ? 'Pruebe con otra palabra.'
            : 'Cada aviso aparece aquí solo, la primera vez que el módulo lo envía. Mientras tanto ya puede apagar las notificaciones del módulo o configurar el buzón de arriba.'}
        />
      ) : (
        <ul className="space-y-2">
          {visibles.map((e) => (
            <FilaEvento key={`${e.codigo_modulo}:${e.clave}`} evento={e} modulo={modulo} catalogos={catalogos} cargarCatalogos={cargarCatalogos} onGuardar={guardarEvento} onProbar={probar} />
          ))}
        </ul>
      )}
    </div>
  );
}
