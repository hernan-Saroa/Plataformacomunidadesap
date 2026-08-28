import React, { useState } from 'react';
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
import { ModuleLayout, MenuGroup } from '../shared/ModuleLayout';

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

type Seccion = 'horarios' | 'aulas' | 'docentes' | 'alertas';

const INITIAL_SCHEDULE: FranjaHoraria[] = [
  {
    id: '1',
    codigo: 'PA-2026-001',
    programa: 'Administración Pública Territorial (APT)',
    asignatura: 'Derecho Constitucional I',
    grupo: 'G01',
    docente: 'Dr. Roberto Mendoza',
    sede: 'Sede Central - Bogotá',
    aula: 'Aula 204 (Bloque B)',
    dia: 'Lunes',
    horaInicio: '08:00',
    horaFin: '11:00',
    jornada: 'Diurna',
    cupos: 35,
    estado: 'CONFIRMADO'
  },
  {
    id: '2',
    codigo: 'PA-2026-002',
    programa: 'Maestría en Administración Pública',
    asignatura: 'Políticas Públicas y Gestión Estatal',
    grupo: 'G02',
    docente: 'Dra. María Fernanda Silva',
    sede: 'Territorial Cundinamarca - Cetap Soacha',
    aula: 'Auditorio Principal',
    dia: 'Martes',
    horaInicio: '18:00',
    horaFin: '21:00',
    jornada: 'Nocturna',
    cupos: 25,
    estado: 'CONFIRMADO'
  },
  {
    id: '3',
    codigo: 'PA-2026-003',
    programa: 'Especialización en Gestión Pública',
    asignatura: 'Finanzas Públicas y Presupuesto',
    grupo: 'G01',
    docente: 'Mg. Carlos Eduardo Gómez',
    sede: 'Sede Central - Bogotá',
    aula: 'Laboratorio de Cómputo 1',
    dia: 'Miércoles',
    horaInicio: '07:00',
    horaFin: '10:00',
    jornada: 'Diurna',
    cupos: 30,
    estado: 'CONFLICTO'
  },
  {
    id: '4',
    codigo: 'PA-2026-004',
    programa: 'Administración Pública Territorial (APT)',
    asignatura: 'Economía de lo Público',
    grupo: 'G03',
    docente: 'Dra. Ana Lucía Ramírez',
    sede: 'Territorial Meta - Villavicencio',
    aula: 'Aula 102',
    dia: 'Sábado',
    horaInicio: '08:00',
    horaFin: '14:00',
    jornada: 'Fin de Semana',
    cupos: 40,
    estado: 'PROGRAMADO'
  }
];

export function ProgramacionAcademicaModule() {
  const [seccion, setSeccion] = useState<Seccion>('horarios');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJornada, setSelectedJornada] = useState<string>('TODAS');
  const [showNewModal, setShowNewModal] = useState(false);
  const [scheduleList, setScheduleList] = useState<FranjaHoraria[]>(INITIAL_SCHEDULE);

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
            <h3 className="text-2xl font-black text-slate-800 mt-1">18</h3>
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

      {seccion === 'aulas' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <h3 className="font-bold text-slate-800 text-sm mb-1">Ocupación y Capacidad de Aulas</h3>
            <p className="text-xs text-slate-500">Monitoreo en tiempo real de espacios universitarios por Sede y Territorial</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-sm">Aula 204 (Bloque B)</span>
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800">Disponible</span>
              </div>
              <p className="text-xs text-slate-500">Sede Central - Bogotá · Capacidad: 40 estudiantes</p>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full w-[65%]" />
              </div>
              <span className="text-[11px] text-slate-400 font-semibold">Ocupación lectiva: 65%</span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-sm">Auditorio Principal</span>
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800">Ocupado</span>
              </div>
              <p className="text-xs text-slate-500">Territorial Cundinamarca - Soacha · Capacidad: 100 personas</p>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-full w-[85%]" />
              </div>
              <span className="text-[11px] text-slate-400 font-semibold">Ocupación lectiva: 85%</span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-sm">Laboratorio de Cómputo 1</span>
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800">Sobrecarga</span>
              </div>
              <p className="text-xs text-slate-500">Sede Central - Bogotá · Capacidad: 30 equipos</p>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full w-[95%]" />
              </div>
              <span className="text-[11px] text-slate-400 font-semibold">Ocupación lectiva: 95%</span>
            </div>
          </div>
        </div>
      )}

      {seccion === 'docentes' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <h3 className="font-bold text-slate-800 text-sm mb-1">Carga Horaria Docente y Disponibilidad</h3>
            <p className="text-xs text-slate-500">Control de horas semanales asignadas y vinculación académica de docentes ESAP</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-sm divide-y divide-slate-100">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-4">Docente</th>
                  <th className="px-6 py-4">Asignaturas Asignadas</th>
                  <th className="px-6 py-4">Horas Semanales</th>
                  <th className="px-6 py-4">Estado Carga</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="hover:bg-slate-50/80">
                  <td className="px-6 py-4 font-semibold text-slate-800">Dr. Roberto Mendoza</td>
                  <td className="px-6 py-4 text-slate-600">Derecho Constitucional I</td>
                  <td className="px-6 py-4 font-bold text-[#003DA5]">12 horas / semana</td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">Normal</span>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/80">
                  <td className="px-6 py-4 font-semibold text-slate-800">Dra. María Fernanda Silva</td>
                  <td className="px-6 py-4 text-slate-600">Políticas Públicas y Gestión Estatal</td>
                  <td className="px-6 py-4 font-bold text-[#003DA5]">16 horas / semana</td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">Normal</span>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/80">
                  <td className="px-6 py-4 font-semibold text-slate-800">Mg. Carlos Eduardo Gómez</td>
                  <td className="px-6 py-4 text-slate-600">Finanzas Públicas y Presupuesto</td>
                  <td className="px-6 py-4 font-bold text-amber-600">22 horas / semana</td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">Cerca del Límite</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

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
