/**
 * GESTIÓN DE AUDITORÍAS - VERSIÓN SIMPLIFICADA Y FUNCIONAL
 * Sin dependencias complejas, solo React y estilos nativos
 */

import { useState } from 'react';
import { toast } from 'sonner@2.0.3';
import {
  Plus, Search, Filter, Download, Eye, Edit, Trash2,
  LayoutGrid, List, Calendar as CalendarIcon, BarChart3,
  ClipboardCheck, Clock, CheckCircle2, AlertCircle,
  MapPin, Building2, User, GripVertical, X, Save, FileText, Users
} from 'lucide-react';

// ==================== TIPOS ====================
type VistaActiva = 'kanban' | 'lista' | 'calendario' | 'gantt';
type FaseAuditoria = 'planeacion' | 'en-curso' | 'revision' | 'completada';

interface Auditoria {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string;
  fase: FaseAuditoria;
  territorial: string;
  sede: string;
  responsable: string;
  fechaInicio: string;
  fechaFin: string;
  progreso: number;
  prioridad: 'Alta' | 'Media' | 'Baja';
  hallazgos: number;
}

// ==================== DATA MOCK ====================
const MOCK_AUDITORIAS: Auditoria[] = [
  {
    id: '1',
    codigo: 'AUD-2024-001',
    nombre: 'Auditoría de Gestión Financiera',
    tipo: 'Gestión',
    fase: 'en-curso',
    territorial: 'Cundinamarca',
    sede: 'Bogotá - Sede Central',
    responsable: 'María González',
    fechaInicio: '2024-11-15',
    fechaFin: '2024-12-15',
    progreso: 65,
    prioridad: 'Alta',
    hallazgos: 3
  },
  {
    id: '2',
    codigo: 'AUD-2024-002',
    nombre: 'Auditoría de Control Interno',
    tipo: 'Control Interno',
    fase: 'planeacion',
    territorial: 'Antioquia',
    sede: 'Medellín',
    responsable: 'Carlos Ramírez',
    fechaInicio: '2024-12-01',
    fechaFin: '2025-01-15',
    progreso: 20,
    prioridad: 'Media',
    hallazgos: 0
  },
  {
    id: '3',
    codigo: 'AUD-2024-003',
    nombre: 'Auditoría de Procesos Académicos',
    tipo: 'Académica',
    fase: 'revision',
    territorial: 'Valle del Cauca',
    sede: 'Cali',
    responsable: 'Ana Martínez',
    fechaInicio: '2024-10-01',
    fechaFin: '2024-11-30',
    progreso: 90,
    prioridad: 'Alta',
    hallazgos: 5
  }
];

const FASES = [
  { id: 'planeacion' as FaseAuditoria, label: 'Planeación', color: '#6B7280' },
  { id: 'en-curso' as FaseAuditoria, label: 'En Curso', color: '#3B82F6' },
  { id: 'revision' as FaseAuditoria, label: 'Revisión', color: '#F59E0B' },
  { id: 'completada' as FaseAuditoria, label: 'Completada', color: '#10B981' }
];

const TIPOS_AUDITORIA = [
  'Auditoría de Cumplimiento',
  'Auditoría Financiera',
  'Auditoría de Gestión',
  'Auditoría de Desempeño',
  'Auditoría Operacional',
  'Auditoría de Sistemas'
];

const TERRITORIALES = [
  'Nacional - Sede Central',
  'Antioquia - Medellín',
  'Atlántico - Barranquilla',
  'Bolívar - Cartagena',
  'Boyacá - Tunja',
  'Cundinamarca - Bogotá',
  'Valle del Cauca - Cali'
];

const LIDERES = [
  'Dra. María Rodríguez',
  'Dr. Carlos Méndez',
  'Mg. Ana Sánchez',
  'Dr. Juan Torres',
  'Dra. Patricia Gómez'
];

