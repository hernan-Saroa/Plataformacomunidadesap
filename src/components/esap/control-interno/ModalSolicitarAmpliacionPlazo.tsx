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
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { toast } from 'sonner@2.0.3';
import { auditoriasApi } from './services/api';

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

  // Función helper para parsear fechas de diferentes formatos
  // IMPORTANTE: Maneja correctamente las fechas para evitar problemas de zona horaria
  const parsearFecha = (fecha: string | Date): Date | null => {
    if (!fecha) return null;
    
    // Si ya es un Date válido
    if (fecha instanceof Date && !isNaN(fecha.getTime())) {
      return fecha;
    }
    
    // Si es string, intentar parsear
    if (typeof fecha === 'string') {
      // Primero intentar formato DD/MM/YYYY (formato común en Colombia)
      const partesSlash = fecha.split('/');
      if (partesSlash.length === 3) {
        const dia = parseInt(partesSlash[0], 10);
        const mes = parseInt(partesSlash[1], 10) - 1; // Mes es 0-indexed
        const año = parseInt(partesSlash[2], 10);
        
        if (!isNaN(dia) && !isNaN(mes) && !isNaN(año) && mes >= 0 && mes <= 11) {
          // Crear fecha en zona horaria local para evitar desfases
          const date = new Date(año, mes, dia);
          if (!isNaN(date.getTime())) {
            return date;
          }
        }
      }
      
      // Intentar formato ISO (YYYY-MM-DD) - IMPORTANTE: parsear como fecha local
      if (fecha.includes('-')) {
        const partesISO = fecha.split('-');
        if (partesISO.length === 3) {
          const año = parseInt(partesISO[0], 10);
          const mes = parseInt(partesISO[1], 10) - 1; // Mes es 0-indexed
          const dia = parseInt(partesISO[2], 10);
          
          if (!isNaN(año) && !isNaN(mes) && !isNaN(dia) && mes >= 0 && mes <= 11) {
            // Crear fecha en zona horaria local para evitar desfases de UTC
            const date = new Date(año, mes, dia);
            if (!isNaN(date.getTime())) {
              return date;
            }
          }
        }
        
        // Si no es formato YYYY-MM-DD simple, intentar parseo directo
        const date = new Date(fecha);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
      
      // Como último recurso, intentar parseo directo
      const date = new Date(fecha);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    return null;
  };

  // Calcular fechas límite con validación
  const fechaFinActualParsed = parsearFecha(auditoria.fechaFin);
  const fechaInicioParsed = parsearFecha(auditoria.fechaInicio);
  
  // Si las fechas no son válidas, mostrar error
  if (!fechaFinActualParsed || !fechaInicioParsed) {
    return (
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[110]"
              onClick={onClose}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-[111] flex items-center justify-center p-4"
            >
              <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md">
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                  <h3 className="text-lg font-bold text-gray-900">Error de Fechas</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  No se pudieron cargar las fechas de la auditoría. Por favor, verifique que la auditoría tenga fechas válidas.
                </p>
                <Button onClick={onClose} className="w-full">
                  Cerrar
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }
  
  const fechaFinActual = fechaFinActualParsed;
  const fechaInicio = fechaInicioParsed;
  
  // Validar que fecha fin sea posterior a fecha inicio
  if (fechaFinActual < fechaInicio) {
    return (
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[110]"
              onClick={onClose}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-[111] flex items-center justify-center p-4"
            >
              <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md">
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                  <h3 className="text-lg font-bold text-gray-900">Error en Fechas de la Auditoría</h3>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  La fecha de finalización ({fechaFinActual.toLocaleDateString('es-CO')}) es anterior a la fecha de inicio ({fechaInicio.toLocaleDateString('es-CO')}).
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  Por favor, corrija las fechas de la auditoría antes de solicitar una ampliación de plazo.
                </p>
                <Button onClick={onClose} className="w-full">
                  Cerrar
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }
  
  // Fecha mínima: día siguiente a fecha fin actual
  const fechaMinima = new Date(fechaFinActual);
  fechaMinima.setDate(fechaMinima.getDate() + 1);
  const fechaMinimaStr = fechaMinima.toISOString().split('T')[0];
  
  // Fecha máxima: 1 año desde fecha inicio
  const fechaMaxima = new Date(fechaInicio);
  fechaMaxima.setFullYear(fechaMaxima.getFullYear() + 1);
  const fechaMaximaStr = fechaMaxima.toISOString().split('T')[0];

  // Validar formulario
  const validarFormulario = (): boolean => {
    const nuevosErrores: typeof errores = {};

    // Validar nueva fecha fin
    if (!nuevaFechaFin) {
      nuevosErrores.nuevaFechaFin = 'La nueva fecha de finalización es obligatoria';
    } else {
      const fechaNueva = new Date(nuevaFechaFin);
      const fechaFin = new Date(auditoria.fechaFin);
      
      if (fechaNueva <= fechaFin) {
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
        throw new Error(response.error || 'Error al enviar la solicitud');
      }
    } catch (error) {
      console.error('Error al solicitar ampliación de plazo:', error);
      toast.error('Error al enviar solicitud', {
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
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 text-sm text-amber-900">
                      <p className="font-semibold mb-1">Restricciones de ampliación:</p>
                      <ul className="list-disc list-inside space-y-1 text-amber-800">
                        <li>La nueva fecha debe ser posterior a la fecha actual de finalización</li>
                        <li>El plazo ampliado no puede exceder 1 año desde la fecha de inicio</li>
                        <li>La justificación debe tener al menos 20 caracteres</li>
                      </ul>
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
                    <div className="relative">
                      <input
                        type="date"
                        value={nuevaFechaFin}
                        onChange={(e) => {
                          setNuevaFechaFin(e.target.value);
                          setErrores(prev => ({ ...prev, nuevaFechaFin: undefined }));
                        }}
                        min={fechaMinimaStr}
                        max={fechaMaximaStr}
                        disabled={enviando}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                          errores.nuevaFechaFin ? 'border-red-500' : 'border-gray-300'
                        } disabled:bg-gray-100 disabled:cursor-not-allowed`}
                      />
                      <Calendar className="absolute right-3 top-2.5 w-5 h-5 text-gray-400 pointer-events-none" />
                    </div>
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
                    <p className="text-xs text-gray-500 mt-1">
                      Fecha límite máxima: {new Date(fechaMaximaStr).toLocaleDateString('es-CO', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
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

