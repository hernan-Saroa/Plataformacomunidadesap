/**
 * ============================================
 * ACTIVIDADES DE AUDITORÍA - INTEGRADAS
 * ============================================
 * 
 * Componente reutilizable para gestionar actividades del proceso de auditoría
 * con checklists, evidencias y validación de completitud.
 * 
 * ÚLTIMA ACTUALIZACIÓN: 24 Diciembre 2025
 * Integración completa Proceso de Auditoría → Expediente Kanban
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronDown, ChevronRight, CheckCircle2, AlertCircle, CheckCircle,
  FileSearch, Send, Users, Target, ClipboardList, FileText, MessageSquare,
  Upload, Eye, Download, Trash2, File
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

import { CardSIGL } from '../gestion-legal/design-system/CardSIGL';
import { BadgeSIGL } from '../gestion-legal/design-system/BadgeSIGL';
import { ButtonSIGL } from '../gestion-legal/design-system/ButtonSIGL';
import { auditoriasApi } from './services/api';

// ============ TIPOS ============

export interface ItemChecklist {
  id: string;
  texto: string;
}

export interface ActividadAuditoria {
  id: string;
  titulo: string;
  descripcion: string;
  icono: React.ReactNode;
  color: string;
  checklist: ItemChecklist[];
}

// ============ DATOS DE ACTIVIDADES ============

export const ACTIVIDADES_PLANEACION: ActividadAuditoria[] = [
  {
    id: 'estudios-preliminares',
    titulo: 'Estudios Preliminares',
    descripcion: 'Análisis previo del área auditada, revisión de informes anteriores, normativa y riesgos',
    icono: <FileSearch className="w-5 h-5" />,
    color: 'purple',
    checklist: [
      { id: 'ep1', texto: 'Revisar informes de auditorías previas del área' },
      { id: 'ep2', texto: 'Analizar normativa aplicable al proceso auditado' },
      { id: 'ep3', texto: 'Identificar riesgos potenciales del área' },
      { id: 'ep4', texto: 'Revisar matriz de riesgos institucional' },
      { id: 'ep5', texto: 'Consultar planes de mejoramiento vigentes del área' },
      { id: 'ep6', texto: 'Elaborar documento de estudios preliminares' },
    ],
  },
  {
    id: 'solicitud-informacion',
    titulo: 'Solicitud de Información',
    descripcion: 'Elaborar y enviar oficio solicitando documentación al área auditada',
    icono: <Send className="w-5 h-5" />,
    color: 'blue',
    checklist: [
      { id: 'si1', texto: 'Elaborar oficio de solicitud de información' },
      { id: 'si2', texto: 'Definir lista de documentos requeridos' },
      { id: 'si3', texto: 'Establecer plazo de entrega (mínimo 5 días hábiles)' },
      { id: 'si4', texto: 'Enviar oficio al responsable del área auditada' },
      { id: 'si5', texto: 'Registrar solicitud en expediente digital' },
      { id: 'si6', texto: 'Hacer seguimiento a entrega de información' },
    ],
  },
  {
    id: 'reunion-apertura',
    titulo: 'Reunión de Apertura',
    descripcion: 'Kick-off oficial con el área auditada para presentar alcance y cronograma',
    icono: <Users className="w-5 h-5" />,
    color: 'green',
    checklist: [
      { id: 'ra1', texto: 'Programar fecha y hora con el área auditada' },
      { id: 'ra2', texto: 'Preparar presentación de la auditoría' },
      { id: 'ra3', texto: 'Enviar convocatoria a participantes' },
      { id: 'ra4', texto: 'Realizar reunión de apertura' },
      { id: 'ra5', texto: 'Elaborar acta de reunión de apertura' },
      { id: 'ra6', texto: 'Obtener firma del acta por responsable del área' },
    ],
  },
];

export const ACTIVIDADES_EJECUCION: ActividadAuditoria[] = [
  {
    id: 'recoleccion-evidencias',
    titulo: 'Recolección de Evidencias',
    descripcion: 'Obtener y documentar evidencias mediante entrevistas, revisión documental y observación',
    icono: <Target className="w-5 h-5" />,
    color: 'amber',
    checklist: [
      { id: 're1', texto: 'Realizar entrevistas con personal del área' },
      { id: 're2', texto: 'Revisar documentación soporte del proceso' },
      { id: 're3', texto: 'Realizar observación directa de actividades' },
      { id: 're4', texto: 'Tomar muestras representativas para análisis' },
      { id: 're5', texto: 'Documentar evidencias en papeles de trabajo' },
      { id: 're6', texto: 'Digitalizar y organizar evidencias recolectadas' },
    ],
  },
  {
    id: 'identificacion-hallazgos',
    titulo: 'Identificación de Hallazgos',
    descripcion: 'Analizar evidencias e identificar hallazgos (conformidades y no conformidades)',
    icono: <ClipboardList className="w-5 h-5" />,
    color: 'red',
    checklist: [
      { id: 'ih1', texto: 'Analizar evidencias vs criterios de auditoría' },
      { id: 'ih2', texto: 'Identificar desviaciones y no conformidades' },
      { id: 'ih3', texto: 'Clasificar hallazgos por nivel de criticidad' },
      { id: 'ih4', texto: 'Validar hallazgos con evidencia documental' },
      { id: 'ih5', texto: 'Documentar hallazgos en formato estándar' },
      { id: 'ih6', texto: 'Revisar hallazgos con auditor líder' },
    ],
  },
  {
    id: 'papeles-trabajo',
    titulo: 'Papeles de Trabajo',
    descripcion: 'Elaborar y consolidar los papeles de trabajo que sustentan los hallazgos',
    icono: <FileText className="w-5 h-5" />,
    color: 'indigo',
    checklist: [
      { id: 'pt1', texto: 'Organizar evidencias por hallazgo' },
      { id: 'pt2', texto: 'Elaborar matriz de hallazgos' },
      { id: 'pt3', texto: 'Completar plantillas de papeles de trabajo' },
      { id: 'pt4', texto: 'Referenciar evidencias en papeles de trabajo' },
      { id: 'pt5', texto: 'Revisar consistencia y suficiencia de evidencias' },
      { id: 'pt6', texto: 'Firmar papeles de trabajo por equipo auditor' },
    ],
  },
];

export const ACTIVIDADES_COMUNICACION: ActividadAuditoria[] = [
  {
    id: 'informe-preliminar',
    titulo: 'Informe Preliminar',
    descripcion: 'Elaborar borrador del informe de auditoría con hallazgos identificados',
    icono: <FileText className="w-5 h-5" />,
    color: 'cyan',
    checklist: [
      { id: 'ip1', texto: 'Redactar introducción y objetivo de la auditoría' },
      { id: 'ip2', texto: 'Describir alcance y metodología aplicada' },
      { id: 'ip3', texto: 'Incluir hallazgos detallados con evidencia' },
      { id: 'ip4', texto: 'Redactar recomendaciones de mejora' },
      { id: 'ip5', texto: 'Revisar informe con auditor líder' },
      { id: 'ip6', texto: 'Socializar informe preliminar con área auditada' },
    ],
  },
  {
    id: 'derecho-contradiccion',
    titulo: 'Derecho de Contradicción',
    descripcion: 'Gestionar el proceso de contradicción del área auditada sobre los hallazgos',
    icono: <MessageSquare className="w-5 h-5" />,
    color: 'orange',
    checklist: [
      { id: 'dc1', texto: 'Enviar informe preliminar al área auditada' },
      { id: 'dc2', texto: 'Otorgar plazo legal para respuesta (5 días hábiles)' },
      { id: 'dc3', texto: 'Recibir y registrar observaciones del área' },
      { id: 'dc4', texto: 'Analizar argumentos presentados por el área' },
      { id: 'dc5', texto: 'Ajustar hallazgos según análisis de contradicción' },
      { id: 'dc6', texto: 'Documentar análisis en expediente de auditoría' },
    ],
  },
  {
    id: 'informe-final',
    titulo: 'Informe Final',
    descripcion: 'Elaborar y emitir el informe final definitivo de auditoría',
    icono: <CheckCircle className="w-5 h-5" />,
    color: 'emerald',
    checklist: [
      { id: 'if1', texto: 'Incorporar ajustes del derecho de contradicción' },
      { id: 'if2', texto: 'Redactar versión final del informe' },
      { id: 'if3', texto: 'Incluir plan de mejoramiento propuesto' },
      { id: 'if4', texto: 'Obtener aprobación de Jefe OCI' },
      { id: 'if5', texto: 'Emitir informe final con radicado oficial' },
      { id: 'if6', texto: 'Notificar formalmente al área auditada' },
    ],
  },
];

// ============ COMPONENTE PRINCIPAL ============

interface ActividadesIntegratedProps {
  actividades: ActividadAuditoria[];
  faseTitulo: string;
  faseColor: string;
  estadoRequerido?: 'Planeación' | 'Ejecución' | 'Comunicación';
  estadoActual?: string;
  auditoriaId?: string;
  checklistInicial?: Record<string, boolean>;
  onChecklistChange?: (checklist: Record<string, boolean>) => void;
}

export function ActividadesIntegradas({
  actividades,
  faseTitulo,
  faseColor,
  estadoRequerido,
  estadoActual,
  auditoriaId,
  checklistInicial,
  onChecklistChange,
}: ActividadesIntegratedProps) {
  const [actividadExpandida, setActividadExpandida] = useState<string | null>(actividades[0]?.id || null);
  const [checklistCompletados, setChecklistCompletados] = useState<Record<string, boolean>>(checklistInicial || {});
  const [guardando, setGuardando] = useState(false);

  // Cargar estado inicial desde la BD
  useEffect(() => {
    console.log('[ActividadesIntegradas] ChecklistInicial recibido:', checklistInicial);
    if (checklistInicial && typeof checklistInicial === 'object' && Object.keys(checklistInicial).length > 0) {
      setChecklistCompletados(checklistInicial);
    } else if (checklistInicial === undefined || checklistInicial === null) {
      // Si no hay datos, mantener el estado actual (no resetear)
      console.log('[ActividadesIntegradas] No hay checklistInicial, manteniendo estado actual');
    }
  }, [checklistInicial]);

  const toggleChecklist = async (id: string) => {
    // Guardar el estado anterior antes de hacer el cambio optimista
    const estadoAnterior = { ...checklistCompletados };
    const nuevoEstado = !checklistCompletados[id];
    
    // Actualizar estado local inmediatamente (optimistic update)
    const nuevoChecklist = {
      ...checklistCompletados,
      [id]: nuevoEstado,
    };
    setChecklistCompletados(nuevoChecklist);

    // Guardar en la base de datos
    if (auditoriaId) {
      setGuardando(true);
      try {
        const response = await auditoriasApi.update(auditoriaId, {
          checklistCompletados: nuevoChecklist,
        });

        if (response.success) {
          // Notificar al componente padre del cambio
          if (onChecklistChange) {
            onChecklistChange(nuevoChecklist);
          }
          // Mostrar toast más visible
          toast.success(nuevoEstado ? '✅ Tarea completada' : '⏳ Tarea pendiente', {
            description: 'Cambio guardado en la base de datos',
            duration: 3000,
          });
        } else {
          // Revertir cambio si falla usando el estado anterior guardado
          setChecklistCompletados(estadoAnterior);
          throw new Error(response.error || 'Error al guardar');
        }
      } catch (error) {
        // Revertir cambio local usando el estado anterior guardado
        setChecklistCompletados(estadoAnterior);
        console.error('Error al guardar checkbox:', error);
        toast.error('Error al guardar', {
          description: error instanceof Error ? error.message : 'No se pudo guardar el cambio',
        });
      } finally {
        setGuardando(false);
      }
    } else {
      toast.success(nuevoEstado ? '✅ Tarea completada' : 'Tarea marcada como pendiente');
    }
  };

  const calcularProgreso = (actividadId: string) => {
    const actividad = actividades.find(a => a.id === actividadId);
    if (!actividad) return 0;

    const total = actividad.checklist.length;
    const completados = actividad.checklist.filter(item => checklistCompletados[item.id]).length;
    return Math.round((completados / total) * 100);
  };

  const todasActividadesCompletas = () => {
    return actividades.every(actividad => calcularProgreso(actividad.id) === 100);
  };

  const alertaNecesaria = estadoRequerido && estadoActual && estadoActual === estadoRequerido && !todasActividadesCompletas();

  return (
    <div className="space-y-4">
      {/* Alerta de validación */}
      {alertaNecesaria && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4 animate-pulse">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-amber-900 mb-1">
                <strong>⚠️ Fase de {faseTitulo} incompleta</strong>
              </p>
              <p className="text-xs text-amber-700">
                Completa las {actividades.length} actividades antes de mover esta auditoría al siguiente estado
              </p>
            </div>
          </div>
        </div>
      )}

      {todasActividadesCompletas() && (
        <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-green-900">
                <strong>✅ Fase de {faseTitulo} completa</strong> - Esta auditoría puede avanzar
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actividades */}
      <div className="space-y-3">
        {actividades.map((actividad) => {
          const progreso = calcularProgreso(actividad.id);
          const isExpandida = actividadExpandida === actividad.id;
          const completados = actividad.checklist.filter(item => checklistCompletados[item.id]).length;
          const total = actividad.checklist.length;

          return (
            <CardSIGL key={actividad.id}>
              <div className="space-y-3">
                {/* Header de actividad */}
                <div
                  onClick={() => setActividadExpandida(isExpandida ? null : actividad.id)}
                  className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 -m-4 p-4 rounded-lg transition-colors"
                >
                  <div className={`w-10 h-10 bg-${actividad.color}-100 rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <div className={`text-${actividad.color}-600`}>
                      {actividad.icono}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm text-gray-900">{actividad.titulo}</h4>
                      <div className="flex items-center gap-2">
                        <BadgeSIGL variant={progreso === 100 ? 'success' : progreso > 0 ? 'warning' : 'neutral'}>
                          {progreso === 100 ? 'Completada' : progreso > 0 ? 'En Progreso' : 'Pendiente'}
                        </BadgeSIGL>
                        {isExpandida ? (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">{actividad.descripcion}</p>

                    {/* Barra de progreso */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500`}
                          style={{
                            width: `${progreso}%`,
                            backgroundColor: progreso === 100 ? '#10b981' : progreso > 0 ? '#f59e0b' : '#6b7280',
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-600 w-16 text-right">
                        {completados}/{total}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Checklist expandido */}
                <AnimatePresence>
                  {isExpandida && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2 pt-3 border-t"
                    >
                      {actividad.checklist.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => !guardando && toggleChecklist(item.id)}
                          className={`flex items-start gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer transition-colors group ${
                            guardando ? 'opacity-50 cursor-wait' : ''
                          }`}
                        >
                          <div className="mt-0.5 relative">
                            {checklistCompletados[item.id] ? (
                              <CheckCircle2 className="w-5 h-5 text-green-600" />
                            ) : (
                              <div className="w-5 h-5 border-2 border-gray-300 rounded group-hover:border-blue-400 transition-colors" />
                            )}
                          </div>
                          <p
                            className={`text-sm flex-1 ${
                              checklistCompletados[item.id]
                                ? 'text-gray-500 line-through'
                                : 'text-gray-900'
                            }`}
                          >
                            {item.texto}
                          </p>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </CardSIGL>
          );
        })}
      </div>
    </div>
  );
}

// ============ UTILIDADES ============

/**
 * Valida si todas las actividades de una fase están completas
 */
export function validarFaseCompleta(
  actividades: ActividadAuditoria[],
  checklistCompletados: Record<string, boolean>
): boolean {
  return actividades.every(actividad => {
    const total = actividad.checklist.length;
    const completados = actividad.checklist.filter(item => checklistCompletados[item.id]).length;
    return completados === total;
  });
}

/**
 * Calcula el progreso general de una fase
 */
export function calcularProgresoFase(
  actividades: ActividadAuditoria[],
  checklistCompletados: Record<string, boolean>
): number {
  const totalTareas = actividades.reduce((sum, act) => sum + act.checklist.length, 0);
  const tareasCompletadas = actividades.reduce(
    (sum, act) => sum + act.checklist.filter(item => checklistCompletados[item.id]).length,
    0
  );
  
  return totalTareas > 0 ? Math.round((tareasCompletadas / totalTareas) * 100) : 0;
}
