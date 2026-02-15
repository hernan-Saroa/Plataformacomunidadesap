/**
 * ═════════════════════════════════════════════════════════════════════════
 * MODAL: APROBAR DOCUMENTOS DE ACTUACIÓN - CONTROL INTERNO DISCIPLINARIO
 * ═════════════════════════════════════════════════════════════════════════
 * 
 * Modal mejorado que muestra los documentos pendientes de aprobación
 * con previsualización y selección múltiple
 * 
 * CARACTERÍSTICAS:
 * ✅ Muestra lista de documentos pendientes con detalles
 * ✅ Permite previsualizar cada documento
 * ✅ Selección individual o múltiple
 * ✅ Información contextual de cada documento
 * ✅ Diseño corporativo ESAP
 * 
 * @version 1.0
 * @date 10 Febrero 2026
 */

import React, { useState } from 'react';
import { 
  X, CheckCircle, FileText, Eye, Calendar, User, 
  File, AlertCircle, Check, Clock, ChevronRight
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';

// ==================== TIPOS ====================

interface DocumentoPendiente {
  id: string;
  tipo: 'auto' | 'acta' | 'oficio' | 'resolucion';
  titulo: string;
  descripcion: string;
  creadoPor: string;
  fechaCreacion: string;
  contenido?: string; // Contenido HTML o texto del documento
  etapaRelacionada: string;
}

interface ModalAprobarDocumentosProps {
  isOpen: boolean;
  onClose: () => void;
  numeroProceso: string;
  documentosPendientes: DocumentoPendiente[];
  onAprobar: (documentosIds: string[]) => void;
  isMobile?: boolean;
}

// ==================== COMPONENTE PRINCIPAL ====================

export function ModalAprobarDocumentos({
  isOpen,
  onClose,
  numeroProceso,
  documentosPendientes,
  onAprobar,
  isMobile = false
}: ModalAprobarDocumentosProps) {
  
  const [documentosSeleccionados, setDocumentosSeleccionados] = useState<string[]>([]);
  const [documentoPreview, setDocumentoPreview] = useState<DocumentoPendiente | null>(null);

  // ==================== HANDLERS ====================

  const toggleDocumento = (id: string) => {
    setDocumentosSeleccionados(prev =>
      prev.includes(id)
        ? prev.filter(docId => docId !== id)
        : [...prev, id]
    );
  };

  const seleccionarTodos = () => {
    if (documentosSeleccionados.length === documentosPendientes.length) {
      setDocumentosSeleccionados([]);
    } else {
      setDocumentosSeleccionados(documentosPendientes.map(d => d.id));
    }
  };

  const handleAprobar = () => {
    if (documentosSeleccionados.length === 0) return;
    onAprobar(documentosSeleccionados);
    setDocumentosSeleccionados([]);
    setDocumentoPreview(null);
  };

  const handleClose = () => {
    setDocumentosSeleccionados([]);
    setDocumentoPreview(null);
    onClose();
  };

  // ==================== UTILIDADES ====================

  const getTipoDocumentoInfo = (tipo: DocumentoPendiente['tipo']) => {
    const info = {
      auto: { 
        label: 'Auto', 
        color: '#2962FF', 
        bg: '#E3F2FD',
        icon: <File className="w-4 h-4" />
      },
      acta: { 
        label: 'Acta', 
        color: '#7C3AED', 
        bg: '#F3E8FF',
        icon: <FileText className="w-4 h-4" />
      },
      oficio: { 
        label: 'Oficio', 
        color: '#F59E0B', 
        bg: '#FEF3C7',
        icon: <FileText className="w-4 h-4" />
      },
      resolucion: { 
        label: 'Resolución', 
        color: '#DC2626', 
        bg: '#FEE2E2',
        icon: <FileText className="w-4 h-4" />
      }
    };
    return info[tipo];
  };

  if (!isOpen) return null;

  // ==================== RENDER ====================

  return (
    <>
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-[9998]"
        onClick={handleClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={`fixed ${isMobile ? 'inset-4' : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'} ${isMobile ? 'w-auto' : 'w-[900px] max-w-[90vw]'} max-h-[90vh] bg-white rounded-2xl shadow-2xl z-[9999] flex flex-col`}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-green-100">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-black text-gray-900`}>
                  Aprobar Documentos de Actuación
                </h3>
                <p className="text-sm text-gray-600">
                  Proceso: <span className="font-semibold">{numeroProceso}</span>
                </p>
              </div>
            </div>
            <button 
              onClick={handleClose} 
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Contador y selección */}
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-600">
              {documentosPendientes.length} documento{documentosPendientes.length !== 1 ? 's' : ''} pendiente{documentosPendientes.length !== 1 ? 's' : ''} de aprobación
            </p>
            <button
              onClick={seleccionarTodos}
              className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              {documentosSeleccionados.length === documentosPendientes.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
            </button>
          </div>
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Información contextual */}
          <div className="mb-6 p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
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

          {/* Lista de documentos pendientes */}
          <div className="space-y-3">
            {documentosPendientes.map((doc, index) => {
              const tipoInfo = getTipoDocumentoInfo(doc.tipo);
              const isSelected = documentosSeleccionados.includes(doc.id);

              return (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-green-500 bg-green-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-sm bg-white'
                  }`}
                  onClick={() => toggleDocumento(doc.id)}
                >
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <div className="flex items-center pt-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleDocumento(doc.id)}
                        className="w-5 h-5 text-green-600 rounded border-gray-300 focus:ring-green-500 cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>

                    {/* Contenido del documento */}
                    <div className="flex-1">
                      {/* Header con tipo y título */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge 
                              className="text-xs font-semibold"
                              style={{ 
                                backgroundColor: tipoInfo.bg, 
                                color: tipoInfo.color,
                                border: `1px solid ${tipoInfo.color}`
                              }}
                            >
                              {tipoInfo.icon}
                              <span className="ml-1">{tipoInfo.label}</span>
                            </Badge>
                            <span className="text-xs text-gray-500">#{index + 1}</span>
                          </div>
                          <h4 className="text-base font-bold text-gray-900 mb-1">
                            {doc.titulo}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {doc.descripcion}
                          </p>
                        </div>

                        {/* Botón de previsualización */}
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
                      <div className="flex items-center gap-4 text-xs text-gray-500 mt-3">
                        <div className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          <span>{doc.creadoPor}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{doc.fechaCreacion}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <ChevronRight className="w-3.5 h-3.5" />
                          <span>{doc.etapaRelacionada}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Advertencia */}
          <div className="mt-6 p-4 bg-amber-50 rounded-xl border-2 border-amber-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-900 mb-1">
                  Importante
                </p>
                <p className="text-sm text-gray-700">
                  Una vez aprobados, estos documentos quedarán registrados oficialmente 
                  en el expediente y se habilitarán para notificación al denunciado. 
                  No podrán ser modificados posteriormente.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-600">
              {documentosSeleccionados.length} de {documentosPendientes.length} documento{documentosSeleccionados.length !== 1 ? 's' : ''} seleccionado{documentosSeleccionados.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="flex gap-3">
            <Button 
              onClick={handleClose} 
              variant="outline" 
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleAprobar} 
              disabled={documentosSeleccionados.length === 0}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4 mr-2" />
              Aprobar {documentosSeleccionados.length > 0 && `(${documentosSeleccionados.length})`}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Modal de Previsualización */}
      <AnimatePresence>
        {documentoPreview && (
          <ModalPreviewDocumento
            documento={documentoPreview}
            onClose={() => setDocumentoPreview(null)}
            isMobile={isMobile}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ==================== MODAL DE PREVISUALIZACIÓN ====================

interface ModalPreviewDocumentoProps {
  documento: DocumentoPendiente;
  onClose: () => void;
  isMobile?: boolean;
}

function ModalPreviewDocumento({ documento, onClose, isMobile }: ModalPreviewDocumentoProps) {
  const tipoInfo = {
    auto: { label: 'Auto', color: '#2962FF', bg: '#E3F2FD' },
    acta: { label: 'Acta', color: '#7C3AED', bg: '#F3E8FF' },
    oficio: { label: 'Oficio', color: '#F59E0B', bg: '#FEF3C7' },
    resolucion: { label: 'Resolución', color: '#DC2626', bg: '#FEE2E2' }
  }[documento.tipo];

  return (
    <>
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-[10000]"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`fixed ${isMobile ? 'inset-4' : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'} ${isMobile ? 'w-auto' : 'w-[800px] max-w-[90vw]'} max-h-[90vh] bg-white rounded-2xl shadow-2xl z-[10001] flex flex-col`}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
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
                  {tipoInfo.label}: {documento.titulo}
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
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Creado por</p>
              <p className="text-sm font-semibold text-gray-900">{documento.creadoPor}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Fecha</p>
              <p className="text-sm font-semibold text-gray-900">{documento.fechaCreacion}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Etapa</p>
              <p className="text-sm font-semibold text-gray-900">{documento.etapaRelacionada}</p>
            </div>
          </div>

          {/* Descripción */}
          <div className="mb-6">
            <h4 className="text-sm font-bold text-gray-900 mb-2">Descripción:</h4>
            <p className="text-sm text-gray-700">{documento.descripcion}</p>
          </div>

          {/* Contenido del documento */}
          <div className="p-6 bg-gray-50 rounded-xl border border-gray-200 min-h-[300px]">
            <h4 className="text-sm font-bold text-gray-900 mb-4">Contenido del Documento:</h4>
            {documento.contenido ? (
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
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <Button onClick={onClose} className="w-full">
            Cerrar Previsualización
          </Button>
        </div>
      </motion.div>
    </>
  );
}