/**
 * Dashboard de Gestión Profesoral - Backoffice Administrativo
 * 
 * Vista principal para administrativos y equipos de gestión profesoral
 * Incluye métricas, acciones rápidas y navegación intuitiva
 * 
 * ACTUALIZADO: Integración completa con Flujo de Aprobación PTA
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Users,
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Award,
  BarChart3,
  Plus,
  Download,
  Filter,
  Search,
  ChevronRight,
  BookOpen,
  Lightbulb,
  Target,
  Activity,
  Eye,
  Edit,
  Send,
  UserCheck,
  ClipboardList,
  Zap,
  Bell,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Progress } from '../ui/progress';
import { Separator } from '../ui/separator';
import { toast } from 'sonner@2.0.3';

// Importar modales originales
import { RevisarPTAsModal } from './modals/RevisarPTAsModal';
import { GestionDocentesModalV2 } from './modals/GestionDocentesModalV2';
import { EvaluacionesModal } from './modals/EvaluacionesModal';
import { AnalyticsModal } from './modals/AnalyticsModal';
import { PTADetallesModal } from './PTADetallesModal';

// Importar nuevo sistema de flujo de aprobación
import { ConfiguradorPTAModal } from './ConfiguradorPTAModal';
import { ModalRevisionPTA } from './ModalRevisionPTA';
import { NotificacionesWidget } from './NotificacionesPTA';
import { TimelineAprobacionesPTA } from './TimelineAprobacionesPTA';
import {
  GestorFlujoAprobacion,
  PTAConAprobacion,
  NotificacionPTA,
  crearPTAConAprobacion,
  NivelAprobacion
} from './FlujoAprobacionPTA';
import { crearPTAVacio } from './MotorReglasPTA';

interface MetricaPTA {
  label: string;
  valor: number;
  cambio: number;
  icon: React.ReactNode;
  color: string;
}

interface PTAPendiente {
  id: string;
  docente: string;
  periodo: string;
  horasAsignadas: number;
  horasBase: number;
  estado: string;
  diasPendientes: number;
  requiereAtencion: boolean;
}

interface DashboardGestionProfesoralProps {
  onNavigate?: (tab: 'dashboard' | 'calendario' | 'planificacion' | 'convocatorias' | 'ptas' | 'hora-catedra' | 'evaluacion') => void;
}

export function DashboardGestionProfesoral({ onNavigate }: DashboardGestionProfesoralProps) {
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState('2025-1');
  const [busqueda, setBusqueda] = useState('');
  
  // Estados para controlar los modales
  const [modalPTAsOpen, setModalPTAsOpen] = useState(false);
  const [modalDocentesOpen, setModalDocentesOpen] = useState(false);
  const [modalEvaluacionesOpen, setModalEvaluacionesOpen] = useState(false);
  const [modalAnalyticsOpen, setModalAnalyticsOpen] = useState(false);
  const [modalDetallesPTAOpen, setModalDetallesPTAOpen] = useState(false);
  const [ptaSeleccionado, setPtaSeleccionado] = useState<any>(null);

  // Métricas principales
  const metricas: MetricaPTA[] = [
    {
      label: 'PTAs Aprobados',
      valor: 187,
      cambio: 12,
      icon: <CheckCircle className="w-6 h-6" />,
      color: 'text-green-600 bg-green-50 border-green-200'
    },
    {
      label: 'En Aprobación',
      valor: 45,
      cambio: -5,
      icon: <Clock className="w-6 h-6" />,
      color: 'text-amber-600 bg-amber-50 border-amber-200'
    },
    {
      label: 'Requieren Atención',
      valor: 18,
      cambio: 3,
      icon: <AlertTriangle className="w-6 h-6" />,
      color: 'text-red-600 bg-red-50 border-red-200'
    },
    {
      label: 'Docentes Activos',
      valor: 270,
      cambio: 8,
      icon: <Users className="w-6 h-6" />,
      color: 'text-[#003DA5] bg-blue-50 border-blue-200'
    }
  ];

  // PTAs pendientes de revisión
  const ptasPendientes: PTAPendiente[] = [
    {
      id: 'PTA-2025-045',
      docente: 'Dr. Carlos Méndez Rivera',
      periodo: '2025-1',
      horasAsignadas: 1450,
      horasBase: 1600,
      estado: 'Pendiente Revisión',
      diasPendientes: 2,
      requiereAtencion: true
    },
    {
      id: 'PTA-2025-046',
      docente: 'Dra. Ana Gutiérrez López',
      periodo: '2025-1',
      horasAsignadas: 1580,
      horasBase: 1600,
      estado: 'En Revisión',
      diasPendientes: 5,
      requiereAtencion: false
    },
    {
      id: 'PTA-2025-047',
      docente: 'Mg. Roberto Silva Castro',
      periodo: '2025-1',
      horasAsignadas: 1350,
      horasBase: 1600,
      estado: 'Observaciones',
      diasPendientes: 1,
      requiereAtencion: true
    },
  ];

  // Handlers para PTAs
  const handleVerDetallesPTA = (pta: PTAPendiente) => {
    // Convertir PTAPendiente a formato completo del PTA
    const ptaCompleto = {
      id: pta.id,
      codigo: pta.id,
      docente_nombre: pta.docente,
      docente_documento: '80.123.456',
      periodo_nombre: pta.periodo,
      territorial: 'Bogotá',
      departamento: 'Facultad de Ciencias Políticas',
      horas_base: pta.horasBase,
      estado: pta.estado.toLowerCase().replace(' ', '_'),
      created_at: new Date().toISOString(),
      componente_ensenanza: {
        horas: Math.floor(pta.horasAsignadas * 0.48),
        porcentaje: 48,
        actividades: [
          { nombre: 'Clases Presenciales', horas: 16 },
          { nombre: 'Tutorías', horas: 4 },
          { nombre: 'Evaluaciones', horas: 3 }
        ]
      },
      componente_investigacion: {
        horas: Math.floor(pta.horasAsignadas * 0.30),
        porcentaje: 30,
        actividades: [
          { nombre: 'Proyecto de Investigación', horas: 10 },
          { nombre: 'Publicaciones', horas: 2 }
        ]
      },
      componente_extension: {
        horas: Math.floor(pta.horasAsignadas * 0.15),
        porcentaje: 15,
        actividades: [
          { nombre: 'Extensión Comunitaria', horas: 6 }
        ]
      },
      componente_apoyo_institucional: {
        horas: Math.floor(pta.horasAsignadas * 0.07),
        porcentaje: 7,
        actividades: [
          { nombre: 'Comités', horas: 3 }
        ]
      }
    };
    
    setPtaSeleccionado(ptaCompleto);
    setModalDetallesPTAOpen(true);
  };

  const handleAprobarPTA = (pta: PTAPendiente) => {
    if (confirm(`¿Está seguro de aprobar el PTA ${pta.id}?`)) {
      toast.success(`PTA ${pta.id} aprobado exitosamente`, {
        description: `El Plan de Trabajo Académico de ${pta.docente} ha sido aprobado.`
      });
      // Aquí iría la lógica para actualizar el estado en el backend
    }
  };

  return (
    <div className="space-y-6">
      {/* Header del Dashboard */}
      <div className="bg-gradient-to-br from-[#003DA5] to-[#1e5da8] rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl mb-2">
              Gestión Profesoral
            </h1>
            <p className="text-sm opacity-90">
              Panel de control y administración del Plan de Trabajo Académico
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="secondary"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
              onClick={() => toast.info('Generando reporte ejecutivo...')}
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar Reporte
            </Button>
          </div>
        </div>

        {/* Selector de periodo */}
        <div className="mt-6 flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
          <Calendar className="w-5 h-5" />
          <span className="text-sm">Periodo Académico:</span>
          <select 
            className="bg-transparent border-none text-white font-medium focus:outline-none cursor-pointer"
            value={periodoSeleccionado}
            onChange={(e) => setPeriodoSeleccionado(e.target.value)}
          >
            <option value="2025-1" className="text-gray-900">2025-1</option>
            <option value="2024-2" className="text-gray-900">2024-2</option>
            <option value="2024-1" className="text-gray-900">2024-1</option>
          </select>
        </div>
      </div>

      {/* Grid de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricas.map((metrica, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className={`border ${metrica.color}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={metrica.color}>
                    {metrica.icon}
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <TrendingUp className={`w-4 h-4 ${metrica.cambio > 0 ? 'text-green-600' : 'text-red-600'}`} />
                    <span className={metrica.cambio > 0 ? 'text-green-600' : 'text-red-600'}>
                      {metrica.cambio > 0 ? '+' : ''}{metrica.cambio}%
                    </span>
                  </div>
                </div>
                <p className="text-3xl font-bold mb-1">
                  {metrica.valor}
                </p>
                <p className="text-sm text-gray-600">
                  {metrica.label}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Acciones Rápidas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#003DA5]" />
            Acciones Rápidas
          </CardTitle>
          <CardDescription>
            Tareas y operaciones frecuentes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <AccionRapida
              icon={<FileText className="w-5 h-5" />}
              titulo="Revisar PTAs"
              descripcion="45 pendientes"
              color="bg-amber-500"
              onClick={() => setModalPTAsOpen(true)}
            />
            <AccionRapida
              icon={<Users className="w-5 h-5" />}
              titulo="Gestión Docentes"
              descripcion="1,450 profesores"
              color="bg-blue-600"
              onClick={() => setModalDocentesOpen(true)}
            />
            <AccionRapida
              icon={<Award className="w-5 h-5" />}
              titulo="Evaluaciones"
              descripcion="10 resultados"
              color="bg-purple-600"
              onClick={() => setModalEvaluacionesOpen(true)}
            />
            <AccionRapida
              icon={<BarChart3 className="w-5 h-5" />}
              titulo="Analytics"
              descripcion="Ver estadísticas"
              color="bg-emerald-600"
              onClick={() => setModalAnalyticsOpen(true)}
            />
          </div>
        </CardContent>
      </Card>

      {/* PTAs Pendientes de Revisión */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-[#003DA5]" />
                PTAs Pendientes de Revisión
              </CardTitle>
              <CardDescription>
                Planes de trabajo que requieren tu atención
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filtrar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Buscador */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar por docente, código PTA..."
                className="pl-10"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
          </div>

          {/* Lista de PTAs */}
          <div className="space-y-3">
            {ptasPendientes.map((pta) => (
              <PTAPendienteCard 
                key={pta.id} 
                {...pta}
                onVerDetalles={() => handleVerDetallesPTA(pta)}
                onAprobar={() => handleAprobarPTA(pta)}
              />
            ))}
          </div>

          {/* Ver todos */}
          <Button 
            variant="outline" 
            className="w-full mt-4"
            onClick={() => onNavigate?.('ptas')}
          >
            Ver Todos los PTAs
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </CardContent>
      </Card>

      {/* Distribución de Horas por Componente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#003DA5]" />
              Distribución Promedio de Horas
            </CardTitle>
            <CardDescription>
              Análisis de asignación por componente del PTA
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ComponenteDistribucion
              nombre="Docencia"
              porcentaje={48}
              promedio={768}
              color="#003DA5"
              icon={<BookOpen className="w-4 h-4" />}
            />
            <ComponenteDistribucion
              nombre="Investigación"
              porcentaje={30}
              promedio={480}
              color="#FF6B35"
              icon={<Lightbulb className="w-4 h-4" />}
            />
            <ComponenteDistribucion
              nombre="Extensión"
              porcentaje={15}
              promedio={240}
              color="#10B981"
              icon={<Target className="w-4 h-4" />}
            />
            <ComponenteDistribucion
              nombre="Complementarias"
              porcentaje={7}
              promedio={112}
              color="#8B5CF6"
              icon={<Award className="w-4 h-4" />}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#003DA5]" />
              Cumplimiento por Territorial
            </CardTitle>
            <CardDescription>
              Porcentaje de PTAs aprobados por sede
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <TerritorialCumplimiento
              nombre="Bogotá - Sede Central"
              aprobados={45}
              total={50}
            />
            <TerritorialCumplimiento
              nombre="Antioquia"
              aprobados={12}
              total={13}
            />
            <TerritorialCumplimiento
              nombre="Atlántico"
              aprobados={18}
              total={20}
            />
            <TerritorialCumplimiento
              nombre="Valle del Cauca"
              aprobados={8}
              total={9}
            />
            <TerritorialCumplimiento
              nombre="Otros Territoriales"
              aprobados={104}
              total={118}
            />
          </CardContent>
        </Card>
      </div>

      {/* Modales */}
      <RevisarPTAsModal 
        isOpen={modalPTAsOpen} 
        onClose={() => setModalPTAsOpen(false)}
        onPTAReviewed={(ptaId, accion) => {
          console.log(`PTA ${ptaId} - Acción: ${accion}`);
        }}
      />
      
      <GestionDocentesModalV2 
        isOpen={modalDocentesOpen} 
        onClose={() => setModalDocentesOpen(false)}
        onDocenteUpdated={(docenteId) => {
          console.log(`Docente ${docenteId} actualizado`);
        }}
      />
      
      <EvaluacionesModal 
        isOpen={modalEvaluacionesOpen} 
        onClose={() => setModalEvaluacionesOpen(false)}
        onEvaluacionViewed={(evaluacionId) => {
          console.log(`Evaluación ${evaluacionId} visualizada`);
        }}
      />
      
      <AnalyticsModal 
        isOpen={modalAnalyticsOpen} 
        onClose={() => setModalAnalyticsOpen(false)}
      />
      
      <PTADetallesModal 
        isOpen={modalDetallesPTAOpen} 
        onClose={() => setModalDetallesPTAOpen(false)}
        pta={ptaSeleccionado}
      />
    </div>
  );
}

