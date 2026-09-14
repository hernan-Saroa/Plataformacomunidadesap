import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Clock,
  BookOpen,
  Users,
  Building,
  Filter,
  Plus,
  Search,
  Download,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Layers,
  MapPin,
  RefreshCw,
  Eye,
  FileCheck,
  ShieldCheck,
  Award,
  Layers3,
  ClipboardCheck,
  X
} from 'lucide-react';

import {
  getTodasLasSesiones, getAulas, getCrucesHistoricos, getPendientesJefatura, getOfertas,
  getEstadoPublicacion, publicarProgramacion, retirarProgramacion,
  type FranjaConContexto, type ValidacionHistorico, type Oferta, type EstadoPublicacion,
} from '../services/api/catalogoApi';
import { CalendarioHorario } from './CalendarioHorario';
import { ModuleLayout, MenuGroup } from '../shared/ModuleLayout';
import { SelectorCatalogo } from './SelectorCatalogo';
import { AsignacionDocente } from './AsignacionDocente';
import { DisponibilidadAulas } from './DisponibilidadAulas';
import { GestionOfertas } from './GestionOfertas';
import { AprobacionJefatura } from './AprobacionJefatura';

interface FranjaHoraria {
  id: string;
  /** Id del grupo: lo necesita la flecha de Acción para abrir su detalle. */
  idGrupo: string | null;
  /** Ciclo del grupo. Sin esto el detalle abriría con las fechas vacías
   *  aunque estén guardadas: el mismo defecto que se corrigió en 3.2. */
  fechaInicioGrupo: string | null;
  fechaFinGrupo: string | null;
  codigo: string;
  programa: string;
  asignatura: string;
  grupo: string;
  docente: string;
  sede: string;
  aula: string;
  dia: string;
  horaInicio: string;
  horaFin: string;
  jornada: string;
  cupos: number;
  /** Los cinco estados reales del ciclo de la franja (migraciones 029-032). */
  estado: string;
  /** Código del periodo al que pertenece la franja. */
  periodoCodigo: string | null;
}

type Seccion = 'catalogo' | 'horarios' | 'aulas' | 'docentes' | 'ofertas' | 'alertas' | 'aprobacion';

