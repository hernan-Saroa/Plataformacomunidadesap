/**
 * ============================================
 * BADGE CUMPLIMIENTO DECRETO 648/2017
 * ============================================
 * 
 * Componente visual que muestra el estado de cumplimiento
 * del Decreto 648/2017 para un Plan Anual
 */

import { CheckCircle, AlertCircle, XCircle, Shield, Info } from 'lucide-react';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Card } from '@esap-mfe/shared-ui/card';
import {
  validarDecreto648,
  obtenerEstadisticasPlan,
  obtenerRolesSinActividades,
  type PlanAnual,
  type ResultadoValidacion
} from '../utils/validacionesDecreto648';

interface BadgeDecreto648Props {
  plan: PlanAnual;
  mostrarDetalles?: boolean;
  tamano?: 'sm' | 'md' | 'lg';
}

export function BadgeDecreto648({ plan, mostrarDetalles = false, tamano = 'md' }: BadgeDecreto648Props) {
  const validacion = validarDecreto648(plan);
  const stats = obtenerEstadisticasPlan(plan);

  // Determinar color y estado
  const getEstadoVisual = () => {
    if (validacion.valido) {
      return {
        color: 'bg-green-100 text-green-800 border-green-300',
        icono: <CheckCircle className="w-4 h-4" />,
        texto: 'Cumple Decreto 648/2017',
        textoCorto: 'Válido'
      };
    }

    if (validacion.errores.length > 0) {
      return {
        color: 'bg-red-100 text-red-800 border-red-300',
        icono: <XCircle className="w-4 h-4" />,
        texto: 'NO Cumple Decreto 648/2017',
        textoCorto: 'Inválido'
      };
    }

    return {
      color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      icono: <AlertCircle className="w-4 h-4" />,
      texto: 'Con Advertencias',
      textoCorto: 'Advertencias'
    };
  };

  const estado = getEstadoVisual();

  // Badge simple (sin detalles)
  if (!mostrarDetalles) {
    const badgeClass = tamano === 'sm' ? 'text-xs px-2 py-1' : tamano === 'lg' ? 'text-base px-4 py-2' : 'text-sm px-3 py-1.5';
    
    return (
      <Badge 
        className={`${estado.color} border ${badgeClass} font-semibold gap-2 inline-flex items-center`}
        variant="outline"
      >
        {estado.icono}
        {tamano === 'sm' ? estado.textoCorto : estado.texto}
      </Badge>
    );
  }

  // Card con detalles completos
  return (
    <Card className={`p-6 border-2 ${estado.color.replace('bg-', 'border-').replace('100', '300')}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-lg ${estado.color}`}>
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-900">
                Decreto 648/2017
              </h3>
              <p className="text-sm text-gray-600">
                Sistema de Control Interno
              </p>
            </div>
          </div>
          
          <Badge 
            className={`${estado.color} border text-sm px-3 py-1.5 font-semibold gap-2`}
            variant="outline"
          >
            {estado.icono}
            {estado.texto}
          </Badge>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-[#003DA5]">
              {stats.rolesConActividades}/5
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Roles con Actividades
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-[#003DA5]">
              {stats.totalActividades}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Total Actividades
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-[#003DA5]">
              {stats.progresoGeneral}%
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Progreso General
            </div>
          </div>
          
          <div className="text-center">
            <div className={`text-2xl font-bold ${validacion.valido ? 'text-green-600' : 'text-red-600'}`}>
              {validacion.valido ? '✓' : '✗'}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Estado Validación
            </div>
          </div>
        </div>

        {/* Errores (si existen) */}
        {validacion.errores.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-2 mb-3">
              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-red-900 mb-2">
                  {validacion.errores.length} Error{validacion.errores.length !== 1 ? 'es' : ''} Encontrado{validacion.errores.length !== 1 ? 's' : ''}
                </h4>
                <ul className="space-y-2">
                  {validacion.errores.map((error, idx) => (
                    <li key={idx} className="text-sm text-red-800 flex gap-2">
                      <span className="font-bold">{idx + 1}.</span>
                      <span>{error}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Advertencias (si existen) */}
        {validacion.advertencias.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-yellow-900 mb-2">
                  {validacion.advertencias.length} Advertencia{validacion.advertencias.length !== 1 ? 's' : ''}
                </h4>
                <ul className="space-y-2">
                  {validacion.advertencias.map((adv, idx) => (
                    <li key={idx} className="text-sm text-yellow-800 flex gap-2">
                      <span>•</span>
                      <span>{adv}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Mensaje de éxito */}
        {validacion.valido && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-green-900 mb-1">
                  ✅ Plan Válido
                </h4>
                <p className="text-sm text-green-800">
                  El Plan Anual cumple con todos los requisitos del Decreto 648/2017.
                  Está listo para ser aprobado.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Información adicional */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <strong>Decreto 648 de 2017:</strong> Establece los lineamientos
              para el fortalecimiento del Sistema de Control Interno en las
              entidades del Estado. El Plan Anual de Auditoría DEBE contener
              EXACTAMENTE 5 roles obligatorios, cada uno con al menos 1 actividad.
            </div>
          </div>
        </div>

        {/* Actividades por estado */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t">
          <div className="bg-gray-100 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-gray-700">
              {stats.actividadesPorEstado.Pendiente}
            </div>
            <div className="text-xs text-gray-600">Pendientes</div>
          </div>
          
          <div className="bg-blue-100 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-blue-700">
              {stats.actividadesPorEstado['En Ejecución']}
            </div>
            <div className="text-xs text-gray-600">En Ejecución</div>
          </div>
          
          <div className="bg-green-100 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-green-700">
              {stats.actividadesPorEstado.Completada}
            </div>
            <div className="text-xs text-gray-600">Completadas</div>
          </div>
          
          <div className="bg-red-100 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-red-700">
              {stats.actividadesPorEstado.Retrasada}
            </div>
            <div className="text-xs text-gray-600">Retrasadas</div>
          </div>
        </div>
      </div>
    </Card>
  );
}

/**
 * Badge simple para usar en listas
 */
export function BadgeDecreto648Simple({ plan }: { plan: PlanAnual }) {
  return <BadgeDecreto648 plan={plan} mostrarDetalles={false} tamano="sm" />;
}

/**
 * Card completo para usar en detalles
 */
export function BadgeDecreto648Completo({ plan }: { plan: PlanAnual }) {
  return <BadgeDecreto648 plan={plan} mostrarDetalles={true} tamano="lg" />;
}
