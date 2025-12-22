/**
 * ============================================
 * MODAL DE APROBACIÓN DE AUDITORÍA - COMPLETO
 * ============================================
 * 
 * Componente modal para aprobar o rechazar planes de auditoría.
 * Solo accesible para Jefe OCI.
 * 
 * FUNCIONALIDADES:
 * 1. Revisar plan de auditoría completo
 * 2. Aprobar plan con comentarios
 * 3. Rechazar plan con justificación obligatoria
 * 4. Solicitar modificaciones
 * 5. Historial de aprobaciones/rechazos
 * 6. Trazabilidad completa (usuario, fecha, IP)
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, CheckCircle, XCircle, AlertTriangle, FileText, 
  User, Calendar, Clock, MessageSquare, Shield, Info,
  Edit2, ThumbsUp, ThumbsDown, Send, Eye
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { toast } from 'sonner@2.0.3';

// ============ TIPOS ============

interface Auditoria {
  id: string;
  codigo: string;
  titulo: string;
  estado: string;
  territorial: string;
  progreso: number;
  estadoAprobacion?: 'pendiente' | 'aprobado' | 'rechazado' | 'modificacion_solicitada';
  auditorLider?: string;
  fechaInicio?: string;
  fechaFin?: string;
}

interface ModalAprobacionProps {
  auditoria: Auditoria | null;
  open: boolean;
  onClose: () => void;
  onAprobado: (auditoria: Auditoria, comentarios: string) => void;
  onRechazado: (auditoria: Auditoria, justificacion: string) => void;
  onModificacion: (auditoria: Auditoria, observaciones: string) => void;
}

type AccionAprobacion = 'aprobar' | 'rechazar' | 'modificacion' | null;

interface HistorialAprobacion {
  id: string;
  fecha: string;
  hora: string;
  usuario: string;
  cargo: string;
  accion: 'aprobado' | 'rechazado' | 'modificacion_solicitada';
  comentarios: string;
  ip: string;
}

// ============ DATOS MOCK ============

const HISTORIAL_APROBACIONES: Record<string, HistorialAprobacion[]> = {
  'aud-001': [
    {
      id: 'apr-001',
      fecha: '2025-01-08',
      hora: '14:00:00',
      usuario: 'María González Díaz',
      cargo: 'Jefe OCI',
      accion: 'aprobado',
      comentarios: 'Plan aprobado sin observaciones. Puede iniciarse trabajo de campo.',
      ip: '192.168.1.105'
    }
  ],
  'aud-002': [
    {
      id: 'apr-010',
      fecha: '2025-01-12',
      hora: '10:30:00',
      usuario: 'María González Díaz',
      cargo: 'Jefe OCI',
      accion: 'modificacion_solicitada',
      comentarios: 'Se requiere ampliar el alcance para incluir la sede de Cúcuta. Favor incluir en el plan de muestreo.',
      ip: '192.168.1.105'
    },
    {
      id: 'apr-011',
      fecha: '2025-01-14',
      hora: '15:00:00',
      usuario: 'María González Díaz',
      cargo: 'Jefe OCI',
      accion: 'aprobado',
      comentarios: 'Plan actualizado correctamente. Aprobado para ejecución.',
      ip: '192.168.1.105'
    }
  ]
};

// Información del plan (simulado - en producción vendría de la auditoría)
const INFORMACION_PLAN: Record<string, any> = {
  'aud-001': {
    objetivos: [
      'Evaluar el cumplimiento de políticas y procedimientos administrativos',
      'Verificar la eficacia de los controles internos en la gestión de recursos'
    ],
    alcance: 'Evaluación integral de procesos administrativos de la territorial Antioquia',
    periodo: 'Enero 2025 - Febrero 2025',
    metodologia: 'Entrevistas, revisión documental, pruebas de cumplimiento',
    recursos: '2 auditores, 20 días hábiles',
    criterios: 'ISO 9001:2015, MECI 2014, Normas internas ESAP'
  },
  'aud-004': {
    objetivos: [
      'Evaluar el proceso de selección y vinculación de personal',
      'Verificar cumplimiento de evaluaciones de desempeño'
    ],
    alcance: 'Proceso de gestión humana de la territorial Valle del Cauca',
    periodo: 'Enero 2025 - Marzo 2025',
    metodologia: 'Muestreo estadístico, entrevistas, revisión de hojas de vida',
    recursos: '2 auditores, 30 días hábiles',
    criterios: 'Decreto 1083/2015, Manual de funciones ESAP, Código de Ética'
  }
};

// ============ UTILIDADES ============

const formatearFecha = (fecha: string) => {
  return new Date(fecha).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
};

const formatearHora = (hora: string) => {
  return hora.slice(0, 5); // HH:MM
};

const getAccionColor = (accion: string) => {
  const colores = {
    'aprobado': 'bg-green-100 text-green-700 border-green-200',
    'rechazado': 'bg-red-100 text-red-700 border-red-200',
    'modificacion_solicitada': 'bg-yellow-100 text-yellow-700 border-yellow-200'
  };
  return colores[accion as keyof typeof colores] || 'bg-gray-100 text-gray-700 border-gray-200';
};

const getAccionIcon = (accion: string) => {
  const iconos = {
    'aprobado': <CheckCircle className="w-4 h-4" />,
    'rechazado': <XCircle className="w-4 h-4" />,
    'modificacion_solicitada': <AlertTriangle className="w-4 h-4" />
  };
  return iconos[accion as keyof typeof iconos] || <Info className="w-4 h-4" />;
};

const getAccionLabel = (accion: string) => {
  const labels = {
    'aprobado': 'Aprobado',
    'rechazado': 'Rechazado',
    'modificacion_solicitada': 'Modificación Solicitada'
  };
  return labels[accion as keyof typeof labels] || accion;
};

// ============ COMPONENTE PRINCIPAL ============

export function ModalAprobacionAuditoria({
  auditoria,
  open,
  onClose,
  onAprobado,
  onRechazado,
  onModificacion
}: ModalAprobacionProps) {
  const [accionSeleccionada, setAccionSeleccionada] = useState<AccionAprobacion>(null);
  const [comentarios, setComentarios] = useState('');
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);

  if (!auditoria) return null;

  // Obtener información del plan
  const infoPlan = INFORMACION_PLAN[auditoria.id] || {};
  const historial = HISTORIAL_APROBACIONES[auditoria.id] || [];

  // Usuario actual (simulado - en producción vendría del contexto)
  const usuarioActual = {
    nombre: 'María González Díaz',
    cargo: 'Jefe OCI',
    rol: 'JEFE_OCI'
  };

  // Resetear estado al cerrar
  const handleClose = () => {
    setAccionSeleccionada(null);
    setComentarios('');
    setMostrarConfirmacion(false);
    onClose();
  };

  // Seleccionar acción
  const handleSeleccionarAccion = (accion: AccionAprobacion) => {
    setAccionSeleccionada(accion);
    setComentarios('');
  };

  // Confirmar acción
  const handleConfirmar = () => {
    // Validaciones
    if (!accionSeleccionada) {
      toast.error('Debe seleccionar una acción');
      return;
    }

    if (accionSeleccionada === 'rechazar' && comentarios.trim().length < 20) {
      toast.error('Debe proporcionar una justificación detallada (mínimo 20 caracteres)');
      return;
    }

    if (accionSeleccionada === 'modificacion' && comentarios.trim().length < 20) {
      toast.error('Debe especificar qué modificaciones se requieren (mínimo 20 caracteres)');
      return;
    }

    setMostrarConfirmacion(true);
  };

  // Ejecutar acción
  const handleEjecutarAccion = () => {
    switch (accionSeleccionada) {
      case 'aprobar':
        onAprobado(auditoria, comentarios);
        toast.success(`✅ Auditoría ${auditoria.codigo} aprobada exitosamente`);
        break;
      case 'rechazar':
        onRechazado(auditoria, comentarios);
        toast.error(`❌ Auditoría ${auditoria.codigo} rechazada`);
        break;
      case 'modificacion':
        onModificacion(auditoria, comentarios);
        toast.warning(`⚠️ Modificación solicitada para ${auditoria.codigo}`);
        break;
    }
    handleClose();
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
            className="fixed inset-0 bg-black/50 z-50"
            onClick={handleClose}
          />

          {/* MODAL */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-4 md:inset-8 lg:inset-16 z-50 flex items-center justify-center"
          >
            <div className="bg-white rounded-lg shadow-2xl w-full h-full flex flex-col max-w-6xl">
              {/* HEADER */}
              <div className="flex items-start justify-between p-6 border-b border-gray-200">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Shield className="w-6 h-6" style={{ color: '#003DA5' }} />
                    <h2 className="text-2xl font-black" style={{ color: '#003DA5' }}>
                      Aprobación de Plan de Auditoría
                    </h2>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge variant="outline" className="text-sm font-mono">
                      {auditoria.codigo}
                    </Badge>
                    <span className="text-sm text-gray-600">{auditoria.titulo}</span>
                    <Badge className="bg-purple-100 text-purple-700 border-purple-200" variant="outline">
                      {auditoria.territorial}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  className="ml-4"
                  aria-label="Cerrar modal"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* CONTENIDO */}
              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
                  {/* COLUMNA IZQUIERDA - INFORMACIÓN DEL PLAN */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Información General */}
                    <div className="bg-white rounded-lg border-2 border-gray-200 p-5">
                      <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5" style={{ color: '#003DA5' }} />
                        Información General del Plan
                      </h3>
                      
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-bold text-gray-600 uppercase">
                              Auditor Líder
                            </label>
                            <p className="text-sm text-gray-900 mt-1">
                              {auditoria.auditorLider || 'Juan Pérez Gómez'}
                            </p>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-gray-600 uppercase">
                              Periodo
                            </label>
                            <p className="text-sm text-gray-900 mt-1">
                              {infoPlan.periodo}
                            </p>
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-gray-600 uppercase mb-2 block">
                            Objetivos de la Auditoría
                          </label>
                          <ul className="space-y-2">
                            {infoPlan.objetivos?.map((obj: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                                <span className="text-blue-600 font-bold">{idx + 1}.</span>
                                {obj}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-gray-600 uppercase">
                            Alcance
                          </label>
                          <p className="text-sm text-gray-700 mt-1">
                            {infoPlan.alcance}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-bold text-gray-600 uppercase">
                              Metodología
                            </label>
                            <p className="text-sm text-gray-700 mt-1">
                              {infoPlan.metodologia}
                            </p>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-gray-600 uppercase">
                              Recursos
                            </label>
                            <p className="text-sm text-gray-700 mt-1">
                              {infoPlan.recursos}
                            </p>
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-gray-600 uppercase">
                            Criterios de Auditoría
                          </label>
                          <p className="text-sm text-gray-700 mt-1">
                            {infoPlan.criterios}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Historial de Aprobaciones */}
                    {historial.length > 0 && (
                      <div className="bg-white rounded-lg border-2 border-gray-200 p-5">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                          <Clock className="w-5 h-5" style={{ color: '#003DA5' }} />
                          Historial de Aprobaciones
                        </h3>
                        
                        <div className="space-y-3">
                          {historial.map((item) => (
                            <div
                              key={item.id}
                              className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <Badge 
                                  className={`${getAccionColor(item.accion)} flex items-center gap-1`}
                                  variant="outline"
                                >
                                  {getAccionIcon(item.accion)}
                                  {getAccionLabel(item.accion)}
                                </Badge>
                                <span className="text-xs text-gray-500">
                                  {formatearFecha(item.fecha)} - {formatearHora(item.hora)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 mb-2">
                                {item.comentarios}
                              </p>
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {item.usuario} ({item.cargo})
                                </span>
                                <span className="flex items-center gap-1">
                                  <Shield className="w-3 h-3" />
                                  {item.ip}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* COLUMNA DERECHA - ACCIONES DE APROBACIÓN */}
                  <div className="lg:col-span-1 space-y-4">
                    {/* Selección de Acción */}
                    {!mostrarConfirmacion && (
                      <div className="bg-white rounded-lg border-2 border-gray-200 p-5">
                        <h3 className="font-bold text-gray-900 mb-4">
                          Seleccione una Acción
                        </h3>

                        <div className="space-y-3">
                          {/* Aprobar */}
                          <button
                            onClick={() => handleSeleccionarAccion('aprobar')}
                            className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                              accionSeleccionada === 'aprobar'
                                ? 'border-green-500 bg-green-50'
                                : 'border-gray-200 hover:border-green-300'
                            }`}
                          >
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white">
                                <CheckCircle className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="font-bold text-green-700">Aprobar Plan</div>
                                <div className="text-xs text-gray-600">
                                  Autorizar inicio de auditoría
                                </div>
                              </div>
                            </div>
                          </button>

                          {/* Solicitar Modificación */}
                          <button
                            onClick={() => handleSeleccionarAccion('modificacion')}
                            className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                              accionSeleccionada === 'modificacion'
                                ? 'border-yellow-500 bg-yellow-50'
                                : 'border-gray-200 hover:border-yellow-300'
                            }`}
                          >
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center text-white">
                                <Edit2 className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="font-bold text-yellow-700">Solicitar Modificación</div>
                                <div className="text-xs text-gray-600">
                                  Requiere ajustes antes de aprobar
                                </div>
                              </div>
                            </div>
                          </button>

                          {/* Rechazar */}
                          <button
                            onClick={() => handleSeleccionarAccion('rechazar')}
                            className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                              accionSeleccionada === 'rechazar'
                                ? 'border-red-500 bg-red-50'
                                : 'border-gray-200 hover:border-red-300'
                            }`}
                          >
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white">
                                <XCircle className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="font-bold text-red-700">Rechazar Plan</div>
                                <div className="text-xs text-gray-600">
                                  No cumple con los requisitos
                                </div>
                              </div>
                            </div>
                          </button>
                        </div>

                        {/* Área de Comentarios */}
                        {accionSeleccionada && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-4"
                          >
                            <label className="text-xs font-bold text-gray-600 uppercase block mb-2">
                              {accionSeleccionada === 'aprobar' && 'Comentarios (Opcional)'}
                              {accionSeleccionada === 'modificacion' && 'Modificaciones Requeridas *'}
                              {accionSeleccionada === 'rechazar' && 'Justificación del Rechazo *'}
                            </label>
                            <textarea
                              value={comentarios}
                              onChange={(e) => setComentarios(e.target.value)}
                              placeholder={
                                accionSeleccionada === 'aprobar'
                                  ? 'Agregue comentarios adicionales (opcional)...'
                                  : 'Debe especificar el motivo...'
                              }
                              rows={6}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                            />
                            {(accionSeleccionada === 'rechazar' || accionSeleccionada === 'modificacion') && (
                              <p className="text-xs text-gray-500 mt-1">
                                Mínimo 20 caracteres. {comentarios.length}/20
                              </p>
                            )}
                          </motion.div>
                        )}

                        {/* Botón Confirmar */}
                        {accionSeleccionada && (
                          <Button
                            onClick={handleConfirmar}
                            className="w-full mt-4"
                            style={{ backgroundColor: '#003DA5' }}
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Confirmar {accionSeleccionada === 'aprobar' ? 'Aprobación' : accionSeleccionada === 'rechazar' ? 'Rechazo' : 'Solicitud'}
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Confirmación Final */}
                    {mostrarConfirmacion && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-lg border-2 border-yellow-500 p-5"
                      >
                        <div className="text-center mb-4">
                          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
                          <h3 className="font-bold text-gray-900 mb-2">
                            Confirmar Acción
                          </h3>
                          <p className="text-sm text-gray-600">
                            ¿Está seguro de que desea {' '}
                            {accionSeleccionada === 'aprobar' && 'aprobar'}
                            {accionSeleccionada === 'rechazar' && 'rechazar'}
                            {accionSeleccionada === 'modificacion' && 'solicitar modificación de'}
                            {' '} esta auditoría?
                          </p>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
                          <div className="font-bold mb-1">Resumen:</div>
                          <div className="text-gray-700">
                            <div>Auditoría: {auditoria.codigo}</div>
                            <div>Acción: {getAccionLabel(accionSeleccionada || 'aprobar')}</div>
                            {comentarios && (
                              <div className="mt-2 text-xs">
                                Comentarios: "{comentarios.slice(0, 50)}..."
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => setMostrarConfirmacion(false)}
                            className="flex-1"
                          >
                            Cancelar
                          </Button>
                          <Button
                            onClick={handleEjecutarAccion}
                            className="flex-1"
                            style={{
                              backgroundColor:
                                accionSeleccionada === 'aprobar'
                                  ? '#22c55e'
                                  : accionSeleccionada === 'rechazar'
                                  ? '#ef4444'
                                  : '#eab308'
                            }}
                          >
                            Confirmar
                          </Button>
                        </div>
                      </motion.div>
                    )}

                    {/* Info del Aprobador */}
                    <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <User className="w-5 h-5 text-blue-700" />
                        <div>
                          <div className="font-bold text-blue-900 text-sm">
                            {usuarioActual.nombre}
                          </div>
                          <div className="text-xs text-blue-700">
                            {usuarioActual.cargo}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-blue-600 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date().toLocaleDateString('es-CO', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* FOOTER */}
              <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
                <div className="text-sm text-gray-600">
                  <Info className="w-4 h-4 inline mr-1" />
                  Todas las acciones quedan registradas con trazabilidad completa
                </div>
                <Button variant="outline" onClick={handleClose}>
                  Cerrar
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
