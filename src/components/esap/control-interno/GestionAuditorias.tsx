/**
 * GESTIÓN DE AUDITORÍAS - Todo en Uno
 * Dashboard Ejecutivo + Kanban + Lista + Calendario integrado
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  ClipboardCheck, TrendingUp, AlertCircle, Clock, Users, CheckCircle2,
  Eye, Edit, Trash2, GripVertical, MapPin, Building2, User, Download, Plus,
  Search, LayoutGrid, List as ListIcon, Calendar as CalendarIcon, Filter, X, Save, Layers, BarChart3
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { MetricCard } from '../shared/MetricCard';
import { ToolbarActions } from '../shared/ToolbarActions';
import { ResponsiveModal } from '../shared/ResponsiveModal';
import { DetalleAuditoriaEtapas } from './etapas/DetalleAuditoriaEtapas';
import { ModalCrearAuditoria } from './ModalCrearAuditoria';
import { ModalDetalleAuditoriaCompleto } from './ModalDetalleAuditoriaCompleto';
import { CalendarioAuditorias } from './CalendarioAuditorias';
import { ModalNuevaAuditoriaSimple } from './ModalNuevaAuditoriaSimple';
import { toast } from 'sonner@2.0.3';

type VistaActiva = 'kanban' | 'lista' | 'calendario' | 'gantt' | 'detalle-etapas';
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

  // Handler para crear auditoría desde el nuevo modal
  const handleCrearNuevaAuditoria = (auditoriaData: any) => {
    const nuevaAuditoria: Auditoria = {
      id: Date.now().toString(),
      codigo: auditoriaData.codigo,
      nombre: auditoriaData.nombre,
      tipo: auditoriaData.tipo,
      fase: 'planeacion', // Por defecto empieza en planeación
      territorial: auditoriaData.territorial.split(' - ')[0], // Solo el nombre sin detalles
      sede: auditoriaData.territorial, // El valor completo
      responsable: auditoriaData.liderAuditoria,
      fechaInicio: auditoriaData.fechaInicio,
      fechaFin: auditoriaData.fechaFin,
      progreso: 0,
      prioridad: 'Media', // Prioridad por defecto
      hallazgos: 0
    };

    setAuditorias([...auditorias, nuevaAuditoria]);
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

  const handleGuardarCambiosAuditoria = (datos: any) => {
    // Actualizar la auditoría con los nuevos datos
    const auditoriasActualizadas = auditorias.map(a => 
      a.id === auditoriaSeleccionada?.id 
        ? { ...a, ...datos }
        : a
    );
    setAuditorias(auditoriasActualizadas);
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
        views={['kanban', 'lista', 'calendario', 'gantt']}
        activeView={vistaActiva}
        onViewChange={(view) => setVistaActiva(view as VistaActiva)}
        onFilter={() => toast.info('Filtros disponibles próximamente')}
        onExport={() => toast.success('Exportando auditorías...')}
        onAdd={() => {
          console.log('🚀 Botón Nueva Auditoría clickeado');
          setModalNuevaAuditoria(true);
        }}
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
        <CalendarioAuditorias 
          auditorias={auditorias} 
          onVerDetalles={handleVerDetalles}
        />
      )}

      {/* VISTA GANTT */}
      {vistaActiva === 'gantt' && (
        <div className="rounded-2xl border-2 overflow-hidden" style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}>
          {/* Header */}
          <div className="p-4 border-b-2" style={{ background: '#F9FAFB', borderColor: '#E5E7EB' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl" style={{ background: '#FFF7ED' }}>
                  <BarChart3 className="w-5 h-5" style={{ color: '#F97316' }} />
                </div>
                <div>
                  <h3 className="font-black" style={{ color: '#1F2937' }}>Diagrama de Gantt</h3>
                  <p className="text-xs" style={{ color: '#6B7280' }}>Timeline de auditorías por fecha</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  <Clock className="w-3 h-3 mr-1" />
                  {auditorias.length} Auditorías
                </Badge>
              </div>
            </div>
          </div>

          {/* Gantt Content */}
          <div className="p-6 overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Timeline Header - Meses */}
              <div className="grid grid-cols-12 gap-1 mb-6">
                {['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'].map((mes, idx) => (
                  <div key={idx} className="text-center">
                    <span className="text-xs font-bold" style={{ color: '#6B7280' }}>{mes}</span>
                  </div>
                ))}
              </div>

              {/* Gantt Bars */}
              <div className="space-y-4">
                {auditorias.map((auditoria) => {
                  const fase = fases.find(f => f.id === auditoria.fase);
                  const fechaInicio = new Date(auditoria.fechaInicio);
                  const fechaFin = new Date(auditoria.fechaFin);
                  
                  // Calcular posición en el grid (0-100%)
                  const mesInicio = fechaInicio.getMonth(); // 0-11
                  const mesFin = fechaFin.getMonth(); // 0-11
                  const diaInicio = fechaInicio.getDate();
                  const diaFin = fechaFin.getDate();
                  
                  // Posición de inicio como % (mes + porcentaje del día en el mes)
                  const posicionInicio = (mesInicio / 12) * 100 + (diaInicio / 30 / 12) * 100;
                  // Ancho como % basado en la duración
                  const duracionMeses = mesFin - mesInicio + (diaFin - diaInicio) / 30;
                  const ancho = (duracionMeses / 12) * 100;

                  return (
                    <div key={auditoria.id} className="relative">
                      {/* Nombre de la auditoría */}
                      <div className="flex items-start gap-3 mb-2">
                        <div className="w-64 flex-shrink-0">
                          <div className="flex items-center gap-2">
                            <Badge 
                              style={{ 
                                background: getPrioridadColor(auditoria.prioridad), 
                                color: '#FFFFFF',
                                fontSize: '9px',
                                padding: '2px 6px'
                              }}
                            >
                              {auditoria.prioridad}
                            </Badge>
                            <span className="text-xs font-bold truncate" style={{ color: '#1F2937' }}>
                              {auditoria.codigo}
                            </span>
                          </div>
                          <p className="text-xs truncate mt-1" style={{ color: '#6B7280' }}>
                            {auditoria.nombre}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <User className="w-3 h-3" style={{ color: '#9CA3AF' }} />
                            <span className="text-xs truncate" style={{ color: '#6B7280' }}>
                              {auditoria.responsable}
                            </span>
                          </div>
                        </div>

                        {/* Barra de timeline */}
                        <div className="flex-1 relative" style={{ minHeight: '60px' }}>
                          {/* Grid de fondo */}
                          <div className="absolute inset-0 grid grid-cols-12 gap-1">
                            {Array.from({ length: 12 }).map((_, idx) => (
                              <div 
                                key={idx} 
                                className="border-l" 
                                style={{ borderColor: '#E5E7EB' }}
                              />
                            ))}
                          </div>

                          {/* Barra de progreso */}
                          <div 
                            className="absolute top-4 h-8 rounded-lg cursor-pointer hover:shadow-lg transition-all group"
                            style={{ 
                              left: `${posicionInicio}%`,
                              width: `${ancho}%`,
                              background: `linear-gradient(90deg, ${fase?.color}E6 0%, ${fase?.color} 100%)`,
                              minWidth: '60px'
                            }}
                            onClick={() => handleVerDetalles(auditoria)}
                          >
                            {/* Progreso interno */}
                            <div 
                              className="h-full rounded-lg opacity-30"
                              style={{ 
                                background: '#FFFFFF',
                                width: `${100 - auditoria.progreso}%`,
                                marginLeft: `${auditoria.progreso}%`
                              }}
                            />
                            
                            {/* Tooltip en hover */}
                            <div className="absolute -top-20 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                              <div className="p-3 rounded-xl shadow-xl border-2" style={{ background: '#FFFFFF', borderColor: '#E5E7EB', minWidth: '200px' }}>
                                <p className="font-bold text-xs mb-1" style={{ color: '#1F2937' }}>{auditoria.nombre}</p>
                                <div className="flex items-center justify-between text-xs mb-1" style={{ color: '#6B7280' }}>
                                  <span>Inicio:</span>
                                  <span className="font-bold">{fechaInicio.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs mb-2" style={{ color: '#6B7280' }}>
                                  <span>Fin:</span>
                                  <span className="font-bold">{fechaFin.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span style={{ color: '#6B7280' }}>Progreso:</span>
                                  <span className="font-black" style={{ color: fase?.color }}>{auditoria.progreso}%</span>
                                </div>
                              </div>
                            </div>

                            {/* Etiqueta de progreso */}
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-xs font-black" style={{ color: '#FFFFFF', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                                {auditoria.progreso}%
                              </span>
                            </div>
                          </div>

                          {/* Fechas debajo */}
                          <div 
                            className="absolute bottom-0 flex items-center justify-between text-xs"
                            style={{ 
                              left: `${posicionInicio}%`,
                              width: `${ancho}%`,
                              minWidth: '60px'
                            }}
                          >
                            <span className="font-bold" style={{ color: fase?.color }}>
                              {fechaInicio.getDate()}/{fechaInicio.getMonth() + 1}
                            </span>
                            <span className="font-bold" style={{ color: fase?.color }}>
                              {fechaFin.getDate()}/{fechaFin.getMonth() + 1}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Leyenda */}
          <div className="p-4 border-t-2" style={{ background: '#F9FAFB', borderColor: '#E5E7EB' }}>
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-xs font-bold" style={{ color: '#6B7280' }}>FASES:</span>
              {fases.map((fase) => (
                <div key={fase.id} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ background: fase.color }} />
                  <span className="text-xs" style={{ color: '#6B7280' }}>{fase.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE DETALLES COMPLETO CON PESTAÑAS */}
      {auditoriaSeleccionada && (
        <ModalDetalleAuditoriaCompleto
          auditoria={auditoriaSeleccionada}
          open={modalDetalles}
          onOpenChange={setModalDetalles}
          onGuardarCambios={handleGuardarCambiosAuditoria}
        />
      )}

      {/* MODAL DE NUEVA AUDITORÍA - ACTUALIZADO */}
      <ModalNuevaAuditoriaSimple
        open={modalNuevaAuditoria}
        onOpenChange={setModalNuevaAuditoria}
        onCrear={handleCrearNuevaAuditoria}
      />
    </div>
  );
}