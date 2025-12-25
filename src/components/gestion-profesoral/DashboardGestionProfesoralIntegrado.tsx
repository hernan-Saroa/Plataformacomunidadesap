/**
 * DASHBOARD INTEGRADO DE GESTIÓN PROFESORAL
 * 
 * Dashboard completo que integra todos los componentes del PTA:
 * - Gestión de PTAs (CRUD)
 * - Flujo de Aprobación 3 Niveles
 * - Seguimiento y Control
 * - Situaciones Administrativas
 * - Reportes y Estadísticas
 * 
 * Este es el componente principal del módulo de Gestión Profesoral
 * 
 * Creado: 22 de diciembre de 2024
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  FileText,
  CheckCircle,
  AlertTriangle,
  Activity,
  Calendar,
  Download,
  Plus,
  Filter,
  Search,
  TrendingUp,
  Clock,
  Target,
  BarChart3
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from 'sonner@2.0.3';

// Componentes del PTA
import { DashboardSeguimientoPTA } from './DashboardSeguimientoPTA';
import { DashboardSituacionesAdministrativas } from './DashboardSituacionesAdministrativas';
import { ConfiguradorPTAModal } from './ConfiguradorPTAModal';
import { ModalRegistroProgresoPTA } from './ModalRegistroProgresoPTA';

// Datos mock
import { pta1, pta2, pta3, pta4, pta5, todasLasPTAs } from '../../data/ptasMockData';
import { todosLosRegistros, obtenerRegistrosPorPTA } from '../../data/seguimientoPTAMockData';
import { 
  todasLasSituaciones, 
  alertasDisponibilidad, 
  reporteDisponibilidad 
} from '../../data/situacionesAdministrativasMockData';

// Hooks de API (para producción)
import { 
  usePTAs, 
  usePTAsPendientes, 
  useAprobarPTA, 
  useRechazarPTA 
} from '../../hooks/usePTAAPI';

// Types
import { PTAConAprobacion, EstadoPTA } from './FlujoAprobacionPTA';
import { RegistroProgreso } from './SeguimientoControlPTA';
import { SituacionAdministrativa } from './SituacionesAdministrativasDocentes';

// ============================================================================
// INTERFACES
// ============================================================================

interface DashboardGestionProfesoralProps {
  usuarioId: string;
  usuarioNombre: string;
  usuarioCargo: 'docente' | 'director' | 'subdirector' | 'decano' | 'rector' | 'admin';
  periodo: string;
  territorial?: string;
}

interface EstadisticasGenerales {
  totalPTAs: number;
  ptasAprobados: number;
  ptasPendientes: number;
  ptasRechazados: number;
  docentesActivos: number;
  cumplimientoPromedio: number;
  alertasActivas: number;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function DashboardGestionProfesoralIntegrado({
  usuarioId,
  usuarioNombre,
  usuarioCargo,
  periodo,
  territorial
}: DashboardGestionProfesoralProps) {
  // Estado
  const [tabActual, setTabActual] = useState<'resumen' | 'ptas' | 'seguimiento' | 'situaciones' | 'aprobaciones'>('resumen');
  const [modalConfiguradorOpen, setModalConfiguradorOpen] = useState(false);
  const [modalProgresoOpen, setModalProgresoOpen] = useState(false);
  const [ptaSeleccionado, setPtaSeleccionado] = useState<PTAConAprobacion | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoPTA | 'todos'>('todos');

  // Datos (en producción, estos vendrían de los hooks de API)
  const ptas = todasLasPTAs;
  const registrosProgreso = todosLosRegistros;
  const situaciones = todasLasSituaciones;
  const alertas = alertasDisponibilidad;

  // Calcular estadísticas generales
  const estadisticas = useMemo((): EstadisticasGenerales => {
    const totalPTAs = ptas.length;
    const ptasAprobados = ptas.filter(p => p.estado === 'aprobado-final').length;
    const ptasPendientes = ptas.filter(p => 
      p.estado.startsWith('en-aprobacion') || p.estado === 'ajustes-solicitados'
    ).length;
    const ptasRechazados = ptas.filter(p => p.estado === 'rechazado').length;
    
    const docentesActivos = new Set(ptas.map(p => p.docenteId)).size;
    
    // Calcular cumplimiento promedio (simulado)
    const cumplimientoPromedio = 85.7;
    
    const alertasActivas = alertas.filter(a => !a.leida).length;

    return {
      totalPTAs,
      ptasAprobados,
      ptasPendientes,
      ptasRechazados,
      docentesActivos,
      cumplimientoPromedio,
      alertasActivas
    };
  }, [ptas, alertas]);

  // Filtrar PTAs
  const ptasFiltrados = useMemo(() => {
    return ptas.filter(pta => {
      const matchBusqueda = busqueda === '' || 
        pta.docenteNombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        pta.docenteDocumento.includes(busqueda);
      
      const matchEstado = filtroEstado === 'todos' || pta.estado === filtroEstado;
      
      return matchBusqueda && matchEstado;
    });
  }, [ptas, busqueda, filtroEstado]);

  // PTAs pendientes de aprobación (según cargo del usuario)
  const ptasPendientesAprobacion = useMemo(() => {
    return ptas.filter(pta => {
      if (usuarioCargo === 'director' && pta.estado === 'en-aprobacion-nivel-1') return true;
      if (usuarioCargo === 'subdirector' && pta.estado === 'en-aprobacion-nivel-2') return true;
      if (usuarioCargo === 'decano' && pta.estado === 'en-aprobacion-nivel-3') return true;
      return false;
    });
  }, [ptas, usuarioCargo]);

  // Handlers
  const handleNuevoPTA = () => {
    setPtaSeleccionado(null);
    setModalConfiguradorOpen(true);
  };

  const handleEditarPTA = (pta: PTAConAprobacion) => {
    setPtaSeleccionado(pta);
    setModalConfiguradorOpen(true);
  };

  const handleVerSeguimiento = (pta: PTAConAprobacion) => {
    setPtaSeleccionado(pta);
    setTabActual('seguimiento');
  };

  const handleRegistrarProgreso = (pta: PTAConAprobacion) => {
    setPtaSeleccionado(pta);
    setModalProgresoOpen(true);
  };

  const handleExportarReporte = () => {
    toast.success('Reporte exportado', {
      description: 'El reporte se ha descargado exitosamente'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003DA5] to-[#1e5da8] text-white p-6 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Gestión Profesoral</h1>
              <p className="text-sm opacity-90 mt-1">
                {usuarioNombre} • {usuarioCargo.charAt(0).toUpperCase() + usuarioCargo.slice(1)} • Periodo {periodo}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                onClick={handleExportarReporte}
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar Reporte
              </Button>
              {(usuarioCargo === 'docente' || usuarioCargo === 'admin') && (
                <Button
                  className="bg-white text-[#003DA5] hover:bg-gray-100"
                  onClick={handleNuevoPTA}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo PTA
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Tabs de navegación */}
        <Tabs value={tabActual} onValueChange={(v: any) => setTabActual(v)} className="space-y-6">
          <TabsList className="bg-white p-1 shadow-sm">
            <TabsTrigger value="resumen" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Resumen
            </TabsTrigger>
            <TabsTrigger value="ptas" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              PTAs ({ptas.length})
            </TabsTrigger>
            {usuarioCargo !== 'docente' && (
              <TabsTrigger value="aprobaciones" className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Aprobaciones
                {ptasPendientesAprobacion.length > 0 && (
                  <Badge className="bg-red-500 text-white ml-1">
                    {ptasPendientesAprobacion.length}
                  </Badge>
                )}
              </TabsTrigger>
            )}
            <TabsTrigger value="seguimiento" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Seguimiento
            </TabsTrigger>
            <TabsTrigger value="situaciones" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Situaciones
              {alertas.length > 0 && (
                <Badge className="bg-amber-500 text-white ml-1">
                  {alertas.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: RESUMEN GENERAL */}
          <TabsContent value="resumen" className="space-y-6">
            <ResumenGeneral 
              estadisticas={estadisticas}
              alertas={alertas}
              onVerAlerta={(alerta) => setTabActual('situaciones')}
            />
          </TabsContent>

          {/* TAB 2: GESTIÓN DE PTAs */}
          <TabsContent value="ptas" className="space-y-6">
            <GestionPTAs
              ptas={ptasFiltrados}
              busqueda={busqueda}
              filtroEstado={filtroEstado}
              onBusquedaChange={setBusqueda}
              onFiltroEstadoChange={setFiltroEstado}
              onEditar={handleEditarPTA}
              onVerSeguimiento={handleVerSeguimiento}
              onRegistrarProgreso={handleRegistrarProgreso}
              usuarioCargo={usuarioCargo}
            />
          </TabsContent>

          {/* TAB 3: APROBACIONES */}
          {usuarioCargo !== 'docente' && (
            <TabsContent value="aprobaciones" className="space-y-6">
              <AprobacionesPendientes
                ptasPendientes={ptasPendientesAprobacion}
                usuarioId={usuarioId}
                usuarioCargo={usuarioCargo}
              />
            </TabsContent>
          )}

          {/* TAB 4: SEGUIMIENTO Y CONTROL */}
          <TabsContent value="seguimiento" className="space-y-6">
            {ptaSeleccionado ? (
              <DashboardSeguimientoPTA
                pta={ptaSeleccionado}
                registrosProgreso={obtenerRegistrosPorPTA(ptaSeleccionado.id)}
                mesActual={3}
                onRegistrarProgreso={() => handleRegistrarProgreso(ptaSeleccionado)}
                onVerActividad={(id) => console.log('Ver actividad:', id)}
                onExportarReporte={handleExportarReporte}
              />
            ) : (
              <div className="text-center py-12">
                <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">Selecciona un PTA para ver el seguimiento</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setTabActual('ptas')}
                >
                  Ver PTAs
                </Button>
              </div>
            )}
          </TabsContent>

          {/* TAB 5: SITUACIONES ADMINISTRATIVAS */}
          <TabsContent value="situaciones" className="space-y-6">
            <DashboardSituacionesAdministrativas
              situaciones={situaciones}
              alertas={alertas}
              reporte={reporteDisponibilidad}
              onNuevaSituacion={() => toast.info('Función en desarrollo')}
              onVerSituacion={(id) => console.log('Ver situación:', id)}
              onSolicitarReporteTH={() => toast.success('Solicitud enviada a Talento Humano')}
              onExportarReporte={handleExportarReporte}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Modales */}
      <ConfiguradorPTAModal
        isOpen={modalConfiguradorOpen}
        onClose={() => setModalConfiguradorOpen(false)}
        pta={ptaSeleccionado}
        usuarioId={usuarioId}
        usuarioNombre={usuarioNombre}
        periodo={periodo}
        onGuardar={(pta) => {
          toast.success(ptaSeleccionado ? 'PTA actualizado' : 'PTA creado');
          setModalConfiguradorOpen(false);
        }}
      />

      {ptaSeleccionado && (
        <ModalRegistroProgresoPTA
          isOpen={modalProgresoOpen}
          onClose={() => setModalProgresoOpen(false)}
          pta={ptaSeleccionado}
          mesActual={3}
          registrosExistentes={obtenerRegistrosPorPTA(ptaSeleccionado.id)}
          usuarioId={usuarioId}
          usuarioNombre={usuarioNombre}
          onRegistrar={(registro) => {
            toast.success('Progreso registrado');
            setModalProgresoOpen(false);
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// COMPONENTES AUXILIARES
// ============================================================================

function ResumenGeneral({ 
  estadisticas, 
  alertas,
  onVerAlerta 
}: { 
  estadisticas: EstadisticasGenerales;
  alertas: any[];
  onVerAlerta: (alerta: any) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Métricas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-8 h-8 opacity-80" />
              <span className="text-3xl font-bold">{estadisticas.totalPTAs}</span>
            </div>
            <p className="text-sm opacity-90">Total PTAs</p>
            <p className="text-xs opacity-75 mt-1">
              {estadisticas.ptasAprobados} aprobados
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-8 h-8 opacity-80" />
              <span className="text-3xl font-bold">{estadisticas.cumplimientoPromedio}%</span>
            </div>
            <p className="text-sm opacity-90">Cumplimiento Promedio</p>
            <p className="text-xs opacity-75 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              +2.3% vs mes anterior
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 opacity-80" />
              <span className="text-3xl font-bold">{estadisticas.docentesActivos}</span>
            </div>
            <p className="text-sm opacity-90">Docentes Activos</p>
            <p className="text-xs opacity-75 mt-1">
              {reporteDisponibilidad.docentesDisponibles} disponibles
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-8 h-8 opacity-80" />
              <span className="text-3xl font-bold">{estadisticas.alertasActivas}</span>
            </div>
            <p className="text-sm opacity-90">Alertas Activas</p>
            <p className="text-xs opacity-75 mt-1">
              {estadisticas.ptasPendientes} PTAs pendientes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas Recientes */}
      {alertas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Alertas Recientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alertas.slice(0, 5).map(alerta => (
                <div
                  key={alerta.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => onVerAlerta(alerta)}
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <div>
                      <p className="text-sm font-medium">{alerta.mensaje}</p>
                      <p className="text-xs text-gray-600">{alerta.docenteNombre}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {alerta.severidad}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function GestionPTAs({
  ptas,
  busqueda,
  filtroEstado,
  onBusquedaChange,
  onFiltroEstadoChange,
  onEditar,
  onVerSeguimiento,
  onRegistrarProgreso,
  usuarioCargo
}: {
  ptas: PTAConAprobacion[];
  busqueda: string;
  filtroEstado: EstadoPTA | 'todos';
  onBusquedaChange: (value: string) => void;
  onFiltroEstadoChange: (value: EstadoPTA | 'todos') => void;
  onEditar: (pta: PTAConAprobacion) => void;
  onVerSeguimiento: (pta: PTAConAprobacion) => void;
  onRegistrarProgreso: (pta: PTAConAprobacion) => void;
  usuarioCargo: string;
}) {
  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar por docente o documento..."
                className="pl-10"
                value={busqueda}
                onChange={(e) => onBusquedaChange(e.target.value)}
              />
            </div>
            <select
              value={filtroEstado}
              onChange={(e) => onFiltroEstadoChange(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="todos">Todos los estados</option>
              <option value="borrador">Borrador</option>
              <option value="en-aprobacion-nivel-1">En Aprobación N1</option>
              <option value="en-aprobacion-nivel-2">En Aprobación N2</option>
              <option value="en-aprobacion-nivel-3">En Aprobación N3</option>
              <option value="aprobado-final">Aprobado</option>
              <option value="rechazado">Rechazado</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de PTAs */}
      <div className="grid grid-cols-1 gap-4">
        {ptas.map(pta => (
          <PTACard
            key={pta.id}
            pta={pta}
            onEditar={() => onEditar(pta)}
            onVerSeguimiento={() => onVerSeguimiento(pta)}
            onRegistrarProgreso={() => onRegistrarProgreso(pta)}
            puedeEditar={usuarioCargo === 'docente' || usuarioCargo === 'admin'}
          />
        ))}

        {ptas.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No se encontraron PTAs</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function PTACard({
  pta,
  onEditar,
  onVerSeguimiento,
  onRegistrarProgreso,
  puedeEditar
}: {
  pta: PTAConAprobacion;
  onEditar: () => void;
  onVerSeguimiento: () => void;
  onRegistrarProgreso: () => void;
  puedeEditar: boolean;
}) {
  const estadoColors = {
    'borrador': 'bg-gray-100 text-gray-700',
    'en-aprobacion-nivel-1': 'bg-blue-100 text-blue-700',
    'en-aprobacion-nivel-2': 'bg-blue-100 text-blue-700',
    'en-aprobacion-nivel-3': 'bg-blue-100 text-blue-700',
    'aprobado-final': 'bg-green-100 text-green-700',
    'rechazado': 'bg-red-100 text-red-700',
    'ajustes-solicitados': 'bg-amber-100 text-amber-700'
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900">{pta.docenteNombre}</h3>
            <p className="text-sm text-gray-600">{pta.docenteDocumento} • {pta.periodo}</p>
          </div>
          <Badge className={estadoColors[pta.estado as keyof typeof estadoColors]}>
            {pta.estado.replace(/-/g, ' ')}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-600">Horas Totales</p>
            <p className="text-lg font-bold text-gray-900">{pta.horasTotalesAsignadas}h</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Actividades</p>
            <p className="text-lg font-bold text-gray-900">{pta.actividades.length}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Cumplimiento</p>
            <p className="text-lg font-bold text-green-600">85%</p>
          </div>
        </div>

        <div className="flex gap-2">
          {puedeEditar && pta.estado === 'borrador' && (
            <Button variant="outline" size="sm" onClick={onEditar}>
              Editar
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onVerSeguimiento}>
            <Activity className="w-4 h-4 mr-1" />
            Ver Seguimiento
          </Button>
          {pta.estado === 'aprobado-final' && (
            <Button size="sm" onClick={onRegistrarProgreso} className="bg-[#003DA5]">
              <Plus className="w-4 h-4 mr-1" />
              Registrar Progreso
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AprobacionesPendientes({
  ptasPendientes,
  usuarioId,
  usuarioCargo
}: {
  ptasPendientes: PTAConAprobacion[];
  usuarioId: string;
  usuarioCargo: string;
}) {
  const handleAprobar = (pta: PTAConAprobacion) => {
    toast.success(`PTA de ${pta.docenteNombre} aprobado`);
  };

  const handleRechazar = (pta: PTAConAprobacion) => {
    toast.error(`PTA de ${pta.docenteNombre} rechazado`);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>PTAs Pendientes de Aprobación ({ptasPendientes.length})</CardTitle>
          <CardDescription>
            Como {usuarioCargo}, tienes {ptasPendientes.length} PTAs esperando tu aprobación
          </CardDescription>
        </CardHeader>
      </Card>

      {ptasPendientes.map(pta => (
        <Card key={pta.id}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold">{pta.docenteNombre}</h3>
                <p className="text-sm text-gray-600">{pta.periodo} • {pta.horasTotalesAsignadas}h totales</p>
              </div>
              <Badge className="bg-blue-100 text-blue-700">{pta.estado}</Badge>
            </div>

            <div className="flex gap-2">
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => handleAprobar(pta)}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Aprobar
              </Button>
              <Button
                variant="outline"
                className="border-red-600 text-red-600 hover:bg-red-50"
                onClick={() => handleRechazar(pta)}
              >
                Rechazar
              </Button>
              <Button variant="outline">
                Ver Detalle
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {ptasPendientes.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <p className="text-gray-600">No hay PTAs pendientes de aprobación</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