/** Los cinco estados del ciclo de la franja, con su etiqueta y color (§1.2). */
const BADGE_ESTADO: Record<string, { etiqueta: string; clase: string }> = {
  PROGRAMADO: { etiqueta: 'Programado', clase: 'bg-blue-50 text-blue-700 border-blue-200' },
  PUBLICADA:  { etiqueta: 'Publicada',  clase: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  TOMADA:     { etiqueta: 'Tomada',     clase: 'bg-violet-50 text-violet-700 border-violet-200' },
  APROBADA:   { etiqueta: 'Aprobada',   clase: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  DEVUELTA:   { etiqueta: 'Devuelta',   clase: 'bg-amber-50 text-amber-700 border-amber-200' },
};


/**
 * El endpoint ya devuelve programa, asignatura y docente resueltos por JOIN
 * (2.3). Lo que no exista en la base viene en null y se muestra vacío: sigue
 * sin inventarse nada, que era el vicio de la constante retirada en 2.1.
 */
function sesionAFranja(s: FranjaConContexto): FranjaHoraria {
  return {
    id: s.idFranja,
    idGrupo: s.idGrupo,
    fechaInicioGrupo: s.fechaInicioGrupo,
    fechaFinGrupo: s.fechaFinGrupo,
    codigo: s.idFranja.slice(0, 8),
    programa: s.programa ?? '',
    asignatura: s.asignatura ?? '',
    grupo: s.numeroGrupo != null ? String(s.numeroGrupo) : '',
    docente: s.docente ?? '',
    sede: '',
    aula: s.aulaCodigo ?? '',
    dia: s.diaSemana,
    horaInicio: s.horaInicio,
    horaFin: s.horaFin,
    jornada: s.jornada ?? '',
    cupos: 0,
    estado: s.estado ?? 'PROGRAMADO',
    periodoCodigo: s.periodoCodigo ?? null,
  };
}

export function ProgramacionAcademicaModule() {
  const [seccion, setSeccion] = useState<Seccion>('horarios');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJornada, setSelectedJornada] = useState<string>('TODAS');
  // Arranca VACÍO y se llena desde la base. Antes salía de una constante del
  // front, así que el panel decía "4 franjas activas" con la base en 0.
  const [scheduleList, setScheduleList] = useState<FranjaHoraria[]>([]);
  const [totalAulas, setTotalAulas] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);
  // 3.6 — Detalle del grupo que abre la flecha de Acción.
  const [detalle, setDetalle] = useState<FranjaHoraria | null>(null);
  // 3.9 — Cruces del histórico. Se cargan aparte del panel: son otra fuente.
  const [historico, setHistorico] = useState<ValidacionHistorico | null>(null);
  // EFDS-1939 — el item de aprobación solo aparece si el usuario ES jefatura. Se
  // prueba pidiendo sus pendientes: 200 (aunque vacío) ⇒ jefatura; 403 ⇒ no.
  const [esJefatura, setEsJefatura] = useState(false);
  useEffect(() => { getPendientesJefatura().then(() => setEsJefatura(true)).catch(() => {}); }, []);

  // §1.0 — El periodo como CONTEXTO. Todo lo que se ve debajo pertenece al
  // periodo seleccionado en la cabecera; se persiste entre recargas.
  const [periodos, setPeriodos] = useState<Oferta[]>([]);
  const [periodoSel, setPeriodoSel] = useState<string>(() => {
    try { return localStorage.getItem('prog-periodo-sel') || ''; } catch { return ''; }
  });
  const periodoActual = periodos.find((p) => p.idPeriodo === periodoSel) || null;

  useEffect(() => {
    getOfertas().then((lista) => {
      setPeriodos(lista);
      setPeriodoSel((actual) => {
        if (actual && lista.some((p) => p.idPeriodo === actual)) return actual;
        // Por defecto, el primer periodo activo; si no hay, el primero.
        const def = lista.find((p) => p.estado === 'activo') || lista[0];
        return def ? def.idPeriodo : '';
      });
    }).catch(() => {});
  }, []);

  const elegirPeriodo = (id: string) => {
    setPeriodoSel(id);
    try { localStorage.setItem('prog-periodo-sel', id); } catch { /* storage no disponible */ }
  };

  // §1.2 — Publicar/retirar el periodo activo DESDE la vista de programación, sin
  // ir a buscarlo a otra sección. El backend valida sin cruces al publicar y
  // rechaza retirar si alguien tomó franjas; el mensaje se muestra tal cual.
  const [estadoPub, setEstadoPub] = useState<EstadoPublicacion | null>(null);
  const [avisoPub, setAvisoPub] = useState('');
  const [pubOcupado, setPubOcupado] = useState(false);
  const cargarEstadoPub = (id: string) => getEstadoPublicacion(id).then(setEstadoPub).catch(() => setEstadoPub(null));
  useEffect(() => { if (periodoSel) cargarEstadoPub(periodoSel); }, [periodoSel]);

  const publicar = async () => {
    setAvisoPub(''); setPubOcupado(true);
    try {
      const e = await publicarProgramacion(periodoSel);
      setEstadoPub(e);
      const s = await getTodasLasSesiones(periodoSel); setScheduleList(s.map(sesionAFranja));
    } catch (err: any) { setAvisoPub(err?.message || 'No se pudo publicar.'); }
    finally { setPubOcupado(false); }
  };
  const retirarPub = async () => {
    setAvisoPub(''); setPubOcupado(true);
    try {
      const e = await retirarProgramacion(periodoSel);
      setEstadoPub(e);
      const s = await getTodasLasSesiones(periodoSel); setScheduleList(s.map(sesionAFranja));
    } catch (err: any) { setAvisoPub(err?.message || 'No se pudo retirar.'); }
    finally { setPubOcupado(false); }
  };

  // Franjas y validación se recargan cada vez que cambia el periodo seleccionado.
  useEffect(() => {
    if (!periodoSel) return;
    let vivo = true;
    setCargando(true);
    const codigo = periodos.find((p) => p.idPeriodo === periodoSel)?.codigo;
    Promise.all([getTodasLasSesiones(periodoSel), getAulas(), getCrucesHistoricos(codigo)])
      .then(([sesiones, aulas, cruces]) => {
        if (!vivo) return;
        setScheduleList(sesiones.map(sesionAFranja));
        setTotalAulas(aulas.length);
        setHistorico(cruces);
      })
      .catch(() => { if (vivo) setTotalAulas(null); })
      .finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, [periodoSel, periodos]);

  // Form state

  const totalFranjas = scheduleList.length;
  // Confirmadas = aprobadas por la jefatura (estado real, no el inventado 'CONFIRMADO').
  const totalConfirmados = scheduleList.filter(s => s.estado === 'APROBADA').length;
  // Alertas de cruce = las de validación del periodo (0 en un periodo nuevo).
  const totalConflictos = historico?.resumen?.total ?? 0;

  const gruposNav: MenuGroup[] = [
    {
      title: 'GESTIÓN PRINCIPAL',
      items: [
        {
          // EFDS-1368: punto de entrada del flujo — nivel → programa → catálogo.
          id: 'catalogo',
          label: 'Catálogo Académico',
          subtitle: 'Nivel, programa y plan de estudios',
          icon: <BookOpen className="w-5 h-5" />,
          color: '#003DA5',
        },
        {
          id: 'horarios',
          label: 'Programación General',
          subtitle: 'Oferta académica y franjas lectivas',
          icon: <Calendar className="w-5 h-5" />,
          color: '#003DA5',
          badge: totalFranjas,
        },
        {
          id: 'aulas',
          label: 'Disponibilidad de Aulas',
          subtitle: 'Espacios físicos y capacidad',
          icon: <Building className="w-5 h-5" />,
          color: '#059669',
        },
        {
          id: 'docentes',
          label: 'Disponibilidad Docente',
          subtitle: 'Carga horaria y asignaciones',
          icon: <Users className="w-5 h-5" />,
          color: '#7C3AED',
        },
        {
          // EFDS-1375/1941: aquí se crean, activan, publican y cierran los periodos.
          id: 'ofertas',
          label: 'Periodos',
          subtitle: 'Crear, activar, publicar y cerrar',
          icon: <Layers3 className="w-5 h-5" />,
          color: '#003DA5',
        },
        {
          id: 'alertas',
          label: 'Validación de Cruces',
          subtitle: 'Alertas y traslapes de horario',
          icon: <AlertTriangle className="w-5 h-5" />,
          color: '#D97706',
          badge: totalConflictos > 0 ? totalConflictos : undefined,
        },
        // EFDS-1939 — solo para jefaturas territoriales.
        ...(esJefatura ? [{
          id: 'aprobacion',
          label: 'Aprobación territorial',
          subtitle: 'Aprobar o devolver franjas de tus docentes',
          icon: <ClipboardCheck className="w-5 h-5" />,
          color: '#059669',
        }] : []),
      ],
    },
  ];

  const filteredSchedule = scheduleList.filter((item) => {
    const matchesSearch =
      item.programa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.asignatura.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.docente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.aula.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesJornada = selectedJornada === 'TODAS' || item.jornada === selectedJornada;
    return matchesSearch && matchesJornada;
  });

  return (
    <ModuleLayout
      moduleName="PROGRAMACIÓN ACADÉMICA"
      moduleDescription="Gestión de Franjas Horarias, Aulas y Carga Lectiva · ESAP"
      moduleIcon={<Calendar className="w-6 h-6" />}
      moduleColor="#003DA5"
      groups={gruposNav}
      activeSection={seccion}
      onSectionChange={(s) => setSeccion(s as Seccion)}
    >
      {/* ── PERIODO ACTIVO (§1.0) — contexto de todo lo de abajo ── */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs mb-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Periodo</span>
          <select
            value={periodoSel}
            onChange={(e) => elegirPeriodo(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-[#003DA5] focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20"
          >
            {periodos.length === 0 && <option value="">Cargando…</option>}
            {periodos.map((p) => (
              <option key={p.idPeriodo} value={p.idPeriodo}>
                {p.codigo} — {p.estado === 'activo' ? 'Activo' : p.estado === 'cerrado' ? 'Cerrado' : 'En planeación'}
              </option>
            ))}
          </select>
          {periodoActual && (
            <span className="text-xs text-slate-500 hidden sm:inline">{periodoActual.nombre}</span>
          )}
        </div>
        <p className="text-[11px] text-slate-400">
          Todo lo que ves —franjas, validación, disponibilidad— pertenece a este periodo.
        </p>
      </div>

      {/* ── KPI HEADER ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Franjas Activas</p>
            <h3 className="text-2xl font-black text-slate-800 mt-1">{totalFranjas}</h3>
            <p className="text-xs text-blue-600 font-medium mt-1">Periodo {periodoActual?.codigo || '—'}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#003DA5] flex items-center justify-center font-bold">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Horarios Confirmados</p>
            <h3 className="text-2xl font-black text-slate-800 mt-1">{totalConfirmados}</h3>
            <p className="text-xs text-emerald-600 font-medium mt-1">100% Sin traslapes</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Alertas de Cruce</p>
            <h3 className="text-2xl font-black text-slate-800 mt-1">{totalConflictos}</h3>
            <p className="text-xs text-amber-600 font-medium mt-1">Requieren resolución</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Aulas Asignadas</p>
            <h3 className="text-2xl font-black text-slate-800 mt-1">{totalAulas ?? '—'}</h3>
            <p className="text-xs text-purple-600 font-medium mt-1">Sedes y Territoriales</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Building className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ── PUBLICAR EL PERIODO (§1.2) — desde la vista de programación ── */}
      {seccion === 'horarios' && estadoPub && periodoActual && periodoActual.estado !== 'cerrado' && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-bold text-slate-700">Programación de {periodoActual.codigo}:</span>
              <span>{estadoPub.programado} programadas</span>
              <span className="text-indigo-600">{estadoPub.publicada} publicadas</span>
              <span className="text-violet-600">{estadoPub.tomada} tomadas</span>
              <span className="text-emerald-700">{estadoPub.aprobada} aprobadas</span>
            </div>
            <div className="flex items-center gap-2">
              {estadoPub.publicada === 0 && estadoPub.tomada === 0 && estadoPub.aprobada === 0 ? (
                <button type="button" disabled={pubOcupado || estadoPub.total === 0} onClick={publicar}
                  className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-40 active:scale-95 transition-all">
                  {pubOcupado ? 'Publicando…' : 'Publicar programación'}
                </button>
              ) : (
                <>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold">Publicada</span>
                  <button type="button" disabled={pubOcupado} onClick={retirarPub}
                    className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 disabled:opacity-40 active:scale-95 transition-all">
                    {pubOcupado ? 'Retirando…' : 'Retirar publicación'}
                  </button>
                </>
              )}
            </div>
          </div>
          {avisoPub && (
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">{avisoPub}</div>
          )}
        </div>
      )}

      {/* ── ACCIONES Y BÚSQUEDA ──
          Solo en Programación General: el buscador, el filtro de jornada y el
          botón de nueva franja no aplican al catálogo, a las aulas ni a las
          ofertas. Antes se repetía en todas las secciones. */}
      {seccion === 'horarios' && (
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por asignatura, docente, aula o programa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5] transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-600 font-medium">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Jornada:</span>
            <select
              value={selectedJornada}
              onChange={(e) => setSelectedJornada(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none"
            >
              {/* §2.1 — Los valores deben ser los del dato del backend
                  (DIURNA/NOCTURNA/FIN_DE_SEMANA), no 'Diurna': la comparacion es
                  exacta y con la etiqueta bonita nunca casaba. */}
              <option value="TODAS">Todas las jornadas</option>
              <option value="DIURNA">Diurna</option>
              <option value="NOCTURNA">Nocturna</option>
              <option value="FIN_DE_SEMANA">Fin de semana</option>
            </select>
          </div>

          {/* §2.2 — Una franja se crea siempre desde un grupo (asignatura →
              grupo → calendario). No hay atajo directo, así que el botón lleva al
              inicio real de ese flujo, el catálogo, y el texto lo dice sin
              prometer una creación que no puede cumplir aquí. */}
          <button
            onClick={() => setSeccion('catalogo')}
            className="flex items-center gap-2 px-4 py-2 bg-[#003DA5] text-white hover:bg-blue-800 font-semibold text-xs rounded-xl shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Programar franja (elegir asignatura)</span>
          </button>

        </div>
      </div>
      )}

      {/* ── VISTAS POR SECCIÓN ── */}

      {/* Las franjas y el conteo de aulas ya salen de la base. Lo que falta es
          que el endpoint de horarios devuelva programa, asignatura y docente:
          hoy solo trae la sesión, así que esas columnas van vacías. */}
      {seccion === 'catalogo' && <SelectorCatalogo idPeriodo={periodoSel} />}

      {seccion === 'horarios' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm">Franjas Académicas Programadas</h3>
            <span className="text-xs text-slate-400 font-medium">Mostrando {filteredSchedule.length} registros</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Código / Programa</th>
                  <th className="px-6 py-4">Asignatura & Grupo</th>
                  <th className="px-6 py-4">Docente</th>
                  <th className="px-6 py-4">Horario & Aula</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSchedule.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      <Calendar className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                      <p className="font-semibold text-slate-700">No se encontraron franjas académicas</p>
                      <p className="text-xs text-slate-400">Intenta ajustando los filtros de búsqueda</p>
                    </td>
                  </tr>
                ) : (
                  filteredSchedule.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800">{item.programa}</div>
                        <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>Periodo {item.periodoCodigo || '—'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-700">{item.asignatura}</div>
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px] font-semibold mt-1">
                          Grupo {item.grupo}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-700 font-medium">{item.docente}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-[#003DA5] flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{item.dia} {item.horaInicio} - {item.horaFin}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">{item.aula}</div>
                      </td>
                      <td className="px-6 py-4">
                        {(() => {
                          const b = BADGE_ESTADO[item.estado] || BADGE_ESTADO.PROGRAMADO;
                          return (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${b.clase}`}>
                              {b.etiqueta}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => item.idGrupo && setDetalle(item)}
                          disabled={!item.idGrupo}
                          title={item.idGrupo ? 'Ver detalle del grupo' : 'La franja no tiene grupo asociado'}
                          aria-label="Ver detalle del grupo"
                          className="text-slate-400 hover:text-[#003DA5] font-medium text-xs p-1.5 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EFDS-1374: disponibilidad de aulas, sin revelar qué las ocupa (RN-07). */}
      {seccion === 'aulas' && <DisponibilidadAulas />}

      {/* EFDS-1372: asignación de docente con panel de solo lectura (RN-09). */}
      {seccion === 'docentes' && <AsignacionDocente />}

      {/* EFDS-1375: gestión de las cinco ofertas académicas. */}
      {seccion === 'ofertas' && <GestionOfertas />}

      {seccion === 'aprobacion' && <AprobacionJefatura />}

      {/* 3.9 — VALIDACIÓN: cruces del HISTÓRICO, no del sistema.
          Antes esta sección mostraba alertas inventadas en el propio front.
          Ahora sale de programacion_historica y va ETIQUETADA: son hallazgos
          del Excel de 2026-1 que hoy se revisan a mano, no fallas del módulo.
          El contador "Alertas de Cruce" del panel es otro y vale 0 por diseño,
          porque el sistema rechaza el cruce al guardar. No se mezclan. */}
      {seccion === 'alertas' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <h3 className="font-bold text-slate-800 text-sm mb-1">Cruces detectados en la programación histórica</h3>
            <p className="text-xs text-slate-500">
              Hallazgos sobre la programación cargada de {historico?.periodos?.join(' y ') || '2026-1'} —
              hoy se revisan a mano. El sistema <strong>no permite crear</strong> estos cruces:
              se rechazan al guardar.
            </p>
          </div>

          {historico && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { etiqueta: 'Total detectados', valor: historico.resumen.total, color: '#B45309' },
                { etiqueta: 'Cruces de aula', valor: historico.resumen.aula, color: '#B45309' },
                { etiqueta: 'Cruces de docente', valor: historico.resumen.docente, color: '#B45309' },
              ].map((k) => (
                <div key={k.etiqueta} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{k.etiqueta}</p>
                  <h3 className="text-2xl font-black mt-1" style={{ color: k.color }}>{k.valor}</h3>
                  <p className="text-xs text-slate-500 mt-1">Origen: histórico</p>
                </div>
              ))}
            </div>
          )}

          {!historico && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 text-center text-sm text-slate-500">
              Cargando cruces del histórico…
            </div>
          )}

          {historico && historico.cruces.length === 0 && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 text-center text-sm text-slate-500">
              No se detectaron cruces en la programación histórica cargada.
            </div>
          )}

          <div className="space-y-3">
            {(historico?.cruces || []).map((c, i) => (
              <div key={i} className="bg-amber-50/70 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-amber-900 text-sm">
                        {c.tipo === 'aula' ? `Aula ${c.recurso}` : c.recurso}
                      </h4>
                      <span className="px-2 py-0.5 rounded-md bg-amber-200/70 text-amber-900 text-[0.62rem] font-bold uppercase tracking-wide">
                        Cruce de {c.tipo}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 text-[0.62rem] font-bold uppercase tracking-wide">
                        Histórico {c.periodo}
                      </span>
                    </div>
                    <p className="text-xs text-amber-800 mt-1">
                      {c.dia} de {c.horaInicio} a {c.horaFin}
                    </p>
                    <p className="text-xs text-amber-700 mt-1">
                      {c.asignaturaA} ({c.programaA}) · {c.asignaturaB} ({c.programaB})
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3.6 — Detalle del grupo. La flecha no hacía nada: era un botón sin
          onClick. Abre el calendario del grupo, que es donde ya se edita el
          horario y se retiran sesiones. */}
      {detalle && detalle.idGrupo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={`Detalle del grupo de ${detalle.asignatura}`}
          onClick={() => setDetalle(null)}
        >
          {/* §3.1 — Centrado (items-center) y con alto máximo: el contenido alto
              del calendario hace scroll DENTRO de la tarjeta, no empuja el modal. */}
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setDetalle(null)}
              aria-label="Cerrar"
              className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
            <CalendarioHorario
              idGrupo={detalle.idGrupo}
              numeroGrupo={Number(detalle.grupo) || 1}
              nombreAsignatura={detalle.asignatura || detalle.programa || 'Grupo'}
              fechaInicioGrupo={detalle.fechaInicioGrupo}
              fechaFinGrupo={detalle.fechaFinGrupo}
            />
          </div>
        </div>
      )}

    </ModuleLayout>
  );
}
