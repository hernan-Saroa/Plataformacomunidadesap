/**
 * MODAL DE PRORRATEO AUTOMÁTICO - ESAP
 * 
 * Algoritmo inteligente que ajusta automáticamente las horas del PTA
 * cuando hay exceso o faltante, respetando las reglas de negocio:
 * 
 * - Docencia ≥ 50% para tipos de vinculación específicos
 * - Investigación ≤ 50% (máximo 400 hrs)
 * - Extensión ≤ 25% (máximo 200 hrs)
 * - Complementarias ≤ 25% (máximo 200 hrs)
 * 
 * El algoritmo aplica un prorrateo proporcional manteniendo las
 * proporciones relativas entre componentes.
 */

import { useState, useEffect } from 'react';
import { X, Calculator, AlertTriangle, CheckCircle, TrendingDown, TrendingUp, ArrowRight, Info } from 'lucide-react';
import { ModalHeaderClean } from '../design-system/ModalHeaderClean';

// ============================================================================
// TIPOS
// ============================================================================

interface ActividadBase {
  id: string;
  descripcion: string;
  horasAsignadas: number;
}

interface ActividadDocencia extends ActividadBase {
  creditos: number;
  gruposAsignados: number;
}

interface DistribucionActual {
  docencia: number;
  investigacion: number;
  extension: number;
  complementarias: number;
  total: number;
}

interface DistribucionPropuesta {
  docencia: number;
  investigacion: number;
  extension: number;
  complementarias: number;
  total: number;
  cambios: {
    docencia: number;
    investigacion: number;
    extension: number;
    complementarias: number;
  };
}

interface ConfiguracionProrrateo {
  horasProgramables: number;
  tipoVinculacion: string;
  mantenerDocenciaFija: boolean; // No prorratear docencia (solo ajustar otros)
  priorizarInvestigacion: boolean; // Priorizar investigación sobre extensión
}

// ============================================================================
// ALGORITMO DE PRORRATEO
// ============================================================================

class AlgoritmoProrrateo {
  /**
   * Calcula el prorrateo óptimo respetando restricciones
   */
  static calcularProrrateo(
    distribucionActual: DistribucionActual,
    configuracion: ConfiguracionProrrateo
  ): DistribucionPropuesta {
    const { horasProgramables, tipoVinculacion, mantenerDocenciaFija, priorizarInvestigacion } = configuracion;
    const diferencia = horasProgramables - distribucionActual.total;

    // Si ya está balanceado, no hacer nada
    if (diferencia === 0) {
      return {
        ...distribucionActual,
        cambios: { docencia: 0, investigacion: 0, extension: 0, complementarias: 0 }
      };
    }

    const esExceso = diferencia < 0;
    const magnitud = Math.abs(diferencia);

    console.log('🔢 Iniciando prorrateo:', {
      actual: distribucionActual.total,
      objetivo: horasProgramables,
      diferencia,
      esExceso,
      magnitud
    });

    // Estrategia 1: Si Docencia está fija, ajustar solo los otros componentes
    if (mantenerDocenciaFija) {
      return this.prorratearSinDocencia(distribucionActual, magnitud, esExceso, horasProgramables);
    }

    // Estrategia 2: Prorrateo proporcional de todos los componentes
    return this.prorratearProporcional(distribucionActual, magnitud, esExceso, horasProgramables, tipoVinculacion);
  }

