/**
 * ModalDetalleRiesgo - Vista completa de detalle del riesgo
 * ✅ DISEÑO LIMPIO ESAP 2025 - ESTÁNDAR
 * ✅ TIMELINE CONECTADO A BACKEND
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../ui/tabs';
import {
  AlertTriangle, Shield, FileText, X, Edit, Target,
  TrendingUp, Activity, CheckCircle, Clock, User, Calendar,
  Zap, AlertCircle, Download, Trash2, ChevronRight, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { ModalHeaderClean } from './ModalHeaderClean';
import type { Riesgo } from '../core/types';
import { riesgosService, RiesgoHistorialAPI } from '../../../../services/api/legal.service';

interface ModalDetalleRiesgoProps {
  open: boolean;
  onClose: () => void;
  riesgo: Riesgo | null;
  onEdit?: (riesgo: Riesgo) => void;
  onDelete?: (riesgo: Riesgo) => void;
}

const ZONA_RIESGO_CONFIG = {
  EXTREMO: { color: '#DC2626', label: '🔴 Extremo', bg: '#FEE2E2' },
  ALTO: { color: '#EA580C', label: '🟠 Alto', bg: '#FFEDD5' },
  MODERADO: { color: '#F59E0B', label: '🟡 Moderado', bg: '#FEF3C7' },
  BAJO: { color: '#10B981', label: '🟢 Bajo', bg: '#D1FAE5' }
};

const TIPO_RIESGO_MAP = {
  GESTION: '📊 Gestión',
  CORRUPCION: '⚠️ Corrupción',
  SEGURIDAD_DIGITAL: '🔒 Seguridad Digital',
  FISCAL: '💰 Fiscal'
};

const ETAPA_CONFIG = {
  IDENTIFICADO: { label: 'Identificado', color: 'bg-gray-100 text-gray-700', icon: '📝' },
  ANALIZADO: { label: 'Analizado', color: 'bg-indigo-100 text-indigo-700', icon: '🔍' },
  VALORADO: { label: 'Valorado', color: 'bg-blue-100 text-blue-700', icon: '📊' },
  EVALUADO: { label: 'Evaluado', color: 'bg-blue-100 text-blue-700', icon: '📊' }, // Deprecated fallback
  TRATAMIENTO: { label: 'En Tratamiento', color: 'bg-yellow-100 text-yellow-700', icon: '⚙️' },
  EN_TRATAMIENTO: { label: 'En Tratamiento', color: 'bg-yellow-100 text-yellow-700', icon: '⚙️' }, // Deprecated fallback
  MONITOREO: { label: 'Monitoreado', color: 'bg-purple-100 text-purple-700', icon: '👁️' },
  MONITOREADO: { label: 'Monitoreado', color: 'bg-purple-100 text-purple-700', icon: '👁️' }, // Deprecated fallback
  CERRADO: { label: 'Cerrado', color: 'bg-green-100 text-green-700', icon: '✅' },
  MATERIALIZADO: { label: 'Materializado', color: 'bg-red-100 text-red-700', icon: '🔥' }
};

export function ModalDetalleRiesgo({ open, onClose, riesgo, onEdit, onDelete }: ModalDetalleRiesgoProps) {
  const [tabActiva, setTabActiva] = useState('general');
  const [historial, setHistorial] = useState<RiesgoHistorialAPI[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  // Cargar historial cuando se abre el modal o cambia el riesgo
  useEffect(() => {
    if (open && riesgo?.id) {
      const cargarHistorial = async () => {
        setLoadingHistorial(true);
        try {
          const data = await riesgosService.getHistorial(riesgo.id);
          setHistorial(data);
        } catch (error) {
          console.log('Historial no disponible');
          setHistorial([]);
        } finally {
          setLoadingHistorial(false);
        }
      };
      cargarHistorial();
    }
  }, [open, riesgo?.id]);

  if (!riesgo) return null;

  const zonaConfig = ZONA_RIESGO_CONFIG[riesgo.zonaResidual];
  const etapaConfig = ETAPA_CONFIG[riesgo.etapa] || { label: riesgo.etapa, color: 'bg-gray-100 text-gray-700', icon: '📋' };

  const calcularValorRiesgo = (prob: number, imp: number) => prob * imp;
  const valorInherente = calcularValorRiesgo(riesgo.probabilidadInherente || 0, riesgo.impactoInherente || 0);
  const valorResidual = calcularValorRiesgo(riesgo.probabilidadResidual || 0, riesgo.impactoResidual || 0);
  // Si el residual es mayor que inherente, mostrar 0% (no hay reducción)
  const reduccionRiesgo = valorInherente > 0 && valorResidual <= valorInherente
    ? Math.max(0, ((valorInherente - valorResidual) / valorInherente * 100)).toFixed(0)
    : '0';

  // Formatear fecha para mostrar
  const formatearFecha = (fechaStr: string) => {
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const handleEditar = () => {
    if (onEdit && riesgo) {
      onEdit(riesgo);
      onClose();
    } else {
      toast.info('Modo edición no disponible');
    }
  };

  const handleEliminar = async () => {
    if (confirm('¿Estás seguro de que quieres eliminar este riesgo permanentemente?')) {
      if (onDelete && riesgo) {
        onDelete(riesgo);
      } else {
        // Fallback just in case
        toast.error('Función de eliminar no conectada');
      }
    }
  };

  const handleExportar = () => {
    const contenidoPDF = `
═══════════════════════════════════════════════════════════════
    ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA - ESAP
            FICHA TÉCNICA DE RIESGO INSTITUCIONAL
═══════════════════════════════════════════════════════════════

IDENTIFICACIÓN DEL RIESGO
═══════════════════════════════════════════════════════════════
ID del Riesgo:        ${riesgo.codigo || riesgo.id}
Descripción:          ${riesgo.descripcion}
Proceso:              ${riesgo.proceso}
Tipo de Riesgo:       ${TIPO_RIESGO_MAP[riesgo.tipo]}
Etapa:                ${etapaConfig.label}
Estado:               ${riesgo.estado}

EVALUACIÓN DE RIESGO INHERENTE (Sin Controles)
═══════════════════════════════════════════════════════════════
Probabilidad:         ${riesgo.probabilidadInherente} (${['', 'Raro', 'Improbable', 'Posible', 'Probable', 'Casi Seguro'][riesgo.probabilidadInherente || 0]})
Impacto:              ${riesgo.impactoInherente} (${['', 'Insignificante', 'Menor', 'Moderado', 'Mayor', 'Catastrófico'][riesgo.impactoInherente || 0]})
Valor Riesgo:         ${valorInherente}
Zona:                 ${ZONA_RIESGO_CONFIG[riesgo.zonaInherente || 'BAJO'].label}

EVALUACIÓN DE RIESGO RESIDUAL (Con Controles)
═══════════════════════════════════════════════════════════════
Probabilidad:         ${riesgo.probabilidadResidual} (${['', 'Raro', 'Improbable', 'Posible', 'Probable', 'Casi Seguro'][riesgo.probabilidadResidual || 0]})
Impacto:              ${riesgo.impactoResidual} (${['', 'Insignificante', 'Menor', 'Moderado', 'Mayor', 'Catastrófico'][riesgo.impactoResidual || 0]})
Valor Riesgo:         ${valorResidual}
Zona:                 ${zonaConfig.label}

EFECTIVIDAD DE CONTROLES
═══════════════════════════════════════════════════════════════
Reducción del Riesgo: ${reduccionRiesgo}%

ESTIMACIÓN CONTABLE
═══════════════════════════════════════════════════════════════
Cuantía Estimada:     $${Number(riesgo.cuantiaEstimada || 0).toLocaleString('es-CO')}
Porcentaje Provisión: ${riesgo.porcentajeProvision || 0}% (${riesgo.zonaResidual})
Provisión Contable:   $${Number(riesgo.provisionContable || 0).toLocaleString('es-CO')}
Fecha Cálculo:        ${riesgo.fechaCalculoProvision ? new Date(riesgo.fechaCalculoProvision).toLocaleString('es-CO') : '-'}

CAUSAS IDENTIFICADAS
═══════════════════════════════════════════════════════════════
${riesgo.causas?.map((c, i) => `${i + 1}. ${c}`).join('\n') || 'No especificadas'}

CONSECUENCIAS POTENCIALES
═══════════════════════════════════════════════════════════════
${riesgo.consecuencias?.map((c, i) => `${i + 1}. ${c}`).join('\n') || 'No especificadas'}

CONTROLES EXISTENTES
═══════════════════════════════════════════════════════════════
${riesgo.controlesExistentes?.map((c, i) => `${i + 1}. ${c.descripcion} (${c.efectividad}%)`).join('\n') || 'No especificados'}

PLAN DE TRATAMIENTO
═══════════════════════════════════════════════════════════════
${riesgo.planTratamiento || 'Sin plan de tratamiento definido'}

RESPONSABLE
═══════════════════════════════════════════════════════════════
${riesgo.responsable || 'Sin asignar'}

═══════════════════════════════════════════════════════════════
Documento generado el: ${new Date().toLocaleDateString('es-CO')} a las ${new Date().toLocaleTimeString('es-CO')}
Sistema SIGL - Gestión de Riesgos ESAP
Metodología DAFP - MECI
═══════════════════════════════════════════════════════════════
    `;

    const blob = new Blob([contenidoPDF], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Riesgo_${riesgo.codigo || riesgo.id}_${new Date().getTime()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast.success('✅ Ficha de riesgo exportada', {
      description: `Riesgo_${riesgo.codigo || riesgo.id}.txt`,
      duration: 4000
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent hideCloseButton className="max-w-3xl h-auto max-h-[80vh] flex flex-col p-0 overflow-hidden !top-[10vh] !translate-y-0">
        <DialogTitle className="sr-only">
          Detalle del Riesgo {riesgo.codigo || riesgo.id}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Vista completa del riesgo {riesgo.codigo || riesgo.id} con evaluación, controles, tratamiento y seguimiento
        </DialogDescription>

        {/* Header ESAP 2025 - FIJO */}
        <ModalHeaderClean
          titulo={riesgo.codigo || riesgo.id || 'Detalle del Riesgo'}
          subtitulo={riesgo.descripcion}
          icono={AlertTriangle}
          colorIcono="orange"
          badgePrincipal={etapaConfig.label}
          badges={
            <>
              <Badge
                className="font-bold text-xs border-2"
                style={{ borderColor: zonaConfig.color, color: zonaConfig.color, backgroundColor: zonaConfig.bg }}
              >
                {zonaConfig.label}
              </Badge>
              <Badge className="text-xs font-bold bg-purple-100 text-purple-700 border border-purple-300">
                {TIPO_RIESGO_MAP[riesgo.tipo]}
              </Badge>
            </>
          }
          onClose={onClose}
        />

        {/* Contenido - CON SCROLL */}
        <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50">
          <div className="space-y-6">

            {/* ALERTA DE ZONA DE RIESGO */}
            <div
              className="p-4 rounded-lg border-2 flex items-center gap-3"
              style={{ backgroundColor: zonaConfig.bg, borderColor: zonaConfig.color }}
            >
              <AlertTriangle className="w-6 h-6 flex-shrink-0" style={{ color: zonaConfig.color }} />
              <div className="flex-1">
                <p className="font-bold text-sm" style={{ color: zonaConfig.color }}>
                  Zona de Riesgo: {zonaConfig.label}
                </p>
                <p className="text-xs text-gray-700 mt-1">
                  {riesgo.zonaResidual === 'EXTREMO' && '⚠️ Requiere acción inmediata y escalamiento a Alta Dirección'}
                  {riesgo.zonaResidual === 'ALTO' && '⚡ Plan de tratamiento prioritario requerido'}
                  {riesgo.zonaResidual === 'MODERADO' && '👁️ Monitoreo mensual y controles preventivos'}
                  {riesgo.zonaResidual === 'BAJO' && '✅ Seguimiento trimestral suficiente'}
                </p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: zonaConfig.color }}>
                  {valorResidual}
                </div>
                <div className="text-xs text-gray-600">Valor</div>
              </div>
            </div>

            {/* INFORMACIÓN GENERAL */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-lg border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Proceso Afectado</p>
                <p className="text-sm font-bold text-gray-900">{riesgo.proceso}</p>
              </div>

              <div className="p-4 bg-white rounded-lg border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Responsable del Riesgo</p>
                <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  {riesgo.responsable || 'Sin asignar'}
                </p>
              </div>
            </div>

            {/* PROVISIÓN CONTABLE */}
            <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
              <h4 className="font-bold text-green-900 mb-3 flex items-center gap-2">
                💰 Provisión Contable
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-xs text-green-700 mb-1">Cuantía Estimada</p>
                  <p className="text-lg font-bold text-gray-900">
                    ${Number(riesgo.cuantiaEstimada || 0).toLocaleString()}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-green-700 mb-1">Porcentaje ({riesgo.zonaResidual})</p>
                  <p className="text-lg font-bold text-gray-900">
                    {riesgo.porcentajeProvision || (
                      riesgo.zonaResidual === 'EXTREMO' ? 100 :
                        riesgo.zonaResidual === 'ALTO' ? 75 :
                          riesgo.zonaResidual === 'MODERADO' ? 50 : 25
                    )}%
                  </p>
                </div>
                <div className="text-center bg-green-100 rounded-lg p-2">
                  <p className="text-xs text-green-700 mb-1">Provisión Calculada</p>
                  <p className="text-xl font-bold text-green-600">
                    ${Number(riesgo.provisionContable || (
                      (Number(riesgo.cuantiaEstimada || 0) * (
                        riesgo.zonaResidual === 'EXTREMO' ? 1 :
                          riesgo.zonaResidual === 'ALTO' ? 0.75 :
                            riesgo.zonaResidual === 'MODERADO' ? 0.5 : 0.25
                      ))
                    )).toLocaleString()}
                  </p>
                </div>
              </div>
              {riesgo.fechaCalculoProvision && (
                <p className="text-xs text-green-600 mt-2 text-right">
                  📅 Calculada: {new Date(riesgo.fechaCalculoProvision).toLocaleDateString('es-CO')}
                </p>
              )}
            </div>

            {/* TABS CON INFORMACIÓN DETALLADA */}
            <Tabs value={tabActiva} onValueChange={setTabActiva}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="general">
                  <FileText className="w-4 h-4 mr-2" />
                  General
                </TabsTrigger>
                <TabsTrigger value="evaluacion">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Evaluación
                </TabsTrigger>
                <TabsTrigger value="controles">
                  <Shield className="w-4 h-4 mr-2" />
                  Controles
                </TabsTrigger>
                <TabsTrigger value="timeline">
                  <Activity className="w-4 h-4 mr-2" />
                  Timeline
                </TabsTrigger>
              </TabsList>

              {/* TAB: GENERAL */}
              <TabsContent value="general" className="space-y-4 mt-4">
                <div>
                  <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-orange-600" />
                    Causas del Riesgo
                  </h3>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    {riesgo.causas && riesgo.causas.length > 0 ? (
                      <ul className="space-y-2">
                        {riesgo.causas.map((causa, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                            <ChevronRight className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                            <span>{causa}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No se han especificado causas</p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    Consecuencias Potenciales
                  </h3>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    {riesgo.consecuencias && riesgo.consecuencias.length > 0 ? (
                      <ul className="space-y-2">
                        {riesgo.consecuencias.map((consecuencia, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                            <ChevronRight className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                            <span>{consecuencia}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No se han especificado consecuencias</p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <Target className="w-4 h-4 text-blue-600" />
                    Plan de Tratamiento
                  </h3>
                  <div className="space-y-3">
                    {riesgo.planTratamiento && riesgo.planTratamiento.length > 0 ? (
                      riesgo.planTratamiento.map((plan, idx) => (
                        <div key={idx} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <p className="text-sm font-bold text-gray-900">{plan.accion}</p>
                            <Badge className={`text-xs font-bold flex-shrink-0 ${plan.estado === 'COMPLETADA' ? 'bg-green-100 text-green-700' :
                              plan.estado === 'EN_CURSO' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                              {plan.estado === 'COMPLETADA' ? '✅ Completada' :
                                plan.estado === 'EN_CURSO' ? '⚙️ En Curso' :
                                  '⏳ Pendiente'}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-xs text-gray-700 mb-2">
                            <div>
                              <span className="font-semibold">Responsable:</span> {plan.responsable}
                            </div>
                            <div>
                              <span className="font-semibold">Fecha límite:</span> {plan.fechaLimite.toLocaleDateString('es-CO')}
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-gray-200 rounded-full">
                                <div
                                  className="h-2 bg-blue-600 rounded-full transition-all"
                                  style={{ width: `${plan.avance}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold text-gray-700">{plan.avance}%</span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-gray-700">Sin plan de tratamiento definido aún</p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* TAB: EVALUACIÓN */}
              <TabsContent value="evaluacion" className="space-y-4 mt-4">
                {/* Comparativa Inherente vs Residual */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Riesgo Inherente */}
                  <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                    <h4 className="font-bold text-red-900 mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Riesgo Inherente (Sin Controles)
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-red-700">Probabilidad</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-2 bg-red-200 rounded-full">
                            <div
                              className="h-2 bg-red-600 rounded-full"
                              style={{ width: `${(riesgo.probabilidadInherente || 0) * 20}%` }}
                            />
                          </div>
                          <span className="text-sm font-bold text-red-900">{riesgo.probabilidadInherente}/5</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-red-700">Impacto</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-2 bg-red-200 rounded-full">
                            <div
                              className="h-2 bg-red-600 rounded-full"
                              style={{ width: `${(riesgo.impactoInherente || 0) * 20}%` }}
                            />
                          </div>
                          <span className="text-sm font-bold text-red-900">{riesgo.impactoInherente}/5</span>
                        </div>
                      </div>
                      <div className="pt-3 border-t border-red-300">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-red-700">Valor de Riesgo</span>
                          <span className="text-2xl font-bold text-red-900">{valorInherente}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Riesgo Residual */}
                  <div className="border-2 rounded-lg p-4" style={{ backgroundColor: zonaConfig.bg, borderColor: zonaConfig.color }}>
                    <h4 className="font-bold mb-3 flex items-center gap-2" style={{ color: zonaConfig.color }}>
                      <Shield className="w-4 h-4" />
                      Riesgo Residual (Con Controles)
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs" style={{ color: zonaConfig.color }}>Probabilidad</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-2 bg-white rounded-full">
                            <div
                              className="h-2 rounded-full"
                              style={{ width: `${(riesgo.probabilidadResidual || 0) * 20}%`, backgroundColor: zonaConfig.color }}
                            />
                          </div>
                          <span className="text-sm font-bold" style={{ color: zonaConfig.color }}>{riesgo.probabilidadResidual}/5</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs" style={{ color: zonaConfig.color }}>Impacto</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-2 bg-white rounded-full">
                            <div
                              className="h-2 rounded-full"
                              style={{ width: `${(riesgo.impactoResidual || 0) * 20}%`, backgroundColor: zonaConfig.color }}
                            />
                          </div>
                          <span className="text-sm font-bold" style={{ color: zonaConfig.color }}>{riesgo.impactoResidual}/5</span>
                        </div>
                      </div>
                      <div className="pt-3 border-t" style={{ borderColor: zonaConfig.color }}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs" style={{ color: zonaConfig.color }}>Valor de Riesgo</span>
                          <span className="text-2xl font-bold" style={{ color: zonaConfig.color }}>{valorResidual}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Efectividad de Controles */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-bold text-green-900 mb-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Efectividad de Controles
                  </h4>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="h-3 bg-green-200 rounded-full">
                        <div
                          className="h-3 bg-green-600 rounded-full transition-all"
                          style={{ width: `${reduccionRiesgo}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xl font-bold text-green-900">{reduccionRiesgo}%</span>
                  </div>
                  <p className="text-xs text-green-700 mt-2">
                    Los controles han reducido el riesgo de {valorInherente} a {valorResidual} puntos
                  </p>
                </div>
              </TabsContent>

              {/* TAB: CONTROLES */}
              <TabsContent value="controles" className="space-y-4 mt-4">
                <div>
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-600" />
                    Controles Existentes
                  </h3>
                  {riesgo.controlesExistentes && riesgo.controlesExistentes.length > 0 ? (
                    <div className="space-y-2">
                      {riesgo.controlesExistentes.map((control, idx) => (
                        <div key={control.id} className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900">{control.descripcion}</p>
                            <div className="mt-2">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-gray-200 rounded-full">
                                  <div
                                    className="h-2 bg-green-600 rounded-full transition-all"
                                    style={{ width: `${control.efectividad}%` }}
                                  />
                                </div>
                                <span className="text-xs font-bold text-gray-700">{control.efectividad}% efectivo</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-50 border border-dashed border-gray-300 rounded-lg text-center">
                      <Shield className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No se han definido controles aún</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* TAB: TIMELINE */}
              <TabsContent value="timeline" className="space-y-3 mt-4">
                {loadingHistorial ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
                    <span className="text-sm text-gray-600">Cargando historial...</span>
                  </div>
                ) : historial.length > 0 ? (
                  historial.map((evento, idx) => (
                    <div key={evento.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center"
                          style={{ backgroundColor: '#003DA5' }}
                        >
                          <Activity className="w-4 h-4 text-white" />
                        </div>
                        {idx < historial.length - 1 && (
                          <div className="w-0.5 h-full min-h-[40px] bg-gray-300 mt-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="text-sm font-bold text-gray-900">{evento.descripcion}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          👤 {evento.usuario} • 📅 {formatearFecha(evento.createdAt)}
                        </p>
                        {evento.campoModificado && evento.valorAnterior && evento.valorNuevo && (
                          <p className="text-xs text-gray-400 mt-1">
                            {evento.campoModificado}: {evento.valorAnterior} → {evento.valorNuevo}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 bg-gray-50 border border-dashed border-gray-300 rounded-lg text-center">
                    <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No hay historial de eventos registrado</p>
                    <p className="text-xs text-gray-400 mt-1">Los cambios futuros se registrarán aquí automáticamente</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* INFO METODOLOGÍA */}
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Target className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-purple-900">
                  <p className="font-bold mb-1">💡 Metodología DAFP - MECI</p>
                  <p className="text-purple-700">
                    Este riesgo se gestiona bajo la metodología de Administración del Riesgo del
                    Departamento Administrativo de la Función Pública, cumpliendo con el MECI
                    (Modelo Estándar de Control Interno).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer con acciones */}
        <div className="flex-shrink-0 border-t bg-gray-50 px-6 py-4 flex items-center justify-between gap-3 flex-wrap">
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Cerrar
          </Button>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={handleExportar}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button variant="outline" onClick={handleEditar}>
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Button>
            <Button variant="outline" onClick={handleEliminar} className="text-red-600 border-red-300 hover:bg-red-50">
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

