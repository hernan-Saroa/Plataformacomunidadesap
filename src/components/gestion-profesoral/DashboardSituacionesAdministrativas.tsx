/**
 * DASHBOARD DE SITUACIONES ADMINISTRATIVAS
 * 
 * Interfaz visual para gestionar situaciones administrativas docentes
 * - Vista general de disponibilidad
 * - Alertas de situaciones próximas y activas
 * - Solicitudes a Talento Humano
 * - Registro de nuevas situaciones
 * - Reportes de disponibilidad
 * 
 * Componente: DashboardSituacionesAdministrativas
 * Fecha: 22 de diciembre de 2024
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Users,
  UserCheck,
  UserX,
  AlertTriangle,
  Calendar,
  FileText,
  Plus,
  Download,
  Send,
  CheckCircle,
  Clock,
  Filter,
  Search,
  Eye,
  TrendingDown,
  TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Progress } from '../ui/progress';
import { toast } from 'sonner@2.0.3';

import {
  SituacionAdministrativa,
  AlertaDisponibilidad,
  ReporteDisponibilidad,
  GestorSituacionesAdministrativas,
  getColorTipoSituacion,
  getIconoTipoSituacion,
  TipoSituacionAdministrativa
} from './SituacionesAdministrativasDocentes';

interface DashboardSituacionesAdministrativasProps {
  situaciones: SituacionAdministrativa[];
  alertas: AlertaDisponibilidad[];
  reporte: ReporteDisponibilidad;
  onNuevaSituacion?: () => void;
  onVerSituacion?: (id: string) => void;
  onSolicitarReporteTH?: () => void;
  onExportarReporte?: () => void;
}

export function DashboardSituacionesAdministrativas({
  situaciones,
  alertas,
  reporte,
  onNuevaSituacion,
  onVerSituacion,
  onSolicitarReporteTH,
  onExportarReporte
}: DashboardSituacionesAdministrativasProps) {
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  
  // Calcular métricas
  const porcentajeDisponibles = Math.round(
    (reporte.docentesDisponibles / reporte.totalDocentes) * 100
  );
  
  const alertasCriticas = alertas.filter(a => a.severidad === 'critical');
  const alertasWarning = alertas.filter(a => a.severidad === 'warning');
  
  // Filtrar situaciones
  const situacionesFiltradas = situaciones.filter(sit => {
    const matchBusqueda = busqueda === '' || 
      sit.docenteNombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      sit.descripcion.toLowerCase().includes(busqueda.toLowerCase());
    
    const matchEstado = filtroEstado === 'todos' || sit.estado === filtroEstado;
    const matchTipo = filtroTipo === 'todos' || sit.tipo === filtroTipo;
    
    return matchBusqueda && matchEstado && matchTipo;
  });
  
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Situaciones Administrativas Docentes
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Gestión de disponibilidad y situaciones que afectan la carga académica
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onSolicitarReporteTH}
          >
            <Send className="w-4 h-4 mr-2" />
            Solicitar a Talento Humano
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onNuevaSituacion}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Situación
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onExportarReporte}
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>
      
      {/* Métricas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricaCard
          titulo="Total Docentes"
          valor={reporte.totalDocentes.toString()}
          icono={<Users className="w-5 h-5" />}
          color="blue"
        />
        
        <MetricaCard
          titulo="Disponibles"
          valor={reporte.docentesDisponibles.toString()}
          subtitulo={`${porcentajeDisponibles}% del total`}
          icono={<UserCheck className="w-5 h-5" />}
          color="green"
        />
        
        <MetricaCard
          titulo="No Disponibles"
          valor={reporte.docentesNoDisponibles.toString()}
          subtitulo={`${reporte.docentesParcialmenteDisponibles} parciales`}
          icono={<UserX className="w-5 h-5" />}
          color="red"
        />
        
        <MetricaCard
          titulo="Alertas Activas"
          valor={alertas.length.toString()}
          subtitulo={`${alertasCriticas.length} críticas`}
          icono={<AlertTriangle className="w-5 h-5" />}
          color={alertasCriticas.length > 0 ? 'red' : 'amber'}
        />
      </div>
      
      {/* Disponibilidad General */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#003DA5]" />
            Disponibilidad Docente - Periodo {reporte.periodo}
          </CardTitle>
          <CardDescription>
            Estado actual de disponibilidad del cuerpo docente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Disponibilidad General</span>
                <span className="font-medium">
                  {reporte.docentesDisponibles} / {reporte.totalDocentes} ({porcentajeDisponibles}%)
                </span>
              </div>
              <Progress value={porcentajeDisponibles} className="h-3" />
            </div>
            
            {/* Por tipo de vinculación */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <DisponibilidadVinculacion
                tipo="Carrera"
                stats={reporte.disponibilidadPorVinculacion.carrera}
              />
              <DisponibilidadVinculacion
                tipo="Ocasional"
                stats={reporte.disponibilidadPorVinculacion.ocasional}
              />
              <DisponibilidadVinculacion
                tipo="Cátedra"
                stats={reporte.disponibilidadPorVinculacion.catedra}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Alertas */}
      {alertas.length > 0 && (
        <Card className="border-amber-300 bg-amber-50/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-amber-900">
                  <AlertTriangle className="w-5 h-5" />
                  Alertas de Disponibilidad ({alertas.length})
                </CardTitle>
                <CardDescription>
                  {alertasCriticas.length} críticas • {alertasWarning.length} advertencias
                </CardDescription>
              </div>
              <Button variant="outline" size="sm">
                Marcar todas como leídas
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alertas.slice(0, 5).map(alerta => (
                <AlertaCard key={alerta.id} alerta={alerta} />
              ))}
              
              {alertas.length > 5 && (
                <Button variant="outline" size="sm" className="w-full">
                  Ver todas las alertas ({alertas.length})
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Proyección Próximo Mes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#003DA5]" />
            Proyección Próximo Mes
          </CardTitle>
          <CardDescription>
            Estimación de cambios en disponibilidad
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Docentes Disponibles</span>
                <span className="text-2xl font-bold text-gray-900">
                  {reporte.proyeccionProximoMes.docentesDisponibles}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {reporte.proyeccionProximoMes.docentesDisponibles < reporte.docentesDisponibles ? (
                  <>
                    <TrendingDown className="w-4 h-4 text-red-600" />
                    <span className="text-red-600">
                      -{Math.abs(reporte.proyeccionProximoMes.docentesDisponibles - reporte.docentesDisponibles)} vs actual
                    </span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span className="text-green-600">Sin cambios</span>
                  </>
                )}
              </div>
            </div>
            
            <div className="border border-green-200 bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-green-700">Finalizarán</span>
                <span className="text-2xl font-bold text-green-900">
                  {reporte.proyeccionProximoMes.situacionesFinalizarán}
                </span>
              </div>
              <p className="text-xs text-green-600">Reincorporaciones esperadas</p>
            </div>
            
            <div className="border border-red-200 bg-red-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-red-700">Iniciarán</span>
                <span className="text-2xl font-bold text-red-900">
                  {reporte.proyeccionProximoMes.situacionesIniciarán}
                </span>
              </div>
              <p className="text-xs text-red-600">Nuevas situaciones próximas</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Situaciones Activas y Próximas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-red-600" />
                  Situaciones Activas
                </CardTitle>
                <CardDescription>
                  {reporte.situacionesActivas.length} situaciones en curso
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reporte.situacionesActivas.slice(0, 5).map(sit => (
                <SituacionCard
                  key={sit.id}
                  situacion={sit}
                  onVer={() => onVerSituacion?.(sit.id)}
                />
              ))}
              
              {reporte.situacionesActivas.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">No hay situaciones activas</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-amber-600" />
                  Situaciones Próximas
                </CardTitle>
                <CardDescription>
                  {reporte.situacionesProximas.length} situaciones comenzarán en 30 días
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reporte.situacionesProximas.slice(0, 5).map(sit => (
                <SituacionCard
                  key={sit.id}
                  situacion={sit}
                  onVer={() => onVerSituacion?.(sit.id)}
                  esProxima
                />
              ))}
              
              {reporte.situacionesProximas.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">No hay situaciones próximas</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Todas las Situaciones */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#003DA5]" />
                Todas las Situaciones Administrativas
              </CardTitle>
              <CardDescription>
                {situacionesFiltradas.length} de {situaciones.length} situaciones
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="todos">Todos los estados</option>
                <option value="solicitada">Solicitada</option>
                <option value="aprobada">Aprobada</option>
                <option value="activa">Activa</option>
                <option value="finalizada">Finalizada</option>
              </select>
              
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="todos">Todos los tipos</option>
                <option value="licencia-medica">Licencia Médica</option>
                <option value="licencia-maternidad">Licencia Maternidad</option>
                <option value="licencia-paternidad">Licencia Paternidad</option>
                <option value="ano-sabatico">Año Sabático</option>
                <option value="comision-servicio">Comisión Servicio</option>
                <option value="incapacidad">Incapacidad</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Buscador */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar por docente o descripción..."
                className="pl-10"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
          </div>
          
          {/* Lista */}
          <div className="space-y-3">
            {situacionesFiltradas.map(sit => (
              <SituacionCard
                key={sit.id}
                situacion={sit}
                onVer={() => onVerSituacion?.(sit.id)}
                completa
              />
            ))}
            
            {situacionesFiltradas.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <FileText className="w-16 h-16 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">No se encontraron situaciones con los filtros aplicados</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// COMPONENTES AUXILIARES
// ============================================================================

function MetricaCard({
  titulo,
  valor,
  subtitulo,
  icono,
  color = 'blue'
}: {
  titulo: string;
  valor: string;
  subtitulo?: string;
  icono: React.ReactNode;
  color?: string;
}) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-600',
    green: 'bg-green-50 border-green-200 text-green-600',
    amber: 'bg-amber-50 border-amber-200 text-amber-600',
    red: 'bg-red-50 border-red-200 text-red-600'
  };
  
  return (
    <Card className={`border ${colorClasses[color as keyof typeof colorClasses]}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-3">
          <div className={colorClasses[color as keyof typeof colorClasses]}>
            {icono}
          </div>
        </div>
        <p className="text-3xl font-bold mb-1">{valor}</p>
        <p className="text-sm text-gray-600">{titulo}</p>
        {subtitulo && <p className="text-xs text-gray-500 mt-1">{subtitulo}</p>}
      </CardContent>
    </Card>
  );
}

function DisponibilidadVinculacion({ tipo, stats }: { tipo: string; stats: any }) {
  const porcentaje = stats.total > 0 ? Math.round((stats.disponibles / stats.total) * 100) : 0;
  
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <h4 className="font-medium text-sm mb-3">{tipo}</h4>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">Total</span>
          <span className="font-medium">{stats.total}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-green-600">Disponibles</span>
          <span className="font-medium">{stats.disponibles}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-red-600">No disponibles</span>
          <span className="font-medium">{stats.noDisponibles}</span>
        </div>
        <div className="mt-2">
          <Progress value={porcentaje} className="h-2" />
          <p className="text-xs text-center text-gray-600 mt-1">{porcentaje}% disponibles</p>
        </div>
      </div>
    </div>
  );
}

function AlertaCard({ alerta }: { alerta: AlertaDisponibilidad }) {
  const severityColors = {
    'info': 'bg-blue-50 border-blue-200',
    'warning': 'bg-amber-50 border-amber-200',
    'critical': 'bg-red-50 border-red-200'
  };
  
  const severityTextColors = {
    'info': 'text-blue-900',
    'warning': 'text-amber-900',
    'critical': 'text-red-900'
  };
  
  return (
    <div className={`border rounded-lg p-3 ${severityColors[alerta.severidad]}`}>
      <div className="flex items-start gap-3">
        <span className="text-xl">
          {alerta.tipo === 'no-disponible' && '🚫'}
          {alerta.tipo === 'situacion-proxima' && '📅'}
          {alerta.tipo === 'reincorporacion-proxima' && '✅'}
          {alerta.tipo === 'disponibilidad-reducida' && '⚠️'}
        </span>
        <div className="flex-1">
          <p className={`font-medium text-sm ${severityTextColors[alerta.severidad]}`}>
            {alerta.docenteNombre} - {alerta.mensaje}
          </p>
          <p className="text-xs text-gray-600 mt-1">{alerta.descripcion}</p>
          {alerta.accionSugerida && (
            <p className="text-xs text-gray-500 mt-2 italic">
              💡 {alerta.accionSugerida}
            </p>
          )}
        </div>
        <Badge variant="outline" className="text-xs uppercase">
          {alerta.severidad}
        </Badge>
      </div>
    </div>
  );
}

function SituacionCard({
  situacion,
  onVer,
  esProxima,
  completa
}: {
  situacion: SituacionAdministrativa;
  onVer: () => void;
  esProxima?: boolean;
  completa?: boolean;
}) {
  const color = getColorTipoSituacion(situacion.tipo);
  const icono = getIconoTipoSituacion(situacion.tipo);
  
  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  const estadoColors = {
    'solicitada': 'bg-blue-100 text-blue-700',
    'aprobada': 'bg-green-100 text-green-700',
    'activa': 'bg-purple-100 text-purple-700',
    'finalizada': 'bg-gray-100 text-gray-700',
    'rechazada': 'bg-red-100 text-red-700',
    'cancelada': 'bg-orange-100 text-orange-700'
  };
  
  return (
    <div className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{icono}</span>
            <p className="font-medium text-sm">{situacion.docenteNombre}</p>
            {situacion.impactoDisponibilidad === 'total' && (
              <Badge className="bg-red-100 text-red-700 text-xs">No disponible</Badge>
            )}
            {situacion.impactoDisponibilidad === 'parcial' && (
              <Badge className="bg-amber-100 text-amber-700 text-xs">
                {situacion.porcentajeDisponibilidad}% disponible
              </Badge>
            )}
          </div>
          <p className="text-xs text-gray-600">{situacion.descripcion}</p>
        </div>
        <Badge className={`text-xs ${estadoColors[situacion.estado]}`}>
          {situacion.estado}
        </Badge>
      </div>
      
      <div className="flex items-center gap-4 text-xs text-gray-600 mb-2">
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          <span>{formatearFecha(situacion.fechaInicio)} - {formatearFecha(situacion.fechaFin)}</span>
        </div>
        <span>•</span>
        <span>{situacion.duracionDias} días</span>
      </div>
      
      {completa && (
        <div className="flex items-center justify-between mt-2 pt-2 border-t">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            {situacion.registradoTalentoHumano && (
              <span className="text-green-600">✓ Registrado TH</span>
            )}
            {situacion.numeroActoAdministrativo && (
              <span>Acto: {situacion.numeroActoAdministrativo}</span>
            )}
            {situacion.evidencias.length > 0 && (
              <span>{situacion.evidencias.length} evidencias</span>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={onVer}>
            <Eye className="w-3 h-3 mr-1" />
            Ver
          </Button>
        </div>
      )}
    </div>
  );
}