  /**
   * Prorrateo manteniendo Docencia fija (ajusta Investigación, Extensión, Complementarias)
   */
  private static prorratearSinDocencia(
    actual: DistribucionActual,
    magnitud: number,
    esExceso: boolean,
    horasProgramables: number
  ): DistribucionPropuesta {
    const docencia = actual.docencia; // Mantener fijo
    const horasDisponibles = horasProgramables - docencia;

    // Total actual de componentes ajustables
    const totalAjustables = actual.investigacion + actual.extension + actual.complementarias;

    if (totalAjustables === 0) {
      // No hay nada que ajustar
      return {
        docencia,
        investigacion: 0,
        extension: 0,
        complementarias: 0,
        total: docencia,
        cambios: {
          docencia: 0,
          investigacion: -actual.investigacion,
          extension: -actual.extension,
          complementarias: -actual.complementarias
        }
      };
    }

    // Calcular proporciones
    const propInv = actual.investigacion / totalAjustables;
    const propExt = actual.extension / totalAjustables;
    const propComp = actual.complementarias / totalAjustables;

    // Distribuir las horas disponibles proporcionalmente
    let investigacion = Math.round(horasDisponibles * propInv);
    let extension = Math.round(horasDisponibles * propExt);
    let complementarias = Math.round(horasDisponibles * propComp);

    // Aplicar límites
    const maxInvestigacion = horasProgramables * 0.50; // 50%
    const maxExtension = horasProgramables * 0.25; // 25%
    const maxComplementarias = horasProgramables * 0.25; // 25%

    investigacion = Math.min(investigacion, maxInvestigacion);
    extension = Math.min(extension, maxExtension);
    complementarias = Math.min(complementarias, maxComplementarias);

    // Ajuste final para que sume exactamente
    const totalPropuesto = docencia + investigacion + extension + complementarias;
    const ajusteFinal = horasProgramables - totalPropuesto;

    // Aplicar ajuste al componente más grande (que no sea docencia)
    if (Math.abs(ajusteFinal) > 0) {
      if (investigacion >= extension && investigacion >= complementarias) {
        investigacion += ajusteFinal;
      } else if (extension >= complementarias) {
        extension += ajusteFinal;
      } else {
        complementarias += ajusteFinal;
      }
    }

    return {
      docencia,
      investigacion: Math.max(0, investigacion),
      extension: Math.max(0, extension),
      complementarias: Math.max(0, complementarias),
      total: horasProgramables,
      cambios: {
        docencia: 0,
        investigacion: investigacion - actual.investigacion,
        extension: extension - actual.extension,
        complementarias: complementarias - actual.complementarias
      }
    };
  }

  /**
   * Prorrateo proporcional de todos los componentes
   */
  private static prorratearProporcional(
    actual: DistribucionActual,
    magnitud: number,
    esExceso: boolean,
    horasProgramables: number,
    tipoVinculacion: string
  ): DistribucionPropuesta {
    const factor = horasProgramables / actual.total;

    // Calcular nuevos valores proporcionalmente
    let docencia = Math.round(actual.docencia * factor);
    let investigacion = Math.round(actual.investigacion * factor);
    let extension = Math.round(actual.extension * factor);
    let complementarias = Math.round(actual.complementarias * factor);

    // Aplicar restricciones
    const minDocencia = this.calcularMinimoDocencia(tipoVinculacion, horasProgramables);
    const maxInvestigacion = horasProgramables * 0.50;
    const maxExtension = horasProgramables * 0.25;
    const maxComplementarias = horasProgramables * 0.25;

    docencia = Math.max(docencia, minDocencia);
    investigacion = Math.min(investigacion, maxInvestigacion);
    extension = Math.min(extension, maxExtension);
    complementarias = Math.min(complementarias, maxComplementarias);

    // Ajuste final para que sume exactamente horasProgramables
    let totalPropuesto = docencia + investigacion + extension + complementarias;
    const ajusteFinal = horasProgramables - totalPropuesto;

    // Distribuir el ajuste final al componente con más margen
    if (ajusteFinal !== 0) {
      // Priorizar ajustar docencia si hay margen
      const margenDocencia = horasProgramables - minDocencia - investigacion - extension - complementarias;
      if (margenDocencia >= Math.abs(ajusteFinal)) {
        docencia += ajusteFinal;
      } else if (investigacion > 0 && investigacion + ajusteFinal <= maxInvestigacion) {
        investigacion += ajusteFinal;
      } else if (extension > 0 && extension + ajusteFinal <= maxExtension) {
        extension += ajusteFinal;
      } else {
        complementarias += ajusteFinal;
      }
    }

    return {
      docencia: Math.max(0, docencia),
      investigacion: Math.max(0, investigacion),
      extension: Math.max(0, extension),
      complementarias: Math.max(0, complementarias),
      total: horasProgramables,
      cambios: {
        docencia: docencia - actual.docencia,
        investigacion: investigacion - actual.investigacion,
        extension: extension - actual.extension,
        complementarias: complementarias - actual.complementarias
      }
    };
  }

  /**
   * Calcula el mínimo de docencia según tipo de vinculación
   */
  private static calcularMinimoDocencia(tipoVinculacion: string, horasProgramables: number): number {
    const requiereMinimoDocencia = ['Ocasional', 'Visitante', 'Especial'].includes(tipoVinculacion);
    return requiereMinimoDocencia ? horasProgramables * 0.50 : 0;
  }
}

// ============================================================================
// COMPONENTE MODAL
// ============================================================================

