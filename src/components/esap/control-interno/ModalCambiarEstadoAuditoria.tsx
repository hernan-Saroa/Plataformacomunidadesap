/**
 * ==============================================
 * MODAL CAMBIAR ESTADO DE AUDITORÍA
 * ==============================================
 * 
 * Modal visual para cambiar el estado de una auditoría
 * - Muestra el flujo completo de estados
 * - Permite saltar a cualquier estado válido
 * - Validación de transiciones
 * - Solicita comentarios obligatorios
 * - Registro en trazabilidad
 */

import { useState } from 'react';
import { X, RefreshCw, CheckCircle, AlertCircle, ArrowRight, ClipboardCheck, Play, MessageSquare, Eye, Award } from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { toast } from 'sonner@2.0.3';

type EstadoAuditoria = 'Planeación' | 'Ejecución' | 'Comunicación' | 'Seguimiento' | 'Finalizada';

interface Auditoria {
  id: string;
  codigo: string;
  titulo: string;
  estado: EstadoAuditoria;
  territorial: string;
  progreso: number;
  aprobada?: boolean; // ✅ Agregar campo aprobada
}

interface ModalCambiarEstadoAuditoriaProps {
  isOpen: boolean;
  onClose: () => void;
  auditoria: Auditoria | null;
  onCambiarEstado: (auditoriaId: string, nuevoEstado: EstadoAuditoria, comentario: string) => void;
}

const ESTADOS_FLUJO: { estado: EstadoAuditoria; label: string; color: string; icon: any; descripcion: string }[] = [
  { 
    estado: 'Planeación', 
    label: 'Planeación', 
    color: '#3B82F6',
    icon: ClipboardCheck,
    descripcion: 'Definición de objetivos y alcance'
  },
  { 
    estado: 'Ejecución', 
    label: 'Ejecución', 
    color: '#F59E0B',
    icon: Play,
    descripcion: 'Recopilación de evidencias y pruebas'
  },
  { 
    estado: 'Comunicación', 
    label: 'Comunicación', 
    color: '#8B5CF6',
    icon: MessageSquare,
    descripcion: 'Elaboración y envío de informes'
  },
  { 
    estado: 'Seguimiento', 
    label: 'Seguimiento', 
    color: '#EC4899',
    icon: Eye,
    descripcion: 'Monitoreo de hallazgos y planes'
  },
  { 
    estado: 'Finalizada', 
    label: 'Finalizada', 
    color: '#10B981',
    icon: Award,
    descripcion: 'Auditoría completada y cerrada'
  }
];

