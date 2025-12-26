/**
 * SISTEMA COMPLETO - CONTROL INTERNO DISCIPLINARIO
 * Módulo funcional con todas las secciones:
 * - Dashboard Ejecutivo
 * - Gestión de Procesos
 * - Profesionales
 * - Reportes
 * - Configuración
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard, FolderOpen, Users, BarChart3, Settings,
  Search, Plus, Filter, Download, Eye, Edit, Trash2, MoreVertical,
  X, Check, Clock, AlertTriangle, CheckCircle, FolderOpen as Folder, FileText,
  Calendar, User, Mail, Phone, MapPin, Save, Upload, ChevronDown, ChevronRight,
  TrendingUp, Star, Award, Target, ChevronLeft, List, Columns3, Scale,
  Archive, BookOpen, Bell
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Avatar, AvatarFallback } from '../../ui/avatar';
import { toast } from 'sonner@2.0.3';
import { ModuleLayout, MenuItem } from '../shared/ModuleLayout';
import { GestionProcesos } from './GestionProcesos';
// import { GestionNoticias } from './GestionNoticias';
import { GestionProfesionales } from './GestionProfesionales';
// import { ModuloReportes } from './ModuloReportes';
import { ModuloConfiguracion } from './ModuloConfiguracion';
import { GestionNoticias } from './GestionNoticias'; // NUEVO: Módulo RF001
import { GestionProcesosProfesionalesCompleto } from './GestionProcesosProfesionalesCompleto'; // ✅ RF003 100% Funcional
import { RevisionAprobacionJefe } from './RevisionAprobacionJefe'; // ✅ RF004 100% Funcional
import { ExpedienteElectronico } from './ExpedienteElectronico'; // ✅ RF005 100% Funcional
import { GestionTerminosAlertas } from './GestionTerminosAlertas'; // ✅ RF006 100% Funcional
import { DashboardEjecutivoIntegrado } from './DashboardEjecutivoIntegrado'; // ✅ Dashboard Hub Operativo
import { DashboardKanbanOperativo } from './DashboardKanbanOperativo'; // ✅ Kanban Operativo Completo
import { ModelosSoporteDisciplinario } from './ModelosSoporteDisciplinario'; // ✅ Modelos de Soporte

import { disciplinaryService, DisciplinaryProcess } from '../../../services/api/disciplinary.service';

// TIPOS GLOBALES
interface Proceso {
  id: string;
  consecutivo: string;
  noticia: string;
  disciplinable: string;
  cedula: string;
  etapaActual: string;
  semaforo: 'verde' | 'amarillo' | 'rojo';
  diasRestantes: number;
  porcentajeTiempo: number;
  profesionalAsignado: string;
  fechaCreacion: string;
  ultimaActuacion: string;
  documentos: number;
  fechaVencimiento: string;
}

// Mapper function
const mapBackendToFrontend = (
  bp: DisciplinaryProcess,
  stageConfigs: any[] = [],
  globalConfig: any = null
): Proceso => {
  const stageMap: Record<string, string> = {
    'EVALUACION': 'Valoración',
    'INDAGACION_PREVIA': 'Indagación',
    'INVESTIGACION': 'Investigación',
    'JUZGAMIENTO': 'Juzgamiento'
  };

  const vencimiento = new Date(bp.fechaVencimientoEtapa);
  const hoy = new Date();
  const diffTime = vencimiento.getTime() - hoy.getTime();
  const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Lógica Semáforo Dinámica
  let semaforo: 'verde' | 'amarillo' | 'rojo' = 'verde';
  let porcentajeTiempo = 0;

  if (stageConfigs.length > 0 && globalConfig) {
    const stage = stageConfigs.find(s => s.nombreEtapa === bp.etapaActual);
    const duracionTotal = stage ? stage.diasDuracion : 100; // Default si falla

    // Calcular días trancurridos aproximados (Duración - Restantes)
    // Nota: Esto asume que fechaVencimiento fue calculada correctamente al inicio
    const diasTranscurridos = duracionTotal - diasRestantes;
    porcentajeTiempo = Math.max(0, Math.round((diasTranscurridos / duracionTotal) * 100));

    // Umbrales de base de datos
    const { porcentajeRiesgo, porcentajeCritico } = globalConfig.alertSettings || { porcentajeRiesgo: 85, porcentajeCritico: 95 };

    if (porcentajeTiempo >= porcentajeCritico || diasRestantes < 0) {
      semaforo = 'rojo';
    } else if (porcentajeTiempo >= porcentajeRiesgo) {
      semaforo = 'amarillo';
    }
  } else {
    // Fallback Legacy
    if (diasRestantes < 0) semaforo = 'rojo';
    else if (diasRestantes < 5) semaforo = 'amarillo';
    porcentajeTiempo = 50; // Dummy
  }

  return {
    id: bp.id,
    consecutivo: bp.radicadoProceso,
    noticia: bp.news?.radicado || 'N/A',
    disciplinable: bp.news?.disciplinable?.nombre || 'Desconocido',
    cedula: bp.news?.disciplinable?.cedula || 'N/A',
    etapaActual: bp.etapaActual,
    semaforo,
    diasRestantes,
    porcentajeTiempo,
    profesionalAsignado: bp.abogadoAsignadoNombre || 'Sin asignar',
    fechaCreacion: new Date(bp.createdAt).toISOString().split('T')[0],
    ultimaActuacion: 'Actualización del sistema',
    documentos: 0,
    fechaVencimiento: bp.fechaVencimientoEtapa ? new Date(bp.fechaVencimientoEtapa).toISOString().split('T')[0] : 'N/A'
  };
};

interface Profesional {
  id: string;
  nombre: string;
  cargo: string;
  procesosAsignados: number;
  capacidadMaxima: number;
  email: string;
  telefono: string;
  especialidad: string;
}

interface Estadistica {
  titulo: string;
  valor: number | string;
  cambio?: number;
  icono: any;
  color: string;
  descripcion: string;
}

// MOCK DATA COMPLETO
const PROCESOS_MOCK: Proceso[] = [
  {
    id: '1',
    consecutivo: 'PD-2025-0025',
    noticia: 'ND-2025-0152',
    disciplinable: 'Ana María López Martínez',
    cedula: '52123456',
    etapaActual: 'EVALUACION',
    semaforo: 'amarillo',
    diasRestantes: 3,
    porcentajeTiempo: 70,
    profesionalAsignado: 'Juan Pérez',
    fechaCreacion: '2025-01-26',
    ultimaActuacion: 'Asignado para valoración',
    documentos: 5,
    fechaVencimiento: '2025-02-02'
  },
  {
    id: '2',
    consecutivo: 'PD-2025-0018',
    noticia: 'ND-2025-0089',
    disciplinable: 'Roberto Sánchez Cruz',
    cedula: '77385960',
    etapaActual: 'INDAGACION_PREVIA',
    semaforo: 'verde',
    diasRestantes: 45,
    porcentajeTiempo: 35,
    profesionalAsignado: 'María Torres',
    fechaCreacion: '2024-12-15',
    ultimaActuacion: 'Auto de indagación previa notificado',
    documentos: 12,
    fechaVencimiento: '2025-03-15'
  },
  {
    id: '3',
    consecutivo: 'PD-2024-0156',
    noticia: 'ND-2024-0891',
    disciplinable: 'Patricia Herrera Gómez',
    cedula: '33445556',
    etapaActual: 'INVESTIGACION',
    semaforo: 'rojo',
    diasRestantes: -12,
    porcentajeTiempo: 115,
    profesionalAsignado: 'Carlos Mendoza',
    fechaCreacion: '2024-09-20',
    ultimaActuacion: 'Investigación disciplinaria en curso',
    documentos: 28,
    fechaVencimiento: '2025-01-18'
  },
  {
    id: '4',
    consecutivo: 'PD-2025-0042',
    noticia: 'ND-2025-0201',
    disciplinable: 'Jorge Ramírez Silva',
    cedula: '11223334',
    etapaActual: 'EVALUACION',
    semaforo: 'verde',
    diasRestantes: 15,
    porcentajeTiempo: 20,
    profesionalAsignado: 'Juan Pérez',
    fechaCreacion: '2025-01-20',
    ultimaActuacion: 'Documentos allegados',
    documentos: 3,
    fechaVencimiento: '2025-02-15'
  },
  {
    id: '5',
    consecutivo: 'PD-2025-0008',
    noticia: 'ND-2025-0045',
    disciplinable: 'Luis Fernando Castro',
    cedula: '44556677',
    etapaActual: 'JUZGAMIENTO',
    semaforo: 'verde',
    diasRestantes: 30,
    porcentajeTiempo: 75,
    profesionalAsignado: 'Ana González',
    fechaCreacion: '2024-11-10',
    ultimaActuacion: 'Audiencia programada',
    documentos: 45,
    fechaVencimiento: '2025-03-01'
  }
];

const PROFESIONALES_MOCK: Profesional[] = [
  {
    id: '1',
    nombre: 'Juan Pérez Rodríguez',
    cargo: 'Profesional Especializado',
    procesosAsignados: 8,
    capacidadMaxima: 12,
    email: 'juan.perez@esap.edu.co',
    telefono: '3001234567',
    especialidad: 'Derecho Disciplinario'
  },
  {
    id: '2',
    nombre: 'María Torres Gómez',
    cargo: 'Profesional Universitario',
    procesosAsignados: 6,
    capacidadMaxima: 10,
    email: 'maria.torres@esap.edu.co',
    telefono: '3109876543',
    especialidad: 'Derecho Administrativo'
  },
  {
    id: '3',
    nombre: 'Carlos Mendoza Silva',
    cargo: 'Profesional Especializado',
    procesosAsignados: 11,
    capacidadMaxima: 12,
    email: 'carlos.mendoza@esap.edu.co',
    telefono: '3205551234',
    especialidad: 'Derecho Disciplinario'
  },
  {
    id: '4',
    nombre: 'Ana González López',
    cargo: 'Profesional Universitario',
    procesosAsignados: 5,
    capacidadMaxima: 10,
    email: 'ana.gonzalez@esap.edu.co',
    telefono: '3157778899',
    especialidad: 'Derecho Público'
  }
];

// ==================== STEPPER DE ETAPAS ====================
function EtapasStepper({ etapaActual, porcentajeTiempo, semaforo }: {
  etapaActual: string;
  porcentajeTiempo: number;
  semaforo: 'verde' | 'amarillo' | 'rojo';
}) {
  const etapas = ['Recepción', 'Valoración', 'Indagación', 'Investigación', 'Juzgamiento', 'Fallo'];
  const stageToLabel: Record<string, string> = {
    'EVALUACION': 'Valoración',
    'INDAGACION_PREVIA': 'Indagación',
    'INVESTIGACION': 'Investigación',
    'JUZGAMIENTO': 'Juzgamiento'
  };
  const currentLabel = stageToLabel[etapaActual] || etapaActual;
  const currentIndex = etapas.indexOf(currentLabel);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold" style={{ color: '#9CA3AF' }}>
          PROGRESO DEL PROCESO
        </p>
        <p className="text-xs font-bold" style={{ color: '#003DA5' }}>
          Etapa {currentIndex + 1} de {etapas.length}
        </p>
      </div>

      {/* Stepper horizontal */}
      <div className="flex items-center gap-2">
        {etapas.map((etapa, index) => (
          <div key={etapa} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              {/* Círculo */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="relative flex items-center justify-center w-10 h-10 rounded-full border-2 mb-2"
                style={{
                  background: index <= currentIndex ? '#003DA5' : '#FFFFFF',
                  borderColor: index <= currentIndex ? '#003DA5' : '#E5E7EB'
                }}
              >
                {index < currentIndex ? (
                  <CheckCircle className="w-5 h-5" style={{ color: '#FFFFFF' }} />
                ) : index === currentIndex ? (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="w-3 h-3 rounded-full"
                    style={{ background: '#FFFFFF' }}
                  />
                ) : (
                  <div className="w-3 h-3 rounded-full" style={{ background: '#E5E7EB' }} />
                )}
              </motion.div>

              {/* Nombre etapa */}
              <p
                className="text-xs font-semibold text-center"
                style={{
                  color: index <= currentIndex ? '#003DA5' : '#9CA3AF',
                  maxWidth: '80px'
                }}
              >
                {etapa}
              </p>
            </div>

            {/* Línea conectora */}
            {index < etapas.length - 1 && (
              <div
                className="h-0.5 flex-1 -mt-8"
                style={{
                  background: index < currentIndex ? '#003DA5' : '#E5E7EB'
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Barra de tiempo */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold" style={{ color: '#9CA3AF' }}>
            TIEMPO TRANSCURRIDO
          </p>
          <p className="text-xs font-bold" style={{
            color: semaforo === 'rojo' ? '#DC2626' : semaforo === 'amarillo' ? '#F59E0B' : '#10B981'
          }}>
            {porcentajeTiempo}%
          </p>
        </div>
        <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(porcentajeTiempo, 100)}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{
              background: semaforo === 'rojo'
                ? 'linear-gradient(90deg, #DC2626 0%, #EF4444 100%)'
                : semaforo === 'amarillo'
                  ? 'linear-gradient(90deg, #F59E0B 0%, #FFC107 100%)'
                  : 'linear-gradient(90deg, #10B981 0%, #34D399 100%)'
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ==================== DASHBOARD EJECUTIVO ====================
function DashboardEjecutivo({ onNavigate, procesos = PROCESOS_MOCK }: { onNavigate: (section: string) => void; procesos?: Proceso[] }) {
  const [stats, setStats] = useState({
    procesosActivos: 0,
    proximosAVencer: 0,
    vencidos: 0,
    profesionales: 0
  });
  const [professionals, setProfessionals] = useState<Array<{ id: string; nombre: string; procesosAsignados: number; capacidadMaxima: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, workloadData] = await Promise.all([
          disciplinaryService.getStats(),
          disciplinaryService.getProfessionalsWorkload()
        ]);
        setStats(statsData);
        setProfessionals(workloadData);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const estadisticas: Estadistica[] = [
    {
      titulo: 'Procesos Activos',
      valor: stats.procesosActivos,
      cambio: 12,
      icono: FolderOpen,
      color: '#003DA5',
      descripcion: 'Total en curso'
    },
    {
      titulo: 'Próximos a Vencer',
      valor: stats.proximosAVencer,
      cambio: -5,
      icono: Clock,
      color: '#F59E0B',
      descripcion: 'Menos de 7 días'
    },
    {
      titulo: 'Vencidos',
      valor: stats.vencidos,
      cambio: -8,
      icono: AlertTriangle,
      color: '#DC2626',
      descripcion: 'Requieren atención'
    },
    {
      titulo: 'Profesionales',
      valor: stats.profesionales,
      icono: Users,
      color: '#10B981',
      descripcion: 'Equipo activo'
    }
  ];

  const procesosActivos = procesos.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold mb-2" style={{ color: '#003DA5' }}>
          Dashboard Ejecutivo
        </h1>
        <p className="text-sm" style={{ color: '#6B7280' }}>
          Vista general del Control Interno Disciplinario
        </p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {estadisticas.map((stat, index) => {
          const Icon = stat.icono;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-6 hover:shadow-lg transition-all cursor-pointer border-2" style={{ borderColor: '#E5E7EB' }}>
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="p-3 rounded-xl"
                    style={{ background: `${stat.color}15` }}
                  >
                    <Icon className="w-6 h-6" style={{ color: stat.color }} />
                  </div>
                  {stat.cambio && (
                    <div className="flex items-center gap-1">
                      <TrendingUp
                        className="w-4 h-4"
                        style={{
                          color: stat.cambio > 0 ? '#10B981' : '#DC2626',
                          transform: stat.cambio < 0 ? 'rotate(180deg)' : 'none'
                        }}
                      />
                      <span
                        className="text-xs font-bold"
                        style={{ color: stat.cambio > 0 ? '#10B981' : '#DC2626' }}
                      >
                        {Math.abs(stat.cambio)}%
                      </span>
                    </div>
                  )}
                </div>
                <h3 className="text-3xl font-extrabold mb-1" style={{ color: stat.color }}>
                  {stat.valor}
                </h3>
                <p className="text-sm font-semibold mb-1" style={{ color: '#1F2937' }}>
                  {stat.titulo}
                </p>
                <p className="text-xs" style={{ color: '#9CA3AF' }}>
                  {stat.descripcion}
                </p>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Procesos Activos */}
      <Card className="p-6 border-2" style={{ borderColor: '#E5E7EB' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-extrabold mb-1" style={{ color: '#1F2937' }}>
              Procesos Activos
            </h2>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              Últimos procesos en curso
            </p>
          </div>
          <button
            onClick={() => onNavigate('procesos')}
            className="px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2 hover:opacity-90"
            style={{ background: '#003DA5', color: '#FFFFFF' }}
          >
            Ver Todos
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          {procesosActivos.map((proceso) => (
            <Card key={proceso.id} className="p-5 border-2 hover:shadow-md transition-all" style={{ borderColor: '#E5E7EB' }}>
              {/* Header del proceso */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full ring-4"
                    style={{
                      background: proceso.semaforo === 'verde' ? '#10B981' : proceso.semaforo === 'amarillo' ? '#F59E0B' : '#DC2626',
                      ringColor: proceso.semaforo === 'verde' ? '#D1FAE5' : proceso.semaforo === 'amarillo' ? '#FEF3C7' : '#FEE2E2'
                    }}
                  />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-extrabold" style={{ color: '#003DA5' }}>
                        {proceso.consecutivo}
                      </h3>
                      <Badge className="text-xs">
                        {proceso.noticia}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium" style={{ color: '#1F2937' }}>
                      {proceso.disciplinable}
                    </p>
                  </div>
                </div>

                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <MoreVertical className="w-5 h-5" style={{ color: '#6B7280' }} />
                </button>
              </div>

              {/* Stepper */}
              <EtapasStepper
                etapaActual={proceso.etapaActual}
                porcentajeTiempo={proceso.porcentajeTiempo}
                semaforo={proceso.semaforo}
              />

              {/* Footer */}
              <div className="mt-4 pt-4 border-t flex items-center justify-between" style={{ borderColor: '#E5E7EB' }}>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-7 h-7">
                      <AvatarFallback style={{ background: '#E0EDFF', color: '#003DA5', fontSize: '11px' }}>
                        {proceso.profesionalAsignado.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs font-semibold" style={{ color: '#9CA3AF' }}>
                        Profesional
                      </p>
                      <p className="text-sm font-medium" style={{ color: '#1F2937' }}>
                        {proceso.profesionalAsignado}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" style={{ color: '#6B7280' }} />
                    <div>
                      <p className="text-xs font-semibold" style={{ color: '#9CA3AF' }}>
                        Vencimiento
                      </p>
                      <p className="text-sm font-medium" style={{ color: '#1F2937' }}>
                        {proceso.fechaVencimiento}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className="text-sm font-bold"
                    style={{ color: proceso.diasRestantes > 0 ? '#10B981' : '#DC2626' }}
                  >
                    {proceso.diasRestantes > 0
                      ? `${proceso.diasRestantes} días restantes`
                      : `Vencido hace ${Math.abs(proceso.diasRestantes)} días`
                    }
                  </span>
                </div>
              </div>

              {/* Última actuación */}
              <div className="mt-3 p-3 rounded-lg" style={{ background: '#F9FAFB' }}>
                <p className="text-xs font-semibold mb-1" style={{ color: '#9CA3AF' }}>
                  ÚLTIMA ACTUACIÓN
                </p>
                <p className="text-sm" style={{ color: '#4B5563' }}>
                  {proceso.ultimaActuacion}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      {/* Distribución de Carga */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 border-2" style={{ borderColor: '#E5E7EB' }}>
          <h3 className="text-lg font-extrabold mb-4" style={{ color: '#1F2937' }}>
            Carga por Profesional
          </h3>
          <div className="space-y-4">
            {professionals.map((prof) => {
              const porcentaje = (prof.procesosAsignados / prof.capacidadMaxima) * 100;
              return (
                <div key={prof.id}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium" style={{ color: '#1F2937' }}>
                      {prof.nombre}
                    </p>
                    <span className="text-xs font-bold" style={{ color: '#6B7280' }}>
                      {prof.procesosAsignados}/{prof.capacidadMaxima}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${porcentaje}%`,
                        background: porcentaje >= 90 ? '#DC2626' : porcentaje >= 70 ? '#F59E0B' : '#10B981'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-6 border-2" style={{ borderColor: '#E5E7EB' }}>
          <h3 className="text-lg font-extrabold mb-4" style={{ color: '#1F2937' }}>
            Procesos por Etapa
          </h3>
          <div className="space-y-3">
            {['Recepción', 'Valoración', 'Indagación', 'Investigación', 'Juzgamiento', 'Fallo'].map((etapa) => {
              const labelToStage: Record<string, string> = {
                'Valoración': 'EVALUACION',
                'Indagación': 'INDAGACION_PREVIA',
                'Investigación': 'INVESTIGACION',
                'Juzgamiento': 'JUZGAMIENTO'
              };
              const stageEnum = labelToStage[etapa];
              const count = procesos.filter(p => p.etapaActual === stageEnum).length;
              return (
                <div key={etapa} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <span className="text-sm font-medium" style={{ color: '#4B5563' }}>
                    {etapa}
                  </span>
                  <Badge
                    className="text-sm font-bold"
                    style={{ background: '#E0EDFF', color: '#003DA5' }}
                  >
                    {count}
                  </Badge>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ==================== COMPONENTE PRINCIPAL ====================
export function ControlDisciplinarioFull() {
  // const [currentSection, setCurrentSection] = useState<'dashboard' | 'noticias' | 'aprobacion' | 'procesos' | 'expediente' | 'terminos' | 'reportes' | 'profesionales' | 'config'>('dashboard');
  const [currentSection, setCurrentSection] = useState<'dashboard' | 'noticias' | 'aprobacion' | 'procesos' | 'expediente' | 'terminos' | 'reportes' | 'profesionales' | 'informes' | 'documental' | 'notificaciones' | 'config'>('dashboard');
  const [filtroProfesional, setFiltroProfesional] = useState<string | null>(null);
  const [filtroProfesionalNombre, setFiltroProfesionalNombre] = useState<string | null>(null);
  const [dashboardView, setDashboardView] = useState<'lista' | 'kanban'>('lista');
  // Estados de Negocio
  const [procesos, setProcesos] = useState<Proceso[]>([]);
  const [stageConfigs, setStageConfigs] = useState<any[]>([]);
  const [globalConfig, setGlobalConfig] = useState<any>(null);

  // Cargar Configuraciones y Procesos
  const loadData = async () => {
    try {
      // Cargar secuencialmente para evitar saturar conexiones en desarrollo
      const stages = await disciplinaryService.getStageConfiguration();
      const global = await disciplinaryService.getGlobalConfig();
      const allProcesos = await disciplinaryService.getAllProcesos();

      setStageConfigs(stages || []);
      setGlobalConfig(global || {});

      // Mapear usando la configuración cargada
      const mapped = allProcesos.map((p: any) => mapBackendToFrontend(p, stages || [], global));
      setProcesos(mapped);
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar datos del sistema');
    }
  };

  useEffect(() => {
    if (currentSection === 'dashboard' || currentSection === 'procesos') {
      loadData();
    }
  }, [currentSection]);

  const menuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Procesos', icon: <LayoutDashboard className="w-5 h-5" />, color: '#003DA5' },
    { id: 'noticias', label: 'Noticias Disciplinarias', icon: <FileText className="w-5 h-5" />, color: '#003DA5' },
    { id: 'aprobacion', label: 'Revisión y Aprobación', icon: <CheckCircle className="w-5 h-5" />, color: '#10B981' },
    { id: 'expediente', label: 'Expediente Electrónico', icon: <Archive className="w-5 h-5" />, color: '#8B5CF6' },
    { id: 'terminos', label: 'Términos y Alertas', icon: <Clock className="w-5 h-5" />, color: '#F59E0B' },
    { id: 'profesionales', label: 'Profesionales', icon: <Users className="w-5 h-5" />, color: '#003DA5' },
    { id: 'config', label: 'Configuración', icon: <Settings className="w-5 h-5" />, color: '#6B7280' }
  ];

  const getTitleForSection = () => {
    const item = menuItems.find(m => m.id === currentSection);
    return item?.label || 'Control Interno Disciplinario';
  };

  const handleVerProcesosProfesional = (profesional: any) => {
    setFiltroProfesional(profesional.id);
    setFiltroProfesionalNombre(profesional.nombre);
    setCurrentSection('dashboard');
    toast.info(`Filtrando procesos asignados a: ${profesional.nombre}`);
  };

  const handleLimpiarFiltro = () => {
    setFiltroProfesional(null);
    setFiltroProfesionalNombre(null);
    toast.info('Filtro de profesional eliminado');
  };

  return (
    <ModuleLayout
      moduleName="CONTROL INTERNO DISCIPLINARIO"
      moduleDescription="Sistema de Gestión"
      moduleIcon={<Scale className="w-6 h-6" />}
      moduleColor="#003DA5"
      menuItems={menuItems}
      activeSection={currentSection}
      onSectionChange={(section) => setCurrentSection(section as any)}
      breadcrumb={['Backoffice', 'Control Interno Disciplinario', getTitleForSection()]}
    >
      {/* Contenido Principal */}
      {currentSection === 'dashboard' && (
        <DashboardKanbanOperativo
          onNavigateToExpediente={() => setCurrentSection('expediente')}
          filtroProfesionalId={filtroProfesional}
          filtroProfesionalNombre={filtroProfesionalNombre}
          onLimpiarFiltro={handleLimpiarFiltro}
        />
      )}
      {currentSection === 'noticias' && <GestionNoticias />}
      {currentSection === 'aprobacion' && <RevisionAprobacionJefe />}
      {currentSection === 'expediente' && <ExpedienteElectronico />}
      {currentSection === 'terminos' && <GestionTerminosAlertas />}
      {currentSection === 'profesionales' && <GestionProfesionales onVerProcesos={handleVerProcesosProfesional} />}
      {currentSection === 'config' && <ModuloConfiguracion />}
    </ModuleLayout>
  );
}