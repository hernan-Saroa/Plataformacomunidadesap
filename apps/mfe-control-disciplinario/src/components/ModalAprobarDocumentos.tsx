/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  MODAL APROBAR DOCUMENTOS - WORLD CLASS DESIGN ✨                        ║
 * ║  Control Interno Disciplinario - ESAP                                    ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 * 
 * Modal para aprobar documentos de actuación con previsualización y selección
 * múltiple.
 * 
 * CARACTERÍSTICAS:
 * ✅ Dialog de shadcn/ui con hideCloseButton
 * ✅ DialogTitle + DialogDescription obligatorios
 * ✅ Gradiente verde corporativo (#059669 → #047857 → #065F46)
 * ✅ Glassmorphism en header
 * ✅ Validación defensiva completa
 * ✅ Toast notifications (sonner@2.0.3)
 * ✅ Scroll vertical garantizado
 * ✅ Estados disabled/loading
 * ✅ Selección múltiple con contador
 * ✅ Previsualización de documentos
 * 
 * @version 2.0.0 (World Class)
 * @date 17 de Febrero de 2026
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@esap-mfe/shared-ui/dialog';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Button } from '@esap-mfe/shared-ui/button';
import { 
  X, CheckCircle, FileText, Eye, Calendar, User, 
  File, AlertCircle, Check, Clock, ChevronRight,
  CheckCircle2, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

interface DocumentoPendiente {
  id: string;
  tipo: 'auto' | 'acta' | 'oficio' | 'resolucion';
  titulo: string;
  descripcion: string;
  creadoPor: string;
  fechaCreacion: string;
  contenido?: string;
  etapaRelacionada: string;
}

interface ModalAprobarDocumentosProps {
  isOpen: boolean;
  onClose: () => void;
  numeroProceso: string;
  documentosPendientes: DocumentoPendiente[];
  onAprobar: (documentosIds: string[]) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export function ModalAprobarDocumentos({
  isOpen,
  onClose,
  numeroProceso,
  documentosPendientes,
  onAprobar
}: ModalAprobarDocumentosProps) {
  
  // ─────────────────────────────────────────────────────────────────────────
  // STATES
  // ─────────────────────────────────────────────────────────────────────────

  const [documentosSeleccionados, setDocumentosSeleccionados] = useState<string[]>([]);
  const [documentoPreview, setDocumentoPreview] = useState<DocumentoPendiente | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  const toggleDocumento = (id: string) => {
    setDocumentosSeleccionados(prev =>
      prev.includes(id)
        ? prev.filter(docId => docId !== id)
        : [...prev, id]
    );
  };

  const seleccionarTodos = () => {
    if (documentosSeleccionados.length === documentosPendientes?.length) {
      setDocumentosSeleccionados([]);
      toast.info('Documentos deseleccionados', {
        description: 'Se han deseleccionado todos los documentos'
      });
    } else {
      setDocumentosSeleccionados(documentosPendientes?.map(d => d.id) || []);
      toast.success('Todos los documentos seleccionados', {
        description: `${documentosPendientes?.length || 0} documentos listos para aprobar`
      });
    }
  };

  const handleAprobar = async () => {
    if (!documentosSeleccionados || documentosSeleccionados.length === 0) {
      toast.error('⚠️ No hay documentos seleccionados', {
        description: 'Debes seleccionar al menos un documento para aprobar'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Simular delay de API
      await new Promise(resolve => setTimeout(resolve, 1500));

      onAprobar(documentosSeleccionados);

      toast.success('✅ Documentos aprobados correctamente', {
        description: `${documentosSeleccionados.length} documento${documentosSeleccionados.length > 1 ? 's' : ''} aprobado${documentosSeleccionados.length > 1 ? 's' : ''} y registrado${documentosSeleccionados.length > 1 ? 's' : ''} en el expediente`,
        duration: 4000
      });

      // Resetear y cerrar
      setDocumentosSeleccionados([]);
      setDocumentoPreview(null);
      onClose();
    } catch (error) {
      toast.error('Error al aprobar documentos', {
        description: 'Por favor intenta nuevamente'
      });
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setDocumentosSeleccionados([]);
    setDocumentoPreview(null);
    onClose();
  };

  // ─────────────────────────────────────────────────────────────────────────
  // UTILS
  // ─────────────────────────────────────────────────────────────────────────

  const getTipoDocumentoInfo = (tipo: DocumentoPendiente['tipo']) => {
    const info = {
      auto: { 
        label: 'Auto', 
        color: '#2962FF', 
        bg: '#E3F2FD',
        icon: File
      },
      acta: { 
        label: 'Acta', 
        color: '#7C3AED', 
        bg: '#F3E8FF',
        icon: FileText
      },
      oficio: { 
        label: 'Oficio', 
        color: '#F59E0B', 
        bg: '#FEF3C7',
        icon: FileText
      },
      resolucion: { 
        label: 'Resolución', 
        color: '#DC2626', 
        bg: '#FEE2E2',
        icon: FileText
      }
    };
    return info[tipo];
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent hideCloseButton className="w-[95vw] max-w-[900px] h-[90vh] flex flex-col p-0">
          <DialogTitle className="sr-only">
            Aprobar Documentos de Actuación - Proceso {numeroProceso}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Revise y apruebe los documentos pendientes del proceso {numeroProceso}. Puede seleccionar múltiples documentos y previsualizarlos antes de aprobar.
          </DialogDescription>

          {/* ==================== HEADER ==================== */}
          <div className="relative overflow-hidden flex-shrink-0">
            <div 
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(135deg, #059669 0%, #047857 50%, #065F46 100%)'
              }}
            />
            
            <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white opacity-5 rounded-full translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative px-6 sm:px-8 py-5 sm:py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div 
                    className="p-3 rounded-2xl"
                    style={{
                      background: 'rgba(255, 255, 255, 0.15)',
                      boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}
                  >
                    <CheckCircle className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                  </div>
                  
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      Aprobar Documentos de Actuación
                    </h2>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-sm text-green-100 font-medium">
                        {numeroProceso || 'Proceso'}
                      </p>
                      <div className="w-1 h-1 rounded-full bg-green-300" />
                      <p className="text-sm text-green-100 font-medium">
                        {documentosPendientes?.length || 0} documentos pendientes
                      </p>
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="p-2.5 hover:bg-white/10 rounded-xl transition-all duration-200 group disabled:opacity-50"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6 text-white group-hover:rotate-90 transition-transform duration-200" />
                </button>
              </div>
            </div>
          </div>

          {/* ==================== BARRA DE SELECCIÓN ==================== */}
          <div className="flex-shrink-0 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200 px-6 sm:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Badge className="bg-white text-green-700 font-bold border border-green-300">
                  {documentosSeleccionados?.length || 0} seleccionados
                </Badge>
                <Badge className="bg-green-600 text-white font-bold">
                  {documentosPendientes?.length || 0} totales
                </Badge>
              </div>
              <button
                onClick={seleccionarTodos}
                disabled={isSubmitting || !documentosPendientes || documentosPendientes.length === 0}
                className="text-sm font-bold text-green-700 hover:text-green-800 transition-colors disabled:opacity-50"
              >
                {documentosSeleccionados?.length === documentosPendientes?.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
              </button>
            </div>
          </div>

          {/* ==================== CONTENIDO ==================== */}
          <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6">
            {/* Información contextual */}
            <div className="mb-6 p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-blue-900 mb-2">
                    Documentos listos para aprobación
                  </p>
                  <p className="text-sm text-gray-700">
                    Revise cada documento antes de aprobar. Puede previsualizar el contenido 
                    haciendo clic en el ícono <Eye className="w-4 h-4 inline" />. Seleccione 
                    los documentos que desea aprobar y confirme al final.
                  </p>
                </div>
              </div>
            </div>

            {/* Lista de documentos */}
            {!documentosPendientes || documentosPendientes.length === 0 ? (
              <div className="text-center py-16">
                <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-600 font-semibold mb-2">No hay documentos pendientes</p>
                <p className="text-sm text-gray-500">
                  Todos los documentos han sido aprobados o aún no se han generado
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {documentosPendientes.map((doc, index) => {
                  const tipoInfo = getTipoDocumentoInfo(doc?.tipo || 'auto');
                  const isSelected = documentosSeleccionados?.includes(doc?.id || '') || false;
                  const IconComponent = tipoInfo.icon;

                  return (
                    <motion.div
                      key={doc?.id || index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-green-500 bg-green-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm bg-white'
                      }`}
                      onClick={() => toggleDocumento(doc?.id || '')}
                    >
                      <div className="flex items-start gap-4">
                        {/* Checkbox */}
                        <div className="flex items-center pt-1">
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                              isSelected
                                ? 'border-green-600 bg-green-600'
                                : 'border-gray-300 bg-white'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleDocumento(doc?.id || '');
                            }}
                          >
                            {isSelected && (
                              <CheckCircle2 className="w-3 h-3 text-white" />
                            )}
                          </div>
                        </div>

                        {/* Contenido */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <Badge 
                                  className="text-xs font-semibold"
                                  style={{ 
                                    backgroundColor: tipoInfo.bg, 
                                    color: tipoInfo.color,
                                    border: `1px solid ${tipoInfo.color}`
                                  }}
                                >
                                  <IconComponent className="w-3 h-3 mr-1" />
                                  {tipoInfo.label}
                                </Badge>
                                <span className="text-xs text-gray-500">#{index + 1}</span>
                              </div>
                              <h4 className="text-base font-bold text-gray-900 mb-1">
                                {doc?.titulo || 'Sin título'}
                              </h4>
                              <p className="text-sm text-gray-600 line-clamp-2">
                                {doc?.descripcion || 'Sin descripción'}
                              </p>
                            </div>

                            {/* Botón preview */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDocumentoPreview(doc);
                              }}
                              className="p-2 hover:bg-blue-100 rounded-lg transition-colors flex-shrink-0"
                              title="Previsualizar documento"
                            >
                              <Eye className="w-5 h-5 text-blue-600" />
                            </button>
                          </div>

                          {/* Metadata */}
                          <div className="flex items-center gap-4 text-xs text-gray-500 mt-3 flex-wrap">
                            <div className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5" />
                              <span>{doc?.creadoPor || 'Sin autor'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>{doc?.fechaCreacion || 'Sin fecha'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <ChevronRight className="w-3.5 h-3.5" />
                              <span>{doc?.etapaRelacionada || 'Sin etapa'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Advertencia */}
            {documentosPendientes && documentosPendientes.length > 0 && (
              <div className="mt-6 p-4 bg-amber-50 rounded-xl border-2 border-amber-200">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-amber-900 mb-1">
                      Importante
                    </p>
                    <p className="text-sm text-gray-700">
                      Una vez aprobados, estos documentos quedarán registrados oficialmente 
                      en el expediente y se habilitarán para notificación. No podrán ser 
                      modificados posteriormente sin dejar trazabilidad.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ==================== FOOTER ==================== */}
          <div className="flex-shrink-0 border-t border-gray-200 px-6 sm:px-8 py-4 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-600">
                <span className="font-bold">{documentosSeleccionados?.length || 0}</span> de{' '}
                <span className="font-bold">{documentosPendientes?.length || 0}</span>{' '}
                documento{(documentosSeleccionados?.length || 0) !== 1 ? 's' : ''} seleccionado{(documentosSeleccionados?.length || 0) !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={handleClose}
                disabled={isSubmitting}
                variant="outline" 
                className="flex-1 font-bold"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleAprobar}
                disabled={!documentosSeleccionados || documentosSeleccionados.length === 0 || isSubmitting}
                className="flex-1 font-bold bg-gradient-to-r from-green-600 to-green-700 hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isSubmitting ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Aprobando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Aprobar {(documentosSeleccionados?.length || 0) > 0 && `(${documentosSeleccionados.length})`}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Previsualización */}
      <AnimatePresence>
        {documentoPreview && (
          <ModalPreviewDocumento
            documento={documentoPreview}
            onClose={() => setDocumentoPreview(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL DE PREVISUALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════

interface ModalPreviewDocumentoProps {
  documento: DocumentoPendiente;
  onClose: () => void;
}

function ModalPreviewDocumento({ documento, onClose }: ModalPreviewDocumentoProps) {
  const tipoInfo = {
    auto: { label: 'Auto', color: '#2962FF', bg: '#E3F2FD' },
    acta: { label: 'Acta', color: '#7C3AED', bg: '#F3E8FF' },
    oficio: { label: 'Oficio', color: '#F59E0B', bg: '#FEF3C7' },
    resolucion: { label: 'Resolución', color: '#DC2626', bg: '#FEE2E2' }
  }[documento?.tipo || 'auto'];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent hideCloseButton className="w-[95vw] max-w-[800px] h-[90vh] flex flex-col p-0">
        <DialogTitle className="sr-only">
          Previsualización de {tipoInfo.label}: {documento?.titulo}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Vista previa del documento {documento?.titulo} antes de aprobar
        </DialogDescription>

        {/* Header */}
        <div className="flex-shrink-0 p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="p-2 rounded-xl"
                style={{ backgroundColor: tipoInfo.bg }}
              >
                <Eye className="w-6 h-6" style={{ color: tipoInfo.color }} />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900">
                  Previsualización de Documento
                </h3>
                <p className="text-sm text-gray-600">
                  {tipoInfo.label}: {documento?.titulo || 'Sin título'}
                </p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Creado por</p>
              <p className="text-sm font-semibold text-gray-900">{documento?.creadoPor || 'N/A'}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Fecha</p>
              <p className="text-sm font-semibold text-gray-900">{documento?.fechaCreacion || 'N/A'}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Etapa</p>
              <p className="text-sm font-semibold text-gray-900">{documento?.etapaRelacionada || 'N/A'}</p>
            </div>
          </div>

          {/* Descripción */}
          {documento?.descripcion && (
            <div className="mb-6">
              <h4 className="text-sm font-bold text-gray-900 mb-2">Descripción:</h4>
              <p className="text-sm text-gray-700">{documento.descripcion}</p>
            </div>
          )}

          {/* Contenido del documento */}
          <div className="p-6 bg-gray-50 rounded-xl border border-gray-200 min-h-[300px]">
            <h4 className="text-sm font-bold text-gray-900 mb-4">Contenido del Documento:</h4>
            {documento?.contenido ? (
              <div 
                className="prose prose-sm max-w-none text-gray-700"
                dangerouslySetInnerHTML={{ __html: documento.contenido }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-[250px] text-center">
                <FileText className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-sm text-gray-500">
                  Previsualización no disponible
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  El contenido completo estará disponible en el expediente electrónico
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-6 border-t border-gray-200 bg-gray-50">
          <Button onClick={onClose} className="w-full font-bold" style={{ background: '#003DA5' }}>
            Cerrar Previsualización
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