export function ModalCambiarEstadoAuditoria({
  isOpen,
  onClose,
  auditoria,
  onCambiarEstado
}: ModalCambiarEstadoAuditoriaProps) {
  const [estadoSeleccionado, setEstadoSeleccionado] = useState<EstadoAuditoria | null>(null);
  const [comentario, setComentario] = useState('');

  if (!isOpen || !auditoria) return null;

  const indiceEstadoActual = ESTADOS_FLUJO.findIndex(e => e.estado === auditoria.estado);
  const indiceEstadoSeleccionado = estadoSeleccionado 
    ? ESTADOS_FLUJO.findIndex(e => e.estado === estadoSeleccionado)
    : -1;

  const handleGuardar = () => {
    if (!estadoSeleccionado) {
      toast.error('Error de validación', {
        description: 'Debe seleccionar un estado destino'
      });
      return;
    }

    if (estadoSeleccionado === auditoria.estado) {
      toast.error('Error de validación', {
        description: 'El estado seleccionado es el mismo que el actual'
      });
      return;
    }

    if (!comentario.trim()) {
      toast.error('Error de validación', {
        description: 'Debe ingresar un comentario explicando el cambio de estado'
      });
      return;
    }

    if (comentario.trim().length < 10) {
      toast.error('Error de validación', {
        description: 'El comentario debe tener al menos 10 caracteres'
      });
      return;
    }

    onCambiarEstado(auditoria.id, estadoSeleccionado, comentario);
    handleCerrar();
  };

  const handleCerrar = () => {
    setEstadoSeleccionado(null);
    setComentario('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[111] p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200" style={{ background: 'linear-gradient(135deg, #F97316 0%, #FB923C 100%)' }}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 rounded-lg">
                  <RefreshCw className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">
                    Cambiar Estado de Auditoría
                  </h2>
                  <p className="text-sm text-white/80 mt-0.5">
                    {auditoria.codigo} - {auditoria.titulo}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Badge className="bg-white/20 text-white border-white/30">
                  Estado Actual: {auditoria.estado}
                </Badge>
                <Badge className="bg-white/20 text-white border-white/30">
                  {auditoria.territorial}
                </Badge>
                <Badge className="bg-white/20 text-white border-white/30">
                  {auditoria.progreso}% completado
                </Badge>
              </div>
            </div>
            <button
              onClick={handleCerrar}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-250px)]">
          {/* Aviso de auditoría aprobada */}
          {auditoria.aprobada && auditoria.estado !== 'Finalizada' && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-green-900 mb-1">
                  Auditoría Aprobada
                </p>
                <p className="text-sm text-green-700">
                  Esta auditoría fue aprobada. Solo puede moverse al estado <strong>"Finalizada"</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Flujo de Estados */}
          <div className="mb-6">
            <h3 className="font-bold text-gray-900 mb-4">Seleccione el nuevo estado</h3>
            
            <div className="space-y-3">
              {ESTADOS_FLUJO.map((estadoFlujo, index) => {
                const esEstadoActual = estadoFlujo.estado === auditoria.estado;
                const esEstadoSeleccionado = estadoFlujo.estado === estadoSeleccionado;
                
                // ✅ Si está aprobada, solo puede moverse a Finalizada
                const estaDeshabilitado = esEstadoActual || 
                  (auditoria.aprobada && estadoFlujo.estado !== 'Finalizada');
                
                const IconoEstado = estadoFlujo.icon;

                return (
                  <div key={estadoFlujo.estado} className="relative">
                    {/* Línea conectora */}
                    {index < ESTADOS_FLUJO.length - 1 && (
                      <div 
                        className="absolute left-6 top-14 w-0.5 h-6 bg-gray-300"
                        style={{
                          backgroundColor: index < indiceEstadoActual ? estadoFlujo.color : '#D1D5DB'
                        }}
                      />
                    )}
                    
                    <button
                      onClick={() => !estaDeshabilitado && setEstadoSeleccionado(estadoFlujo.estado)}
                      disabled={estaDeshabilitado}
                      className={`
                        w-full p-4 rounded-lg border-2 transition-all text-left
                        ${estaDeshabilitado 
                          ? 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-60' 
                          : esEstadoSeleccionado
                          ? 'bg-orange-50 border-orange-500 shadow-md'
                          : 'bg-white border-gray-200 hover:border-orange-300 hover:bg-orange-50/50 cursor-pointer'
                        }
                      `}
                    >
                      <div className="flex items-start gap-4">
                        {/* Indicador visual */}
                        <div 
                          className={`
                            flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center
                            ${esEstadoActual 
                              ? 'ring-4 ring-offset-2'
                              : esEstadoSeleccionado
                              ? 'ring-4 ring-orange-200'
                              : ''
                            }
                          `}
                          style={{ 
                            backgroundColor: esEstadoActual || esEstadoSeleccionado ? estadoFlujo.color : '#F3F4F6',
                            ringColor: esEstadoActual ? estadoFlujo.color + '40' : undefined
                          }}
                        >
                          <IconoEstado 
                            className="w-6 h-6" 
                            style={{ color: esEstadoActual || esEstadoSeleccionado ? '#FFFFFF' : '#9CA3AF' }}
                          />
                        </div>

                        {/* Contenido */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p 
                              className="font-bold text-lg"
                              style={{ color: esEstadoActual || esEstadoSeleccionado ? estadoFlujo.color : '#1F2937' }}
                            >
                              {estadoFlujo.label}
                            </p>
                            {esEstadoActual && (
                              <Badge 
                                className="text-xs"
                                style={{ backgroundColor: estadoFlujo.color, color: '#FFFFFF' }}
                              >
                                Estado Actual
                              </Badge>
                            )}
                            {esEstadoSeleccionado && !esEstadoActual && (
                              <Badge className="text-xs bg-orange-500 text-white">
                                <ArrowRight className="w-3 h-3 mr-1" />
                                Seleccionado
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            {estadoFlujo.descripcion}
                          </p>
                        </div>

                        {/* Checkbox visual */}
                        {!estaDeshabilitado && (
                          <div className={`
                            flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center
                            ${esEstadoSeleccionado 
                              ? 'bg-orange-500 border-orange-500' 
                              : 'border-gray-300 bg-white'
                            }
                          `}>
                            {esEstadoSeleccionado && (
                              <CheckCircle className="w-4 h-4 text-white" />
                            )}
                          </div>
                        )}
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Comentario obligatorio */}
          <div className="border-t border-gray-200 pt-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="font-bold text-gray-900">
                  Comentario sobre el cambio de estado
                </label>
                <span className="text-xs text-red-600">* Obligatorio</span>
              </div>
              <p className="text-sm text-gray-500">
                Explique brevemente el motivo del cambio de estado (mínimo 10 caracteres)
              </p>
              <textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Ej: Se completa la fase de planeación con todos los documentos aprobados, se procede a la ejecución de campo..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                rows={4}
                maxLength={500}
              />
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>
                  {comentario.length}/500 caracteres
                  {comentario.length < 10 && comentario.length > 0 && (
                    <span className="text-red-600 ml-2">
                      (Faltan {10 - comentario.length} caracteres)
                    </span>
                  )}
                </span>
                {comentario.length >= 10 && (
                  <span className="text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Longitud válida
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Resumen del cambio */}
          {estadoSeleccionado && estadoSeleccionado !== auditoria.estado && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-900">Resumen del cambio:</p>
                  <p className="text-sm text-blue-800 mt-1">
                    La auditoría <strong>{auditoria.codigo}</strong> cambiará de estado{' '}
                    <strong>{auditoria.estado}</strong> a <strong>{estadoSeleccionado}</strong>.
                  </p>
                  <p className="text-xs text-blue-700 mt-2">
                    Este cambio quedará registrado en el historial de trazabilidad con fecha, hora y usuario.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <AlertCircle className="w-4 h-4" />
              <span>Los cambios de estado quedan registrados en trazabilidad</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleCerrar}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleGuardar}
                style={{ background: '#F97316' }}
                className="text-white"
                disabled={
                  !estadoSeleccionado || 
                  estadoSeleccionado === auditoria.estado ||
                  !comentario.trim() ||
                  comentario.trim().length < 10
                }
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Confirmar Cambio
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}