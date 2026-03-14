/**
 * ModalDetalleIndicador - ESAP 2025 Standard
 * Modal para ver detalles completos y seguimiento de un indicador
 */

import { Eye, Target, Calendar, User, TrendingUp, Activity, FileText, Clock, Award, AlertCircle, CheckCircle, Archive } from 'lucide-react';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { Progress } from '../../../ui/progress';
import { Avatar, AvatarFallback } from '../../../ui/avatar';
import { ModalHeaderClean } from './ModalHeaderClean';

interface Indicador {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  ejeEstrategico: string;
  responsable: string;
  meta: number;
  valorActual: number;
  avance: number;
  fechaInicio: Date;
  fechaFin: Date;
  estado: 'EN_TIEMPO' | 'EN_RIESGO' | 'VENCIDO' | 'COMPLETADO';
  prioridad: 'ALTA' | 'MEDIA' | 'BAJA';
  periodicidad: string;
  tipoIndicador: string;
  unidadMedida: string;
  ultimaActualizacion: Date;
}

interface ModalDetalleIndicadorProps {
  isOpen: boolean;
  onClose: () => void;
  indicador: Indicador | null;
  onEditar?: () => void;
  onCargarAvance?: () => void;
  onArchivar?: () => void;
}

export function ModalDetalleIndicador({ isOpen, onClose, indicador, onEditar, onCargarAvance, onArchivar }: ModalDetalleIndicadorProps) {
  if (!isOpen || !indicador) return null;

  const ejeConfig = {
    GESTION_INSTITUCIONAL: {
      nombre: 'Gestión Institucional',
      color: '#2962FF',
      bgColor: '#E3F2FD',
      icon: '🏛️'
    },
    TALENTO_HUMANO: {
      nombre: 'Talento Humano',
      color: '#F57C00',
      bgColor: '#FFF3E0',
      icon: '👥'
    },
    TRANSPARENCIA: {
      nombre: 'Transparencia',
      color: '#00C853',
      bgColor: '#E8F5E9',
      icon: '🔍'
    },
    TECNOLOGIA: {
      nombre: 'Tecnología',
      color: '#9C27B0',
      bgColor: '#F3E5F5',
      icon: '💻'
    }
  }[indicador.ejeEstrategico] || {
    nombre: 'Gestión Institucional',
    color: '#2962FF',
    bgColor: '#E3F2FD',
    icon: '🏛️'
  };

  const estadoConfig = {
    EN_TIEMPO: {
      nombre: 'En Tiempo',
      color: '#10B981',
      bgColor: '#D1FAE5',
      icon: <CheckCircle className="w-4 h-4" />
    },
    EN_RIESGO: {
      nombre: 'En Riesgo',
      color: '#F59E0B',
      bgColor: '#FEF3C7',
      icon: <AlertCircle className="w-4 h-4" />
    },
    VENCIDO: {
      nombre: 'Vencido',
      color: '#DC2626',
      bgColor: '#FEE2E2',
      icon: <AlertCircle className="w-4 h-4" />
    },
    COMPLETADO: {
      nombre: 'Completado',
      color: '#059669',
      bgColor: '#D1FAE5',
      icon: <CheckCircle className="w-4 h-4" />
    }
  }[indicador.estado];

  const prioridadConfig = {
    ALTA: { nombre: 'Alta', color: '#DC2626', bgColor: '#FEE2E2', emoji: '🔴' },
    MEDIA: { nombre: 'Media', color: '#F59E0B', bgColor: '#FEF3C7', emoji: '🟡' },
    BAJA: { nombre: 'Baja', color: '#10B981', bgColor: '#D1FAE5', emoji: '🟢' }
  }[indicador.prioridad];

  const getSemaforoColor = (avance: number) => {
    if (avance >= 90) return '#10B981'; // Verde
    if (avance >= 50) return '#F59E0B'; // Amarillo
    return '#DC2626'; // Rojo
  };

  // Calcular días restantes
  const diasRestantes = Math.ceil((indicador.fechaFin.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const diasTranscurridos = Math.ceil((new Date().getTime() - indicador.fechaInicio.getTime()) / (1000 * 60 * 60 * 24));
  const diasTotales = Math.ceil((indicador.fechaFin.getTime() - indicador.fechaInicio.getTime()) / (1000 * 60 * 60 * 24));
  const porcentajeTiempo = Math.min(Math.round((diasTranscurridos / diasTotales) * 100), 100);

  return (
    <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-screen md:min-h-0 flex items-start md:items-center justify-center p-0 md:p-4 md:py-8">
        <div className="bg-white rounded-none md:rounded-2xl shadow-2xl w-full md:max-w-4xl md:max-h-[90vh] overflow-hidden flex flex-col my-0 md:my-4">
          {/* Header con ModalHeaderClean */}
          <ModalHeaderClean
            titulo={indicador.nombre}
            subtitulo={indicador.descripcion}
            icono={Eye}
            colorIcono="purple"
            badges={
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full border border-blue-300">
                  {indicador.codigo}
                </span>
                <span
                  className="px-3 py-1 text-xs font-bold rounded-full border flex items-center gap-1"
                  style={{
                    backgroundColor: ejeConfig.bgColor,
                    color: ejeConfig.color,
                    borderColor: ejeConfig.color
                  }}
                >
                  {ejeConfig.icon} {ejeConfig.nombre}
                </span>
                <span
                  className="px-3 py-1 text-xs font-bold rounded-full border flex items-center gap-1"
                  style={{
                    backgroundColor: estadoConfig.bgColor,
                    color: estadoConfig.color,
                    borderColor: estadoConfig.color
                  }}
                >
                  {estadoConfig.icon} {estadoConfig.nombre}
                </span>
              </div>
            }
            onClose={onClose}
          />

          {/* Contenido del Modal */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
            {/* Sección: Resumen Ejecutivo — Visualización Intuitiva */}
            <div className="bg-white border-2 border-gray-200 rounded-xl p-5 space-y-4">
              {/* Fila superior: meta vs actual */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Target className="w-4 h-4 text-blue-600" />
                    <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">Meta</p>
                  </div>
                  <p className="text-2xl font-black text-blue-700">
                    {indicador.meta}<span className="text-sm font-semibold ml-0.5">{indicador.unidadMedida}</span>
                  </p>
                </div>

                {/* Cumplimiento central — más prominente */}
                <div
                  className="border-2 rounded-xl p-3 flex flex-col items-center justify-center shadow-sm"
                  style={{
                    borderColor: getSemaforoColor(indicador.avance),
                    backgroundColor: `${getSemaforoColor(indicador.avance)}15`,
                  }}
                >
                  <Award className="w-5 h-5 mb-1" style={{ color: getSemaforoColor(indicador.avance) }} />
                  <p className="text-xs font-bold uppercase tracking-wide" style={{ color: getSemaforoColor(indicador.avance) }}>Cumplimiento</p>
                  <p className="text-3xl font-black" style={{ color: getSemaforoColor(indicador.avance) }}>
                    {indicador.avance}%
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {indicador.avance >= 90 ? '✅ En meta' : indicador.avance >= 50 ? '⚠️ En riesgo' : '🔴 Requiere acción'}
                  </p>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Activity className="w-4 h-4 text-green-600" />
                    <p className="text-xs font-bold text-green-700 uppercase tracking-wide">Actual</p>
                  </div>
                  <p className="text-2xl font-black text-green-700">
                    {indicador.valorActual}<span className="text-sm font-semibold ml-0.5">{indicador.unidadMedida}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{indicador.ultimaActualizacion.toLocaleDateString('es-CO')}</p>
                </div>
              </div>

              {/* Barra de progreso visual: muestra avance sobre la meta */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>0 {indicador.unidadMedida}</span>
                  <span className="font-semibold text-gray-700">
                    {indicador.valorActual} de {indicador.meta} {indicador.unidadMedida}
                  </span>
                  <span>{indicador.meta} {indicador.unidadMedida}</span>
                </div>
                <div className="relative h-5 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(indicador.avance, 100)}%`,
                      backgroundColor: getSemaforoColor(indicador.avance),
                    }}
                  />
                  <span
                    className="absolute inset-0 flex items-center justify-center text-xs font-bold"
                    style={{ color: indicador.avance > 40 ? '#fff' : getSemaforoColor(indicador.avance) }}
                  >
                    {indicador.avance}% completado
                  </span>
                </div>
              </div>
            </div>

            {/* Sección: Información General */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b-2 border-gray-200">
                <FileText className="w-5 h-5 text-gray-700" />
                <h3 className="font-bold text-gray-900">Información General</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-gray-600" />
                    <p className="text-xs font-semibold text-gray-600">RESPONSABLE</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback
                        className="text-xs font-bold"
                        style={{
                          backgroundColor: ejeConfig.bgColor,
                          color: ejeConfig.color
                        }}
                      >
                        {indicador.responsable.split(' ').map(n => n[0]).join('').substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-sm font-semibold text-gray-900">{indicador.responsable}</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-gray-600" />
                    <p className="text-xs font-semibold text-gray-600">PERIODICIDAD</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    {indicador.periodicidad === 'MENSUAL' && '📅 Mensual'}
                    {indicador.periodicidad === 'TRIMESTRAL' && '📊 Trimestral'}
                    {indicador.periodicidad === 'SEMESTRAL' && '📈 Semestral'}
                    {indicador.periodicidad === 'ANUAL' && '📆 Anual'}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-gray-600" />
                    <p className="text-xs font-semibold text-gray-600">PRIORIDAD</p>
                  </div>
                  <Badge
                    className="text-xs font-semibold"
                    style={{
                      backgroundColor: prioridadConfig.bgColor,
                      color: prioridadConfig.color,
                      border: `1px solid ${prioridadConfig.color}`
                    }}
                  >
                    {prioridadConfig.emoji} {prioridadConfig.nombre}
                  </Badge>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-gray-600" />
                    <p className="text-xs font-semibold text-gray-600">TIPO INDICADOR</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    {indicador.tipoIndicador === 'EFICIENCIA' && '⚡ Eficiencia'}
                    {indicador.tipoIndicador === 'EFICACIA' && '🎯 Eficacia'}
                    {indicador.tipoIndicador === 'GESTION' && '📊 Gestión'}
                    {indicador.tipoIndicador === 'TRANSPARENCIA' && '🔍 Transparencia'}
                  </p>
                </div>
              </div>
            </div>

            {/* Sección: Cronograma y Avance Temporal */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b-2 border-gray-200">
                <Calendar className="w-5 h-5 text-gray-700" />
                <h3 className="font-bold text-gray-900">Cronograma y Avance Temporal</h3>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-xl p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Fecha de Inicio</p>
                    <p className="text-sm font-bold text-gray-900">
                      {indicador.fechaInicio.toLocaleDateString('es-CO', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Fecha Límite</p>
                    <p className="text-sm font-bold text-gray-900">
                      {indicador.fechaFin.toLocaleDateString('es-CO', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Días Restantes</p>
                    <p
                      className="text-sm font-bold"
                      style={{
                        color: diasRestantes < 30 ? '#DC2626' : diasRestantes < 90 ? '#F59E0B' : '#10B981'
                      }}
                    >
                      {diasRestantes > 0 ? `${diasRestantes} días` : 'Vencido'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-700">
                    <span>Progreso Temporal</span>
                    <span className="font-bold">{porcentajeTiempo}% del tiempo transcurrido</span>
                  </div>
                  <Progress value={porcentajeTiempo} className="h-3" />
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>{diasTranscurridos} días transcurridos</span>
                    <span>{diasTotales} días totales</span>
                  </div>
                </div>
              </div>

              {/* Comparación Avance vs Tiempo */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Análisis Avance vs Tiempo
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-700 mb-2">Avance del Indicador</p>
                    <div className="flex items-center gap-2">
                      <Progress value={indicador.avance} className="flex-1 h-3" />
                      <span className="text-sm font-bold" style={{ color: getSemaforoColor(indicador.avance) }}>
                        {indicador.avance}%
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-700 mb-2">Tiempo Transcurrido</p>
                    <div className="flex items-center gap-2">
                      <Progress value={porcentajeTiempo} className="flex-1 h-3" />
                      <span className="text-sm font-bold text-gray-900">{porcentajeTiempo}%</span>
                    </div>
                  </div>
                </div>

                {/* Mensaje de alerta */}
                <div className="mt-4 p-3 rounded-lg" style={{
                  backgroundColor: indicador.avance >= porcentajeTiempo ? '#D1FAE5' : '#FEF3C7'
                }}>
                  <p className="text-sm font-semibold" style={{
                    color: indicador.avance >= porcentajeTiempo ? '#059669' : '#D97706'
                  }}>
                    {indicador.avance >= porcentajeTiempo
                      ? '✅ El indicador va según lo programado o adelantado'
                      : '⚠️ El indicador está retrasado respecto al tiempo transcurrido'}
                  </p>
                </div>
              </div>
            </div>

            {/* Acciones Rápidas */}
            <div className="flex items-center gap-3 pt-4 border-t-2 border-gray-200 flex-wrap">
              <Button
                onClick={onCargarAvance}
                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Actualizar Avance
              </Button>
              <Button
                onClick={onEditar}
                variant="outline"
                className="flex-1 border-2 border-blue-500 text-blue-600 hover:bg-blue-50 font-semibold"
              >
                Editar Indicador
              </Button>
              {onArchivar && (
                <Button
                  onClick={() => { onArchivar(); onClose(); }}
                  variant="outline"
                  className="border-2 border-orange-400 text-orange-600 hover:bg-orange-50 font-semibold"
                >
                  <Archive className="w-4 h-4 mr-2" />
                  Archivar
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
