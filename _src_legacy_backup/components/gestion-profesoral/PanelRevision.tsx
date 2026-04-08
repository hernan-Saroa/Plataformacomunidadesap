/**
 * PANEL DE REVISIÓN Y ENVÍO - PTA ESAP
 * 
 * Último paso del wizard que muestra un resumen completo del PTA
 * antes de enviarlo a aprobación.
 * 
 * Incluye:
 * - Resumen ejecutivo con totales
 * - Gráfico circular de distribución
 * - Tabla detallada de actividades por componente
 * - Checklist de validaciones
 * - Botón de envío a aprobación
 * - Opción de descarga PDF (próximamente)
 */

import { useMemo } from 'react';
import { motion } from 'motion/react';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  BookOpen,
  FlaskConical,
  Users,
  Briefcase,
  Send,
  Download,
  Calendar,
  TrendingUp,
  Award,
  Building2,
  FileText,
  Clock
} from 'lucide-react';
import type { ActividadDocencia } from './FormularioDocencia';
import type { ActividadInvestigacion } from './FormularioInvestigacion';
import type { ActividadExtension } from './FormularioExtension';
import type { ActividadComplementaria } from './FormularioComplementarias';

// ============================================================================
// TIPOS
// ============================================================================

interface DocenteInfo {
  cedula: string;
  nombreCompleto: string;
  perfilAcademico: 'Especialización' | 'Maestría' | 'Doctorado';
  categoria: 'Auxiliar' | 'Asistente' | 'Asociado' | 'Titular';
  sedeVinculacion: string;
  tipoVinculacion: 'Carrera1' | 'Carrera2' | 'Periodo Prueba' | 'Ocasional' | 'Visitante' | 'Especial';
  tipoDedicacion: 'TC' | 'MT';
  nucleoTematico: string;
  horasProgramables: number;
}

interface Validacion {
  id: string;
  descripcion: string;
  estado: 'ok' | 'error' | 'warning';
  severidad: 'bloqueante' | 'advertencia' | 'info';
}

