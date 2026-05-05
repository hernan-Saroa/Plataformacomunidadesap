/**
 * BadgeDiasHabilesConHora - Componente mejorado que considera FECHA Y HORA
 * ✅ Diseño corporativo ESAP 2026
 * ✅ Cálculo preciso considerando horas y minutos
 * ✅ Tooltip informativo sobre días hábiles con hora
 * 
 * IMPORTANTE: En derecho procesal colombiano, los términos consideran
 * tanto el día como la HORA exacta de notificación/actuación.
 */

import { Calendar, Clock, Info, AlertCircle } from 'lucide-react';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { ModuleInfoTooltip } from './ModuleInfoTooltip';
import { 
  calcularDiasHabilesEntreDosFechas, 
  formatearFechaHoraLegal,
  obtenerEstadoSemaforo,
  plazoVencido
} from '../utils/diasHabiles';

interface BadgeDiasHabilesConHoraProps {
  fechaInicio: Date | string;
  fechaVencimiento: Date | string;
  mostrarIcono?: boolean;
  mostrarTooltip?: boolean;
  variant?: 'default' | 'inline' | 'compact';
  mostrarHoraEnTooltip?: boolean;
}

export function BadgeDiasHabilesConHora({ 
  fechaInicio,
  fechaVencimiento,
  mostrarIcono = true,
  mostrarTooltip = true,
  variant = 'default',
  mostrarHoraEnTooltip = true
}: BadgeDiasHabilesConHoraProps) {
  
  // ✅ Calcular días hábiles restantes considerando HORA
  const diasRestantes = calcularDiasHabilesEntreDosFechas(new Date(), fechaVencimiento);
  const diasRedondeados = Math.floor(diasRestantes);
  
  // Determinar si está vencido
  const vencido = plazoVencido(fechaVencimiento);
  
  // Obtener estado del semáforo
  const estadoSemaforo = obtenerEstadoSemaforo(fechaVencimiento);
  
  const getColorClasses = () => {
    if (vencido || diasRedondeados <= 0) return 'bg-red-100 text-red-800 border-red-300';
    if (diasRedondeados <= 2) return 'bg-red-100 text-red-800 border-red-300';
    if (diasRedondeados <= 5) return 'bg-orange-100 text-orange-800 border-orange-300';
    if (diasRedondeados <= 10) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-green-100 text-green-800 border-green-300';
  };

  const getTexto = () => {
    const diasAbsoluto = Math.abs(diasRedondeados);
    const label = diasAbsoluto === 1 ? 'día hábil' : 'días hábiles';
    
    if (vencido) {
      return variant === 'compact' ? 'Vencido' : `Vencido hace ${diasAbsoluto} ${label}`;
    }
    
    if (diasRedondeados === 0) {
      // Verificar si vence hoy pero aún no es la hora
      const ahora = new Date();
      const vencimiento = typeof fechaVencimiento === 'string' ? new Date(fechaVencimiento) : fechaVencimiento;
      
      if (ahora < vencimiento) {
        const horasRestantes = Math.floor((vencimiento.getTime() - ahora.getTime()) / (1000 * 60 * 60));
        const minutosRestantes = Math.floor(((vencimiento.getTime() - ahora.getTime()) / (1000 * 60)) % 60);
        
        if (variant === 'compact') return 'Hoy';
        if (horasRestantes > 0) return `Vence hoy (${horasRestantes}h ${minutosRestantes}m)`;
        return `Vence hoy (${minutosRestantes}m)`;
      }
      
      return variant === 'compact' ? 'Hoy' : 'Vence hoy';
    }
    
    if (variant === 'compact') return `${diasRedondeados} dh`;
    
    // Mostrar fracción de día si es relevante
    const fraccion = diasRestantes - diasRedondeados;
    if (fraccion >= 0.1 && diasRedondeados <= 5) {
      const horas = Math.floor(fraccion * 24);
      if (horas > 0) {
        return `${diasRedondeados} ${label} y ${horas}h`;
      }
    }
    
    return `${diasRedondeados} ${label}`;
  };

  const tooltipContent = (
    <div className="text-xs space-y-2.5 max-w-xs">
      <div className="font-bold text-[#003DA5] mb-2 flex items-center gap-2">
        <Calendar className="w-4 h-4" />
        Días Hábiles con Hora Exacta
      </div>
      
      {/* Información de fechas */}
      <div className="space-y-1.5 bg-blue-50 p-2 rounded border border-blue-200">
        <div>
          <strong className="text-gray-700">Notificación:</strong>
          <div className="text-gray-600 ml-2">
            {formatearFechaHoraLegal(fechaInicio, mostrarHoraEnTooltip)}
          </div>
        </div>
        <div>
          <strong className="text-gray-700">Vencimiento:</strong>
          <div className="text-gray-600 ml-2">
            {formatearFechaHoraLegal(fechaVencimiento, mostrarHoraEnTooltip)}
          </div>
        </div>
      </div>

      {/* Días restantes */}
      <div className="bg-gray-50 p-2 rounded border border-gray-200">
        <strong className="text-gray-700">Tiempo restante:</strong>
        <div className="text-gray-600 ml-2">
          {vencido ? (
            <span className="text-red-600 font-semibold">⚠️ Plazo vencido</span>
          ) : (
            <>
              {diasRedondeados} días hábiles
              {diasRestantes - diasRedondeados >= 0.1 && (
                <span className="text-xs"> + {Math.floor((diasRestantes - diasRedondeados) * 24)} horas</span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Información adicional */}
      <div className="space-y-1 pt-2 border-t border-gray-200">
        <p className="font-semibold text-gray-700 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          ¿Por qué considerar la hora?
        </p>
        <p className="text-gray-600">
          En derecho procesal colombiano, los términos legales no solo se cuentan por días, 
          sino que <strong>también consideran la hora exacta</strong> de notificación.
        </p>
        <p className="text-gray-600 mt-1">
          <strong>Ejemplo:</strong> Si una notificación se recibe el 3 de febrero a las 14:30 
          y el plazo es de 5 días hábiles, el vencimiento será el 10 de febrero <strong>a las 14:30</strong>.
        </p>
      </div>

      {/* Días hábiles */}
      <div className="pt-2 border-t border-gray-200 text-gray-600">
        <p className="font-semibold mb-1">Los días hábiles excluyen:</p>
        <ul className="list-disc ml-4 space-y-0.5">
          <li>Sábados y Domingos</li>
          <li>Festivos nacionales de Colombia</li>
        </ul>
      </div>

      {/* Referencia legal */}
      <div className="pt-2 border-t border-gray-200 text-[10px] text-gray-500 italic">
        Art. 121 del CPACA (Código de Procedimiento Administrativo y de lo Contencioso Administrativo)
      </div>
    </div>
  );

  const BadgeContent = (
    <Badge 
      className={`
        ${getColorClasses()} 
        border font-medium
        ${variant === 'inline' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1'}
        ${variant === 'compact' ? 'text-[10px] px-1 py-0.5' : ''}
        flex items-center gap-1
      `}
    >
      {mostrarIcono && variant !== 'compact' && (
        <div className="flex items-center gap-0.5">
          <Calendar className="w-3 h-3" />
          <Clock className="w-2.5 h-2.5" />
        </div>
      )}
      {getTexto()}
    </Badge>
  );

  if (mostrarTooltip) {
    return (
      <div className="flex items-center gap-1">
        {BadgeContent}
        <ModuleInfoTooltip 
          content={tooltipContent}
          side="top"
        >
          <button className="text-gray-400 hover:text-[#003DA5] transition-colors">
            <Info className="w-3.5 h-3.5" />
          </button>
        </ModuleInfoTooltip>
      </div>
    );
  }

  return BadgeContent;
}

/**
 * BannerDiasHabilesConHora - Banner informativo para headers
 * Muestra alerta si hay plazos próximos a vencer
 */
export function BannerDiasHabilesConHora({ 
  expedientes 
}: { 
  expedientes: Array<{ fechaVencimiento: Date | string }> 
}) {
  // Contar expedientes por urgencia
  const contadores = {
    vencidos: 0,
    urgentes: 0, // <= 2 días
    atencion: 0  // 3-5 días
  };

  expedientes.forEach(exp => {
    const estado = obtenerEstadoSemaforo(exp.fechaVencimiento);
    if (estado === 'vencido') contadores.vencidos++;
    else if (estado === 'rojo') contadores.urgentes++;
    else if (estado === 'amarillo') contadores.atencion++;
  });

  // No mostrar si no hay urgencias
  if (contadores.vencidos === 0 && contadores.urgentes === 0 && contadores.atencion === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-3 mb-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-bold text-gray-900 mb-1 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Alertas de Vencimientos (Fecha y Hora)
          </h3>
          <div className="text-xs text-gray-700 space-y-1">
            {contadores.vencidos > 0 && (
              <p className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-red-600 rounded-full"></span>
                <strong>{contadores.vencidos}</strong> expediente{contadores.vencidos !== 1 ? 's' : ''} con plazo vencido
              </p>
            )}
            {contadores.urgentes > 0 && (
              <p className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-orange-600 rounded-full"></span>
                <strong>{contadores.urgentes}</strong> expediente{contadores.urgentes !== 1 ? 's' : ''} vence{contadores.urgentes !== 1 ? 'n' : ''} en ≤2 días
              </p>
            )}
            {contadores.atencion > 0 && (
              <p className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-yellow-600 rounded-full"></span>
                <strong>{contadores.atencion}</strong> expediente{contadores.atencion !== 1 ? 's' : ''} vence{contadores.atencion !== 1 ? 'n' : ''} en 3-5 días
              </p>
            )}
          </div>
          <p className="text-[10px] text-gray-600 mt-2 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Los plazos consideran <strong>fecha Y hora</strong> exacta según Art. 121 CPACA
          </p>
        </div>
      </div>
    </div>
  );
}
