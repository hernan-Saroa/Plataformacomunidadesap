/**
 * DASHBOARD EJECUTIVO INTEGRADO - CONTROL DISCIPLINARIO
 * Centro de Control Completo con todas las funcionalidades del flujo
 * Permite gestionar Noticias, Asignaciones, Procesos, Revisiones, Expedientes
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard, FileText, FolderOpen, CheckCircle, Archive,
  Clock, Users, BarChart3, Plus, Search, Filter, Eye, Edit,
  Send, Download, Upload, AlertTriangle, TrendingUp, Calendar,
  ChevronRight, MoreVertical, X, Check, Ban, Forward, Scale,
  Zap, Target, Award, Bell, Activity, Briefcase
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Avatar, AvatarFallback } from '../../ui/avatar';
import { toast } from 'sonner@2.0.3';

// ==================== INTERFACES ====================
interface Persona {
  nombre: string;
  tipoIdentificacion: 'CC' | 'CE' | 'TI' | 'PA' | 'NIT';
  numeroIdentificacion: string;
}

interface NoticiaResumen {
  id: string;
  numero: string;
  fechaRecepcion: string;
  origen: string;
  denunciado: Persona | string; // Permite ambos tipos para compatibilidad
  hechos: string;
  estado: 'pendiente' | 'en-valoracion' | 'asignada' | 'archivada';
  prioridad: 'alta' | 'media' | 'baja';
  diasPendientes: number;
}

interface ProcesoResumen {
  id: string;
  numeroProceso: string;
  noticiaOrigen: string;
  denunciado: Persona | string; // Permite ambos tipos para compatibilidad
  etapaActual: string;
  estadoActual: string;
  profesionalAsignado: string;
  semaforo: 'verde' | 'amarillo' | 'rojo';
  diasRestantes: number;
  borradores: number;
  documentos: number;
  pendienteAprobacion: boolean;
}

interface RevisionPendiente {
  id: string;
  tipo: 'borrador' | 'documento' | 'auto';
  proceso: string;
  titulo: string;
  profesional: string;
  fechaEnvio: string;
  diasPendiente: number;
  prioridad: 'alta' | 'media' | 'baja';
}

// ==================== MOCK DATA ====================
const NOTICIAS_MOCK: NoticiaResumen[] = [
  {
    id: '1',
    numero: 'ND-2025-0260',
    fechaRecepcion: '2025-01-15',
    origen: 'Denuncia Ciudadana',
    denunciado: 'Juan Pérez Gómez',
    hechos: 'Presunto acoso laboral en Territorial Bogotá',
    estado: 'pendiente',
    prioridad: 'alta',
    diasPendientes: 3
  },
  {
    id: '2',
    numero: 'ND-2025-0261',
    fechaRecepcion: '2025-01-16',
    origen: 'Oficio Interno',
    denunciado: 'María González Castro',
    hechos: 'Incumplimiento de deberes administrativos',
    estado: 'en-valoracion',
    prioridad: 'media',
    diasPendientes: 5
  }
];

const PROCESOS_MOCK: ProcesoResumen[] = [
  {
    id: '1',
    numeroProceso: 'P-120-2025',
    noticiaOrigen: 'ND-260',
    denunciado: 'Juan Pérez Gómez',
    etapaActual: 'Valoración',
    estadoActual: 'En Gestión',
    profesionalAsignado: 'Juan Carlos Pérez',
    semaforo: 'verde',
    diasRestantes: 5,
    borradores: 1,
    documentos: 3,
    pendienteAprobacion: false
  },
  {
    id: '2',
    numeroProceso: 'P-089-2024',
    noticiaOrigen: 'ND-178',
    denunciado: 'María González Castro',
    etapaActual: 'Investigación',
    estadoActual: 'Pendiente Aprobación',
    profesionalAsignado: 'Ana María López',
    semaforo: 'amarillo',
    diasRestantes: 15,
    borradores: 2,
    documentos: 8,
    pendienteAprobacion: true
  }
];

const REVISIONES_MOCK: RevisionPendiente[] = [
  {
    id: '1',
    tipo: 'auto',
    proceso: 'P-089-2024',
    titulo: 'Auto de Apertura de Investigación',
    profesional: 'Ana María López',
    fechaEnvio: '2025-01-10',
    diasPendiente: 2,
    prioridad: 'alta'
  }
];

// ==================== COMPONENTE WIDGET ====================
interface WidgetProps {
  titulo: string;
  valor: number;
  icono: any;
  color: string;
  descripcion?: string;
  accion?: () => void;
  accionLabel?: string;
}

function Widget({ titulo, valor, icono: Icon, color, descripcion, accion, accionLabel }: WidgetProps) {
  return (
    <Card className="p-5 border-2 hover:shadow-lg transition-all" style={{ borderColor: '#E5E7EB' }}>
      <div className="flex items-start justify-between mb-3">
        <div className="p-3 rounded-xl" style={{ background: `${color}15` }}>
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
        {accion && (
          <Button
            onClick={accion}
            size="sm"
            className="text-xs"
            style={{ background: color, color: '#FFFFFF' }}
          >
            {accionLabel || 'Ver'}
          </Button>
        )}
      </div>
      <h3 className="text-3xl font-black mb-1" style={{ color }}>
        {valor}
      </h3>
      <p className="text-sm font-bold text-gray-900">{titulo}</p>
      {descripcion && (
        <p className="text-xs text-gray-600 mt-1">{descripcion}</p>
      )}
    </Card>
  );
}

// ==================== COMPONENTE PRINCIPAL ====================
export function DashboardEjecutivoIntegrado({ onNavigate }: { onNavigate?: (section: string) => void }) {
  const [activeTab, setActiveTab] = useState<'resumen' | 'noticias' | 'procesos' | 'revisiones' | 'alertas'>('resumen');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNoticia, setSelectedNoticia] = useState<NoticiaResumen | null>(null);
  const [showAsignarModal, setShowAsignarModal] = useState(false);

  // ==================== HANDLERS ====================
  const handleAsignarNoticia = (noticia: NoticiaResumen) => {
    setSelectedNoticia(noticia);
    setShowAsignarModal(true);
  };

  const handleConfirmarAsignacion = () => {
    toast.success('Noticia Asignada', {
      description: `La noticia ${selectedNoticia?.numero} ha sido asignada a proceso`
    });
    setShowAsignarModal(false);
    setSelectedNoticia(null);
  };

  const handleArchivarNoticia = (noticia: NoticiaResumen) => {
    toast.success('Noticia Archivada', {
      description: `La noticia ${noticia.numero} ha sido archivada sin mérito`
    });
  };

  const handleAprobarRevision = (revision: RevisionPendiente) => {
    toast.success('Borrador Aprobado', {
      description: `El documento del proceso ${revision.proceso} ha sido aprobado`
    });
  };

  const handleRechazarRevision = (revision: RevisionPendiente) => {
    toast.info('Borrador Rechazado', {
      description: 'Se ha enviado retroalimentación al profesional'
    });
  };

  // ==================== ESTADÍSTICAS ====================
  const estadisticas = {
    noticiasPendientes: NOTICIAS_MOCK.filter(n => n.estado === 'pendiente').length,
    procesosActivos: PROCESOS_MOCK.length,
    revisionesPendientes: REVISIONES_MOCK.length,
    procesosVencer: PROCESOS_MOCK.filter(p => p.diasRestantes <= 7).length,
    borradoresTotales: PROCESOS_MOCK.reduce((sum, p) => sum + p.borradores, 0),
    documentosTotales: PROCESOS_MOCK.reduce((sum, p) => sum + p.documentos, 0)
  };

  // ==================== RENDER ====================
  return (
    <div className="space-y-6">
      {/* Header con Tabs */}
      <div>
        <h1 className="text-2xl font-black mb-2" style={{ color: '#003DA5' }}>
          Dashboard Ejecutivo Integrado
        </h1>
        <p className="text-sm text-gray-600 mb-4">
          Centro de Control Completo - Gestión del Flujo de Control Interno Disciplinario
        </p>

        {/* Tabs de Navegación */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {[
            { id: 'resumen', label: 'Resumen', icon: LayoutDashboard },
            { id: 'noticias', label: 'Noticias', icon: FileText, badge: estadisticas.noticiasPendientes },
            { id: 'procesos', label: 'Procesos', icon: FolderOpen, badge: estadisticas.procesosActivos },
            { id: 'revisiones', label: 'Revisiones', icon: CheckCircle, badge: estadisticas.revisionesPendientes },
            { id: 'alertas', label: 'Alertas', icon: Bell, badge: estadisticas.procesosVencer }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap"
                style={{
                  background: isActive ? '#003DA5' : '#F9FAFB',
                  color: isActive ? '#FFFFFF' : '#6B7280',
                  border: isActive ? 'none' : '2px solid #E5E7EB'
                }}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <Badge
                    className="ml-1 px-2 py-0.5 text-xs font-bold"
                    style={{
                      background: isActive ? '#FFFFFF' : '#DC2626',
                      color: isActive ? '#003DA5' : '#FFFFFF'
                    }}
                  >
                    {tab.badge}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Contenido por Tab */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {/* TAB: RESUMEN */}
          {activeTab === 'resumen' && (
            <div className="space-y-6">
              {/* Widgets de Estadísticas */}
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <Widget
                  titulo="Noticias Pendientes"
                  valor={estadisticas.noticiasPendientes}
                  icono={FileText}
                  color="#F59E0B"
                  descripcion="Requieren valoración"
                  accion={() => setActiveTab('noticias')}
                  accionLabel="Gestionar"
                />
                <Widget
                  titulo="Procesos Activos"
                  valor={estadisticas.procesosActivos}
                  icono={FolderOpen}
                  color="#003DA5"
                  descripcion="En gestión"
                  accion={() => setActiveTab('procesos')}
                />
                <Widget
                  titulo="Revisiones Pendientes"
                  valor={estadisticas.revisionesPendientes}
                  icono={CheckCircle}
                  color="#10B981"
                  descripcion="Para aprobación"
                  accion={() => setActiveTab('revisiones')}
                  accionLabel="Revisar"
                />
                <Widget
                  titulo="Próximos a Vencer"
                  valor={estadisticas.procesosVencer}
                  icono={AlertTriangle}
                  color="#DC2626"
                  descripcion="≤ 7 días"
                  accion={() => setActiveTab('alertas')}
                />
                <Widget
                  titulo="Borradores"
                  valor={estadisticas.borradoresTotales}
                  icono={Edit}
                  color="#8B5CF6"
                  descripcion="En edición"
                />
                <Widget
                  titulo="Documentos"
                  valor={estadisticas.documentosTotales}
                  icono={Archive}
                  color="#06B6D4"
                  descripcion="En expedientes"
                />
              </div>

              {/* Acciones Rápidas */}
              <Card className="p-6 border-2" style={{ borderColor: '#E5E7EB' }}>
                <h2 className="text-lg font-black mb-4 flex items-center gap-2" style={{ color: '#1F2937' }}>
                  <Zap className="w-5 h-5 text-yellow-500" />
                  Acciones Rápidas
                </h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { label: 'Nueva Noticia', icon: Plus, color: '#F59E0B', action: () => setActiveTab('noticias') },
                    { label: 'Asignar Proceso', icon: Forward, color: '#003DA5', action: () => setActiveTab('noticias') },
                    { label: 'Revisar Borradores', icon: CheckCircle, color: '#10B981', action: () => setActiveTab('revisiones') },
                    { label: 'Ver Expedientes', icon: Archive, color: '#8B5CF6', action: () => toast.info('Navegando a Expedientes') }
                  ].map((accion) => {
                    const Icon = accion.icon;
                    return (
                      <Button
                        key={accion.label}
                        onClick={accion.action}
                        className="h-auto py-4 flex flex-col gap-2 items-center justify-center font-bold hover:shadow-md transition-all"
                        style={{ background: accion.color, color: '#FFFFFF' }}
                      >
                        <Icon className="w-6 h-6" />
                        <span className="text-xs">{accion.label}</span>
                      </Button>
                    );
                  })}
                </div>
              </Card>

              {/* Actividad Reciente */}
              <Card className="p-6 border-2" style={{ borderColor: '#E5E7EB' }}>
                <h2 className="text-lg font-black mb-4 flex items-center gap-2" style={{ color: '#1F2937' }}>
                  <Activity className="w-5 h-5 text-blue-600" />
                  Actividad Reciente
                </h2>
                <div className="space-y-3">
                  {[
                    { tipo: 'noticia', texto: 'Nueva noticia ND-2025-0260 recibida', tiempo: 'Hace 2 horas', color: '#F59E0B' },
                    { tipo: 'asignacion', texto: 'Proceso P-120-2025 asignado a Juan Carlos Pérez', tiempo: 'Hace 3 horas', color: '#003DA5' },
                    { tipo: 'borrador', texto: 'Borrador enviado para revisión en P-089-2024', tiempo: 'Hace 5 horas', color: '#10B981' },
                    { tipo: 'documento', texto: 'Documento adjuntado al expediente P-120-2025', tiempo: 'Hace 1 día', color: '#8B5CF6' }
                  ].map((actividad, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ background: actividad.color }} />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{actividad.texto}</p>
                        <p className="text-xs text-gray-600 mt-0.5">{actividad.tiempo}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* TAB: NOTICIAS */}
          {activeTab === 'noticias' && (
            <div className="space-y-4">
              {/* Header con Búsqueda y Nuevo */}
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar noticias..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <Button
                  onClick={() => toast.info('Formulario de nueva noticia')}
                  style={{ background: '#F59E0B', color: '#FFFFFF' }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Noticia
                </Button>
              </div>

              {/* Lista de Noticias */}
              <div className="space-y-3">
                {NOTICIAS_MOCK.map((noticia) => (
                  <Card key={noticia.id} className="p-5 border-2 hover:shadow-md transition-all" style={{ borderColor: '#E5E7EB' }}>
                    <div className="flex items-start gap-4">
                      {/* Indicador de Prioridad */}
                      <div
                        className="w-1 h-full rounded-full flex-shrink-0"
                        style={{
                          background: noticia.prioridad === 'alta' ? '#DC2626' : noticia.prioridad === 'media' ? '#F59E0B' : '#10B981'
                        }}
                      />

                      {/* Contenido */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-lg font-bold" style={{ color: '#003DA5' }}>
                              {noticia.numero}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {noticia.origen} • {noticia.fechaRecepcion}
                            </p>
                          </div>
                          <Badge
                            style={{
                              background: noticia.estado === 'pendiente' ? '#FEF3C7' : '#E0EDFF',
                              color: noticia.estado === 'pendiente' ? '#92400E' : '#003DA5'
                            }}
                          >
                            {noticia.estado === 'pendiente' ? 'Pendiente' : 'En Valoración'}
                          </Badge>
                        </div>

                        <p className="font-semibold text-gray-900 mb-1">
                          Denunciado: {typeof noticia.denunciado === 'string' ? noticia.denunciado : noticia.denunciado.nombre}
                        </p>
                        <p className="text-sm text-gray-700 mb-3">
                          {noticia.hechos}
                        </p>

                        <div className="flex items-center gap-2 text-xs">
                          <Clock className="w-4 h-4 text-orange-600" />
                          <span className="font-bold text-orange-600">
                            {noticia.diasPendientes} días pendiente
                          </span>
                        </div>
                      </div>

                      {/* Acciones */}
                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={() => toast.info('Ver detalles de la noticia')}
                          size="sm"
                          variant="outline"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Ver
                        </Button>
                        <Button
                          onClick={() => handleAsignarNoticia(noticia)}
                          size="sm"
                          style={{ background: '#003DA5', color: '#FFFFFF' }}
                        >
                          <Forward className="w-4 h-4 mr-2" />
                          Asignar
                        </Button>
                        <Button
                          onClick={() => handleArchivarNoticia(noticia)}
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                          <Ban className="w-4 h-4 mr-2" />
                          Archivar
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* TAB: PROCESOS */}
          {activeTab === 'procesos' && (
            <div className="space-y-4">
              {/* Header con Búsqueda */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar procesos..."
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Lista de Procesos */}
              <div className="space-y-3">
                {PROCESOS_MOCK.map((proceso) => (
                  <Card key={proceso.id} className="p-5 border-2 hover:shadow-md transition-all" style={{ borderColor: '#E5E7EB' }}>
                    <div className="flex items-start gap-4">
                      {/* Semáforo */}
                      <div
                        className="w-16 h-16 rounded-full ring-4 flex items-center justify-center flex-shrink-0"
                        style={{
                          background: proceso.semaforo === 'verde' ? '#10B981' : proceso.semaforo === 'amarillo' ? '#F59E0B' : '#DC2626',
                          ringColor: proceso.semaforo === 'verde' ? '#D1FAE5' : proceso.semaforo === 'amarillo' ? '#FEF3C7' : '#FEE2E2'
                        }}
                      >
                        <Scale className="w-8 h-8 text-white" />
                      </div>

                      {/* Información */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold" style={{ color: '#003DA5' }}>
                            {proceso.numeroProceso}
                          </h3>
                          <Badge variant="outline">Noticia: {proceso.noticiaOrigen}</Badge>
                          <Badge>{proceso.etapaActual}</Badge>
                          {proceso.pendienteAprobacion && (
                            <Badge className="bg-red-100 text-red-700 border border-red-300">
                              ⚠️ Pendiente Aprobación
                            </Badge>
                          )}
                        </div>

                        <p className="font-semibold text-gray-900 mb-3">
                          {typeof proceso.denunciado === 'string' ? proceso.denunciado : proceso.denunciado.nombre}
                        </p>

                        {/* Métricas */}
                        <div className="grid grid-cols-5 gap-4">
                          <div>
                            <p className="text-xs text-gray-600">Profesional</p>
                            <p className="font-semibold text-sm text-gray-900">{typeof proceso.profesionalAsignado === 'string' ? proceso.profesionalAsignado : ''}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Días Restantes</p>
                            <p className="font-semibold text-sm text-green-600">{proceso.diasRestantes} días</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Borradores</p>
                            <p className="font-semibold text-sm text-purple-600">{proceso.borradores}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Documentos</p>
                            <p className="font-semibold text-sm text-blue-600">{proceso.documentos}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Estado</p>
                            <p className="font-semibold text-sm text-gray-900">{proceso.estadoActual}</p>
                          </div>
                        </div>
                      </div>

                      {/* Acciones */}
                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={() => toast.info(`Ver proceso ${proceso.numeroProceso}`)}
                          size="sm"
                          style={{ background: '#003DA5', color: '#FFFFFF' }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Proceso
                        </Button>
                        <Button
                          onClick={() => toast.info('Abrir expediente electrónico')}
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          <Archive className="w-4 h-4 mr-2" />
                          Expediente
                        </Button>
                        <Button
                          onClick={() => toast.info('Ver términos y alertas')}
                          size="sm"
                          className="bg-orange-600 hover:bg-orange-700 text-white"
                        >
                          <Clock className="w-4 h-4 mr-2" />
                          Términos
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* TAB: REVISIONES */}
          {activeTab === 'revisiones' && (
            <div className="space-y-4">
              <Card className="p-4 bg-green-50 border-2 border-green-200">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-bold text-green-900">
                      {estadisticas.revisionesPendientes} documentos pendientes de revisión
                    </p>
                    <p className="text-sm text-green-700">
                      Requieren aprobación del Jefe de OCID
                    </p>
                  </div>
                </div>
              </Card>

              {/* Lista de Revisiones */}
              <div className="space-y-3">
                {REVISIONES_MOCK.map((revision) => (
                  <Card key={revision.id} className="p-5 border-2 hover:shadow-md transition-all" style={{ borderColor: '#E5E7EB' }}>
                    <div className="flex items-start gap-4">
                      {/* Icono por Tipo */}
                      <div
                        className="p-3 rounded-xl"
                        style={{
                          background: revision.prioridad === 'alta' ? '#FEE2E2' : '#E0EDFF'
                        }}
                      >
                        {revision.tipo === 'auto' ? (
                          <FileText className="w-6 h-6" style={{ color: revision.prioridad === 'alta' ? '#DC2626' : '#003DA5' }} />
                        ) : (
                          <Archive className="w-6 h-6" style={{ color: '#8B5CF6' }} />
                        )}
                      </div>

                      {/* Información */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-bold" style={{ color: '#003DA5' }}>
                            {revision.titulo}
                          </h3>
                          <Badge
                            style={{
                              background: revision.prioridad === 'alta' ? '#FEE2E2' : '#FEF3C7',
                              color: revision.prioridad === 'alta' ? '#DC2626' : '#92400E'
                            }}
                          >
                            {revision.prioridad === 'alta' ? 'Urgente' : 'Normal'}
                          </Badge>
                        </div>

                        <p className="text-sm text-gray-600 mb-1">
                          Proceso: <span className="font-semibold text-gray-900">{revision.proceso}</span>
                        </p>
                        <p className="text-sm text-gray-600 mb-2">
                          Profesional: <span className="font-semibold text-gray-900">{revision.profesional}</span>
                        </p>

                        <div className="flex items-center gap-2 text-xs">
                          <Clock className="w-4 h-4 text-orange-600" />
                          <span className="font-bold text-orange-600">
                            Enviado hace {revision.diasPendiente} días
                          </span>
                        </div>
                      </div>

                      {/* Acciones */}
                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={() => toast.info('Ver documento completo')}
                          size="sm"
                          variant="outline"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Documento
                        </Button>
                        <Button
                          onClick={() => handleAprobarRevision(revision)}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Aprobar
                        </Button>
                        <Button
                          onClick={() => handleRechazarRevision(revision)}
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Rechazar
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* TAB: ALERTAS */}
          {activeTab === 'alertas' && (
            <div className="space-y-4">
              <Card className="p-4 bg-orange-50 border-2 border-orange-200">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="font-bold text-orange-900">
                      {estadisticas.procesosVencer} procesos próximos a vencer
                    </p>
                    <p className="text-sm text-orange-700">
                      Requieren atención inmediata (≤ 7 días)
                    </p>
                  </div>
                </div>
              </Card>

              {/* Lista de Procesos Críticos */}
              <div className="space-y-3">
                {PROCESOS_MOCK.filter(p => p.diasRestantes <= 7).map((proceso) => (
                  <Card key={proceso.id} className="p-5 border-2 border-orange-300 hover:shadow-md transition-all bg-orange-50">
                    <div className="flex items-start gap-4">
                      <AlertTriangle className="w-10 h-10 text-orange-600 flex-shrink-0" />

                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-orange-900 mb-1">
                          {proceso.numeroProceso} - {typeof proceso.denunciado === 'string' ? proceso.denunciado : proceso.denunciado.nombre}
                        </h3>
                        <p className="text-sm text-orange-700 mb-2">
                          Etapa: {proceso.etapaActual} • Profesional: {typeof proceso.profesionalAsignado === 'string' ? proceso.profesionalAsignado : ''}
                        </p>
                        <p className="text-lg font-black text-orange-600">
                          ⚠️ {proceso.diasRestantes} días restantes
                        </p>
                      </div>

                      <Button
                        onClick={() => toast.info(`Gestionar proceso ${proceso.numeroProceso}`)}
                        className="bg-orange-600 hover:bg-orange-700 text-white"
                      >
                        <Forward className="w-4 h-4 mr-2" />
                        Gestionar Ahora
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Modal de Asignación */}
      <AnimatePresence>
        {showAsignarModal && selectedNoticia && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-start justify-center pt-16 sm:pt-20 z-[150] p-4"
            onClick={() => setShowAsignarModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold" style={{ color: '#003DA5' }}>
                  Asignar Noticia a Proceso
                </h3>
                <button
                  onClick={() => setShowAsignarModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <p className="text-sm font-semibold text-gray-600 mb-1">Noticia</p>
                  <p className="text-lg font-bold" style={{ color: '#003DA5' }}>
                    {selectedNoticia.numero}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-600 mb-1">Denunciado</p>
                  <p className="font-bold text-gray-900">{typeof selectedNoticia.denunciado === 'string' ? selectedNoticia.denunciado : selectedNoticia.denunciado.nombre}</p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-600 mb-2 block">
                    Asignar a Profesional
                  </label>
                  <select className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Juan Carlos Pérez</option>
                    <option>Ana María López</option>
                    <option>Carlos Rodríguez</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-600 mb-2 block">
                    Observaciones
                  </label>
                  <textarea
                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Observaciones sobre la asignación..."
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setShowAsignarModal(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleConfirmarAsignacion}
                  className="flex-1"
                  style={{ background: '#003DA5', color: '#FFFFFF' }}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Confirmar Asignación
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}