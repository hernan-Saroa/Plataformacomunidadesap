/**
 * ============================================
 * MODAL SOLICITAR AMPLIACIÓN DE PLAZO
 * ============================================
 * 
 * Componente modal para que el Auditor Líder solicite ampliación de plazo
 * de una auditoría en curso.
 * 
 * FUNCIONALIDADES:
 * 1. Formulario para solicitar ampliación con justificación
 * 2. Validación de fecha (no exceder 1 año desde fecha inicio)
 * 3. Validación de justificación (mínimo 20 caracteres)
 * 4. Integración con backend
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Calendar, FileText, AlertTriangle, Clock, CheckCircle,
  Info, AlertCircle
} from 'lucide-react';
import { Button } from '@esap-mfe/shared-ui/button';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { toast } from 'sonner';
import { auditoriasApi } from './services/api';
import { debugAuthToken } from './services/authDebug';

// ============ TIPOS ============

interface Auditoria {
  id: string;
  codigo: string;
  titulo: string;
  fechaInicio: string;
  fechaFin: string;
  estado: string;
}

interface ModalSolicitarAmpliacionPlazoProps {
  auditoria: Auditoria | null;
  open: boolean;
  onClose: () => void;
  onSolicitudEnviada: () => void;
}

// ============ COMPONENTE PRINCIPAL ============

export function ModalSolicitarAmpliacionPlazo({
  auditoria,
  open,
  onClose,
  onSolicitudEnviada
}: ModalSolicitarAmpliacionPlazoProps) {
  const [nuevaFechaFin, setNuevaFechaFin] = useState('');
  const [justificacion, setJustificacion] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errores, setErrores] = useState<{
    nuevaFechaFin?: string;
    justificacion?: string;
  }>({});

  // Resetear formulario al abrir/cerrar
  useEffect(() => {
    if (open && auditoria) {
      setNuevaFechaFin('');
      setJustificacion('');
      setErrores({});
    }
  }, [open, auditoria]);

  if (!auditoria) return null;

  // Función helper para parsear fechas ISO correctamente
  // IMPORTANTE: Las fechas pueden venir en formato YYYY-MM-DD o DD/MM/YYYY
  // Debemos parsearlas como fecha local, NO como UTC
  const parsearFechaISO = (fechaStr: string): Date => {
    
    // Manejar formato DD/MM/YYYY (usado por el backend colombiano)
    if (fechaStr.includes('/')) {
      const partes = fechaStr.split('/');
      
      if (partes.length === 3) {
        const dia = parseInt(partes[0], 10);
        const mes = parseInt(partes[1], 10) - 1; // Mes es 0-indexed en JavaScript
        const año = parseInt(partes[2], 10);
        
        // Crear fecha en zona horaria local (sin conversión UTC)
        const fecha = new Date(año, mes, dia);
        
        return fecha;
      }
    }
    
    // Manejar formato YYYY-MM-DD (formato ISO estándar)
    if (fechaStr.includes('-')) {
      const partes = fechaStr.split('T')[0].split('-'); // Tomar solo la parte de fecha si viene con tiempo
      
      if (partes.length === 3) {
        const año = parseInt(partes[0], 10);
        const mes = parseInt(partes[1], 10) - 1; // Mes es 0-indexed en JavaScript
        const dia = parseInt(partes[2], 10);
        
        // Crear fecha en zona horaria local (sin conversión UTC)
        const fecha = new Date(año, mes, dia);
        
        return fecha;
      }
    }
    
    console.error('❌ [parsearFechaISO] Formato no reconocido:', fechaStr);
    return new Date(NaN); // Fecha inválida
  };

  // Función helper para formatear Date a string YYYY-MM-DD SIN conversión UTC
  const formatearFechaLocal = (fecha: Date): string => {
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
  };

  // Parsear fechas de la auditoría
  const fechaInicio = parsearFechaISO(auditoria.fechaInicio);
  const fechaFinActual = parsearFechaISO(auditoria.fechaFin);
  
  // Fecha mínima: día siguiente a fecha fin actual
  const fechaMinima = new Date(fechaFinActual);
  fechaMinima.setDate(fechaMinima.getDate() + 1);
  const fechaMinimaStr = formatearFechaLocal(fechaMinima);
  
  // Fecha máxima: 1 año desde fecha inicio
  const fechaMaxima = new Date(fechaInicio);
  fechaMaxima.setFullYear(fechaMaxima.getFullYear() + 1);
  const fechaMaximaStr = formatearFechaLocal(fechaMaxima);
  
  // ⚠️ VALIDACIÓN: Verificar que haya rango válido de fechas
  const rangoValido = fechaMinima <= fechaMaxima;

  // Validar formulario
  const validarFormulario = (): boolean => {
    const nuevosErrores: typeof errores = {};

    // Validar nueva fecha fin
    if (!nuevaFechaFin) {
      nuevosErrores.nuevaFechaFin = 'La nueva fecha de finalización es obligatoria';
    } else {
      // Parsear la fecha ingresada correctamente (YYYY-MM-DD del input)
      const fechaNueva = parsearFechaISO(nuevaFechaFin);
      
      // Comparar solo con fechaFinActual ya parseada, ignorando la hora
      fechaNueva.setHours(0, 0, 0, 0);
      const fechaFinComparar = new Date(fechaFinActual);
      fechaFinComparar.setHours(0, 0, 0, 0);
      
      if (fechaNueva <= fechaFinComparar) {
        nuevosErrores.nuevaFechaFin = 'La nueva fecha debe ser posterior a la fecha actual de finalización';
      } else {
        // Validar que no exceda 1 año desde fecha inicio
        const diferenciaDias = Math.floor(
          (fechaNueva.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diferenciaDias > 365) {
          nuevosErrores.nuevaFechaFin = 'El plazo ampliado no puede exceder 1 año desde la fecha de inicio';
        }
      }
    }

    // Validar justificación
    if (!justificacion.trim()) {
      nuevosErrores.justificacion = 'La justificación es obligatoria';
    } else if (justificacion.trim().length < 20) {
      nuevosErrores.justificacion = 'La justificación debe tener al menos 20 caracteres';
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  // Enviar solicitud
  const handleEnviar = async () => {
    if (!validarFormulario()) {
      toast.error('Por favor corrija los errores en el formulario');
      return;
    }

    setEnviando(true);
    try {
      const response = await auditoriasApi.solicitarAmpliacionPlazo(auditoria.id, {
        nuevaFechaFin,
        justificacion: justificacion.trim()
      });

      if (response.success) {
        toast.success('✅ Solicitud de ampliación de plazo enviada exitosamente');
        onSolicitudEnviada();
        handleClose();
      } else {
        // Mostrar el mensaje de error específico del backend
        const errorMsg = response.error || 'Error al enviar la solicitud';
        
        // Si es error de autenticación, sugerir reiniciar sesión
        if ((response as any).statusCode === 401) {
          toast.error('❌ Sesión expirada', {
            description: errorMsg + ' Recarga la página para iniciar sesión nuevamente.',
            duration: 5000
          });
        } else {
          toast.error('❌ Error al enviar solicitud', {
            description: errorMsg
          });
        }
      }
    } catch (error) {
      console.error('Error al solicitar ampliación de plazo:', error);
      toast.error('❌ Error al enviar solicitud', {
        description: error instanceof Error ? error.message : 'No se pudo enviar la solicitud de ampliación'
      });
    } finally {
      setEnviando(false);
    }
  };

  // Cerrar modal
  const handleClose = () => {
    if (!enviando) {
      setNuevaFechaFin('');
      setJustificacion('');
      setErrores({});
      onClose();
    }
  };

  // Calcular días de ampliación
  const diasAmpliacion = nuevaFechaFin && !errores.nuevaFechaFin
    ? Math.floor(
        (new Date(nuevaFechaFin).getTime() - fechaFinActual.getTime()) / (1000 * 60 * 60 * 24)
      )
    : null;

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
            onClick={handleClose}
          />

          {/* MODAL */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-[111] flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* HEADER */}
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 rounded-lg p-2">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      Solicitar Ampliación de Plazo
                    </h2>
                    <p className="text-sm text-orange-100">
                      Auditoría: {auditoria.codigo}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  disabled={enviando}
                  className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* CONTENT */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Información de la auditoría */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-blue-900 mb-2">{auditoria.titulo}</h3>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-blue-700 font-medium">Fecha Inicio:</span>
                          <p className="text-blue-900">
                            {fechaInicio.toLocaleDateString('es-CO', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                        <div>
                          <span className="text-blue-700 font-medium">Fecha Fin Actual:</span>
                          <p className="text-blue-900">
                            {fechaFinActual.toLocaleDateString('es-CO', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Alerta de validación */}
                <div className={`border rounded-lg p-4 ${
                  rangoValido 
                    ? 'bg-amber-50 border-amber-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-start gap-3">
                    <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                      rangoValido ? 'text-amber-600' : 'text-red-600'
                    }`} />
                    <div className="flex-1 text-sm">
                      {rangoValido ? (
                        <>
                          <p className="font-semibold mb-1 text-amber-900">Restricciones de ampliación:</p>
                          <ul className="list-disc list-inside space-y-1 text-amber-800">
                            <li>La nueva fecha debe ser posterior a la fecha actual de finalización</li>
                            <li>El plazo ampliado no puede exceder 1 año desde la fecha de inicio</li>
                            <li>La justificación debe tener al menos 20 caracteres</li>
                          </ul>
                        </>
                      ) : (
                        <>
                          <p className="font-semibold mb-1 text-red-900">⚠️ No es posible solicitar ampliación</p>
                          <p className="text-red-800">
                            Esta auditoría ya ha alcanzado el plazo máximo permitido (1 año desde la fecha de inicio). 
                            La fecha fin actual ({fechaFinActual.toLocaleDateString('es-CO')}) está a solo{' '}
                            {Math.max(0, Math.floor((fechaMaxima.getTime() - fechaFinActual.getTime()) / (1000 * 60 * 60 * 24)))}{' '}
                            día(s) del límite máximo ({fechaMaxima.toLocaleDateString('es-CO')}).
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Formulario */}
                <div className="space-y-4">
                  {/* Nueva fecha fin */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Nueva Fecha de Finalización <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={nuevaFechaFin}
                      onChange={(e) => {
                        setNuevaFechaFin(e.target.value);
                        setErrores(prev => ({ ...prev, nuevaFechaFin: undefined }));
                      }}
                      min={fechaMinimaStr}
                      max={fechaMaximaStr}
                      disabled={enviando || !rangoValido}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                        errores.nuevaFechaFin ? 'border-red-500' : 'border-gray-300'
                      } disabled:bg-gray-100 disabled:cursor-not-allowed`}
                    />
                    {!rangoValido && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        No se puede seleccionar ninguna fecha. El plazo máximo ya fue alcanzado.
                      </p>
                    )}
                    {errores.nuevaFechaFin && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errores.nuevaFechaFin}
                      </p>
                    )}
                    {nuevaFechaFin && !errores.nuevaFechaFin && diasAmpliacion !== null && (
                      <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Ampliación de {diasAmpliacion} día{diasAmpliacion !== 1 ? 's' : ''}
                      </p>
                    )}
                    {rangoValido && (
                      <p className="text-xs text-gray-500 mt-1">
                        Fecha límite máxima: {fechaMaxima.toLocaleDateString('es-CO', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    )}
                  </div>

                  {/* Justificación */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Justificación <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={justificacion}
                      onChange={(e) => {
                        setJustificacion(e.target.value);
                        setErrores(prev => ({ ...prev, justificacion: undefined }));
                      }}
                      disabled={enviando}
                      rows={5}
                      placeholder="Describa los motivos que justifican la ampliación de plazo (mínimo 20 caracteres)..."
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none ${
                        errores.justificacion ? 'border-red-500' : 'border-gray-300'
                      } disabled:bg-gray-100 disabled:cursor-not-allowed`}
                    />
                    {errores.justificacion && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errores.justificacion}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {justificacion.length} / 20 caracteres mínimos
                    </p>
                  </div>
                </div>
              </div>

              {/* FOOTER */}
              <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3 bg-gray-50">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={enviando}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleEnviar}
                  disabled={enviando || !nuevaFechaFin || !justificacion.trim()}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {enviando ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Enviar Solicitud
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

