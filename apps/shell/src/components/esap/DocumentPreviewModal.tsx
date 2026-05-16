/**
 * COMPONENTE: Modal de Vista Previa de Documentos
 * 
 * Muestra preview de documentos con opciones de validación/rechazo
 * - Vista previa de PDFs e imágenes
 * - Validar/Rechazar documentos
 * - Agregar comentarios
 * - Descargar documento
 * 
 * @version 1.0.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Download, Eye, FileText, CheckCircle2, Clock, 
  User, Calendar, File, AlertCircle, ExternalLink,
  ChevronLeft, ChevronRight, Trash2, CheckCircle, 
  XCircle, Loader2, MessageSquare, Tag
} from 'lucide-react';
import { ModalPortal } from '../ui/ModalPortal';
import { toast } from 'sonner';

// Badge Component
const Badge = ({ children, className }: { children: React.ReactNode; className: string }) => (
  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${className}`}>
    {children}
  </span>
);

// ============================================================================
// TYPES
// ============================================================================

type DocumentStatus = 'validado' | 'pendiente' | 'rechazado' | 'vencido';
type DocumentCategory = 'personal' | 'academico' | 'certificados' | 'laboral' | 'otros';

interface Documento {
  id: string;
  nombre: string;
  categoria: DocumentCategory;
  tipo_archivo: string;
  tamano_bytes: number;
  estado: DocumentStatus;
  url_archivo?: string;
  fecha_subida: string;
  fecha_validacion?: string;
  validado_por?: string;
  comentarios?: string;
}

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  documento: Documento | null;
  onValidate?: (documentoId: string, comentarios?: string) => Promise<void>;
  onReject?: (documentoId: string, motivo: string) => Promise<void>;
  onDownload?: (documentoId: string) => void;
  canValidate?: boolean;
}

// ============================================================================
// UTILS
// ============================================================================

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getCategoryLabel = (category: DocumentCategory): string => {
  const labels: Record<DocumentCategory, string> = {
    personal: 'Personal',
    academico: 'Académico',
    certificados: 'Certificados',
    laboral: 'Laboral',
    otros: 'Otros'
  };
  return labels[category] || category;
};

const getStatusBadgeProps = (status: DocumentStatus) => {
  const props = {
    validado: { 
      className: 'bg-green-100 text-green-700 border-green-300',
      label: 'Validado'
    },
    pendiente: { 
      className: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      label: 'Pendiente'
    },
    rechazado: { 
      className: 'bg-red-100 text-red-700 border-red-300',
      label: 'Rechazado'
    },
    vencido: { 
      className: 'bg-orange-100 text-orange-700 border-orange-300',
      label: 'Vencido'
    }
  };
  return props[status] || props.pendiente;
};

// ============================================================================
// COMPONENT
// ============================================================================

export function DocumentPreviewModal({
  isOpen,
  onClose,
  documento,
  onValidate,
  onReject,
  onDownload,
  canValidate = false
}: DocumentPreviewModalProps) {
  const [showValidateForm, setShowValidateForm] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [comentarios, setComentarios] = useState('');
  const [motivo, setMotivo] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen || !documento) return null;

  // ========== HANDLERS ==========
  const handleValidate = async () => {
    if (!onValidate) return;

    console.log('📋 MODAL - handleValidate llamado');
    console.log('📋 MODAL - documento.id:', documento.id);
    console.log('📋 MODAL - comentarios:', comentarios);

    setIsProcessing(true);
    try {
      await onValidate(documento.id, comentarios);
      toast.success('Documento validado exitosamente');
      setShowValidateForm(false);
      setComentarios('');
      onClose();
    } catch (error: any) {
      console.error('📋 MODAL - Error al validar:', error);
      toast.error('Error al validar documento', {
        description: error.message
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!onReject || !motivo.trim()) {
      toast.error('Debes especificar un motivo de rechazo');
      return;
    }

    setIsProcessing(true);
    try {
      await onReject(documento.id, motivo);
      toast.success('Documento rechazado');
      setShowRejectForm(false);
      setMotivo('');
      onClose();
    } catch (error: any) {
      toast.error('Error al rechazar documento', {
        description: error.message
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload(documento.id);
    } else {
      toast.info('Descarga en desarrollo');
    }
  };

  const statusBadge = getStatusBadgeProps(documento.estado);
  const isPDF = documento.tipo_archivo.toLowerCase().includes('pdf');
  const isImage = documento.tipo_archivo.toLowerCase().includes('image') || 
                  documento.tipo_archivo.toLowerCase().includes('jpg') ||
                  documento.tipo_archivo.toLowerCase().includes('png') ||
                  documento.tipo_archivo.toLowerCase().includes('jpeg');
  const isOfficeDoc = documento.tipo_archivo.toLowerCase().includes('word') ||
                      documento.tipo_archivo.toLowerCase().includes('excel') ||
                      documento.tipo_archivo.toLowerCase().includes('spreadsheet') ||
                      documento.tipo_archivo.toLowerCase().includes('document');

  // ========== RENDER ==========
  return (
    <ModalPortal isOpen={isOpen}>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white sm:rounded-2xl shadow-2xl w-full max-w-6xl h-full max-h-[100dvh] sm:h-auto sm:max-h-[95vh] flex flex-col pointer-events-auto"
            >
              {/* Header */}
              <div className="flex items-start justify-between px-6 py-5 border-b-2 border-gray-200">
                <div className="flex-1 mr-4">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl font-bold text-gray-900">{documento.nombre}</h2>
                    <Badge className={statusBadge.className}>
                      {statusBadge.label}
                    </Badge>
                  </div>
                  
                  {/* Metadata */}
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Tag className="w-4 h-4" />
                      <span>{getCategoryLabel(documento.categoria)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      <span>{formatSize(documento.tamano_bytes)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>Subido: {formatDate(documento.fecha_subida)}</span>
                    </div>
                    {documento.validado_por && (
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        <span>Validado por: {documento.validado_por}</span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                {/* Preview Area */}
                <div className="bg-white rounded-xl border-2 border-gray-200 p-6 mb-6">
                  {isPDF && documento.url_archivo ? (
                    <iframe
                      src={documento.url_archivo}
                      className="w-full h-[500px] rounded-lg"
                      title={documento.nombre}
                    />
                  ) : isImage && documento.url_archivo ? (
                    <div className="flex items-center justify-center">
                      <img
                        src={documento.url_archivo}
                        alt={documento.nombre}
                        className="max-w-full max-h-[500px] rounded-lg shadow-lg"
                      />
                    </div>
                  ) : isOfficeDoc && documento.url_archivo ? (
                    <div className="flex flex-col items-center justify-center h-[500px] text-center">
                      <FileText className="w-16 h-16 text-gray-400 mb-4" />
                      <p className="text-lg font-semibold text-gray-900 mb-2">
                        Vista previa no disponible
                      </p>
                      <p className="text-sm text-gray-600 mb-4">
                        Este tipo de archivo no puede ser visualizado en el navegador
                      </p>
                      <button
                        onClick={handleDownload}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Descargar para ver
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[500px] text-center">
                      <FileText className="w-16 h-16 text-gray-400 mb-4" />
                      <p className="text-lg font-semibold text-gray-900 mb-2">
                        Vista previa no disponible
                      </p>
                      <p className="text-sm text-gray-600 mb-4">
                        Este tipo de archivo no puede ser visualizado en el navegador
                      </p>
                      <button
                        onClick={handleDownload}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Descargar para ver
                      </button>
                    </div>
                  )}
                </div>

                {/* Comments */}
                {documento.comentarios && (
                  <div className="bg-blue-50 rounded-xl border-2 border-blue-200 p-4 mb-6">
                    <div className="flex items-start gap-3">
                      <MessageSquare className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-blue-900 mb-1">Comentarios</p>
                        <p className="text-sm text-blue-700">{documento.comentarios}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Validation Form */}
                {canValidate && documento.estado === 'pendiente' && !showRejectForm && (
                  <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
                    {!showValidateForm ? (
                      <div className="flex gap-3">
                        <button
                          onClick={() => setShowValidateForm(true)}
                          className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-medium flex items-center justify-center gap-2"
                        >
                          <CheckCircle className="w-5 h-5" />
                          Validar Documento
                        </button>
                        <button
                          onClick={() => setShowRejectForm(true)}
                          className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-medium flex items-center justify-center gap-2"
                        >
                          <XCircle className="w-5 h-5" />
                          Rechazar Documento
                        </button>
                      </div>
                    ) : (
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Validar Documento</h3>
                        <textarea
                          value={comentarios}
                          onChange={(e) => setComentarios(e.target.value)}
                          placeholder="Comentarios opcionales..."
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none resize-none mb-4"
                          rows={3}
                        />
                        <div className="flex gap-3">
                          <button
                            onClick={() => {
                              setShowValidateForm(false);
                              setComentarios('');
                            }}
                            disabled={isProcessing}
                            className="px-6 py-2.5 border-2 border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={handleValidate}
                            disabled={isProcessing}
                            className="flex-1 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {isProcessing ? (
                              <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Procesando...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-5 h-5" />
                                Confirmar Validación
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Rejection Form */}
                {canValidate && documento.estado === 'pendiente' && showRejectForm && (
                  <div className="bg-white rounded-xl border-2 border-red-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Rechazar Documento</h3>
                    <textarea
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      placeholder="Especifica el motivo del rechazo (requerido)..."
                      className="w-full px-4 py-3 border-2 border-red-300 rounded-lg focus:border-red-500 focus:outline-none resize-none mb-4"
                      rows={3}
                      required
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setShowRejectForm(false);
                          setMotivo('');
                        }}
                        disabled={isProcessing}
                        className="px-6 py-2.5 border-2 border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleReject}
                        disabled={isProcessing || !motivo.trim()}
                        className="flex-1 px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Procesando...
                          </>
                        ) : (
                          <>
                            <XCircle className="w-5 h-5" />
                            Confirmar Rechazo
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-6 py-4 border-t-2 border-gray-200 bg-gray-50 rounded-b-2xl">
                <div className="text-sm text-gray-600">
                  {documento.fecha_validacion && (
                    <span>Validado el {formatDate(documento.fecha_validacion)}</span>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleDownload}
                    className="px-5 py-2.5 border-2 border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-all flex items-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Descargar
                  </button>
                  <button
                    onClick={onClose}
                    className="px-5 py-2.5 rounded-lg font-medium text-white transition-all hover:shadow-lg"
                    style={{ background: '#003DA5' }}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ModalPortal>
  );
}