// ==================== COMPONENTE PRINCIPAL ====================
export function GestionAuditoriasSimple() {
  const [vistaActiva, setVistaActiva] = useState<VistaActiva>('kanban');
  const [auditorias, setAuditorias] = useState<Auditoria[]>(MOCK_AUDITORIAS);
  const [busqueda, setBusqueda] = useState('');
  const [modalNueva, setModalNueva] = useState(false);
  const [modalDetalle, setModalDetalle] = useState(false);
  const [auditoriaSeleccionada, setAuditoriaSeleccionada] = useState<Auditoria | null>(null);

  // Form para nueva auditoría
  const [formNueva, setFormNueva] = useState({
    nombre: '',
    tipo: '',
    territorial: '',
    lider: '',
    fechaInicio: '',
    fechaFin: ''
  });

  // Métricas
  const totalAuditorias = auditorias.length;
  const enCurso = auditorias.filter(a => a.fase === 'en-curso').length;
  const completadas = auditorias.filter(a => a.fase === 'completada').length;
  const hallazgosTotal = auditorias.reduce((sum, a) => sum + a.hallazgos, 0);

  // Crear auditoría
  const handleCrearAuditoria = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formNueva.nombre || !formNueva.tipo || !formNueva.territorial || 
        !formNueva.lider || !formNueva.fechaInicio || !formNueva.fechaFin) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    const nuevaAuditoria: Auditoria = {
      id: Date.now().toString(),
      codigo: `AUD-2024-${String(auditorias.length + 1).padStart(3, '0')}`,
      nombre: formNueva.nombre,
      tipo: formNueva.tipo,
      fase: 'planeacion',
      territorial: formNueva.territorial.split(' - ')[0],
      sede: formNueva.territorial,
      responsable: formNueva.lider,
      fechaInicio: formNueva.fechaInicio,
      fechaFin: formNueva.fechaFin,
      progreso: 0,
      prioridad: 'Media',
      hallazgos: 0
    };

    setAuditorias([...auditorias, nuevaAuditoria]);
    setModalNueva(false);
    setFormNueva({ nombre: '', tipo: '', territorial: '', lider: '', fechaInicio: '', fechaFin: '' });
    toast.success(`Auditoría ${nuevaAuditoria.codigo} creada exitosamente`);
  };

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case 'Alta': return '#EF4444';
      case 'Media': return '#F59E0B';
      case 'Baja': return '#10B981';
      default: return '#6B7280';
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6" style={{ background: '#F9FAFB', minHeight: '100vh' }}>
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-black" style={{ color: '#1F2937' }}>
            Gestión de Auditorías
          </h1>
          <p className="text-sm" style={{ color: '#6B7280' }}>
            Control Interno de Gestión - ESAP
          </p>
        </div>
      </div>

      {/* MÉTRICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total */}
        <div className="p-4 rounded-2xl border-2" style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl" style={{ background: '#FFF7ED' }}>
              <ClipboardCheck className="w-6 h-6" style={{ color: '#F97316' }} />
            </div>
            <div>
              <p className="text-sm" style={{ color: '#6B7280' }}>Total Auditorías</p>
              <p className="text-2xl font-black" style={{ color: '#1F2937' }}>{totalAuditorias}</p>
            </div>
          </div>
        </div>

        {/* En Curso */}
        <div className="p-4 rounded-2xl border-2" style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl" style={{ background: '#EFF6FF' }}>
              <Clock className="w-6 h-6" style={{ color: '#3B82F6' }} />
            </div>
            <div>
              <p className="text-sm" style={{ color: '#6B7280' }}>En Curso</p>
              <p className="text-2xl font-black" style={{ color: '#1F2937' }}>{enCurso}</p>
            </div>
          </div>
        </div>

        {/* Completadas */}
        <div className="p-4 rounded-2xl border-2" style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl" style={{ background: '#F0FDF4' }}>
              <CheckCircle2 className="w-6 h-6" style={{ color: '#10B981' }} />
            </div>
            <div>
              <p className="text-sm" style={{ color: '#6B7280' }}>Completadas</p>
              <p className="text-2xl font-black" style={{ color: '#1F2937' }}>{completadas}</p>
            </div>
          </div>
        </div>

        {/* Hallazgos */}
        <div className="p-4 rounded-2xl border-2" style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl" style={{ background: '#FEF3C7' }}>
              <AlertCircle className="w-6 h-6" style={{ color: '#F59E0B' }} />
            </div>
            <div>
              <p className="text-sm" style={{ color: '#6B7280' }}>Hallazgos</p>
              <p className="text-2xl font-black" style={{ color: '#1F2937' }}>{hallazgosTotal}</p>
            </div>
          </div>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="p-4 rounded-2xl border-2 space-y-3" style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}>
        {/* Búsqueda */}
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
          <input
            type="text"
            placeholder="Buscar auditorías..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border-2 outline-none"
            style={{ borderColor: '#E5E7EB' }}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        {/* Controles */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Vistas */}
          <div className="flex items-center gap-1 p-1 rounded-xl border-2" style={{ borderColor: '#E5E7EB', background: '#F9FAFB' }}>
            <button
              onClick={() => setVistaActiva('kanban')}
              className="px-3 py-2 rounded-lg flex items-center gap-2 transition-all"
              style={{
                background: vistaActiva === 'kanban' ? '#F97316' : 'transparent',
                color: vistaActiva === 'kanban' ? '#FFFFFF' : '#6B7280'
              }}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="text-sm font-medium hidden sm:inline">Kanban</span>
            </button>
            <button
              onClick={() => setVistaActiva('lista')}
              className="px-3 py-2 rounded-lg flex items-center gap-2 transition-all"
              style={{
                background: vistaActiva === 'lista' ? '#F97316' : 'transparent',
                color: vistaActiva === 'lista' ? '#FFFFFF' : '#6B7280'
              }}
            >
              <List className="w-4 h-4" />
              <span className="text-sm font-medium hidden sm:inline">Lista</span>
            </button>
            <button
              onClick={() => setVistaActiva('calendario')}
              className="px-3 py-2 rounded-lg flex items-center gap-2 transition-all"
              style={{
                background: vistaActiva === 'calendario' ? '#F97316' : 'transparent',
                color: vistaActiva === 'calendario' ? '#FFFFFF' : '#6B7280'
              }}
            >
              <CalendarIcon className="w-4 h-4" />
              <span className="text-sm font-medium hidden sm:inline">Calendario</span>
            </button>
            <button
              onClick={() => setVistaActiva('gantt')}
              className="px-3 py-2 rounded-lg flex items-center gap-2 transition-all"
              style={{
                background: vistaActiva === 'gantt' ? '#F97316' : 'transparent',
                color: vistaActiva === 'gantt' ? '#FFFFFF' : '#6B7280'
              }}
            >
              <BarChart3 className="w-4 h-4" />
              <span className="text-sm font-medium hidden sm:inline">Gantt</span>
            </button>
          </div>

          {/* Botón Nueva Auditoría */}
          <button
            onClick={() => {
              console.log('✅ Botón Nueva Auditoría clickeado - Versión Simple');
              setModalNueva(true);
            }}
            className="ml-auto px-4 py-2 rounded-xl flex items-center gap-2 font-medium transition-all hover:opacity-90"
            style={{ background: '#003DA5', color: '#FFFFFF' }}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nueva Auditoría</span>
          </button>
        </div>
      </div>

      {/* VISTA KANBAN */}
      {vistaActiva === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {FASES.map((fase) => {
            const auditoriasEnFase = auditorias.filter(a => a.fase === fase.id);
            
            return (
              <div key={fase.id}>
                {/* Header */}
                <div className="p-4 rounded-t-2xl border-2 border-b-0" style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-black text-sm" style={{ color: fase.color }}>{fase.label}</h3>
                    <span className="px-2 py-1 rounded-lg text-xs font-bold" style={{ background: `${fase.color}20`, color: fase.color }}>
                      {auditoriasEnFase.length}
                    </span>
                  </div>
                </div>

                {/* Tarjetas */}
                <div className="p-3 rounded-b-2xl border-2 border-t-0 space-y-3" style={{ background: '#F9FAFB', borderColor: '#E5E7EB', minHeight: '300px' }}>
                  {auditoriasEnFase.map((auditoria) => (
                    <div
                      key={auditoria.id}
                      className="p-4 rounded-xl border-2 cursor-pointer hover:shadow-lg transition-all"
                      style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
                      onClick={() => {
                        setAuditoriaSeleccionada(auditoria);
                        setModalDetalle(true);
                      }}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 rounded text-xs font-bold" style={{ background: getPrioridadColor(auditoria.prioridad), color: '#FFFFFF' }}>
                            {auditoria.prioridad}
                          </span>
                          <span className="text-xs" style={{ color: '#6B7280' }}>{auditoria.codigo}</span>
                        </div>
                        <h4 className="font-bold text-sm" style={{ color: '#1F2937' }}>{auditoria.nombre}</h4>
                        <div className="space-y-1 text-xs" style={{ color: '#6B7280' }}>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate">{auditoria.territorial}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="w-3 h-3" />
                            <span className="truncate">{auditoria.responsable}</span>
                          </div>
                        </div>
                        {/* Progreso */}
                        <div>
                          <div className="flex justify-between text-xs mb-1" style={{ color: '#6B7280' }}>
                            <span>Progreso</span>
                            <span className="font-bold">{auditoria.progreso}%</span>
                          </div>
                          <div className="h-2 rounded-full" style={{ background: '#E5E7EB' }}>
                            <div className="h-full rounded-full" style={{ background: fase.color, width: `${auditoria.progreso}%` }} />
                          </div>
                        </div>
                        {auditoria.hallazgos > 0 && (
                          <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: '#FEF3C7' }}>
                            <AlertCircle className="w-4 h-4" style={{ color: '#F59E0B' }} />
                            <span className="text-xs font-bold" style={{ color: '#F59E0B' }}>
                              {auditoria.hallazgos} Hallazgos
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VISTA LISTA */}
      {vistaActiva === 'lista' && (
        <div className="rounded-2xl border-2 overflow-hidden" style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ background: '#F9FAFB' }}>
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-black" style={{ color: '#6B7280' }}>CÓDIGO</th>
                  <th className="px-6 py-4 text-left text-xs font-black" style={{ color: '#6B7280' }}>NOMBRE</th>
                  <th className="px-6 py-4 text-left text-xs font-black" style={{ color: '#6B7280' }}>FASE</th>
                  <th className="px-6 py-4 text-left text-xs font-black" style={{ color: '#6B7280' }}>TERRITORIAL</th>
                  <th className="px-6 py-4 text-left text-xs font-black" style={{ color: '#6B7280' }}>RESPONSABLE</th>
                  <th className="px-6 py-4 text-left text-xs font-black" style={{ color: '#6B7280' }}>PROGRESO</th>
                  <th className="px-6 py-4 text-left text-xs font-black" style={{ color: '#6B7280' }}>HALLAZGOS</th>
                </tr>
              </thead>
              <tbody>
                {auditorias.map((auditoria) => {
                  const fase = FASES.find(f => f.id === auditoria.fase);
                  return (
                    <tr
                      key={auditoria.id}
                      className="border-t-2 hover:bg-orange-50 cursor-pointer transition-colors"
                      style={{ borderColor: '#E5E7EB' }}
                      onClick={() => {
                        setAuditoriaSeleccionada(auditoria);
                        setModalDetalle(true);
                      }}
                    >
                      <td className="px-6 py-4">
                        <span className="font-bold text-sm" style={{ color: '#1F2937' }}>{auditoria.codigo}</span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-sm" style={{ color: '#1F2937' }}>{auditoria.nombre}</p>
                        <p className="text-xs" style={{ color: '#6B7280' }}>{auditoria.sede}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded text-xs font-bold" style={{ background: `${fase?.color}20`, color: fase?.color }}>
                          {fase?.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm" style={{ color: '#6B7280' }}>{auditoria.territorial}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm" style={{ color: '#6B7280' }}>{auditoria.responsable}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 rounded-full" style={{ background: '#E5E7EB' }}>
                            <div className="h-full rounded-full" style={{ background: fase?.color, width: `${auditoria.progreso}%` }} />
                          </div>
                          <span className="text-sm font-bold" style={{ color: '#6B7280' }}>{auditoria.progreso}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {auditoria.hallazgos > 0 ? (
                          <span className="px-2 py-1 rounded text-xs font-bold" style={{ background: '#FEF3C7', color: '#F59E0B' }}>
                            {auditoria.hallazgos}
                          </span>
                        ) : (
                          <span className="text-sm" style={{ color: '#9CA3AF' }}>-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VISTA CALENDARIO */}
      {vistaActiva === 'calendario' && (
        <div className="p-8 rounded-2xl border-2 text-center" style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}>
          <CalendarIcon className="w-16 h-16 mx-auto mb-4" style={{ color: '#9CA3AF' }} />
          <h3 className="text-xl font-bold mb-2" style={{ color: '#1F2937' }}>Vista de Calendario</h3>
          <p className="text-sm" style={{ color: '#6B7280' }}>Próximamente disponible</p>
        </div>
      )}

      {/* VISTA GANTT */}
      {vistaActiva === 'gantt' && (
        <div className="p-8 rounded-2xl border-2 text-center" style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}>
          <BarChart3 className="w-16 h-16 mx-auto mb-4" style={{ color: '#9CA3AF' }} />
          <h3 className="text-xl font-bold mb-2" style={{ color: '#1F2937' }}>Diagrama de Gantt</h3>
          <p className="text-sm" style={{ color: '#6B7280' }}>Próximamente disponible</p>
        </div>
      )}

      {/* MODAL NUEVA AUDITORÍA */}
      {modalNueva && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.5)' }}
          onClick={() => setModalNueva(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6"
            style={{ background: '#FFFFFF' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b-2" style={{ borderColor: '#E5E7EB' }}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#003DA5' }}>
                  <Plus className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold" style={{ color: '#1F2937' }}>Nueva Auditoría</h2>
                  <p className="text-sm" style={{ color: '#6B7280' }}>Completa los datos básicos</p>
                </div>
              </div>
              <button
                onClick={() => setModalNueva(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" style={{ color: '#6B7280' }} />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleCrearAuditoria} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>
                  Nombre de la Auditoría <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 rounded-xl border-2 outline-none"
                  style={{ borderColor: '#E5E7EB' }}
                  placeholder="Ej: Auditoría de Gestión Financiera"
                  value={formNueva.nombre}
                  onChange={(e) => setFormNueva({ ...formNueva, nombre: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>
                    Tipo <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full px-4 py-2 rounded-xl border-2 outline-none"
                    style={{ borderColor: '#E5E7EB' }}
                    value={formNueva.tipo}
                    onChange={(e) => setFormNueva({ ...formNueva, tipo: e.target.value })}
                    required
                  >
                    <option value="">Selecciona el tipo</option>
                    {TIPOS_AUDITORIA.map((tipo) => (
                      <option key={tipo} value={tipo}>{tipo}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>
                    Líder <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full px-4 py-2 rounded-xl border-2 outline-none"
                    style={{ borderColor: '#E5E7EB' }}
                    value={formNueva.lider}
                    onChange={(e) => setFormNueva({ ...formNueva, lider: e.target.value })}
                    required
                  >
                    <option value="">Selecciona el líder</option>
                    {LIDERES.map((lider) => (
                      <option key={lider} value={lider}>{lider}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>
                  Territorial <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full px-4 py-2 rounded-xl border-2 outline-none"
                  style={{ borderColor: '#E5E7EB' }}
                  value={formNueva.territorial}
                  onChange={(e) => setFormNueva({ ...formNueva, territorial: e.target.value })}
                  required
                >
                  <option value="">Selecciona la territorial</option>
                  {TERRITORIALES.map((terr) => (
                    <option key={terr} value={terr}>{terr}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>
                    Fecha Inicio <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 rounded-xl border-2 outline-none"
                    style={{ borderColor: '#E5E7EB' }}
                    value={formNueva.fechaInicio}
                    onChange={(e) => setFormNueva({ ...formNueva, fechaInicio: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>
                    Fecha Fin <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 rounded-xl border-2 outline-none"
                    style={{ borderColor: '#E5E7EB' }}
                    value={formNueva.fechaFin}
                    onChange={(e) => setFormNueva({ ...formNueva, fechaFin: e.target.value })}
                    min={formNueva.fechaInicio}
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t-2" style={{ borderColor: '#E5E7EB' }}>
                <button
                  type="button"
                  className="flex-1 px-6 py-3 rounded-xl border-2 font-medium hover:bg-gray-50"
                  style={{ borderColor: '#E5E7EB', color: '#374151' }}
                  onClick={() => setModalNueva(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 rounded-xl font-medium text-white flex items-center justify-center gap-2"
                  style={{ background: '#003DA5' }}
                >
                  <Plus className="w-5 h-5" />
                  Crear Auditoría
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALLE */}
      {modalDetalle && auditoriaSeleccionada && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.5)' }}
          onClick={() => setModalDetalle(false)}
        >
          <div
            className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl p-6"
            style={{ background: '#FFFFFF' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b-2" style={{ borderColor: '#E5E7EB' }}>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 rounded text-xs font-bold" style={{ background: getPrioridadColor(auditoriaSeleccionada.prioridad), color: '#FFFFFF' }}>
                    {auditoriaSeleccionada.prioridad}
                  </span>
                  <span className="text-sm font-bold" style={{ color: '#6B7280' }}>{auditoriaSeleccionada.codigo}</span>
                </div>
                <h2 className="text-2xl font-bold" style={{ color: '#1F2937' }}>{auditoriaSeleccionada.nombre}</h2>
              </div>
              <button
                onClick={() => setModalDetalle(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" style={{ color: '#6B7280' }} />
              </button>
            </div>

            {/* Contenido */}
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-1" style={{ color: '#6B7280' }}>Tipo</p>
                  <p className="font-bold" style={{ color: '#1F2937' }}>{auditoriaSeleccionada.tipo}</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1" style={{ color: '#6B7280' }}>Fase</p>
                  <p className="font-bold" style={{ color: '#1F2937' }}>{FASES.find(f => f.id === auditoriaSeleccionada.fase)?.label}</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1" style={{ color: '#6B7280' }}>Territorial</p>
                  <p className="font-bold" style={{ color: '#1F2937' }}>{auditoriaSeleccionada.territorial}</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1" style={{ color: '#6B7280' }}>Responsable</p>
                  <p className="font-bold" style={{ color: '#1F2937' }}>{auditoriaSeleccionada.responsable}</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1" style={{ color: '#6B7280' }}>Fecha Inicio</p>
                  <p className="font-bold" style={{ color: '#1F2937' }}>{auditoriaSeleccionada.fechaInicio}</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1" style={{ color: '#6B7280' }}>Fecha Fin</p>
                  <p className="font-bold" style={{ color: '#1F2937' }}>{auditoriaSeleccionada.fechaFin}</p>
                </div>
              </div>

              {/* Progreso */}
              <div>
                <div className="flex justify-between mb-2">
                  <p className="text-sm font-medium" style={{ color: '#6B7280' }}>Progreso</p>
                  <p className="font-bold" style={{ color: '#1F2937' }}>{auditoriaSeleccionada.progreso}%</p>
                </div>
                <div className="h-4 rounded-full" style={{ background: '#E5E7EB' }}>
                  <div className="h-full rounded-full" style={{ 
                    background: FASES.find(f => f.id === auditoriaSeleccionada.fase)?.color, 
                    width: `${auditoriaSeleccionada.progreso}%` 
                  }} />
                </div>
              </div>

              {/* Hallazgos */}
              {auditoriaSeleccionada.hallazgos > 0 && (
                <div className="p-4 rounded-xl" style={{ background: '#FEF3C7' }}>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" style={{ color: '#F59E0B' }} />
                    <p className="font-bold" style={{ color: '#F59E0B' }}>
                      {auditoriaSeleccionada.hallazgos} Hallazgos Detectados
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
