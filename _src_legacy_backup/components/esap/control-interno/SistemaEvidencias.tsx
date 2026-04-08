/**
 * SISTEMA DE GESTIÓN DE EVIDENCIAS
 * Componente crítico para carga, validación y gestión de evidencias
 * Casos de Uso: 3 (Seguimiento Trimestral)
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload, FileText, Image, Video, File, Paperclip, Eye,
  Download, Trash2, CheckCircle, XCircle, AlertTriangle,
  Calendar, User, FileCheck, Clock, Shield
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { toast } from 'sonner@2.0.3';

// ============ TIPOS ============

export type TipoEvidencia = 'documento' | 'imagen' | 'video' | 'otro';
export type EstadoValidacion = 'pendiente' | 'validada' | 'rechazada';

export interface Evidencia {
  id: string;
  accionId: string;
  nombre: string;
  descripcion: string;
  tipo: TipoEvidencia;
  formato: string; // PDF, DOCX, JPG, etc.
  tamano: number; // bytes
  archivoUrl: string; // URL del archivo
  cargadoPor: string;
  fechaCarga: string;
  validada: EstadoValidacion;
  validadaPor: string | null;
  fechaValidacion: string | null;
  observacionesValidacion: string;
  esObligatoria: boolean;
}

interface SistemaEvidenciasProps {
  accionId: string;
  accionDescripcion: string;
  evidenciasExistentes: Evidencia[];
  modoValidacion?: boolean; // true = auditor validando, false = área cargando
  onEvidenciasCargadas?: (evidencias: Evidencia[]) => void;
  onValidacionCompleta?: (evidenciaId: string, validada: boolean, observaciones: string) => void;
}

// ============ CONSTANTES ============

const FORMATOS_PERMITIDOS = {
  documento: ['.pdf', '.docx', '.doc', '.xlsx', '.xls'],
  imagen: ['.jpg', '.jpeg', '.png', '.gif'],
  video: ['.mp4', '.avi', '.mov'],
  otro: ['.zip', '.rar', '.txt']
};

const TAMANO_MAXIMO_MB = 10;
const TAMANO_MAXIMO_BYTES = TAMANO_MAXIMO_MB * 1024 * 1024;

const VALIDACIONES_FORMATO = {
  pdf: { tipo: 'documento', icono: FileText, color: '#EF4444' },
  docx: { tipo: 'documento', icono: FileText, color: '#2563EB' },
  doc: { tipo: 'documento', icono: FileText, color: '#2563EB' },
  xlsx: { tipo: 'documento', icono: FileText, color: '#10B981' },
  xls: { tipo: 'documento', icono: FileText, color: '#10B981' },
  jpg: { tipo: 'imagen', icono: Image, color: '#F59E0B' },
  jpeg: { tipo: 'imagen', icono: Image, color: '#F59E0B' },
  png: { tipo: 'imagen', icono: Image, color: '#F59E0B' },
  mp4: { tipo: 'video', icono: Video, color: '#8B5CF6' },
  avi: { tipo: 'video', icono: Video, color: '#8B5CF6' },
  default: { tipo: 'otro', icono: File, color: '#6B7280' }
};

// ============ COMPONENTE PRINCIPAL ============

export function SistemaEvidencias({
  accionId,
  accionDescripcion,
  evidenciasExistentes,
  modoValidacion = false,
  onEvidenciasCargadas,
  onValidacionCompleta
}: SistemaEvidenciasProps) {
  const [evidencias, setEvidencias] = useState<Evidencia[]>(evidenciasExistentes);
  const [cargando, setCargando] = useState(false);
  const [evidenciaSeleccionada, setEvidenciaSeleccionada] = useState<Evidencia | null>(null);
  const [mostrarModal, setMostrarModal] = useState(false);

  // ============ FUNCIONES DE CARGA ============

  const validarArchivo = (archivo: File): { valido: boolean; error?: string } => {
    // Validar tamaño
    if (archivo.size > TAMANO_MAXIMO_BYTES) {
      return {
        valido: false,
        error: `El archivo excede el tamaño máximo permitido (${TAMANO_MAXIMO_MB}MB)`
      };
    }

    // Validar formato
    const extension = '.' + archivo.name.split('.').pop()?.toLowerCase();
    const todosLosFormatos = Object.values(FORMATOS_PERMITIDOS).flat();
    
    if (!todosLosFormatos.includes(extension)) {
      return {
        valido: false,
        error: `Formato de archivo no permitido. Formatos válidos: ${todosLosFormatos.join(', ')}`
      };
    }

    return { valido: true };
  };

  const handleCargarEvidencia = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = event.target.files?.[0];
    if (!archivo) return;

    // Validar archivo
    const validacion = validarArchivo(archivo);
    if (!validacion.valido) {
      toast.error(validacion.error);
      return;
    }

    setCargando(true);

    try {
      // Simular carga de archivo (en producción sería upload a servidor/S3)
      await new Promise(resolve => setTimeout(resolve, 1500));

      const extension = archivo.name.split('.').pop()?.toLowerCase() || '';
      const infoFormato = VALIDACIONES_FORMATO[extension as keyof typeof VALIDACIONES_FORMATO] || VALIDACIONES_FORMATO.default;

      const nuevaEvidencia: Evidencia = {
        id: `evid-${Date.now()}`,
        accionId,
        nombre: archivo.name,
        descripcion: '',
        tipo: infoFormato.tipo as TipoEvidencia,
        formato: extension.toUpperCase(),
        tamano: archivo.size,
        archivoUrl: URL.createObjectURL(archivo), // En producción sería URL del servidor
        cargadoPor: 'Usuario Actual', // Obtener del contexto
        fechaCarga: new Date().toISOString(),
        validada: 'pendiente',
        validadaPor: null,
        fechaValidacion: null,
        observacionesValidacion: '',
        esObligatoria: false
      };

      const evidenciasActualizadas = [...evidencias, nuevaEvidencia];
      setEvidencias(evidenciasActualizadas);

      if (onEvidenciasCargadas) {
        onEvidenciasCargadas(evidenciasActualizadas);
      }

      toast.success('Evidencia cargada exitosamente');
    } catch (error) {
      toast.error('Error al cargar la evidencia');
      console.error(error);
    } finally {
      setCargando(false);
      event.target.value = ''; // Reset input
    }
  };

  const handleEliminarEvidencia = (evidenciaId: string) => {
    if (!confirm('¿Está seguro de eliminar esta evidencia?')) return;

    const evidenciasActualizadas = evidencias.filter(e => e.id !== evidenciaId);
    setEvidencias(evidenciasActualizadas);

    if (onEvidenciasCargadas) {
      onEvidenciasCargadas(evidenciasActualizadas);
    }

    toast.success('Evidencia eliminada');
  };

  // ============ FUNCIONES DE VALIDACIÓN (AUDITOR) ============

  const handleValidarEvidencia = (evidenciaId: string, validada: boolean, observaciones: string) => {
    const evidenciasActualizadas = evidencias.map(e => {
      if (e.id === evidenciaId) {
        return {
          ...e,
          validada: validada ? 'validada' : 'rechazada',
          validadaPor: 'Auditor Actual', // Obtener del contexto
          fechaValidacion: new Date().toISOString(),
          observacionesValidacion: observaciones
        } as Evidencia;
      }
      return e;
    });

    setEvidencias(evidenciasActualizadas);

    if (onValidacionCompleta) {
      onValidacionCompleta(evidenciaId, validada, observaciones);
    }

    setMostrarModal(false);
    setEvidenciaSeleccionada(null);

    toast.success(validada ? 'Evidencia validada' : 'Evidencia rechazada');
  };

  // ============ FUNCIONES AUXILIARES ============

  const formatearTamano = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getIconoFormato = (formato: string) => {
    const extension = formato.toLowerCase();
    const info = VALIDACIONES_FORMATO[extension as keyof typeof VALIDACIONES_FORMATO] || VALIDACIONES_FORMATO.default;
    return info.icono;
  };

  const getColorFormato = (formato: string) => {
    const extension = formato.toLowerCase();
    const info = VALIDACIONES_FORMATO[extension as keyof typeof VALIDACIONES_FORMATO] || VALIDACIONES_FORMATO.default;
    return info.color;
  };

  const getEstadisticas = () => {
    return {
      total: evidencias.length,
      pendientes: evidencias.filter(e => e.validada === 'pendiente').length,
      validadas: evidencias.filter(e => e.validada === 'validada').length,
      rechazadas: evidencias.filter(e => e.validada === 'rechazada').length
    };
  };

  const stats = getEstadisticas();

  // ============ RENDER ============

  return (
    <div className="space-y-4">
      {/* Header con estadísticas */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="font-black text-gray-800">Evidencias de Cumplimiento</h4>
            <p className="text-xs text-gray-600 mt-1">{accionDescripcion}</p>
          </div>
          {!modoValidacion && (
            <label className="cursor-pointer">
              <Button disabled={cargando} style={{ background: '#003DA5' }}>
                <Upload className="w-4 h-4 mr-2" />
                {cargando ? 'Cargando...' : 'Cargar Evidencia'}
              </Button>
              <input
                type="file"
                className="hidden"
                onChange={handleCargarEvidencia}
                disabled={cargando}
                accept=".pdf,.docx,.doc,.xlsx,.xls,.jpg,.jpeg,.png,.mp4,.avi"
              />
            </label>
          )}
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-4 gap-3">
          <div className="p-2 bg-gray-50 rounded text-center">
            <p className="text-xs text-gray-600">Total</p>
            <p className="text-lg font-black text-gray-800">{stats.total}</p>
          </div>
          <div className="p-2 bg-yellow-50 rounded text-center">
            <p className="text-xs text-gray-600">Pendientes</p>
            <p className="text-lg font-black text-yellow-600">{stats.pendientes}</p>
          </div>
          <div className="p-2 bg-green-50 rounded text-center">
            <p className="text-xs text-gray-600">Validadas</p>
            <p className="text-lg font-black text-green-600">{stats.validadas}</p>
          </div>
          <div className="p-2 bg-red-50 rounded text-center">
            <p className="text-xs text-gray-600">Rechazadas</p>
            <p className="text-lg font-black text-red-600">{stats.rechazadas}</p>
          </div>
        </div>

        {/* Información sobre formatos permitidos */}
        {!modoValidacion && (
          <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
            <p className="text-xs text-blue-800">
              <strong>Formatos permitidos:</strong> PDF, Word, Excel, JPG, PNG, MP4. 
              <strong> Tamaño máximo:</strong> {TAMANO_MAXIMO_MB}MB
            </p>
          </div>
        )}
      </Card>

      {/* Lista de evidencias */}
      <div className="space-y-2">
        {evidencias.length === 0 ? (
          <Card className="p-8 text-center">
            <Paperclip className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No hay evidencias cargadas</p>
            {!modoValidacion && (
              <p className="text-xs text-gray-500 mt-1">
                Cargue las evidencias de cumplimiento de esta acción
              </p>
            )}
          </Card>
        ) : (
          evidencias.map(evidencia => {
            const IconoFormato = getIconoFormato(evidencia.formato);
            const colorFormato = getColorFormato(evidencia.formato);

            return (
              <motion.div
                key={evidencia.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Card className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    {/* Información de la evidencia */}
                    <div className="flex items-start gap-3 flex-1">
                      <div 
                        className="w-10 h-10 rounded flex items-center justify-center"
                        style={{ background: colorFormato + '20' }}
                      >
                        <IconoFormato className="w-5 h-5" style={{ color: colorFormato }} />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-gray-800">{evidencia.nombre}</p>
                          <Badge
                            style={{
                              background: 
                                evidencia.validada === 'validada' ? '#10B981' :
                                evidencia.validada === 'rechazada' ? '#EF4444' : '#F59E0B',
                              color: 'white'
                            }}
                          >
                            {evidencia.validada === 'validada' && '✓ Validada'}
                            {evidencia.validada === 'rechazada' && '✗ Rechazada'}
                            {evidencia.validada === 'pendiente' && '⏱ Pendiente Validación'}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span>Cargado por: {evidencia.cargadoPor}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(evidencia.fechaCarga).toLocaleDateString('es-CO')}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <FileCheck className="w-3 h-3" />
                            <span>Formato: {evidencia.formato}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            <span>Tamaño: {formatearTamano(evidencia.tamano)}</span>
                          </div>
                        </div>

                        {/* Información de validación */}
                        {evidencia.validada !== 'pendiente' && (
                          <div className="mt-2 p-2 bg-gray-50 rounded">
                            <p className="text-xs">
                              <strong>Validado por:</strong> {evidencia.validadaPor} el{' '}
                              {new Date(evidencia.fechaValidacion!).toLocaleDateString('es-CO')}
                            </p>
                            {evidencia.observacionesValidacion && (
                              <p className="text-xs mt-1">
                                <strong>Observaciones:</strong> {evidencia.observacionesValidacion}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex gap-1 ml-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(evidencia.archivoUrl, '_blank')}
                      >
                        <Eye className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const a = document.createElement('a');
                          a.href = evidencia.archivoUrl;
                          a.download = evidencia.nombre;
                          a.click();
                          toast.success('Descargando evidencia...');
                        }}
                      >
                        <Download className="w-3 h-3" />
                      </Button>

                      {/* Botón de validación (solo para auditores) */}
                      {modoValidacion && evidencia.validada === 'pendiente' && (
                        <Button
                          size="sm"
                          style={{ background: '#10B981' }}
                          onClick={() => {
                            setEvidenciaSeleccionada(evidencia);
                            setMostrarModal(true);
                          }}
                        >
                          <FileCheck className="w-3 h-3 mr-1" />
                          Validar
                        </Button>
                      )}

                      {/* Botón de eliminar (solo para quien carga) */}
                      {!modoValidacion && evidencia.validada === 'pendiente' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEliminarEvidencia(evidencia.id)}
                        >
                          <Trash2 className="w-3 h-3 text-red-600" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Modal de validación */}
      <AnimatePresence>
        {mostrarModal && evidenciaSeleccionada && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setMostrarModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
            >
              <h3 className="font-black text-lg mb-4">Validar Evidencia</h3>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-1">Evidencia:</p>
                <p className="font-bold">{evidenciaSeleccionada.nombre}</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Observaciones:
                </label>
                <textarea
                  id={`obs-${evidenciaSeleccionada.id}`}
                  className="w-full p-2 border rounded"
                  rows={3}
                  placeholder="Comentarios sobre la validación..."
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    const textarea = document.getElementById(`obs-${evidenciaSeleccionada.id}`) as HTMLTextAreaElement;
                    handleValidarEvidencia(evidenciaSeleccionada.id, true, textarea.value);
                  }}
                  style={{ background: '#10B981' }}
                  className="flex-1"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Validar
                </Button>
                <Button
                  onClick={() => {
                    const textarea = document.getElementById(`obs-${evidenciaSeleccionada.id}`) as HTMLTextAreaElement;
                    if (!textarea.value.trim()) {
                      toast.error('Debe indicar el motivo del rechazo');
                      return;
                    }
                    handleValidarEvidencia(evidenciaSeleccionada.id, false, textarea.value);
                  }}
                  style={{ background: '#EF4444' }}
                  className="flex-1"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Rechazar
                </Button>
              </div>

              <Button
                onClick={() => {
                  setMostrarModal(false);
                  setEvidenciaSeleccionada(null);
                }}
                variant="outline"
                className="w-full mt-2"
              >
                Cancelar
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