interface ModalProrrateoProps {
  isOpen: boolean;
  onClose: () => void;
  distribucionActual: DistribucionActual;
  horasProgramables: number;
  tipoVinculacion: string;
  onAplicar: (distribucionNueva: DistribucionPropuesta) => void;
}

export function ModalProrrateo({
  isOpen,
  onClose,
  distribucionActual,
  horasProgramables,
  tipoVinculacion,
  onAplicar
}: ModalProrrateoProps) {
  const [mantenerDocenciaFija, setMantenerDocenciaFija] = useState(false);
  const [distribucionPropuesta, setDistribucionPropuesta] = useState<DistribucionPropuesta | null>(null);

  useEffect(() => {
    if (isOpen) {
      calcularProrrateo();
    }
  }, [isOpen, mantenerDocenciaFija, distribucionActual]);

  const calcularProrrateo = () => {
    const propuesta = AlgoritmoProrrateo.calcularProrrateo(distribucionActual, {
      horasProgramables,
      tipoVinculacion,
      mantenerDocenciaFija,
      priorizarInvestigacion: false
    });

    setDistribucionPropuesta(propuesta);
  };

  const handleAplicar = () => {
    if (distribucionPropuesta) {
      onAplicar(distribucionPropuesta);
      onClose();
    }
  };

  if (!isOpen) return null;

  const diferencia = distribucionActual.total - horasProgramables;
  const esExceso = diferencia > 0;
  const magnitud = Math.abs(diferencia);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <ModalHeaderClean
          title="Prorrateo Automático de Horas"
          subtitle="Ajuste inteligente para balancear tu Plan de Trabajo Académico"
          onClose={onClose}
        />

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Resumen del Problema */}
          <div className={`${esExceso ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'} border rounded-xl p-4 mb-6`}>
            <div className="flex items-start gap-3">
              <AlertTriangle className={`w-6 h-6 ${esExceso ? 'text-red-600' : 'text-yellow-600'} flex-shrink-0`} />
              <div className="flex-1">
                <h3 className={`font-bold ${esExceso ? 'text-red-900' : 'text-yellow-900'} mb-1`}>
                  {esExceso ? 'Exceso de Horas Detectado' : 'Horas Faltantes Detectadas'}
                </h3>
                <p className={`text-sm ${esExceso ? 'text-red-700' : 'text-yellow-700'}`}>
                  Tienes {distribucionActual.total} hrs asignadas de {horasProgramables} hrs programables.
                  {esExceso ? ` Necesitas reducir ${magnitud} hrs.` : ` Faltan ${magnitud} hrs por asignar.`}
                </p>
              </div>
              <div className="text-right">
                <div className={`text-3xl font-bold ${esExceso ? 'text-red-600' : 'text-yellow-600'}`}>
                  {esExceso ? '+' : '-'}{magnitud}
                </div>
                <div className="text-xs text-gray-600">horas</div>
              </div>
            </div>
          </div>

          {/* Opciones de Prorrateo */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Opciones de Prorrateo
            </h4>
            
            <div className="space-y-2">
              <label className="flex items-start gap-3 p-3 bg-white rounded-lg cursor-pointer hover:bg-blue-50 transition-colors">
                <input
                  type="radio"
                  name="estrategia"
                  checked={!mantenerDocenciaFija}
                  onChange={() => setMantenerDocenciaFija(false)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Prorrateo Proporcional (Recomendado)</p>
                  <p className="text-sm text-gray-600">
                    Ajusta todos los componentes proporcionalmente, manteniendo las proporciones relativas.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 bg-white rounded-lg cursor-pointer hover:bg-blue-50 transition-colors">
                <input
                  type="radio"
                  name="estrategia"
                  checked={mantenerDocenciaFija}
                  onChange={() => setMantenerDocenciaFija(true)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Mantener Docencia Fija</p>
                  <p className="text-sm text-gray-600">
                    Solo ajusta Investigación, Extensión y Complementarias. Docencia permanece sin cambios.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Preview de Cambios */}
          {distribucionPropuesta && (
            <div className="bg-white border-2 border-gray-200 rounded-xl p-6 mb-6">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Vista Previa de Cambios
              </h4>

              <div className="space-y-4">
                {/* Docencia */}
                <ComparacionComponente
                  nombre="Docencia"
                  color="blue"
                  horasActuales={distribucionActual.docencia}
                  horasPropuestas={distribucionPropuesta.docencia}
                  cambio={distribucionPropuesta.cambios.docencia}
                  maxHoras={horasProgramables}
                />

                {/* Investigación */}
                <ComparacionComponente
                  nombre="Investigación"
                  color="green"
                  horasActuales={distribucionActual.investigacion}
                  horasPropuestas={distribucionPropuesta.investigacion}
                  cambio={distribucionPropuesta.cambios.investigacion}
                  maxHoras={horasProgramables}
                  limite={horasProgramables * 0.50}
                />

                {/* Extensión */}
                <ComparacionComponente
                  nombre="Extensión"
                  color="teal"
                  horasActuales={distribucionActual.extension}
                  horasPropuestas={distribucionPropuesta.extension}
                  cambio={distribucionPropuesta.cambios.extension}
                  maxHoras={horasProgramables}
                  limite={horasProgramables * 0.25}
                />

                {/* Complementarias */}
                <ComparacionComponente
                  nombre="Complementarias"
                  color="orange"
                  horasActuales={distribucionActual.complementarias}
                  horasPropuestas={distribucionPropuesta.complementarias}
                  cambio={distribucionPropuesta.cambios.complementarias}
                  maxHoras={horasProgramables}
                  limite={horasProgramables * 0.25}
                />

                {/* Total */}
                <div className="pt-4 border-t-2 border-gray-300">
                  <ComparacionComponente
                    nombre="TOTAL"
                    color="gray"
                    horasActuales={distribucionActual.total}
                    horasPropuestas={distribucionPropuesta.total}
                    cambio={distribucionPropuesta.total - distribucionActual.total}
                    maxHoras={horasProgramables}
                    esTotal
                  />
                </div>
              </div>
            </div>
          )}

          {/* Información Adicional */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-700">
                <p className="font-medium mb-2">¿Cómo funciona el prorrateo?</p>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>El algoritmo ajusta las horas de cada componente proporcionalmente</li>
                  <li>Respeta los límites máximos de cada componente (Inv ≤50%, Ext ≤25%, Comp ≤25%)</li>
                  <li>Garantiza que el total sea exactamente {horasProgramables} horas</li>
                  <li>Los cambios se aplican a nivel de actividades, distribuyendo proporcionalmente</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleAplicar}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              Aplicar Prorrateo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTES
// ============================================================================

interface ComparacionComponenteProps {
  nombre: string;
  color: 'blue' | 'green' | 'teal' | 'orange' | 'gray';
  horasActuales: number;
  horasPropuestas: number;
  cambio: number;
  maxHoras: number;
  limite?: number;
  esTotal?: boolean;
}

function ComparacionComponente({
  nombre,
  color,
  horasActuales,
  horasPropuestas,
  cambio,
  maxHoras,
  limite,
  esTotal = false
}: ComparacionComponenteProps) {
  const colorClasses = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
    green: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
    teal: { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-300' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
    gray: { bg: 'bg-gray-200', text: 'text-gray-900', border: 'border-gray-400' }
  };

  const classes = colorClasses[color];
  const porcentajeActual = (horasActuales / maxHoras) * 100;
  const porcentajePropuesto = (horasPropuestas / maxHoras) * 100;

  const esCambioPositivo = cambio > 0;
  const sinCambio = cambio === 0;

  return (
    <div className={esTotal ? 'bg-gray-50 rounded-lg p-3' : ''}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className={`font-semibold ${esTotal ? 'text-lg' : ''} text-gray-900`}>{nombre}</span>
          {limite && (
            <span className="text-xs text-gray-500">
              (máx. {limite} hrs)
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm text-gray-600">Actual</div>
            <div className="font-bold text-gray-900">{horasActuales} hrs</div>
          </div>
          <ArrowRight className={`w-5 h-5 ${sinCambio ? 'text-gray-400' : esCambioPositivo ? 'text-green-600' : 'text-red-600'}`} />
          <div className="text-right">
            <div className="text-sm text-gray-600">Propuesto</div>
            <div className={`font-bold ${classes.text}`}>{horasPropuestas} hrs</div>
          </div>
          {!sinCambio && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded ${esCambioPositivo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {esCambioPositivo ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span className="text-sm font-medium">
                {esCambioPositivo ? '+' : ''}{cambio} hrs
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Barras de progreso */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gray-400 transition-all`}
              style={{ width: `${Math.min(porcentajeActual, 100)}%` }}
            />
          </div>
        </div>
        <div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full ${classes.bg} transition-all`}
              style={{ width: `${Math.min(porcentajePropuesto, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}