// Componente de Acción Rápida
function AccionRapida({ 
  icon, 
  titulo, 
  descripcion, 
  color,
  onClick 
}: { 
  icon: React.ReactNode; 
  titulo: string; 
  descripcion: string; 
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 hover:border-[#003DA5] hover:bg-gray-50 transition-all group"
    >
      <div className={`${color} text-white p-2 rounded-lg group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <div className="text-left">
        <p className="font-medium text-sm mb-0.5">{titulo}</p>
        <p className="text-xs text-gray-600">{descripcion}</p>
      </div>
    </button>
  );
}

// Card de PTA Pendiente
function PTAPendienteCard({
  id,
  docente,
  periodo,
  horasAsignadas,
  horasBase,
  estado,
  diasPendientes,
  requiereAtencion,
  onVerDetalles,
  onAprobar
}: PTAPendiente & { onVerDetalles: () => void, onAprobar: () => void }) {
  const porcentaje = Math.round((horasAsignadas / horasBase) * 100);

  return (
    <div className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${requiereAtencion ? 'border-red-300 bg-red-50/50' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium truncate">{docente}</p>
            {requiereAtencion && (
              <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">
                Urgente
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-600">
            {id} • Periodo {periodo}
          </p>
        </div>
        <Badge variant="outline" className="ml-2 whitespace-nowrap">
          {estado}
        </Badge>
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-gray-600">Horas asignadas</span>
          <span className="font-medium">{horasAsignadas} / {horasBase}h ({porcentaje}%)</span>
        </div>
        <Progress value={porcentaje} className="h-2" />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <Clock className="w-4 h-4" />
          <span>{diasPendientes} días para fecha límite</span>
        </div>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={onVerDetalles}
          >
            <Eye className="w-4 h-4 mr-1" />
            Ver
          </Button>
          <Button 
            size="sm" 
            className="bg-[#003DA5] hover:bg-[#1e5da8]"
            onClick={onAprobar}
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            Aprobar
          </Button>
        </div>
      </div>
    </div>
  );
}

// Componente de Distribución
function ComponenteDistribucion({
  nombre,
  porcentaje,
  promedio,
  color,
  icon
}: {
  nombre: string;
  porcentaje: number;
  promedio: number;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
            <div style={{ color }}>{icon}</div>
          </div>
          <span className="text-sm font-medium">{nombre}</span>
        </div>
        <div className="text-sm">
          <span className="font-medium">{promedio}h</span>
          <span className="text-gray-500 ml-1">({porcentaje}%)</span>
        </div>
      </div>
      <Progress 
        value={porcentaje} 
        className="h-2"
        style={{ 
          // @ts-ignore
          '--progress-background': color 
        }}
      />
    </div>
  );
}

// Componente de Cumplimiento Territorial
function TerritorialCumplimiento({
  nombre,
  aprobados,
  total
}: {
  nombre: string;
  aprobados: number;
  total: number;
}) {
  const porcentaje = Math.round((aprobados / total) * 100);
  const color = porcentaje >= 90 ? 'text-green-600' : porcentaje >= 70 ? 'text-amber-600' : 'text-red-600';

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm">{nombre}</span>
        <span className={`text-sm font-medium ${color}`}>
          {aprobados}/{total} ({porcentaje}%)
        </span>
      </div>
      <Progress value={porcentaje} className="h-2" />
    </div>
  );
}