/**
 * WORKFLOW DE REVISIÓN Y APROBACIÓN
 * Componente crítico para flujos de aprobación
 * Casos de Uso: 2 y 5 (Ejecución de Auditoría + Informes de Ley)
 * 
 * Workflow estándar:
 * 1. Elaboración (Responsable)
 * 2. Revisión (Revisor)
 * 3. Aprobación (Aprobador/Jefe OCI)
 * 4. Publicación (Automática)
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle, XCircle, Clock, User, FileText, Send,
  AlertTriangle, MessageSquare, Eye, ChevronRight,
  Edit, ThumbsUp, ThumbsDown, FileSignature, Lock
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { toast } from 'sonner@2.0.3';

// ============ TIPOS ============

export type NombrePaso = 'elaboracion' | 'revision' | 'aprobacion' | 'publicacion';
export type EstadoPaso = 'pendiente' | 'en-proceso' | 'completado' | 'rechazado';

export interface PasoWorkflow {
  numero: number;
  nombre: NombrePaso;
  nombreDisplay: string;
  descripcion: string;
  responsable: string;
  rolResponsable: string;
  estado: EstadoPaso;
  fechaInicio: string | null;
  fechaFin: string | null;
  observaciones: string;
  archivosAdjuntos: string[];
  accion: 'aprobar' | 'revisar' | 'elaborar' | 'publicar';
  esObligatorio: boolean;
}

export interface Workflow {
  id: string;
  tipoDocumento: string; // 'informe-ley', 'plan-mejoramiento', 'informe-auditoria', etc.
  documentoId: string;
  documentoTitulo: string;
  pasoActual: number;
  pasos: PasoWorkflow[];
  completado: boolean;
  fechaInicio: string;
  fechaCompletado: string | null;
  requiereAprobacionObligatoria: boolean;
}

interface WorkflowAprobacionProps {
  workflow: Workflow;
  usuarioActual: {
    nombre: string;
    rol: string;
  };
  onPasoAprobado?: (numeroPaso: number, observaciones: string) => void;
  onPasoRechazado?: (numeroPaso: number, observaciones: string) => void;
  onWorkflowCompletado?: () => void;
  modoVisualizacion?: boolean;
}

// ============ COMPONENTE PRINCIPAL ============

export function WorkflowAprobacion({
  workflow,
  usuarioActual,
  onPasoAprobado,
  onPasoRechazado,
  onWorkflowCompletado,
  modoVisualizacion = false
}: WorkflowAprobacionProps) {
  const [pasoSeleccionado, setPasoSeleccionado] = useState<PasoWorkflow | null>(null);
  const [mostrarModalAccion, setMostrarModalAccion] = useState(false);
  const [accionSeleccionada, setAccionSeleccionada] = useState<'aprobar' | 'rechazar' | null>(null);

  // ============ VALIDACIÓN DE DATOS ============
  
  // Si no hay workflow o no tiene pasos, mostrar mensaje
  if (!workflow || !workflow.pasos || workflow.pasos.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4" style={{ color: '#F59E0B' }} />
          <h3 className="font-black text-lg text-gray-800 mb-2">
            No hay workflow disponible
          </h3>
          <p className="text-sm text-gray-600">
            El workflow de aprobación aún no ha sido configurado para este documento.
          </p>
        </div>
      </Card>
    );
  }

  // ============ FUNCIONES ============

  const esResponsablePasoActual = (): boolean => {
    const pasoActual = workflow.pasos.find(p => p.numero === workflow.pasoActual);
    if (!pasoActual) return false;

    return (
      pasoActual.responsable === usuarioActual.nombre ||
      pasoActual.rolResponsable === usuarioActual.rol
    );
  };

  const handleAprobarPaso = (numeroPaso: number, observaciones: string) => {
    if (onPasoAprobado) {
      onPasoAprobado(numeroPaso, observaciones);
    }

    // Actualizar el workflow local (en producción, vendría del backend)
    const pasoActualizado = workflow.pasos[numeroPaso - 1];
    pasoActualizado.estado = 'completado';
    pasoActualizado.fechaFin = new Date().toISOString();
    pasoActualizado.observaciones = observaciones;

    // Avanzar al siguiente paso
    if (numeroPaso < workflow.pasos.length) {
      const siguientePaso = workflow.pasos[numeroPaso];
      siguientePaso.estado = 'en-proceso';
      siguientePaso.fechaInicio = new Date().toISOString();
      workflow.pasoActual = numeroPaso + 1;
    } else {
      // Workflow completado
      workflow.completado = true;
      workflow.fechaCompletado = new Date().toISOString();
      
      if (onWorkflowCompletado) {
        onWorkflowCompletado();
      }
    }

    setMostrarModalAccion(false);
    setAccionSeleccionada(null);
    setPasoSeleccionado(null);

    toast.success(`Paso ${numeroPaso} aprobado exitosamente`);
  };

  const handleRechazarPaso = (numeroPaso: number, observaciones: string) => {
    if (!observaciones || observaciones.trim() === '') {
      toast.error('Debe indicar el motivo del rechazo');
      return;
    }

    if (onPasoRechazado) {
      onPasoRechazado(numeroPaso, observaciones);
    }

    // Actualizar el workflow local
    const pasoActualizado = workflow.pasos[numeroPaso - 1];
    pasoActualizado.estado = 'rechazado';
    pasoActualizado.fechaFin = new Date().toISOString();
    pasoActualizado.observaciones = observaciones;

    setMostrarModalAccion(false);
    setAccionSeleccionada(null);
    setPasoSeleccionado(null);

    toast.error(`Paso ${numeroPaso} rechazado. El documento debe ser corregido.`);
  };

  const abrirModalAprobacion = (paso: PasoWorkflow, accion: 'aprobar' | 'rechazar') => {
    setPasoSeleccionado(paso);
    setAccionSeleccionada(accion);
    setMostrarModalAccion(true);
  };

  // ============ FUNCIONES AUXILIARES ============

  const getColorEstado = (estado: EstadoPaso): string => {
    switch (estado) {
      case 'pendiente': return '#6B7280';
      case 'en-proceso': return '#3B82F6';
      case 'completado': return '#10B981';
      case 'rechazado': return '#EF4444';
    }
  };

  const getIconoEstado = (estado: EstadoPaso) => {
    switch (estado) {
      case 'pendiente': return Clock;
      case 'en-proceso': return Edit;
      case 'completado': return CheckCircle;
      case 'rechazado': return XCircle;
    }
  };

  const calcularProgreso = (): number => {
    const completados = workflow.pasos.filter(p => p.estado === 'completado').length;
    return (completados / workflow.pasos.length) * 100;
  };

  const progreso = calcularProgreso();

  // ============ RENDER ============

  return (
    <div className="space-y-4">
      {/* Header del workflow */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-black text-lg text-gray-800">Workflow de Aprobación</h3>
            <p className="text-sm text-gray-600 mt-1">{workflow.documentoTitulo}</p>
          </div>
          {workflow.completado && (
            <Badge style={{ background: '#10B981', color: 'white', fontSize: '14px', padding: '8px 16px' }}>
              ✓ Workflow Completado
            </Badge>
          )}
        </div>

        {/* Barra de progreso */}
        <div className="mb-2">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Progreso del Workflow</span>
            <span>{progreso.toFixed(0)}%</span>
          </div>
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-blue-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progreso}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Información del paso actual */}
        {!workflow.completado && (
          <div className="mt-3 p-3 bg-blue-50 border-l-4 border-blue-600 rounded">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                {workflow.pasoActual}
              </div>
              <p className="font-bold text-blue-900">
                Paso Actual: {workflow.pasos[workflow.pasoActual - 1]?.nombreDisplay}
              </p>
            </div>
            <p className="text-xs text-blue-800 ml-8">
              Responsable: {workflow.pasos[workflow.pasoActual - 1]?.responsable}
            </p>
            {esResponsablePasoActual() && (
              <div className="mt-2 ml-8">
                <Badge style={{ background: '#F59E0B', color: 'white' }}>
                  ⚠️ Requiere su acción
                </Badge>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Visualización de pasos */}
      <div className="space-y-3">
        {workflow.pasos.map((paso, idx) => {
          const IconoEstado = getIconoEstado(paso.estado);
          const esActual = workflow.pasoActual === paso.numero;
          const esPendiente = paso.estado === 'pendiente';
          const esResponsable = paso.responsable === usuarioActual.nombre || paso.rolResponsable === usuarioActual.rol;

          return (
            <motion.div
              key={paso.numero}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card
                className={`p-4 transition-all ${
                  esActual ? 'border-2 border-blue-500 bg-blue-50' :
                  paso.estado === 'completado' ? 'border-2 border-green-500 bg-green-50' :
                  paso.estado === 'rechazado' ? 'border-2 border-red-500 bg-red-50' :
                  'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  {/* Número e información del paso */}
                  <div className="flex items-start gap-3 flex-1">
                    {/* Número del paso */}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black flex-shrink-0"
                      style={{ background: getColorEstado(paso.estado) }}
                    >
                      {paso.estado === 'completado' ? (
                        <CheckCircle className="w-6 h-6" />
                      ) : paso.estado === 'rechazado' ? (
                        <XCircle className="w-6 h-6" />
                      ) : (
                        paso.numero
                      )}
                    </div>

                    {/* Detalles */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-black text-gray-800">{paso.nombreDisplay}</h4>
                        <Badge style={{ background: getColorEstado(paso.estado), color: 'white' }}>
                          {paso.estado}
                        </Badge>
                        {esActual && (
                          <Badge style={{ background: '#3B82F6', color: 'white' }}>
                            📍 Paso Actual
                          </Badge>
                        )}
                      </div>

                      <p className="text-sm text-gray-600 mb-2">{paso.descripcion}</p>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600 mb-2">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>Responsable: {paso.responsable}</span>
                        </div>
                        {paso.fechaInicio && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Inicio: {new Date(paso.fechaInicio).toLocaleDateString('es-CO')}</span>
                          </div>
                        )}
                        {paso.fechaFin && (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            <span>Fin: {new Date(paso.fechaFin).toLocaleDateString('es-CO')}</span>
                          </div>
                        )}
                      </div>

                      {/* Observaciones */}
                      {paso.observaciones && (
                        <div className="mt-2 p-2 bg-white border rounded">
                          <p className="text-xs font-bold text-gray-700 mb-1">Observaciones:</p>
                          <p className="text-xs text-gray-600">{paso.observaciones}</p>
                        </div>
                      )}

                      {/* Indicador de responsable */}
                      {esResponsable && esActual && !modoVisualizacion && (
                        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                          <p className="text-xs font-bold text-yellow-900">
                            ⚠️ Este paso requiere su acción
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Botones de acción */}
                  {esActual && esResponsable && !modoVisualizacion && paso.estado === 'en-proceso' && (
                    <div className="flex gap-2 ml-3">
                      <Button
                        size="sm"
                        style={{ background: '#10B981' }}
                        onClick={() => abrirModalAprobacion(paso, 'aprobar')}
                      >
                        <ThumbsUp className="w-3 h-3 mr-1" />
                        Aprobar
                      </Button>
                      <Button
                        size="sm"
                        style={{ background: '#EF4444' }}
                        onClick={() => abrirModalAprobacion(paso, 'rechazar')}
                      >
                        <ThumbsDown className="w-3 h-3 mr-1" />
                        Rechazar
                      </Button>
                    </div>
                  )}
                </div>

                {/* Conector al siguiente paso */}
                {idx < workflow.pasos.length - 1 && (
                  <div className="flex justify-center mt-2">
                    <ChevronRight 
                      className="w-6 h-6 transform rotate-90" 
                      style={{ 
                        color: paso.estado === 'completado' ? '#10B981' : '#D1D5DB' 
                      }} 
                    />
                  </div>
                )}
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Mensaje de workflow completado */}
      {workflow.completado && (
        <Card className="p-6 bg-green-50 border-2 border-green-500 text-center">
          <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
          <h4 className="font-black text-green-900 text-lg mb-2">
            ✅ Workflow Completado Exitosamente
          </h4>
          <p className="text-sm text-green-800">
            El documento ha pasado por todos los pasos de aprobación y está listo para publicación.
          </p>
          {workflow.fechaCompletado && (
            <p className="text-xs text-green-700 mt-2">
              Completado el {new Date(workflow.fechaCompletado).toLocaleDateString('es-CO')}
            </p>
          )}
        </Card>
      )}

      {/* Requisito de aprobación obligatoria */}
      {workflow.requiereAprobacionObligatoria && !workflow.completado && (
        <Card className="p-4 bg-blue-50 border-l-4 border-blue-600">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-blue-600" />
            <p className="text-sm font-bold text-blue-900">
              El workflow de revisión y aprobación es obligatorio antes de finalizar este documento
            </p>
          </div>
        </Card>
      )}

      {/* Modal de acción (aprobar/rechazar) */}
      <AnimatePresence>
        {mostrarModalAccion && pasoSeleccionado && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setMostrarModalAccion(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6"
            >
              <h3 className="font-black text-lg mb-4">
                {accionSeleccionada === 'aprobar' ? '✅ Aprobar Paso' : '❌ Rechazar Paso'}
              </h3>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-1">Paso:</p>
                <p className="font-bold">{pasoSeleccionado.nombreDisplay}</p>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-1">Descripción:</p>
                <p className="text-sm">{pasoSeleccionado.descripcion}</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Observaciones {accionSeleccionada === 'rechazar' && <span className="text-red-600">*</span>}:
                </label>
                <textarea
                  id={`obs-${pasoSeleccionado.numero}`}
                  className="w-full p-2 border rounded"
                  rows={4}
                  placeholder={
                    accionSeleccionada === 'aprobar'
                      ? 'Observaciones opcionales sobre la aprobación...'
                      : 'Indique los motivos del rechazo y las correcciones necesarias...'
                  }
                />
              </div>

              <div className="flex gap-2">
                {accionSeleccionada === 'aprobar' ? (
                  <Button
                    onClick={() => {
                      const textarea = document.getElementById(`obs-${pasoSeleccionado.numero}`) as HTMLTextAreaElement;
                      handleAprobarPaso(pasoSeleccionado.numero, textarea.value);
                    }}
                    style={{ background: '#10B981' }}
                    className="flex-1"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirmar Aprobación
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      const textarea = document.getElementById(`obs-${pasoSeleccionado.numero}`) as HTMLTextAreaElement;
                      handleRechazarPaso(pasoSeleccionado.numero, textarea.value);
                    }}
                    style={{ background: '#EF4444' }}
                    className="flex-1"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Confirmar Rechazo
                  </Button>
                )}
                <Button
                  onClick={() => {
                    setMostrarModalAccion(false);
                    setAccionSeleccionada(null);
                    setPasoSeleccionado(null);
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============ FUNCIÓN AUXILIAR PARA CREAR WORKFLOWS ============

export function crearWorkflowInformeLey(
  informeId: string,
  informeTitulo: string,
  responsable: string,
  revisor: string,
  aprobador: string
): Workflow {
  return {
    id: `wf-${Date.now()}`,
    tipoDocumento: 'informe-ley',
    documentoId: informeId,
    documentoTitulo: informeTitulo,
    pasoActual: 1,
    pasos: [
      {
        numero: 1,
        nombre: 'elaboracion',
        nombreDisplay: 'Elaboración',
        descripcion: 'Elaboración del informe con datos y análisis',
        responsable: responsable,
        rolResponsable: 'Profesional OCI',
        estado: 'en-proceso',
        fechaInicio: new Date().toISOString(),
        fechaFin: null,
        observaciones: '',
        archivosAdjuntos: [],
        accion: 'elaborar',
        esObligatorio: true
      },
      {
        numero: 2,
        nombre: 'revision',
        nombreDisplay: 'Revisión Técnica',
        descripcion: 'Revisión técnica del contenido y verificación de datos',
        responsable: revisor,
        rolResponsable: 'Profesional Especializado OCI',
        estado: 'pendiente',
        fechaInicio: null,
        fechaFin: null,
        observaciones: '',
        archivosAdjuntos: [],
        accion: 'revisar',
        esObligatorio: true
      },
      {
        numero: 3,
        nombre: 'aprobacion',
        nombreDisplay: 'Aprobación Final',
        descripcion: 'Aprobación por el Jefe de Control Interno',
        responsable: aprobador,
        rolResponsable: 'Jefe OCI',
        estado: 'pendiente',
        fechaInicio: null,
        fechaFin: null,
        observaciones: '',
        archivosAdjuntos: [],
        accion: 'aprobar',
        esObligatorio: true
      },
      {
        numero: 4,
        nombre: 'publicacion',
        nombreDisplay: 'Publicación',
        descripcion: 'Publicación automática y envío a destinatarios',
        responsable: 'Sistema',
        rolResponsable: 'Sistema',
        estado: 'pendiente',
        fechaInicio: null,
        fechaFin: null,
        observaciones: '',
        archivosAdjuntos: [],
        accion: 'publicar',
        esObligatorio: true
      }
    ],
    completado: false,
    fechaInicio: new Date().toISOString(),
    fechaCompletado: null,
    requiereAprobacionObligatoria: true
  };
}