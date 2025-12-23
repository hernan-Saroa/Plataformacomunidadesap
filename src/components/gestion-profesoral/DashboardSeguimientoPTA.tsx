/**
 * DASHBOARD DE SEGUIMIENTO Y CONTROL PTA
 * 
 * Interfaz visual principal para el seguimiento del cumplimiento del PTA
 * - Vista general de cumplimiento
 * - Comparación programado vs ejecutado
 * - Gráficos de progreso
 * - Alertas y notificaciones
 * - Acceso a registro de actividades
 * 
 * Componente: DashboardSeguimientoPTA
 * Fecha: 22 de diciembre de 2024
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Activity,
  FileText,
  Calendar,
  Target,
  Plus,
  Download,
  Filter,
  Eye,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { toast } from 'sonner@2.0.3';

import { PTAConAprobacion } from './FlujoAprobacionPTA';
import {
  GestorSeguimientoPTA,
  ComparacionProgramadoEjecutado,
  ResumenCumplimiento,
  RegistroProgreso,
  AlertaDesviacion,
  EstadoCumplimiento,
  getColorEstadoCumplimiento,
  getIconoTipoAlerta
} from './SeguimientoControlPTA';

interface DashboardSeguimientoPTAProps {
  pta: PTAConAprobacion;
  registrosProgreso: RegistroProgreso[];
  mesActual: number; // 1-6
  onRegistrarProgreso?: () => void;
  onVerActividad?: (actividadId: string) => void;
  onExportarReporte?: () => void;
}

export function DashboardSeguimientoPTA({
  pta,
  registrosProgreso,
  mesActual,
  onRegistrarProgreso,
  onVerActividad,
  onExportarReporte
}: DashboardSeguimientoPTAProps) {
  const gestor = new GestorSeguimientoPTA();
  const [comparacion, setComparacion] = useState<ComparacionProgramadoEjecutado | null>(null);
  const [resumen, setResumen] = useState<ResumenCumplimiento | null>(null);
  
  // Calcular comparación al montar o cuando cambien los datos
  useEffect(() => {
    const comp = gestor.compararProgramadoVsEjecutado(pta, registrosProgreso, mesActual);
    setComparacion(comp);
    
    const res = gestor.generarResumenCumplimiento(pta, comp, mesActual);
    setResumen(res);
  }, [pta, registrosProgreso, mesActual]);
  
  if (!comparacion || !resumen) {
    return <div className="p-6">Cargando seguimiento...</div>;
  }
  
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Seguimiento y Control del PTA
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {pta.docenteNombre} • Periodo {pta.periodo}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRegistrarProgreso}
          >
            <Plus className="w-4 h-4 mr-2" />
            Registrar Progreso
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onExportarReporte}
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar Reporte
          </Button>
        </div>
      </div>
      
      {/* Métricas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricaCard
          titulo="Cumplimiento Global"
          valor={`${resumen.cumplimientoGlobal.toFixed(1)}%`}
          estado={resumen.estadoGeneral}
          icono={<Target className="w-5 h-5" />}
          tendencia={resumen.tendencia}
        />
        
        <MetricaCard
          titulo="Horas Ejecutadas"
          valor={`${resumen.horasEjecutadas}h`}
          subtitulo={`de ${resumen.horasProgramadas}h`}
          icono={<CheckCircle className="w-5 h-5" />}
          color="blue"
        />
        
        <MetricaCard
          titulo="Horas Pendientes"
          valor={`${resumen.horasPendientes}h`}
          subtitulo={`${((resumen.horasPendientes/resumen.horasProgramadas)*100).toFixed(0)}% restante`}
          icono={<Clock className="w-5 h-5" />}
          color="amber"
        />
        
        <MetricaCard
          titulo="Alertas Activas"
          valor={resumen.alertasActivas.toString()}
          subtitulo={`${resumen.alertasCriticas} críticas`}
          icono={<AlertTriangle className="w-5 h-5" />}
          color={resumen.alertasCriticas > 0 ? "red" : "green"}
        />
      </div>
      
      {/* Progreso del Período */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#003DA5]" />
            Progreso del Período
          </CardTitle>
          <CardDescription>
            Mes {mesActual} de 6 • {resumen.porcentajeTiempoTranscurrido.toFixed(0)}% del periodo transcurrido
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600">Tiempo transcurrido</span>
                <span className="font-medium">{resumen.semanasTrscurridas} / {resumen.semanasTotal} semanas</span>
              </div>
              <Progress value={resumen.porcentajeTiempoTranscurrido} className="h-3" />
            </div>
            
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600">Cumplimiento de actividades</span>
                <span className="font-medium">{resumen.cumplimientoGlobal.toFixed(1)}%</span>
              </div>
              <Progress 
                value={resumen.cumplimientoGlobal} 
                className="h-3"
                style={{
                  // @ts-ignore
                  '--progress-background': getColorEstadoCumplimiento(resumen.estadoGeneral)
                }}
              />
            </div>
            
            {/* Proyección */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Proyección Final</p>
                  <p className="text-xl font-bold text-gray-900">
                    {resumen.proyeccionFinal.toFixed(1)}%
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {resumen.tendencia === 'mejorando' && (
                    <>
                      <TrendingUp className="w-5 h-5 text-green-600" />
                      <Badge className="bg-green-100 text-green-700">Mejorando</Badge>
                    </>
                  )}
                  {resumen.tendencia === 'estable' && (
                    <>
                      <Minus className="w-5 h-5 text-blue-600" />
                      <Badge className="bg-blue-100 text-blue-700">Estable</Badge>
                    </>
                  )}
                  {resumen.tendencia === 'empeorando' && (
                    <>
                      <TrendingDown className="w-5 h-5 text-red-600" />
                      <Badge className="bg-red-100 text-red-700">Empeorando</Badge>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Cumplimiento por Componente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#003DA5]" />
            Cumplimiento por Componente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {comparacion.componentesComparacion.map(comp => (
              <ComponenteProgress
                key={comp.componente}
                componente={comp.componente}
                programado={comp.programado}
                ejecutado={comp.ejecutado}
                porcentaje={comp.porcentajeCumplimiento}
                estado={comp.estado}
                actividadesCompletadas={comp.actividadesCompletadas}
                actividadesTotal={comp.actividadesCount}
              />
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Alertas */}
      {comparacion.alertas.length > 0 && (
        <Card className="border-amber-300 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900">
              <AlertCircle className="w-5 h-5" />
              Alertas de Desviación ({comparacion.alertas.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {comparacion.alertas.slice(0, 5).map(alerta => (
                <AlertaCard key={alerta.id} alerta={alerta} />
              ))}
              
              {comparacion.alertas.length > 5 && (
                <Button variant="outline" size="sm" className="w-full">
                  Ver todas las alertas ({comparacion.alertas.length})
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Progreso Mensual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#003DA5]" />
            Progreso Mensual
          </CardTitle>
          <CardDescription>
            Comparación acumulada programado vs ejecutado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {comparacion.progresoMensual.map(mes => (
              <ProgresoMensualCard
                key={mes.mes}
                mes={mes}
                esActual={mes.mes === mesActual}
              />
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Actividades */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#003DA5]" />
                Actividades del PTA
              </CardTitle>
              <CardDescription>
                {comparacion.actividadesComparacion.length} actividades registradas
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filtrar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {comparacion.actividadesComparacion.map(actividad => (
              <ActividadCard
                key={actividad.actividadId}
                actividad={actividad}
                onVer={() => onVerActividad?.(actividad.actividadId)}
              />
            ))}
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
  estado,
  icono,
  color = 'blue',
  tendencia
}: {
  titulo: string;
  valor: string;
  subtitulo?: string;
  estado?: EstadoCumplimiento;
  icono: React.ReactNode;
  color?: string;
  tendencia?: 'mejorando' | 'estable' | 'empeorando';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-600',
    green: 'bg-green-50 border-green-200 text-green-600',
    amber: 'bg-amber-50 border-amber-200 text-amber-600',
    red: 'bg-red-50 border-red-200 text-red-600'
  };
  
  const estadoColor = estado ? getColorEstadoCumplimiento(estado) : undefined;
  
  return (
    <Card className={estado ? '' : `border ${colorClasses[color as keyof typeof colorClasses]}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-3">
          <div className={estado ? '' : colorClasses[color as keyof typeof colorClasses]}>
            {icono}
          </div>
          {tendencia && (
            <div>
              {tendencia === 'mejorando' && <TrendingUp className="w-4 h-4 text-green-600" />}
              {tendencia === 'estable' && <Minus className="w-4 h-4 text-blue-600" />}
              {tendencia === 'empeorando' && <TrendingDown className="w-4 h-4 text-red-600" />}
            </div>
          )}
        </div>
        <p 
          className="text-3xl font-bold mb-1"
          style={estadoColor ? { color: estadoColor } : undefined}
        >
          {valor}
        </p>
        <p className="text-sm text-gray-600">{titulo}</p>
        {subtitulo && <p className="text-xs text-gray-500 mt-1">{subtitulo}</p>}
      </CardContent>
    </Card>
  );
}

function ComponenteProgress({
  componente,
  programado,
  ejecutado,
  porcentaje,
  estado,
  actividadesCompletadas,
  actividadesTotal
}: {
  componente: string;
  programado: number;
  ejecutado: number;
  porcentaje: number;
  estado: EstadoCumplimiento;
  actividadesCompletadas: number;
  actividadesTotal: number;
}) {
  const nombresComponentes = {
    'docencia': 'Docencia',
    'investigacion': 'Investigación',
    'extension': 'Extensión',
    'academico-administrativo': 'Académico-Administrativo'
  };
  
  const color = getColorEstadoCumplimiento(estado);
  
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-sm font-medium">
            {nombresComponentes[componente as keyof typeof nombresComponentes]}
          </span>
          <span className="text-xs text-gray-500 ml-2">
            ({actividadesCompletadas}/{actividadesTotal} actividades)
          </span>
        </div>
        <div className="text-sm">
          <span className="font-medium">{ejecutado}h</span>
          <span className="text-gray-500"> / {programado}h</span>
          <span className="ml-2" style={{ color }}>
            ({porcentaje.toFixed(0)}%)
          </span>
        </div>
      </div>
      <Progress 
        value={porcentaje} 
        className="h-3"
        style={{
          // @ts-ignore
          '--progress-background': color
        }}
      />
    </div>
  );
}

function AlertaCard({ alerta }: { alerta: AlertaDesviacion }) {
  const severityColors = {
    'info': 'bg-blue-50 border-blue-200',
    'warning': 'bg-amber-50 border-amber-200',
    'error': 'bg-red-50 border-red-200',
    'critical': 'bg-red-100 border-red-300'
  };
  
  const severityTextColors = {
    'info': 'text-blue-900',
    'warning': 'text-amber-900',
    'error': 'text-red-900',
    'critical': 'text-red-950'
  };
  
  return (
    <div className={`border rounded-lg p-3 ${severityColors[alerta.severidad]}`}>
      <div className="flex items-start gap-3">
        <span className="text-xl">{getIconoTipoAlerta(alerta.tipo)}</span>
        <div className="flex-1">
          <p className={`font-medium text-sm ${severityTextColors[alerta.severidad]}`}>
            {alerta.mensaje}
          </p>
          <p className="text-xs text-gray-600 mt-1">{alerta.descripcion}</p>
          {alerta.accionSugerida && (
            <p className="text-xs text-gray-500 mt-2 italic">
              💡 {alerta.accionSugerida}
            </p>
          )}
        </div>
        <Badge variant="outline" className="text-xs">
          {alerta.severidad.toUpperCase()}
        </Badge>
      </div>
    </div>
  );
}

function ProgresoMensualCard({ 
  mes, 
  esActual 
}: { 
  mes: any;
  esActual: boolean;
}) {
  const porcentaje = Math.min(mes.porcentajeCumplimiento, 100);
  const esRetraso = mes.ejecutadoAcumulado < mes.programadoAcumulado;
  
  return (
    <div className={`${esActual ? 'bg-blue-50 border border-blue-200 rounded-lg p-3' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{mes.nombreMes}</span>
          {esActual && <Badge className="bg-blue-600 text-xs">Mes actual</Badge>}
        </div>
        <div className="text-sm">
          <span className="font-medium">{mes.ejecutadoAcumulado.toFixed(0)}h</span>
          <span className="text-gray-500"> / {mes.programadoAcumulado.toFixed(0)}h</span>
          <span className={`ml-2 ${esRetraso ? 'text-red-600' : 'text-green-600'}`}>
            ({porcentaje.toFixed(0)}%)
          </span>
        </div>
      </div>
      <Progress 
        value={porcentaje} 
        className="h-2"
        style={{
          // @ts-ignore
          '--progress-background': esRetraso ? '#EF4444' : '#10B981'
        }}
      />
      {mes.desviacionAcumulada !== 0 && (
        <p className="text-xs text-gray-500 mt-1">
          Desviación: {mes.desviacionAcumulada > 0 ? '+' : ''}{mes.desviacionAcumulada.toFixed(0)}h
        </p>
      )}
    </div>
  );
}

function ActividadCard({
  actividad,
  onVer
}: {
  actividad: any;
  onVer: () => void;
}) {
  const porcentaje = Math.min(actividad.porcentajeCumplimiento, 100);
  const color = porcentaje >= 95 ? '#10B981' : porcentaje >= 75 ? '#3B82F6' : porcentaje >= 50 ? '#F59E0B' : '#EF4444';
  
  return (
    <div className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">{actividad.nombre}</p>
          <p className="text-xs text-gray-500">{actividad.codigo}</p>
        </div>
        <Badge variant="outline" className="text-xs">
          {actividad.componente}
        </Badge>
      </div>
      
      <div className="mb-2">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-gray-600">Progreso</span>
          <span className="font-medium">
            {actividad.ejecutado}h / {actividad.programado}h ({porcentaje.toFixed(0)}%)
          </span>
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
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          {actividad.tieneEvidencias ? (
            <span className="text-green-600">✓ {actividad.cantidadEvidencias} evidencias</span>
          ) : (
            <span className="text-amber-600">⚠ Sin evidencias</span>
          )}
          {actividad.ultimoRegistro && (
            <span>
              Último: {new Date(actividad.ultimoRegistro).toLocaleDateString()}
            </span>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={onVer}>
          <Eye className="w-3 h-3 mr-1" />
          Ver
        </Button>
      </div>
    </div>
  );
}
