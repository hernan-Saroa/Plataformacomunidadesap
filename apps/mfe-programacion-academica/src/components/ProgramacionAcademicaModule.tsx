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
  Layers3
} from 'lucide-react';

import { getTodasLasSesiones, getAulas, type FranjaConContexto } from '../services/api/catalogoApi';
import { ModuleLayout, MenuGroup } from '../shared/ModuleLayout';
import { SelectorCatalogo } from './SelectorCatalogo';
import { AsignacionDocente } from './AsignacionDocente';
import { DisponibilidadAulas } from './DisponibilidadAulas';
import { GestionOfertas } from './GestionOfertas';

interface FranjaHoraria {
  id: string;
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
  jornada: 'Diurna' | 'Nocturna' | 'Fin de Semana';
  cupos: number;
  estado: 'PROGRAMADO' | 'CONFIRMADO' | 'CONFLICTO';
}

type Seccion = 'catalogo' | 'horarios' | 'aulas' | 'docentes' | 'ofertas' | 'alertas';


/**
 * El endpoint ya devuelve programa, asignatura y docente resueltos por JOIN
 * (2.3). Lo que no exista en la base viene en null y se muestra vacío: sigue
 * sin inventarse nada, que era el vicio de la constante retirada en 2.1.
 */
function sesionAFranja(s: FranjaConContexto): FranjaHoraria {
  return {
    id: s.idFranja,
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
    jornada: (s.jornada as FranjaHoraria['jornada']) ?? 'Diurna',
    cupos: 0,
    estado: (s.estado as FranjaHoraria['estado']) ?? 'PROGRAMADO',
  };
}

