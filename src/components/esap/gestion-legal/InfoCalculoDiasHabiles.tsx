/**
 * ============================================
 * COMPONENTE DE INFO - CÁLCULO DÍAS HÁBILES
 * ============================================
 * 
 * Muestra información detallada sobre cómo se calculó
 * una fecha de vencimiento, incluyendo:
 * - Días calendario vs días hábiles
 * - Fines de semana excluidos
 * - Festivos colombianos excluidos
 * - Porcentaje de eficiencia
 * 
 * Útil para transparencia y debugging del cálculo
 */

import { Calendar, AlertCircle, Info, X } from 'lucide-react';
import { obtenerInfoCalculoVencimiento, obtenerFestivosActuales } from '../../../utils/diasHabiles';

interface Props {
  fechaInicio: Date | string;
  diasHabiles: number;
  mostrarFestivos?: boolean;
  onClose?: () => void;
}

export function InfoCalculoDiasHabiles({ 
  fechaInicio, 
  diasHabiles,
  mostrarFestivos = false,
  onClose 
}: Props) {
  const fechaInicioDate = typeof fechaInicio === 'string' 
    ? new Date(fechaInicio) 
    : fechaInicio;

  const info = obtenerInfoCalculoVencimiento(fechaInicioDate, diasHabiles);
  const festivos = mostrarFestivos ? obtenerFestivosActuales() : [];

  // Filtrar festivos que están en el rango de cálculo
  const festivosEnRango = festivos.filter(f => 
    f.fecha >= info.fechaInicio && f.fecha <= info.fechaVencimiento
  );

  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-6 border-2 border-blue-300 relative">
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      )}
      
      <div className="flex items-start gap-3 mb-4">
        <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-blue-900 text-lg">
            📊 Información del Cálculo
          </h4>
          <p className="text-sm text-blue-700 mt-1">
            Desglose detallado del cálculo de días hábiles
          </p>
        </div>
      </div>

      {/* Resumen Principal */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-white rounded-lg p-4 border border-blue-200">
          <p className="text-xs text-blue-700 font-semibold">Días Solicitados</p>
          <p className="text-2xl font-bold text-blue-900 mt-1">
            {info.diasHabilesSolicitados}
          </p>
          <p className="text-xs text-gray-600 mt-1">días hábiles</p>
        </div>

        <div className="bg-white rounded-lg p-4 border border-purple-200">
          <p className="text-xs text-purple-700 font-semibold">Días Calendario</p>
          <p className="text-2xl font-bold text-purple-900 mt-1">
            {info.diasCalendario}
          </p>
          <p className="text-xs text-gray-600 mt-1">días totales</p>
        </div>

        <div className="bg-white rounded-lg p-4 border border-red-200">
          <p className="text-xs text-red-700 font-semibold">Fines de Semana</p>
          <p className="text-2xl font-bold text-red-900 mt-1">
            {info.finesDeSemana}
          </p>
          <p className="text-xs text-gray-600 mt-1">días excluidos</p>
        </div>

        <div className="bg-white rounded-lg p-4 border border-orange-200">
          <p className="text-xs text-orange-700 font-semibold">Festivos</p>
          <p className="text-2xl font-bold text-orange-900 mt-1">
            {info.festivos}
          </p>
          <p className="text-xs text-gray-600 mt-1">días excluidos</p>
        </div>
      </div>

      {/* Detalles */}
      <div className="bg-white rounded-lg p-4 border border-gray-200 mb-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Fecha de Inicio:</span>
            <p className="font-semibold text-gray-900">
              {info.fechaInicio.toLocaleDateString('es-CO', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric'
              })}
            </p>
          </div>
          <div>
            <span className="text-gray-600">Fecha de Vencimiento:</span>
            <p className="font-semibold text-red-600">
              {info.fechaVencimiento.toLocaleDateString('es-CO', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric'
              })}
            </p>
          </div>
          <div>
            <span className="text-gray-600">Días No Hábiles:</span>
            <p className="font-semibold text-gray-900">
              {info.diasNoHabiles} días (fines de semana + festivos)
            </p>
          </div>
          <div>
            <span className="text-gray-600">Eficiencia:</span>
            <p className="font-semibold text-gray-900">
              {info.porcentajeEficiencia}% días hábiles
            </p>
          </div>
        </div>
      </div>

      {/* Barra de Progreso Visual */}
      <div className="bg-white rounded-lg p-4 border border-gray-200 mb-4">
        <p className="text-sm font-semibold text-gray-700 mb-2">
          Distribución de Días:
        </p>
        <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
          {/* Días hábiles */}
          <div 
            className="absolute top-0 left-0 h-full bg-green-500 flex items-center justify-center text-white text-xs font-bold"
            style={{ width: `${info.porcentajeEficiencia}%` }}
          >
            {info.diasHabilesSolicitados} hábiles
          </div>
          
          {/* Días no hábiles */}
          <div 
            className="absolute top-0 h-full bg-red-400 flex items-center justify-center text-white text-xs font-bold"
            style={{ 
              left: `${info.porcentajeEficiencia}%`,
              width: `${100 - info.porcentajeEficiencia}%` 
            }}
          >
            {info.diasNoHabiles} no hábiles
          </div>
        </div>
        <div className="flex justify-between text-xs text-gray-600 mt-2">
          <span>0 días</span>
          <span>{info.diasCalendario} días calendario</span>
        </div>
      </div>

      {/* Festivos en el rango (si mostrarFestivos = true) */}
      {mostrarFestivos && festivosEnRango.length > 0 && (
        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-300">
          <div className="flex items-start gap-2 mb-3">
            <Calendar className="w-5 h-5 text-yellow-700 flex-shrink-0 mt-0.5" />
            <div>
              <h5 className="font-semibold text-yellow-900">
                Festivos Colombianos en este Período
              </h5>
              <p className="text-xs text-yellow-700 mt-1">
                Estos días fueron excluidos del cálculo
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {festivosEnRango.map((festivo, index) => (
              <div 
                key={index}
                className="bg-white rounded p-2 border border-yellow-200 text-sm"
              >
                <p className="font-semibold text-yellow-900">{festivo.nombre}</p>
                <p className="text-xs text-gray-600">
                  {festivo.fecha.toLocaleDateString('es-CO', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nota Legal */}
      <div className="bg-blue-100 rounded-lg p-3 mt-4 border border-blue-300">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-blue-700 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-900">
            <strong>Nota Legal:</strong> Este cálculo considera días hábiles (Lunes a Viernes) 
            excluyendo festivos colombianos según la Ley 51 de 1983 (Ley Emiliani). 
            El cálculo es exacto y puede ser verificado manualmente.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Componente Simplificado - Solo muestra resumen básico
 */
interface InfoSimpleProps {
  fechaInicio: Date | string;
  fechaVencimiento: Date | string;
  diasHabiles: number;
}

export function InfoCalculoSimple({ 
  fechaInicio, 
  fechaVencimiento,
  diasHabiles 
}: InfoSimpleProps) {
  const fechaInicioDate = typeof fechaInicio === 'string' 
    ? new Date(fechaInicio) 
    : fechaInicio;
    
  const fechaVencDate = typeof fechaVencimiento === 'string' 
    ? new Date(fechaVencimiento) 
    : fechaVencimiento;

  const diasCalendario = Math.floor(
    (fechaVencDate.getTime() - fechaInicioDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="inline-flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2 border border-blue-200">
      <Calendar className="w-4 h-4 text-blue-600" />
      <span className="text-sm text-blue-900">
        <strong>{diasHabiles} días hábiles</strong> = {diasCalendario} días calendario
      </span>
      <span className="text-xs text-blue-600">
        (excluye fines de semana y festivos)
      </span>
    </div>
  );
}
