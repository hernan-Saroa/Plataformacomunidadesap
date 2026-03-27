/**
 * ============================================
 * BANDEJA DE AMPLIACIONES DE PLAZO PENDIENTES
 * ============================================
 * 
 * Componente para que el Jefe OCI vea y gestione las solicitudes de ampliación
 * de plazo pendientes de aprobación.
 * 
 * FUNCIONALIDADES:
 * 1. Listar todas las solicitudes pendientes
 * 2. Ver detalles de cada solicitud
 * 3. Aprobar solicitud con comentarios opcionales
 * 4. Rechazar solicitud con justificación obligatoria
 * 5. Actualización automática después de cada acción
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, CheckCircle, XCircle, Calendar, FileText, Clock, User,
  AlertTriangle, Info, ChevronDown, ChevronUp, Eye, ThumbsUp, ThumbsDown
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { toast } from 'sonner@2.0.3';
import { auditoriasApi } from './services/api';

// ============ TIPOS ============

interface SolicitudAmpliacion {
  id: string;
  auditoriaId: string;
  auditoriaCodigo: string;
  auditoriaNombre: string;
  fechaSolicitud: string;
  justificacion: string;
  fechaFinAnterior: string;
  fechaFinNueva: string;
  solicitanteId: string | null;
}

interface BandejaAmpliacionesPendientesProps {
  open: boolean;
  onClose: () => void;
  onSolicitudProcesada: () => void;
}

// ============ COMPONENTE PRINCIPAL ============

export function BandejaAmpliacionesPendientes({
  open,
  onClose,
  onSolicitudProcesada
}: BandejaAmpliacionesPendientesProps) {
  const [solicitudes, setSolicitudes] = useState<SolicitudAmpliacion[]>([]);
  const [cargando, setCargando] = useState(false);
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<SolicitudAmpliacion | null>(null);
  const [accion, setAccion] = useState<'aprobar' | 'rechazar' | null>(null);
  const [comentarios, setComentarios] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Cargar solicitudes pendientes
  const cargarSolicitudes = async () => {
    setCargando(true);
    try {
      const response = await auditoriasApi.getSolicitudesAmpliacionPendientes();
      if (response.success && response.data) {
        setSolicitudes(response.data);
      } else {
        throw new Error(response.error || 'Error al cargar solicitudes');
      }
    } catch (error) {
      console.error('Error al cargar solicitudes:', error);
      toast.error('Error al cargar solicitudes', {
        description: error instanceof Error ? error.message : 'No se pudieron cargar las solicitudes pendientes'
      });
    } finally {
      setCargando(false);
    }
  };

  // Cargar al abrir
  useEffect(() => {
    if (open) {
      cargarSolicitudes();
    }
  }, [open]);

  // Toggle expandir/colapsar
  const toggleExpandir = (id: string) => {
    setExpandedIds(prev => {
      const nuevo = new Set(prev);
      if (nuevo.has(id)) {
        nuevo.delete(id);
      } else {
        nuevo.add(id);
      }
      return nuevo;
    });
  };

  // Calcular días de ampliación
  const calcularDiasAmpliacion = (fechaAnterior: string, fechaNueva: string): number => {
    const anterior = new Date(fechaAnterior);
    const nueva = new Date(fechaNueva);
    return Math.floor((nueva.getTime() - anterior.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Formatear fecha
  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Abrir modal de aprobación/rechazo
  const abrirModalAccion = (solicitud: SolicitudAmpliacion, tipo: 'aprobar' | 'rechazar') => {
    setSolicitudSeleccionada(solicitud);
    setAccion(tipo);
    setComentarios('');
  };

  // Cerrar modal de acción
  const cerrarModalAccion = () => {
    setSolicitudSeleccionada(null);
    setAccion(null);
    setComentarios('');
  };

  // Procesar acción (aprobar o rechazar)
  const procesarAccion = async () => {
    if (!solicitudSeleccionada || !accion) return;

    // Validar justificación si es rechazo
    if (accion === 'rechazar' && comentarios.trim().length < 20) {
      toast.error('La justificación del rechazo debe tener al menos 20 caracteres');
      return;
    }

    setProcesando(true);
    try {
      let response;
      if (accion === 'aprobar') {
        response = await auditoriasApi.aprobarAmpliacionPlazo(solicitudSeleccionada.auditoriaId, {
          comentarios: comentarios.trim() || undefined
        });
      } else {
        response = await auditoriasApi.rechazarAmpliacionPlazo(solicitudSeleccionada.auditoriaId, {
          justificacion: comentarios.trim()
        });
      }

      if (response.success) {
        toast.success(
          accion === 'aprobar'
            ? `✅ Ampliación de plazo aprobada exitosamente`
            : `❌ Ampliación de plazo rechazada`
        );
        cerrarModalAccion();
        await cargarSolicitudes();
        onSolicitudProcesada();
      } else {
        throw new Error(response.error || `Error al ${accion === 'aprobar' ? 'aprobar' : 'rechazar'} la solicitud`);
      }
    } catch (error) {
      console.error(`Error al ${accion} ampliación:`, error);
      toast.error(`Error al procesar solicitud`, {
        description: error instanceof Error ? error.message : `No se pudo ${accion === 'aprobar' ? 'aprobar' : 'rechazar'} la solicitud`
      });
    } finally {
      setProcesando(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* OVERLAY */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[110]"
            onClick={onClose}
          />

          {/* MODAL */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-[111] flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* HEADER */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 rounded-lg p-2">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      Bandeja de Ampliaciones Pendientes
                    </h2>
                    <p className="text-sm text-blue-100">
                      {solicitudes.length} solicitud{solicitudes.length !== 1 ? 'es' : ''} pendiente{solicitudes.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* CONTENT */}
              <div className="flex-1 overflow-y-auto p-6">
                {cargando ? (
                  <div className="flex items-center justify-center py-12">
                    <Clock className="w-8 h-8 text-gray-400 animate-spin" />
                    <span className="ml-3 text-gray-600">Cargando solicitudes...</span>
                  </div>
                ) : solicitudes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No hay solicitudes pendientes
                    </h3>
                    <p className="text-sm text-gray-600">
                      Todas las solicitudes de ampliación de plazo han sido procesadas.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {solicitudes.map((solicitud) => {
                      const expandida = expandedIds.has(solicitud.id);
                      const diasAmpliacion = calcularDiasAmpliacion(
                        solicitud.fechaFinAnterior,
                        solicitud.fechaFinNueva
                      );

                      return (
                        <motion.div
                          key={solicitud.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow"
                        >
                          {/* HEADER DE SOLICITUD */}
                          <div
                            className="bg-gray-50 px-4 py-3 cursor-pointer"
                            onClick={() => toggleExpandir(solicitud.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1">
                                <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                                  {solicitud.auditoriaCodigo}
                                </Badge>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-gray-900 truncate">
                                    {solicitud.auditoriaNombre}
                                  </h3>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    Solicitado el {formatearFecha(solicitud.fechaSolicitud)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <p className="text-sm font-semibold text-blue-600">
                                    +{diasAmpliacion} día{diasAmpliacion !== 1 ? 's' : ''}
                                  </p>
                                  <p className="text-xs text-gray-500">Ampliación</p>
                                </div>
                                {expandida ? (
                                  <ChevronUp className="w-5 h-5 text-gray-400" />
                                ) : (
                                  <ChevronDown className="w-5 h-5 text-gray-400" />
                                )}
                              </div>
                            </div>
                          </div>

                          {/* CONTENIDO EXPANDIDO */}
                          <AnimatePresence>
                            {expandida && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="px-4 py-4 space-y-4 border-t border-gray-200">
                                  {/* Información de fechas */}
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                      <div className="flex items-center gap-2 mb-1">
                                        <Calendar className="w-4 h-4 text-red-600" />
                                        <span className="text-xs font-semibold text-red-700">
                                          Fecha Fin Anterior
                                        </span>
                                      </div>
                                      <p className="text-sm font-bold text-red-900">
                                        {formatearFecha(solicitud.fechaFinAnterior)}
                                      </p>
                                    </div>
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                      <div className="flex items-center gap-2 mb-1">
                                        <Calendar className="w-4 h-4 text-green-600" />
                                        <span className="text-xs font-semibold text-green-700">
                                          Nueva Fecha Fin
                                        </span>
                                      </div>
                                      <p className="text-sm font-bold text-green-900">
                                        {formatearFecha(solicitud.fechaFinNueva)}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Justificación */}
                                  <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <FileText className="w-4 h-4 text-gray-600" />
                                      <span className="text-sm font-semibold text-gray-700">
                                        Justificación
                                      </span>
                                    </div>
                                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                        {solicitud.justificacion}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Acciones */}
                                  <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-200">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => abrirModalAccion(solicitud, 'rechazar')}
                                      className="border-red-300 text-red-700 hover:bg-red-50"
                                    >
                                      <ThumbsDown className="w-4 h-4 mr-2" />
                                      Rechazar
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => abrirModalAccion(solicitud, 'aprobar')}
                                      className="bg-green-600 hover:bg-green-700 text-white"
                                    >
                                      <ThumbsUp className="w-4 h-4 mr-2" />
                                      Aprobar
                                    </Button>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* FOOTER */}
              <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-end bg-gray-50">
                <Button variant="outline" onClick={onClose}>
                  Cerrar
                </Button>
              </div>
            </div>

            {/* MODAL DE APROBACIÓN/RECHAZO */}
            <AnimatePresence>
              {solicitudSeleccionada && accion && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 z-[112]"
                    onClick={cerrarModalAccion}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="fixed inset-0 z-[113] flex items-center justify-center p-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
                      <div className={`px-6 py-4 flex items-center justify-between ${
                        accion === 'aprobar' ? 'bg-green-600' : 'bg-red-600'
                      }`}>
                        <div className="flex items-center gap-3">
                          {accion === 'aprobar' ? (
                            <CheckCircle className="w-6 h-6 text-white" />
                          ) : (
                            <XCircle className="w-6 h-6 text-white" />
                          )}
                          <h3 className="text-lg font-bold text-white">
                            {accion === 'aprobar' ? 'Aprobar' : 'Rechazar'} Ampliación de Plazo
                          </h3>
                        </div>
                        <button
                          onClick={cerrarModalAccion}
                          disabled={procesando}
                          className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors disabled:opacity-50"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="p-6 space-y-4">
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                          <p className="text-sm font-semibold text-gray-700 mb-1">
                            Auditoría: {solicitudSeleccionada.auditoriaCodigo}
                          </p>
                          <p className="text-xs text-gray-600">
                            {solicitudSeleccionada.auditoriaNombre}
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            {accion === 'aprobar' ? 'Comentarios (opcional)' : 'Justificación (obligatorio)'}
                            {accion === 'rechazar' && <span className="text-red-500">*</span>}
                          </label>
                          <textarea
                            value={comentarios}
                            onChange={(e) => setComentarios(e.target.value)}
                            disabled={procesando}
                            rows={4}
                            placeholder={
                              accion === 'aprobar'
                                ? 'Agregue comentarios opcionales sobre la aprobación...'
                                : 'Describa la razón del rechazo (mínimo 20 caracteres)...'
                            }
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:bg-gray-100"
                          />
                          {accion === 'rechazar' && (
                            <p className="text-xs text-gray-500 mt-1">
                              {comentarios.length} / 20 caracteres mínimos
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3 bg-gray-50">
                        <Button
                          variant="outline"
                          onClick={cerrarModalAccion}
                          disabled={procesando}
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={procesarAccion}
                          disabled={procesando || (accion === 'rechazar' && comentarios.trim().length < 20)}
                          className={
                            accion === 'aprobar'
                              ? 'bg-green-600 hover:bg-green-700 text-white'
                              : 'bg-red-600 hover:bg-red-700 text-white'
                          }
                        >
                          {procesando ? (
                            <>
                              <Clock className="w-4 h-4 mr-2 animate-spin" />
                              Procesando...
                            </>
                          ) : (
                            <>
                              {accion === 'aprobar' ? (
                                <>
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Aprobar
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Rechazar
                                </>
                              )}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

