import { useEffect, useState, type FormEvent } from 'react';
import { CalendarDays, Loader2, Gauge, Search } from 'lucide-react';
import { useRevisionProgramacion, invalidarProgramacion } from '../services/actualizacionProgramacion';
import {
  getPeriodos, crearPeriodoPlataforma, getImpactoActivacion, activarPeriodoPlataforma,
  type PeriodoPlataforma, type RespuestaPeriodos,
} from '../services/api/periodosApi';
import { CargaAsignaturasPeriodo } from './CargaAsignaturasPeriodo';

import {
  getConsumoPorOferta,
  getEstadoPublicacion, publicarProgramacion, retirarProgramacion, cerrarProgramacion,
  getPendientesCierre, marcarExcepcion,
  type AcumuladoDocente, type EstadoPublicacion, type PendienteCierre,
} from '../services/api/catalogoApi';

/** Periodos compartidos de la plataforma; las ofertas pasan a ser del grupo. */

interface GestionOfertasProps {
  puedeAbrirProgramasAcademicos?: boolean;
  abrirProgramasAcademicos?: () => void;
}

export function GestionOfertas({ puedeAbrirProgramasAcademicos = false, abrirProgramasAcademicos }: GestionOfertasProps) {
  const [periodos, setPeriodos] = useState<RespuestaPeriodos | null>(null);
  const [importarId, setImportarId] = useState<string | null>(null);
  const revisionPeriodos = useRevisionProgramacion('periodos');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [documento, setDocumento] = useState('');
  const [consumo, setConsumo] = useState<AcumuladoDocente | null>(null);
  const [buscando, setBuscando] = useState(false);

  // NUEVA-5a — Crear y activar. Requieren el permiso de administración; si
  // falta, el backend responde 403 y el mensaje se muestra tal cual, sin
  // traducirlo a un genérico.
  const [nuevo, setNuevo] = useState({ anio: new Date().getFullYear(), semestre: 1 as 1 | 2, fechaInicio: '', fechaFin: '' });
  const [guardando, setGuardando] = useState(false);
  const [avisoAdmin, setAvisoAdmin] = useState('');

  // NUEVA-1 (EFDS-1937) — Publicación de la programación por periodo. El estado
  // por periodo se consulta y se refresca tras publicar/retirar.
  const [pubs, setPubs] = useState<Record<string, EstadoPublicacion>>({});
  const [pubOcupado, setPubOcupado] = useState<string | null>(null);
  const [avisoPub, setAvisoPub] = useState('');
  // EFDS-1941 — lista de franjas que impiden cerrar, para marcarlas como excepción.
  const [verPend, setVerPend] = useState<string | null>(null);
  const [pendCierre, setPendCierre] = useState<Record<string, PendienteCierre[]>>({});

  const cargarPubs = (lista: PeriodoPlataforma[]) =>
    Promise.all(lista.map((o) =>
      getEstadoPublicacion(o.idPeriodo).then((e) => [o.idPeriodo, e] as const).catch(() => null),
    )).then((pares) => {
      const map: Record<string, EstadoPublicacion> = {};
      for (const p of pares) if (p) map[p[0]] = p[1];
      setPubs(map);
    });

  const recargar = async () => {
    const datos = await getPeriodos();
    setPeriodos(datos);
    await cargarPubs(datos.periodos);
    return datos;
  };

  const publicar = async (id: string) => {
    setAvisoPub('');
    setPubOcupado(id);
    try {
      const e = await publicarProgramacion(id);
      setPubs((prev) => ({ ...prev, [id]: e }));
    } catch (err: any) {
      setAvisoPub(err?.message || 'No se pudo publicar la programación.');
    } finally {
      setPubOcupado(null);
    }
  };

  const retirar = async (id: string) => {
    setAvisoPub('');
    setPubOcupado(id);
    try {
      const e = await retirarProgramacion(id);
      setPubs((prev) => ({ ...prev, [id]: e }));
    } catch (err: any) {
      setAvisoPub(err?.message || 'No se pudo retirar la publicación.');
    } finally {
      setPubOcupado(null);
    }
  };

  const abrirExcepciones = async (id: string) => {
    if (verPend === id) { setVerPend(null); return; }
    setAvisoPub('');
    try {
      const lista = await getPendientesCierre(id);
      setPendCierre((prev) => ({ ...prev, [id]: lista }));
      setVerPend(id);
    } catch (err: any) {
      setAvisoPub(err?.message || 'No se pudieron cargar las franjas pendientes.');
    }
  };

  const excepcion = async (id: string, idFranja: string) => {
    if (!window.confirm('¿Marcar esta franja como excepción? No pasará por aprobación y no impedirá cerrar el periodo.')) return;
    setAvisoPub('');
    try {
      const e = await marcarExcepcion(id, idFranja);
      setPubs((prev) => ({ ...prev, [id]: e }));
      const lista = await getPendientesCierre(id);
      setPendCierre((prev) => ({ ...prev, [id]: lista }));
      if (lista.length === 0) setVerPend(null);
    } catch (err: any) {
      setAvisoPub(err?.message || 'No se pudo marcar la excepción.');
    }
  };

  // NUEVA-5b (EFDS-1941) — Cerrar solo la programación. Al cerrarse queda
  // inmutable, así que se recarga para que la tarjeta muestre el estado.
  const cerrar = async (periodo: PeriodoPlataforma) => {
    if (!window.confirm(`Cerrar la programación del periodo ${periodo.codigo} impedirá crear grupos y no se puede deshacer. ¿Desea continuar?`)) return;
    const id = periodo.idPeriodo;
    setAvisoPub('');
    setPubOcupado(id);
    let cerrado = false;
    try {
      await cerrarProgramacion(id);
      cerrado = true;
      invalidarProgramacion('periodos', 'programacion', 'publicaciones');
      await recargar();
    } catch (err: any) {
      setAvisoPub(cerrado
        ? 'La programación se cerró, pero no se pudo actualizar la lista. Vuelva a consultarla.'
        : err?.message || 'No se pudo cerrar la programación.');
    } finally {
      setPubOcupado(null);
    }
  };

  const crear = async (e: FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setAvisoAdmin('');
    let creado = false;
    try {
      await crearPeriodoPlataforma(nuevo);
      creado = true;
      const actualizados = await recargar();
      const periodoCreado = actualizados.periodos.find((p) => p.anio === nuevo.anio && p.semestre === nuevo.semestre);
      setImportarId(periodoCreado?.idPeriodo ?? null);
      setNuevo({ ...nuevo, fechaInicio: '', fechaFin: '' });
    } catch (err: any) {
      setAvisoAdmin(creado
        ? 'El periodo se creó, pero no se pudo actualizar la lista. Vuelva a consultarla antes de reintentar.'
        : err?.message || 'No se pudo crear el periodo.');
    } finally {
      setGuardando(false);
    }
  };

  const activar = async (id: string) => {
    setAvisoAdmin('');
    let activado = false;
    try {
      const impacto = await getImpactoActivacion(id);
      const detalle = impacto.porPeriodo.map((p) => `${p.codigo}: ${p.ptas}`).join(', ');
      const terminados = impacto.ptasATerminar === null ? 'un número de PTA aún no disponible' : `${impacto.ptasATerminar} PTA`;
      const cierre = impacto.periodosACerrar.length ? ` Cerrará ${impacto.periodosACerrar.join(', ')}.` : '';
      const planeacion = impacto.periodosAPlaneacion.length ? ` Pasarán a planeación: ${impacto.periodosAPlaneacion.join(', ')}.` : '';
      const aviso = impacto.advertencia ? `\n${impacto.advertencia}` : '';
      if (!window.confirm(`Activar ${impacto.codigo} terminará ${terminados}${detalle ? ` (${detalle})` : ''}.${cierre}${planeacion}${aviso}\n¿Continuar?`)) return;
      await activarPeriodoPlataforma(id);
      activado = true;
      await recargar();
    } catch (err: any) {
      setAvisoAdmin(activado
        ? 'El periodo se activó, pero no se pudo actualizar la lista. Vuelva a consultarla.'
        : err?.message || 'No se pudo activar el periodo.');
    }
  };

  useEffect(() => {
    let vigente = true;
    getPeriodos()
      .then(async (data) => {
        if (!vigente) return;
        setPeriodos(data);
        await cargarPubs(data.periodos);
      })
      .catch((e) => { if (vigente) setError(e?.message || 'No se pudieron cargar los periodos.'); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [revisionPeriodos]);

  const consultar = async () => {
    if (!documento.trim()) return;
    setBuscando(true);
    try {
      setConsumo(await getConsumoPorOferta(documento.trim()));
    } catch {
      setConsumo(null);
    } finally {
      setBuscando(false);
    }
  };

  const pct = consumo && consumo.tope > 0 ? Math.min(100, Math.round((consumo.totalAsignado / consumo.tope) * 100)) : 0;

  return (
    <div className="space-y-4">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <h3 className="font-bold text-slate-800 text-sm mb-1 flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-[#003DA5]" /> Periodos
        </h3>
        <p className="text-xs text-slate-500">
          El periodo es el de toda la plataforma. La programación se puede editar en planeación y en curso;
          al cerrar aquí, solo se cierra su programación.
        </p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>}

      {/* Aviso de publicar/retirar: el mensaje del backend, verbatim (403 para
          quien no administra; conflicto si ya hay franjas tomadas). */}
      {avisoPub && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">{avisoPub}</div>
      )}

      {cargando ? (
        <div className="flex items-center gap-2 text-sm text-slate-500 p-4">
          <Loader2 className="w-4 h-4 animate-spin" /> Cargando periodos…
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(periodos?.periodos ?? []).map((o) => (
            <div key={o.idPeriodo} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-sm">{o.codigo}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-[#003DA5] font-bold">
                  {o.esActivo ? 'Activo' : o.estadoPlataforma.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-600">Programación {o.programacion.estado}</p>
              <p className="text-[11px] text-slate-400">
                {o.fechaInicio || '—'} a {o.fechaFin || '—'}
              </p>
              <div className="flex items-center justify-between pt-1">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${o.programable ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                  {o.programable ? 'Programable' : 'Solo consulta'}
                </span>
                {/* Cerrado es inmutable: no se ofrece reactivar lo que el
                    backend rechazaría por inmutable. */}
                {periodos?.permisos.activar && !o.esActivo && o.estadoPlataforma !== 'cerrado' && (
                  <button
                    type="button"
                    onClick={() => activar(o.idPeriodo)}
                    className="px-2.5 py-1 rounded-lg bg-[#003DA5] text-white text-[11px] font-bold hover:bg-blue-800 active:scale-95 transition-all"
                  >
                    Activar
                  </button>
                )}
              </div>

              {/* NUEVA-1 — Publicación de la programación del periodo. Publicar
                  valida sin cruces; retirar solo si nadie tomó franjas. */}
              {(() => {
                const p = pubs[o.idPeriodo];
                if (!p) return null;
                const ocupado = pubOcupado === o.idPeriodo;
                const publicado = p.publicada > 0 || p.tomada > 0;
                return (
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                      <span className="font-semibold text-slate-600">Programación:</span>
                      <span>{p.programado} programadas</span>
                      <span className="text-emerald-600">{p.publicada} publicadas</span>
                      <span className="text-[#003DA5]">{p.tomada} tomadas</span>
                      <span className="text-emerald-700 font-semibold">{p.aprobada} aprobadas</span>
                    </div>
                    {o.programable && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {!publicado ? (
                        <button type="button" disabled={ocupado || p.total === 0}
                          onClick={() => publicar(o.idPeriodo)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 disabled:opacity-40 active:scale-95 transition-all">
                          {ocupado ? 'Publicando…' : 'Publicar programación'}
                        </button>
                      ) : (
                        <>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold">Publicada</span>
                          {/* Retirar se ofrece; el backend lo rechaza verbatim si ya hay franjas tomadas. */}
                          <button type="button" disabled={ocupado}
                            onClick={() => retirar(o.idPeriodo)}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 text-[11px] font-bold hover:bg-slate-50 disabled:opacity-40 active:scale-95 transition-all">
                            {ocupado ? 'Retirando…' : 'Retirar'}
                          </button>
                        </>
                      )}
                      {/* Cerrar: el backend exige todo aprobado o en excepción y lo
                          rechaza verbatim si algo queda pendiente. */}
                      {periodos?.permisos.cerrarProgramacion && (
                      <button type="button" disabled={ocupado || p.pendientesCierre > 0}
                        onClick={() => cerrar(o)}
                        title={p.pendientesCierre > 0 ? `${p.pendientesCierre} franjas pendientes: apruébalas o márcalas como excepción` : 'Cerrar solo la programación'}
                        className="px-2.5 py-1 rounded-lg bg-slate-700 text-white text-[11px] font-bold hover:bg-slate-800 disabled:opacity-40 active:scale-95 transition-all">
                        {ocupado ? 'Cerrando…' : 'Cerrar programación'}
                      </button>
                      )}
                      {p.pendientesCierre > 0 && (
                        <button type="button" onClick={() => abrirExcepciones(o.idPeriodo)}
                          className="px-2.5 py-1 rounded-lg border border-amber-300 text-amber-800 text-[11px] font-bold hover:bg-amber-50 active:scale-95 transition-all">
                          {verPend === o.idPeriodo ? 'Ocultar pendientes' : `Ver pendientes (${p.pendientesCierre})`}
                        </button>
                      )}
                      {p.pendientesCierre > 0 && (
                        <p className="w-full text-[11px] text-amber-800">
                          {p.pendientesCierre} franjas pendientes: apruébalas o márcalas como excepción.
                        </p>
                      )}
                    </div>
                    )}

                    {/* Lista de franjas que impiden cerrar; se marcan como excepción. */}
                    {verPend === o.idPeriodo && (pendCierre[o.idPeriodo]?.length ?? 0) > 0 && (
                      <div className="mt-1 space-y-1 border border-amber-200 rounded-lg p-2 bg-amber-50/40">
                        {pendCierre[o.idPeriodo].map((f) => (
                          <div key={f.idFranja} className="flex items-center justify-between gap-2 text-[11px]">
                            <span className="min-w-0 truncate text-slate-600">
                              {f.asignatura || 'Asignatura'} · {f.diaSemana.toLowerCase()} {f.horaInicio}–{f.horaFin}
                              <span className="ml-1 text-slate-400">({f.estado.toLowerCase()})</span>
                            </span>
                            <button type="button" onClick={() => excepcion(o.idPeriodo, f.idFranja)}
                              className="shrink-0 px-2 py-0.5 rounded border border-amber-300 text-amber-800 font-bold hover:bg-amber-100">
                              Excepción
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
              {periodos?.permisos.importar && o.programable && (
                <button type="button" onClick={() => setImportarId(importarId === o.idPeriodo ? null : o.idPeriodo)}
                  className="text-xs font-bold text-[#003DA5] underline">
                  {importarId === o.idPeriodo ? 'Ocultar carga masiva' : 'Cargar asignaturas desde Excel'}
                </button>
              )}
              {puedeAbrirProgramasAcademicos && abrirProgramasAcademicos && (
                <button type="button" onClick={abrirProgramasAcademicos}
                  className="text-xs font-bold text-[#003DA5] underline">
                  Agregar asignatura manualmente en Programas Académicos
                </button>
              )}
              {importarId === o.idPeriodo && periodos?.permisos.importar && o.programable && (
                <CargaAsignaturasPeriodo periodo={o} alTerminar={() => setAvisoAdmin(`Catálogo de ${o.codigo} actualizado.`)} />
              )}
            </div>
          ))}
        </div>
      )}

      {(periodos?.legado?.length ?? 0) > 0 && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
          <h4 className="font-bold text-sm">Periodos anteriores al modelo único</h4>
          {periodos!.legado.map((p) => <p key={p.idPeriodo} className="text-xs text-slate-600">{p.codigo} · {p.nombre}: {p.motivo}</p>)}
        </div>
      )}

      {/* Crear el periodo compartido de la plataforma mediante el PTA. */}
      {periodos?.permisos.crear && <form onSubmit={crear} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <h4 className="font-bold text-slate-800 text-sm">Crear periodo</h4>
        <p className="text-xs text-slate-500">
          Nace <strong>en planeación</strong>. Activarlo muestra primero cuántos PTA se terminarán.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Año</span>
            <input required type="number" min={2020} max={2050} value={nuevo.anio}
              onChange={(e) => setNuevo({ ...nuevo, anio: Number(e.target.value) })}
              className="border border-slate-200 rounded-lg px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Semestre</span>
            <select value={nuevo.semestre}
              onChange={(e) => setNuevo({ ...nuevo, semestre: Number(e.target.value) as 1 | 2 })}
              className="border border-slate-200 rounded-lg px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20">
              <option value={1}>Primero</option>
              <option value={2}>Segundo</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Inicio</span>
            <input required type="date" value={nuevo.fechaInicio}
              onChange={(e) => setNuevo({ ...nuevo, fechaInicio: e.target.value })}
              className="border border-slate-200 rounded-lg px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Fin</span>
            <input required type="date" value={nuevo.fechaFin}
              onChange={(e) => setNuevo({ ...nuevo, fechaFin: e.target.value })}
              className="border border-slate-200 rounded-lg px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
          </label>
          </div>
        </div>
        {avisoAdmin && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
            {avisoAdmin}
          </div>
        )}
        <button type="submit" disabled={guardando}
          className="px-4 py-2 rounded-lg bg-[#003DA5] text-white text-xs font-bold disabled:opacity-50 active:scale-95 transition-all">
          {guardando ? 'Creando…' : 'Crear periodo'}
        </button>
      </form>}

      {/* Consumo previo del docente frente al tope, entre ofertas */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
          <Gauge className="w-4 h-4 text-[#003DA5]" /> Consumo del docente entre ofertas
        </h4>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Documento del docente</label>
            <input
              type="text"
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && consultar()}
              placeholder="Cédula del docente"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5]"
            />
          </div>
          <button
            onClick={consultar}
            disabled={buscando || !documento.trim()}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-[#003DA5] text-white hover:bg-blue-800 disabled:opacity-50 font-semibold text-xs rounded-xl shadow-md"
          >
            {buscando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>Ver consumo</span>
          </button>
        </div>

        {consumo && (
          <div className="space-y-2 pt-2">
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
              <div className={`h-full ${consumo.totalAsignado > consumo.tope ? 'bg-red-500' : 'bg-[#003DA5]'}`} style={{ width: `${pct}%` }} />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>{consumo.nombre} · {consumo.categoriaVinculacion}</span>
              <span><strong className="text-slate-800">{consumo.totalAsignado} h</strong> de {consumo.tope} h</span>
            </div>
            {consumo.porOferta.length > 0 ? (
              <div className="pt-1 space-y-1">
                {consumo.porOferta.map((o, i) => (
                  <div key={i} className="flex items-center justify-between text-xs text-slate-600">
                    <span>{o.periodo || 'Sin periodo definido'}</span>
                    <span className="font-semibold text-slate-800">{o.horas} h</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400">Sin carga asignada en ninguna oferta.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