interface PanelRevisionProps {
  docenteInfo: DocenteInfo;
  actividadesDocencia: ActividadDocencia[];
  actividadesInvestigacion: ActividadInvestigacion[];
  actividadesExtension: ActividadExtension[];
  actividadesComplementarias: ActividadComplementaria[];
  validaciones: Validacion[];
  onEnviar: () => void;
  onVolver: () => void;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function PanelRevision({
  docenteInfo,
  actividadesDocencia,
  actividadesInvestigacion,
  actividadesExtension,
  actividadesComplementarias,
  validaciones,
  onEnviar,
  onVolver
}: PanelRevisionProps) {
  // Calcular totales
  const totales = useMemo(() => {
    const totalDocencia = actividadesDocencia.reduce((sum, act) => sum + act.horasPTA, 0);
    
    // Investigación: Solo contar las que NO tienen estímulo económico
    const totalInvestigacion = actividadesInvestigacion.reduce((sum, act) => {
      return sum + (act.recibeEstimulo ? 0 : act.horas);
    }, 0);
    
    const totalExtension = actividadesExtension.reduce((sum, act) => sum + act.horas, 0);
    const totalComplementarias = actividadesComplementarias.reduce((sum, act) => sum + act.horas, 0);
    
    const total = totalDocencia + totalInvestigacion + totalExtension + totalComplementarias;
    
    return {
      docencia: totalDocencia,
      investigacion: totalInvestigacion,
      extension: totalExtension,
      complementarias: totalComplementarias,
      total
    };
  }, [actividadesDocencia, actividadesInvestigacion, actividadesExtension, actividadesComplementarias]);

  // Calcular porcentajes
  const porcentajes = useMemo(() => {
    const { horasProgramables } = docenteInfo;
    return {
      docencia: (totales.docencia / horasProgramables) * 100,
      investigacion: (totales.investigacion / horasProgramables) * 100,
      extension: (totales.extension / horasProgramables) * 100,
      complementarias: (totales.complementarias / horasProgramables) * 100
    };
  }, [totales, docenteInfo]);

  // Verificar si hay validaciones bloqueantes
  const tieneErroresBloqueantes = validaciones.some(
    v => v.estado === 'error' && v.severidad === 'bloqueante'
  );

  const totalActividades = 
    actividadesDocencia.length +
    actividadesInvestigacion.length +
    actividadesExtension.length +
    actividadesComplementarias.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">
              Revisión Final del PTA
            </h2>
            <p className="text-blue-100">
              Revisa cuidadosamente toda la información antes de enviar a aprobación
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{totalActividades}</div>
            <div className="text-sm text-blue-100">Actividades totales</div>
          </div>
        </div>
      </div>

      {/* Información del Docente */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Award className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Información del Docente</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-600 mb-1">Nombre Completo</p>
            <p className="font-semibold text-gray-900">{docenteInfo.nombreCompleto}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Cédula</p>
            <p className="font-semibold text-gray-900">{docenteInfo.cedula}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Perfil Académico</p>
            <p className="font-semibold text-gray-900">{docenteInfo.perfilAcademico}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Categoría</p>
            <p className="font-semibold text-gray-900">{docenteInfo.categoria}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Sede Vinculación</p>
            <p className="font-semibold text-gray-900">{docenteInfo.sedeVinculacion}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Tipo Vinculación</p>
            <p className="font-semibold text-gray-900">{docenteInfo.tipoVinculacion}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Dedicación</p>
            <p className="font-semibold text-gray-900">
              {docenteInfo.tipoDedicacion === 'TC' ? 'Tiempo Completo' : 'Medio Tiempo'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Horas Programables</p>
            <p className="font-semibold text-blue-600 text-lg">{docenteInfo.horasProgramables} hrs</p>
          </div>
        </div>
      </div>

      {/* Resumen de Horas - Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Docencia */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl border-2 border-blue-200 p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">{totales.docencia}</div>
              <div className="text-xs text-gray-600">hrs</div>
            </div>
          </div>
          <h4 className="font-semibold text-gray-900 mb-1">Docencia</h4>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{porcentajes.docencia.toFixed(1)}%</span>
            <span className="text-gray-600">{actividadesDocencia.length} actividades</span>
          </div>
          <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-500"
              style={{ width: `${Math.min(porcentajes.docencia, 100)}%` }}
            />
          </div>
        </motion.div>

        {/* Investigación */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl border-2 border-green-200 p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <FlaskConical className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">{totales.investigacion}</div>
              <div className="text-xs text-gray-600">hrs</div>
            </div>
          </div>
          <h4 className="font-semibold text-gray-900 mb-1">Investigación</h4>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{porcentajes.investigacion.toFixed(1)}%</span>
            <span className="text-gray-600">{actividadesInvestigacion.length} actividades</span>
          </div>
          <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-500"
              style={{ width: `${Math.min(porcentajes.investigacion, 100)}%` }}
            />
          </div>
        </motion.div>

        {/* Extensión */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl border-2 border-teal-200 p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-teal-600" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-teal-600">{totales.extension}</div>
              <div className="text-xs text-gray-600">hrs</div>
            </div>
          </div>
          <h4 className="font-semibold text-gray-900 mb-1">Extensión</h4>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{porcentajes.extension.toFixed(1)}%</span>
            <span className="text-gray-600">{actividadesExtension.length} actividades</span>
          </div>
          <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-500 transition-all duration-500"
              style={{ width: `${Math.min(porcentajes.extension, 100)}%` }}
            />
          </div>
        </motion.div>

        {/* Complementarias */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl border-2 border-orange-200 p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-orange-600" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-orange-600">{totales.complementarias}</div>
              <div className="text-xs text-gray-600">hrs</div>
            </div>
          </div>
          <h4 className="font-semibold text-gray-900 mb-1">Complementarias</h4>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{porcentajes.complementarias.toFixed(1)}%</span>
            <span className="text-gray-600">{actividadesComplementarias.length} actividades</span>
          </div>
          <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-500 transition-all duration-500"
              style={{ width: `${Math.min(porcentajes.complementarias, 100)}%` }}
            />
          </div>
        </motion.div>
      </div>

      {/* Total de Horas */}
      <div className={`rounded-xl border-2 p-6 ${
        totales.total === docenteInfo.horasProgramables
          ? 'bg-green-50 border-green-300'
          : totales.total > docenteInfo.horasProgramables
          ? 'bg-red-50 border-red-300'
          : 'bg-yellow-50 border-yellow-300'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
              totales.total === docenteInfo.horasProgramables
                ? 'bg-green-100'
                : totales.total > docenteInfo.horasProgramables
                ? 'bg-red-100'
                : 'bg-yellow-100'
            }`}>
              <Clock className={`w-7 h-7 ${
                totales.total === docenteInfo.horasProgramables
                  ? 'text-green-600'
                  : totales.total > docenteInfo.horasProgramables
                  ? 'text-red-600'
                  : 'text-yellow-600'
              }`} />
            </div>
            <div>
              <h3 className={`text-lg font-bold ${
                totales.total === docenteInfo.horasProgramables
                  ? 'text-green-900'
                  : totales.total > docenteInfo.horasProgramables
                  ? 'text-red-900'
                  : 'text-yellow-900'
              }`}>
                Total de Horas Asignadas
              </h3>
              <p className={`text-sm ${
                totales.total === docenteInfo.horasProgramables
                  ? 'text-green-700'
                  : totales.total > docenteInfo.horasProgramables
                  ? 'text-red-700'
                  : 'text-yellow-700'
              }`}>
                {totales.total === docenteInfo.horasProgramables
                  ? '✓ Cumple exactamente con las horas programables'
                  : totales.total > docenteInfo.horasProgramables
                  ? `⚠ Excede por ${totales.total - docenteInfo.horasProgramables} horas`
                  : `⚠ Faltan ${docenteInfo.horasProgramables - totales.total} horas por asignar`
                }
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-4xl font-bold ${
              totales.total === docenteInfo.horasProgramables
                ? 'text-green-600'
                : totales.total > docenteInfo.horasProgramables
                ? 'text-red-600'
                : 'text-yellow-600'
            }`}>
              {totales.total}
            </div>
            <div className="text-sm text-gray-600">
              de {docenteInfo.horasProgramables} hrs
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de Distribución Visual */}
      <GraficoDistribucion totales={totales} horasProgramables={docenteInfo.horasProgramables} />

      {/* Validaciones */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-purple-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Estado de Validaciones</h3>
        </div>

        <div className="space-y-2">
          {validaciones.map((validacion, index) => (
            <motion.div
              key={validacion.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`flex items-start gap-3 p-3 rounded-lg ${
                validacion.estado === 'ok'
                  ? 'bg-green-50'
                  : validacion.estado === 'error'
                  ? 'bg-red-50'
                  : 'bg-yellow-50'
              }`}
            >
              {validacion.estado === 'ok' ? (
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : validacion.estado === 'error' ? (
                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={`text-sm font-medium ${
                  validacion.estado === 'ok'
                    ? 'text-green-900'
                    : validacion.estado === 'error'
                    ? 'text-red-900'
                    : 'text-yellow-900'
                }`}>
                  {validacion.descripcion}
                </p>
                {validacion.severidad === 'bloqueante' && validacion.estado === 'error' && (
                  <p className="text-xs text-red-700 mt-1">
                    Esta validación debe resolverse antes de enviar el PTA
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Detalle de Actividades por Componente */}
      <DetalleActividades
        actividadesDocencia={actividadesDocencia}
        actividadesInvestigacion={actividadesInvestigacion}
        actividadesExtension={actividadesExtension}
        actividadesComplementarias={actividadesComplementarias}
      />

      {/* Mensaje de advertencia si hay errores bloqueantes */}
      {tieneErroresBloqueantes && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-red-900 mb-2">
                No se puede enviar el PTA
              </h4>
              <p className="text-sm text-red-700">
                Existen validaciones bloqueantes que deben resolverse antes de enviar el PTA a aprobación.
                Por favor, revisa las validaciones marcadas en rojo y corrige los errores.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Botones de Acción */}
      <div className="flex items-center justify-between gap-4 pt-4 border-t border-gray-200">
        <button
          onClick={onVolver}
          className="px-6 py-3 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors font-medium"
        >
          ← Volver a Editar
        </button>

        <div className="flex items-center gap-3">
          <button
            className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl transition-colors font-medium"
            title="Próximamente"
          >
            <Download className="w-4 h-4" />
            Descargar PDF
          </button>

          <button
            onClick={onEnviar}
            disabled={tieneErroresBloqueantes}
            className={`flex items-center gap-2 px-8 py-3 rounded-xl transition-all font-bold shadow-lg ${
              tieneErroresBloqueantes
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white transform hover:scale-105'
            }`}
          >
            <Send className="w-5 h-5" />
            Enviar a Aprobación
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTE: GRÁFICO DE DISTRIBUCIÓN
// ============================================================================

interface GraficoDistribucionProps {
  totales: {
    docencia: number;
    investigacion: number;
    extension: number;
    complementarias: number;
    total: number;
  };
  horasProgramables: number;
}

function GraficoDistribucion({ totales, horasProgramables }: GraficoDistribucionProps) {
  const porcentajes = {
    docencia: (totales.docencia / horasProgramables) * 100,
    investigacion: (totales.investigacion / horasProgramables) * 100,
    extension: (totales.extension / horasProgramables) * 100,
    complementarias: (totales.complementarias / horasProgramables) * 100
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-indigo-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">Distribución de Horas</h3>
      </div>

      <div className="space-y-4">
        {/* Docencia */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Docencia</span>
            </div>
            <div className="text-sm">
              <span className="font-bold text-blue-600">{totales.docencia} hrs</span>
              <span className="text-gray-600 ml-2">({porcentajes.docencia.toFixed(1)}%)</span>
            </div>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-500"
              style={{ width: `${Math.min(porcentajes.docencia, 100)}%` }}
            />
          </div>
        </div>

        {/* Investigación */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-gray-700">Investigación</span>
            </div>
            <div className="text-sm">
              <span className="font-bold text-green-600">{totales.investigacion} hrs</span>
              <span className="text-gray-600 ml-2">({porcentajes.investigacion.toFixed(1)}%)</span>
            </div>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-500"
              style={{ width: `${Math.min(porcentajes.investigacion, 100)}%` }}
            />
          </div>
        </div>

        {/* Extensión */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-600" />
              <span className="text-sm font-medium text-gray-700">Extensión</span>
            </div>
            <div className="text-sm">
              <span className="font-bold text-teal-600">{totales.extension} hrs</span>
              <span className="text-gray-600 ml-2">({porcentajes.extension.toFixed(1)}%)</span>
            </div>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-500 transition-all duration-500"
              style={{ width: `${Math.min(porcentajes.extension, 100)}%` }}
            />
          </div>
        </div>

        {/* Complementarias */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium text-gray-700">Complementarias</span>
            </div>
            <div className="text-sm">
              <span className="font-bold text-orange-600">{totales.complementarias} hrs</span>
              <span className="text-gray-600 ml-2">({porcentajes.complementarias.toFixed(1)}%)</span>
            </div>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-500 transition-all duration-500"
              style={{ width: `${Math.min(porcentajes.complementarias, 100)}%` }}
            />
          </div>
        </div>

        {/* Total */}
        <div className="pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="font-bold text-gray-900">TOTAL</span>
            <span className="text-lg font-bold text-blue-600">{totales.total} hrs</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTE: DETALLE DE ACTIVIDADES
// ============================================================================

interface DetalleActividadesProps {
  actividadesDocencia: ActividadDocencia[];
  actividadesInvestigacion: ActividadInvestigacion[];
  actividadesExtension: ActividadExtension[];
  actividadesComplementarias: ActividadComplementaria[];
}

function DetalleActividades({
  actividadesDocencia,
  actividadesInvestigacion,
  actividadesExtension,
  actividadesComplementarias
}: DetalleActividadesProps) {
  return (
    <div className="space-y-4">
      {/* Docencia */}
      {actividadesDocencia.length > 0 && (
        <div className="bg-white rounded-xl border border-blue-200 overflow-hidden">
          <div className="bg-blue-50 border-b border-blue-200 px-6 py-4">
            <div className="flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-blue-600" />
              <h4 className="font-bold text-blue-900">Actividades de Docencia ({actividadesDocencia.length})</h4>
            </div>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-gray-600 font-semibold">Programa</th>
                    <th className="text-left py-2 px-3 text-gray-600 font-semibold">Asignatura</th>
                    <th className="text-center py-2 px-3 text-gray-600 font-semibold">Créditos</th>
                    <th className="text-center py-2 px-3 text-gray-600 font-semibold">Horas Base</th>
                    <th className="text-center py-2 px-3 text-gray-600 font-semibold">Horas PTA</th>
                    <th className="text-left py-2 px-3 text-gray-600 font-semibold">Sede</th>
                  </tr>
                </thead>
                <tbody>
                  {actividadesDocencia.map((act, idx) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-3">{act.programa}</td>
                      <td className="py-3 px-3 font-medium">{act.nombreAsignatura}</td>
                      <td className="py-3 px-3 text-center">{act.creditos}</td>
                      <td className="py-3 px-3 text-center">{act.horasBase}</td>
                      <td className="py-3 px-3 text-center font-bold text-blue-600">{act.horasPTA}</td>
                      <td className="py-3 px-3 text-xs text-gray-600">{act.sedeAsignatura}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Investigación */}
      {actividadesInvestigacion.length > 0 && (
        <div className="bg-white rounded-xl border border-green-200 overflow-hidden">
          <div className="bg-green-50 border-b border-green-200 px-6 py-4">
            <div className="flex items-center gap-3">
              <FlaskConical className="w-5 h-5 text-green-600" />
              <h4 className="font-bold text-green-900">Actividades de Investigación ({actividadesInvestigacion.length})</h4>
            </div>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-gray-600 font-semibold">Tipo</th>
                    <th className="text-left py-2 px-3 text-gray-600 font-semibold">Actividad</th>
                    <th className="text-center py-2 px-3 text-gray-600 font-semibold">Horas</th>
                    <th className="text-center py-2 px-3 text-gray-600 font-semibold">Estímulo</th>
                    <th className="text-center py-2 px-3 text-gray-600 font-semibold">Cuenta PTA</th>
                  </tr>
                </thead>
                <tbody>
                  {actividadesInvestigacion.map((act, idx) => (
                    <tr key={idx} className={`border-b border-gray-100 hover:bg-gray-50 ${
                      act.recibeEstimulo ? 'opacity-60' : ''
                    }`}>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          act.tipo === 'proyecto' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {act.tipo === 'proyecto' ? 'Proyecto' : 'Apoyo'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-medium">
                        {act.tipo === 'proyecto' ? act.nombreProyecto : act.tipoActividad}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-green-600">{act.horas}</td>
                      <td className="py-3 px-3 text-center">
                        {act.recibeEstimulo ? (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">SÍ</span>
                        ) : (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">NO</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {act.recibeEstimulo ? (
                          <span className="text-red-600 font-bold line-through">0 hrs</span>
                        ) : (
                          <span className="text-green-600 font-bold">{act.horas} hrs</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Extensión */}
      {actividadesExtension.length > 0 && (
        <div className="bg-white rounded-xl border border-teal-200 overflow-hidden">
          <div className="bg-teal-50 border-b border-teal-200 px-6 py-4">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-teal-600" />
              <h4 className="font-bold text-teal-900">Actividades de Extensión ({actividadesExtension.length})</h4>
            </div>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-gray-600 font-semibold">Categoría</th>
                    <th className="text-left py-2 px-3 text-gray-600 font-semibold">Actividad</th>
                    <th className="text-center py-2 px-3 text-gray-600 font-semibold">Horas</th>
                    <th className="text-left py-2 px-3 text-gray-600 font-semibold">Entidad</th>
                  </tr>
                </thead>
                <tbody>
                  {actividadesExtension.map((act, idx) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-3">
                        <span className="px-2 py-1 rounded text-xs font-medium bg-teal-100 text-teal-700">
                          {act.tipo}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-medium">{act.nombreActividad || act.actividad}</td>
                      <td className="py-3 px-3 text-center font-bold text-teal-600">{act.horas}</td>
                      <td className="py-3 px-3 text-xs text-gray-600">{act.entidadTerritorial || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Complementarias */}
      {actividadesComplementarias.length > 0 && (
        <div className="bg-white rounded-xl border border-orange-200 overflow-hidden">
          <div className="bg-orange-50 border-b border-orange-200 px-6 py-4">
            <div className="flex items-center gap-3">
              <Briefcase className="w-5 h-5 text-orange-600" />
              <h4 className="font-bold text-orange-900">Actividades Complementarias ({actividadesComplementarias.length})</h4>
            </div>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-gray-600 font-semibold">Categoría</th>
                    <th className="text-left py-2 px-3 text-gray-600 font-semibold">Actividad</th>
                    <th className="text-center py-2 px-3 text-gray-600 font-semibold">Horas</th>
                  </tr>
                </thead>
                <tbody>
                  {actividadesComplementarias.map((act, idx) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-3">
                        <span className="px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-700">
                          {act.categoria}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-medium">
                        {act.nombrePersonalizado || act.actividad}
                        {act.esJuntaSindicato && (
                          <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">
                            {act.tipoMiembroSindicato === 'titular' ? 'Titular' : 'Suplente'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-orange-600">{act.horas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
