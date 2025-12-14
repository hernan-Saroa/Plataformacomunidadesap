/**
 * GESTIÓN DE AUDITORÍAS - Todo en Uno
 * Dashboard Ejecutivo + Kanban + Lista + Calendario integrado
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  ClipboardCheck, TrendingUp, AlertCircle, Clock, Users, CheckCircle2,
  Eye, Edit, Trash2, GripVertical, MapPin, Building2, User, Download, Plus,
  Search, LayoutGrid, List as ListIcon, Calendar as CalendarIcon, Filter, X, Save, Layers
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { MetricCard } from '../shared/MetricCard';
import { ToolbarActions } from '../shared/ToolbarActions';
import { ResponsiveModal } from '../shared/ResponsiveModal';
import { DetalleAuditoriaEtapas } from './etapas/DetalleAuditoriaEtapas';
import { toast } from 'sonner@2.0.3';

type VistaActiva = 'kanban' | 'lista' | 'calendario' | 'detalle-etapas';
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

// Data para los selects
const TERRITORIALES = [
  'Cundinamarca', 'Antioquia', 'Valle del Cauca', 'Atlántico', 'Santander',
  'Bolívar', 'Boyacá', 'Caldas', 'Cauca', 'Cesar', 'Córdoba', 'Huila',
  'La Guajira', 'Magdalena', 'Meta', 'Nariño', 'Norte de Santander',
  'Quindío', 'Risaralda', 'Tolima'
];

const SEDES = [
  'Bogotá - Sede Central',
  'Medellín',
  'Cali',
  'Barranquilla',
  'Cartagena',
  'Bucaramanga',
  'Manizales',
  'Pereira',
  'Ibagué',
  'Pasto'
];

const TIPOS_AUDITORIA = [
  'Gestión',
  'Control Interno',
  'Académica',
  'RRHH',
  'Financiera',
  'TI',
  'Cumplimiento',
  'Operacional'
];

const RESPONSABLES = [
  'María González',
  'Carlos Ramírez',
  'Ana Martínez',
  'Luis Pérez',
  'Sandra López',
  'Jorge Castro',
  'Patricia Ruiz',
  'Fernando Silva'
];

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
  },
  {
    id: '4',
    codigo: 'AUD-2024-004',
    nombre: 'Auditoría de Recursos Humanos',
    tipo: 'RRHH',
    fase: 'completada',
    territorial: 'Atlántico',
    sede: 'Barranquilla',
    responsable: 'Luis Pérez',
    fechaInicio: '2024-09-01',
    fechaFin: '2024-10-31',
    progreso: 100,
    prioridad: 'Media',
    hallazgos: 2
  }
];

export function GestionAuditorias() {
  const [vistaActiva, setVistaActiva] = useState<VistaActiva>('kanban');
  const [auditorias, setAuditorias] = useState<Auditoria[]>(MOCK_AUDITORIAS);
  const [auditoriaSeleccionada, setAuditoriaSeleccionada] = useState<Auditoria | null>(null);
  const [modalDetalles, setModalDetalles] = useState(false);
  const [modalNuevaAuditoria, setModalNuevaAuditoria] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    nombre: '',
    tipo: '',
    territorial: '',
    sede: '',
    responsable: '',
    fechaInicio: '',
    fechaFin: '',
    prioridad: 'Media' as 'Alta' | 'Media' | 'Baja',
    fase: 'planeacion' as FaseAuditoria
  });

  const resetForm = () => {
    setFormData({
      nombre: '',
      tipo: '',
      territorial: '',
      sede: '',
      responsable: '',
      fechaInicio: '',
      fechaFin: '',
      prioridad: 'Media',
      fase: 'planeacion'
    });
  };

  const handleCrearAuditoria = () => {
    // Validaciones
    if (!formData.nombre || !formData.tipo || !formData.territorial || !formData.sede || 
        !formData.responsable || !formData.fechaInicio || !formData.fechaFin) {
      toast.error('Por favor completa todos los campos obligatorios');
      return;
    }

    // Generar código automático
    const year = new Date().getFullYear();
    const nextNumber = auditorias.length + 1;
    const codigo = `AUD-${year}-${String(nextNumber).padStart(3, '0')}`;

    // Crear nueva auditoría
    const nuevaAuditoria: Auditoria = {
      id: Date.now().toString(),
      codigo,
      nombre: formData.nombre,
      tipo: formData.tipo,
      fase: formData.fase,
      territorial: formData.territorial,
      sede: formData.sede,
      responsable: formData.responsable,
      fechaInicio: formData.fechaInicio,
      fechaFin: formData.fechaFin,
      progreso: 0,
      prioridad: formData.prioridad,
      hallazgos: 0
    };

    setAuditorias([...auditorias, nuevaAuditoria]);
    setModalNuevaAuditoria(false);
    resetForm();
    toast.success(`Auditoría ${codigo} creada exitosamente`);
  };

  // Métricas calculadas
  const totalAuditorias = auditorias.length;
  const enCurso = auditorias.filter(a => a.fase === 'en-curso').length;
  const completadas = auditorias.filter(a => a.fase === 'completada').length;
  const hallazgosTotal = auditorias.reduce((sum, a) => sum + a.hallazgos, 0);

  const fases: { id: FaseAuditoria; label: string; color: string }[] = [
    { id: 'planeacion', label: 'Planeación', color: '#6B7280' },
    { id: 'en-curso', label: 'En Curso', color: '#3B82F6' },
    { id: 'revision', label: 'Revisión', color: '#F59E0B' },
    { id: 'completada', label: 'Completada', color: '#10B981' }
  ];

  const handleVerDetalles = (auditoria: Auditoria) => {
    setAuditoriaSeleccionada(auditoria);
    setModalDetalles(true);
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
    <div className="space-y-6">
      {/* DASHBOARD EJECUTIVO - Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          title="Total Auditorías"
          value={totalAuditorias}
          icon={ClipboardCheck}
          iconColor="#F97316"
          iconBgColor="#FFF7ED"
          trend={{ value: "Año 2024", icon: TrendingUp, isPositive: true }}
        />

        <MetricCard
          title="En Curso"
          value={enCurso}
          icon={Clock}
          iconColor="#3B82F6"
          iconBgColor="#EFF6FF"
          subtitle="Activas"
        />

        <MetricCard
          title="Completadas"
          value={completadas}
          icon={CheckCircle2}
          iconColor="#10B981"
          iconBgColor="#F0FDF4"
          trend={{ 
            value: `${Math.round((completadas / totalAuditorias) * 100)}%`,
            icon: TrendingUp, 
            isPositive: true 
          }}
        />

        <MetricCard
          title="Hallazgos"
          value={hallazgosTotal}
          icon={AlertCircle}
          iconColor="#F59E0B"
          iconBgColor="#FEF3C7"
          subtitle="Detectados"
        />
      </div>

      {/* BARRA DE HERRAMIENTAS */}
      <ToolbarActions
        searchPlaceholder="Buscar auditorías..."
        searchValue={busqueda}
        onSearchChange={setBusqueda}
        views={['kanban', 'lista', 'calendario']}
        activeView={vistaActiva}
        onViewChange={(view) => setVistaActiva(view as VistaActiva)}
        onFilter={() => toast.info('Filtros disponibles próximamente')}
        onExport={() => toast.success('Exportando auditorías...')}
        onAdd={() => setModalNuevaAuditoria(true)}
        addButtonText="Nueva Auditoría"
        primaryColor="#F97316"
      />

      {/* VISTA KANBAN */}
      {vistaActiva === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {fases.map((fase) => {
            const auditoriasEnFase = auditorias.filter(a => a.fase === fase.id);
            
            return (
              <div key={fase.id} className="flex flex-col">
                {/* Header de columna */}
                <div className="p-4 rounded-t-2xl border-2 border-b-0" style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-black text-sm" style={{ color: fase.color }}>
                      {fase.label}
                    </h3>
                    <Badge style={{ background: `${fase.color}20`, color: fase.color }}>
                      {auditoriasEnFase.length}
                    </Badge>
                  </div>
                  <div className="h-1 rounded-full" style={{ background: `${fase.color}20` }}>
                    <div className="h-full rounded-full" style={{ background: fase.color, width: '100%' }} />
                  </div>
                </div>

                {/* Tarjetas de auditorías */}
                <div className="flex-1 p-2 rounded-b-2xl border-2 border-t-0 space-y-3" style={{ background: '#F9FAFB', borderColor: '#E5E7EB', minHeight: '300px' }}>
                  {auditoriasEnFase.map((auditoria) => (
                    <motion.div
                      key={auditoria.id}
                      className="p-4 rounded-xl border-2 cursor-move hover:shadow-lg transition-all"
                      style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => handleVerDetalles(auditoria)}
                    >
                      <div className="flex items-start gap-2 mb-3">
                        <GripVertical className="w-4 h-4 flex-shrink-0" style={{ color: '#9CA3AF' }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge style={{ background: getPrioridadColor(auditoria.prioridad), color: '#FFFFFF', fontSize: '10px' }}>
                              {auditoria.prioridad}
                            </Badge>
                            <span className="text-xs" style={{ color: '#6B7280' }}>{auditoria.codigo}</span>
                          </div>
                          <h4 className="font-bold text-sm mb-2" style={{ color: '#1F2937' }}>
                            {auditoria.nombre}
                          </h4>
                          
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs" style={{ color: '#6B7280' }}>
                              <MapPin className="w-3 h-3" />
                              <span className="truncate">{auditoria.territorial}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs" style={{ color: '#6B7280' }}>
                              <Building2 className="w-3 h-3" />
                              <span className="truncate">{auditoria.sede}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs" style={{ color: '#6B7280' }}>
                              <User className="w-3 h-3" />
                              <span className="truncate">{auditoria.responsable}</span>
                            </div>
                          </div>

                          {/* Progreso */}
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs mb-1" style={{ color: '#6B7280' }}>
                              <span>Progreso</span>
                              <span className="font-bold">{auditoria.progreso}%</span>
                            </div>
                            <div className="h-2 rounded-full" style={{ background: '#E5E7EB' }}>
                              <div 
                                className="h-full rounded-full transition-all" 
                                style={{ background: fase.color, width: `${auditoria.progreso}%` }} 
                              />
                            </div>
                          </div>

                          {auditoria.hallazgos > 0 && (
                            <div className="mt-3 flex items-center gap-2 p-2 rounded-lg" style={{ background: '#FEF3C7' }}>
                              <AlertCircle className="w-4 h-4" style={{ color: '#F59E0B' }} />
                              <span className="text-xs font-bold" style={{ color: '#F59E0B' }}>
                                {auditoria.hallazgos} Hallazgos
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
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
                  <th className="px-6 py-4 text-left text-xs font-black" style={{ color: '#6B7280' }}>TIPO</th>
                  <th className="px-6 py-4 text-left text-xs font-black" style={{ color: '#6B7280' }}>FASE</th>
                  <th className="px-6 py-4 text-left text-xs font-black" style={{ color: '#6B7280' }}>TERRITORIAL</th>
                  <th className="px-6 py-4 text-left text-xs font-black" style={{ color: '#6B7280' }}>RESPONSABLE</th>
                  <th className="px-6 py-4 text-left text-xs font-black" style={{ color: '#6B7280' }}>PROGRESO</th>
                  <th className="px-6 py-4 text-left text-xs font-black" style={{ color: '#6B7280' }}>HALLAZGOS</th>
                  <th className="px-6 py-4 text-left text-xs font-black" style={{ color: '#6B7280' }}>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {auditorias.map((auditoria, index) => {
                  const fase = fases.find(f => f.id === auditoria.fase);
                  return (
                    <tr 
                      key={auditoria.id} 
                      className="border-t-2 hover:bg-orange-50 transition-colors cursor-pointer"
                      style={{ borderColor: '#E5E7EB' }}
                      onClick={() => handleVerDetalles(auditoria)}
                    >
                      <td className="px-6 py-4">
                        <span className="font-bold text-sm" style={{ color: '#1F2937' }}>{auditoria.codigo}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-bold text-sm" style={{ color: '#1F2937' }}>{auditoria.nombre}</p>
                          <p className="text-xs" style={{ color: '#6B7280' }}>{auditoria.sede}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline">{auditoria.tipo}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge style={{ background: `${fase?.color}20`, color: fase?.color }}>
                          {fase?.label}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm" style={{ color: '#6B7280' }}>{auditoria.territorial}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm" style={{ color: '#6B7280' }}>{auditoria.responsable}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full" style={{ background: '#E5E7EB', maxWidth: '80px' }}>
                            <div 
                              className="h-full rounded-full" 
                              style={{ background: fase?.color, width: `${auditoria.progreso}%` }} 
                            />
                          </div>
                          <span className="text-sm font-bold" style={{ color: '#6B7280' }}>{auditoria.progreso}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {auditoria.hallazgos > 0 ? (
                          <Badge style={{ background: '#FEF3C7', color: '#F59E0B' }}>
                            {auditoria.hallazgos}
                          </Badge>
                        ) : (
                          <span className="text-sm" style={{ color: '#9CA3AF' }}>-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleVerDetalles(auditoria); }}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                            <Trash2 className="w-4 h-4" style={{ color: '#EF4444' }} />
                          </Button>
                        </div>
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
          <CalendarIcon className="w-16 h-16 mx-auto mb-4" style={{ color: '#F97316' }} />
          <h3 className="font-black text-xl mb-2" style={{ color: '#1F2937' }}>Vista de Calendario</h3>
          <p style={{ color: '#6B7280' }}>Visualiza auditorías en formato de calendario con fechas de inicio y fin</p>
          <Button className="mt-4" style={{ background: '#F97316', color: '#FFFFFF' }}>
            Próximamente
          </Button>
        </div>
      )}

      {/* MODAL DE DETALLES */}
      <Dialog open={modalDetalles} onOpenChange={setModalDetalles}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 rounded-xl" style={{ background: '#FFF7ED' }}>
                <ClipboardCheck className="w-6 h-6" style={{ color: '#F97316' }} />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-black" style={{ color: '#1F2937' }}>
                  {auditoriaSeleccionada?.nombre}
                </h3>
                <p className="text-sm" style={{ color: '#6B7280' }}>
                  {auditoriaSeleccionada?.codigo}
                </p>
              </div>
              <Badge style={{ background: getPrioridadColor(auditoriaSeleccionada?.prioridad || 'Media'), color: '#FFFFFF' }}>
                {auditoriaSeleccionada?.prioridad}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {auditoriaSeleccionada && (
            <div className="space-y-6">
              {/* Info General */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold mb-1 block" style={{ color: '#6B7280' }}>Tipo de Auditoría</label>
                  <p className="font-bold" style={{ color: '#1F2937' }}>{auditoriaSeleccionada.tipo}</p>
                </div>
                <div>
                  <label className="text-xs font-bold mb-1 block" style={{ color: '#6B7280' }}>Fase Actual</label>
                  <Badge style={{ background: `${fases.find(f => f.id === auditoriaSeleccionada.fase)?.color}20`, color: fases.find(f => f.id === auditoriaSeleccionada.fase)?.color }}>
                    {fases.find(f => f.id === auditoriaSeleccionada.fase)?.label}
                  </Badge>
                </div>
                <div>
                  <label className="text-xs font-bold mb-1 block" style={{ color: '#6B7280' }}>Territorial</label>
                  <p className="font-bold" style={{ color: '#1F2937' }}>{auditoriaSeleccionada.territorial}</p>
                </div>
                <div>
                  <label className="text-xs font-bold mb-1 block" style={{ color: '#6B7280' }}>Sede</label>
                  <p className="font-bold" style={{ color: '#1F2937' }}>{auditoriaSeleccionada.sede}</p>
                </div>
                <div>
                  <label className="text-xs font-bold mb-1 block" style={{ color: '#6B7280' }}>Responsable</label>
                  <p className="font-bold" style={{ color: '#1F2937' }}>{auditoriaSeleccionada.responsable}</p>
                </div>
                <div>
                  <label className="text-xs font-bold mb-1 block" style={{ color: '#6B7280' }}>Hallazgos Identificados</label>
                  <p className="font-bold" style={{ color: auditoriaSeleccionada.hallazgos > 0 ? '#F59E0B' : '#10B981' }}>
                    {auditoriaSeleccionada.hallazgos}
                  </p>
                </div>
              </div>

              {/* Fechas y Progreso */}
              <div className="p-4 rounded-xl" style={{ background: '#F9FAFB' }}>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-xs font-bold mb-1 block" style={{ color: '#6B7280' }}>Fecha de Inicio</label>
                    <p className="font-bold" style={{ color: '#1F2937' }}>{new Date(auditoriaSeleccionada.fechaInicio).toLocaleDateString('es-CO')}</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold mb-1 block" style={{ color: '#6B7280' }}>Fecha de Finalización</label>
                    <p className="font-bold" style={{ color: '#1F2937' }}>{new Date(auditoriaSeleccionada.fechaFin).toLocaleDateString('es-CO')}</p>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold" style={{ color: '#6B7280' }}>Progreso General</label>
                    <span className="font-black" style={{ color: '#F97316' }}>{auditoriaSeleccionada.progreso}%</span>
                  </div>
                  <div className="h-3 rounded-full" style={{ background: '#E5E7EB' }}>
                    <div 
                      className="h-full rounded-full transition-all" 
                      style={{ background: '#F97316', width: `${auditoriaSeleccionada.progreso}%` }} 
                    />
                  </div>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex gap-3">
                <Button className="flex-1" style={{ background: '#F97316', color: '#FFFFFF' }}>
                  <Edit className="w-4 h-4 mr-2" />
                  Editar Auditoría
                </Button>
                <Button variant="outline" className="border-2">
                  <Download className="w-4 h-4 mr-2" />
                  Descargar Informe
                </Button>
                <Button variant="outline" className="border-2" style={{ borderColor: '#EF4444', color: '#EF4444' }}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL DE NUEVA AUDITORÍA */}
      <Dialog open={modalNuevaAuditoria} onOpenChange={setModalNuevaAuditoria}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 rounded-xl" style={{ background: '#FFF7ED' }}>
                <ClipboardCheck className="w-6 h-6" style={{ color: '#F97316' }} />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-black" style={{ color: '#1F2937' }}>
                  Crear Nueva Auditoría
                </h3>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Info General */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold mb-1 block" style={{ color: '#6B7280' }}>Nombre de la Auditoría</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold mb-1 block" style={{ color: '#6B7280' }}>Tipo de Auditoría</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                >
                  <option value="">Selecciona un tipo</option>
                  {TIPOS_AUDITORIA.map(tipo => (
                    <option key={tipo} value={tipo}>{tipo}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold mb-1 block" style={{ color: '#6B7280' }}>Territorial</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.territorial}
                  onChange={(e) => setFormData({ ...formData, territorial: e.target.value })}
                >
                  <option value="">Selecciona un territorial</option>
                  {TERRITORIALES.map(territorial => (
                    <option key={territorial} value={territorial}>{territorial}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold mb-1 block" style={{ color: '#6B7280' }}>Sede</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.sede}
                  onChange={(e) => setFormData({ ...formData, sede: e.target.value })}
                >
                  <option value="">Selecciona una sede</option>
                  {SEDES.map(sede => (
                    <option key={sede} value={sede}>{sede}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold mb-1 block" style={{ color: '#6B7280' }}>Responsable</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.responsable}
                  onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
                >
                  <option value="">Selecciona un responsable</option>
                  {RESPONSABLES.map(responsable => (
                    <option key={responsable} value={responsable}>{responsable}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold mb-1 block" style={{ color: '#6B7280' }}>Prioridad</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.prioridad}
                  onChange={(e) => setFormData({ ...formData, prioridad: e.target.value as 'Alta' | 'Media' | 'Baja' })}
                >
                  <option value="Alta">Alta</option>
                  <option value="Media">Media</option>
                  <option value="Baja">Baja</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold mb-1 block" style={{ color: '#6B7280' }}>Fecha de Inicio</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.fechaInicio}
                  onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold mb-1 block" style={{ color: '#6B7280' }}>Fecha de Finalización</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.fechaFin}
                  onChange={(e) => setFormData({ ...formData, fechaFin: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold mb-1 block" style={{ color: '#6B7280' }}>Fase Actual</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.fase}
                  onChange={(e) => setFormData({ ...formData, fase: e.target.value as FaseAuditoria })}
                >
                  <option value="planeacion">Planeación</option>
                  <option value="en-curso">En Curso</option>
                  <option value="revision">Revisión</option>
                  <option value="completada">Completada</option>
                </select>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex gap-3">
              <Button className="flex-1" style={{ background: '#F97316', color: '#FFFFFF' }} onClick={handleCrearAuditoria}>
                <Plus className="w-4 h-4 mr-2" />
                Crear Auditoría
              </Button>
              <Button variant="outline" className="border-2" onClick={() => setModalNuevaAuditoria(false)}>
                <X className="w-4 h-4" />
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}