export function ProgramacionAcademicaModule() {
  const [seccion, setSeccion] = useState<Seccion>('horarios');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJornada, setSelectedJornada] = useState<string>('TODAS');
  const [showNewModal, setShowNewModal] = useState(false);
  // Arranca VACÍO y se llena desde la base. Antes salía de una constante del
  // front, así que el panel decía "4 franjas activas" con la base en 0.
  const [scheduleList, setScheduleList] = useState<FranjaHoraria[]>([]);
  const [totalAulas, setTotalAulas] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vivo = true;
    Promise.all([getTodasLasSesiones(), getAulas()])
      .then(([sesiones, aulas]) => {
        if (!vivo) return;
        setScheduleList(sesiones.map(sesionAFranja));
        setTotalAulas(aulas.length);
      })
      .catch(() => { if (vivo) setTotalAulas(null); })
      .finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, []);

  // Form state
  const [newPrograma, setNewPrograma] = useState('');
  const [newAsignatura, setNewAsignatura] = useState('');
  const [newDocente, setNewDocente] = useState('');
  const [newSede, setNewSede] = useState('Sede Central - Bogotá');
  const [newAula, setNewAula] = useState('');
  const [newDia, setNewDia] = useState('Lunes');
  const [newHoraInicio, setNewHoraInicio] = useState('08:00');
  const [newHoraFin, setNewHoraFin] = useState('10:00');
  const [newJornada, setNewJornada] = useState<'Diurna' | 'Nocturna' | 'Fin de Semana'>('Diurna');

  const totalFranjas = scheduleList.length;
  const totalConfirmados = scheduleList.filter(s => s.estado === 'CONFIRMADO').length;
  const totalConflictos = scheduleList.filter(s => s.estado === 'CONFLICTO').length;

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
          // EFDS-1375: las cinco ofertas academicas y el consumo entre ellas.
          id: 'ofertas',
          label: 'Ofertas Académicas',
          subtitle: 'Periodos, virtual e interperiodo',
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

  const handleCreateFranja = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrograma || !newAsignatura || !newDocente || !newAula) return;

    const newItem: FranjaHoraria = {
      id: String(Date.now()),
      codigo: `PA-2026-0${scheduleList.length + 1}`,
      programa: newPrograma,
      asignatura: newAsignatura,
      grupo: 'G01',
      docente: newDocente,
      sede: newSede,
      aula: newAula,
      dia: newDia,
      horaInicio: newHoraInicio,
      horaFin: newHoraFin,
      jornada: newJornada,
      cupos: 30,
      estado: 'PROGRAMADO'
    };

    setScheduleList([newItem, ...scheduleList]);
    setShowNewModal(false);
    setNewPrograma('');
    setNewAsignatura('');
    setNewDocente('');
    setNewAula('');
  };

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
      {/* ── KPI HEADER ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Franjas Activas</p>
            <h3 className="text-2xl font-black text-slate-800 mt-1">{totalFranjas}</h3>
            <p className="text-xs text-blue-600 font-medium mt-1">Periodo 2026-1</p>
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

      {/* ── ACCIONES Y BÚSQUEDA ── */}
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
              <option value="TODAS">Todas las jornadas</option>
              <option value="Diurna">Diurna</option>
              <option value="Nocturna">Nocturna</option>
              <option value="Fin de Semana">Fin de Semana</option>
            </select>
          </div>

          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#003DA5] text-white hover:bg-blue-800 font-semibold text-xs rounded-xl shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Franja Lectiva</span>
          </button>

          <button className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium text-xs rounded-xl transition-all">
            <Download className="w-4 h-4" />
            <span>Exportar</span>
          </button>
        </div>
      </div>

      {/* ── VISTAS POR SECCIÓN ── */}
      {/* Las franjas y el conteo de aulas ya salen de la base. Lo que falta es
          que el endpoint de horarios devuelva programa, asignatura y docente:
          hoy solo trae la sesión, así que esas columnas van vacías. */}
      {seccion === 'catalogo' && <SelectorCatalogo />}

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
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{item.sede}</span>
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
                        {item.estado === 'CONFIRMADO' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Confirmado</span>
                          </span>
                        )}
                        {item.estado === 'PROGRAMADO' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Programado</span>
                          </span>
                        )}
                        {item.estado === 'CONFLICTO' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Cruce Detectado</span>
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-slate-400 hover:text-[#003DA5] font-medium text-xs p-1.5 rounded-lg hover:bg-blue-50 transition-colors">
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

      {seccion === 'alertas' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <h3 className="font-bold text-slate-800 text-sm mb-1">Detección de Cruces y Traslapes</h3>
            <p className="text-xs text-slate-500">Validación de conflictos de horario en asignaciones docentes y espacios físicos</p>
          </div>

          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-amber-900 text-sm">Cruce de Horario en Laboratorio 1</h4>
                <p className="text-xs text-amber-700">
                  El Mg. Carlos Eduardo Gómez presenta cruce de franja horaria el Miércoles entre 07:00 y 10:00 AM en Sede Central Bogotá.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-amber-200/60">
              <button className="px-3 py-1.5 bg-amber-600 text-white rounded-lg font-semibold text-xs hover:bg-amber-700 transition-colors">
                Reasignar Aula / Horario
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nueva Franja Lectiva */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Nueva Franja Académica</h3>
                <p className="text-xs text-slate-500">Registrar franja horaria en la oferta institucional</p>
              </div>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateFranja} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Programa Académico</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Administración Pública Territorial"
                  value={newPrograma}
                  onChange={(e) => setNewPrograma(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#003DA5]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Asignatura</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Finanzas Públicas"
                  value={newAsignatura}
                  onChange={(e) => setNewAsignatura(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#003DA5]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Docente Asignado</label>
                  <input
                    type="text"
                    required
                    placeholder="Nombre del docente"
                    value={newDocente}
                    onChange={(e) => setNewDocente(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#003DA5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Aula / Espacio</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Aula 201"
                    value={newAula}
                    onChange={(e) => setNewAula(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#003DA5]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Día</label>
                  <select
                    value={newDia}
                    onChange={(e) => setNewDia(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#003DA5]"
                  >
                    <option value="Lunes">Lunes</option>
                    <option value="Martes">Martes</option>
                    <option value="Miércoles">Miércoles</option>
                    <option value="Jueves">Jueves</option>
                    <option value="Viernes">Viernes</option>
                    <option value="Sábado">Sábado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hora Inicio</label>
                  <input
                    type="time"
                    value={newHoraInicio}
                    onChange={(e) => setNewHoraInicio(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#003DA5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hora Fin</label>
                  <input
                    type="time"
                    value={newHoraFin}
                    onChange={(e) => setNewHoraFin(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#003DA5]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-medium text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#003DA5] hover:bg-blue-800 text-white rounded-xl font-semibold text-xs shadow-md"
                >
                  Guardar Franja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ModuleLayout>
  );
}
