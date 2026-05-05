import { X, Download, Award, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';

interface CertificateGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  graduateName: string;
  graduateId: string;
  documento: string;
  programa: string;
  promedio: number;
  fechaGrado: string;
}

export function CertificateGeneratorModal({ 
  isOpen, 
  onClose, 
  graduateName, 
  graduateId, 
  documento,
  programa,
  promedio,
  fechaGrado
}: CertificateGeneratorModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  // Block body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsGenerating(true);
    
    // Simular generación del certificado
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    toast.success('Certificado generado exitosamente', {
      description: 'El documento se ha descargado en formato PDF'
    });
    
    setIsGenerating(false);
    onClose();
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed left-0 right-0 top-0 bottom-0 z-[10000] flex items-center justify-center p-2 sm:p-4 md:p-6 pointer-events-none overflow-y-auto">
            <motion.div
              className="bg-white rounded-xl sm:rounded-2xl w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden pointer-events-auto my-auto mx-auto flex flex-col"
              style={{ boxShadow: 'var(--esap-shadow-2xl)' }}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              {/* Header */}
              <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-5 md:py-6 border-b border-[--esap-gray-200] bg-gradient-to-r from-[#1e5da8]/5 to-white flex-shrink-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div 
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #1e5da8 0%, #154a85 100%)' }}
                      >
                        <Award className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={2} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-lg sm:text-xl font-bold text-[--esap-gray-900] truncate">
                          Generar Certificado
                        </h2>
                        <p className="text-xs sm:text-sm text-[--esap-gray-600] truncate">
                          {graduateName}
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg border-2 border-[--esap-gray-300] bg-white flex items-center justify-center hover:bg-[--esap-gray-50] hover:border-[--esap-gray-400] transition-all active:scale-95 flex-shrink-0"
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5 text-[--esap-gray-700]" strokeWidth={2} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 py-4 sm:py-6">
                {/* Graduate Info */}
                <div className="bg-gradient-to-br from-[#1e5da8]/5 to-transparent rounded-xl p-4 sm:p-6 border border-[--esap-gray-200] mb-6">
                  <h3 className="text-sm font-bold text-[--esap-gray-900] mb-4 uppercase tracking-wide">Información del Graduado</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <p className="text-xs text-[--esap-gray-600] mb-1">Nombre Completo</p>
                      <p className="text-sm font-semibold text-[--esap-gray-900]">{graduateName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[--esap-gray-600] mb-1">Documento</p>
                      <p className="text-sm font-semibold text-[--esap-gray-900]">{documento}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[--esap-gray-600] mb-1">Programa</p>
                      <p className="text-sm font-semibold text-[--esap-gray-900]">{programa}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[--esap-gray-600] mb-1">Fecha de Grado</p>
                      <p className="text-sm font-semibold text-[--esap-gray-900]">{fechaGrado}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[--esap-gray-600] mb-1">Promedio</p>
                      <p className="text-sm font-semibold text-[#1e5da8]">{promedio.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[--esap-gray-600] mb-1">ID Estudiante</p>
                      <p className="text-sm font-semibold text-[--esap-gray-900]">{graduateId}</p>
                    </div>
                  </div>
                </div>

                {/* Certificate Type */}
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-[--esap-gray-900] mb-4 uppercase tracking-wide">Tipo de Certificado</h3>
                  <div className="w-full p-4 sm:p-5 rounded-xl border-2 border-[#1e5da8] bg-[#1e5da8]/5">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-[#1e5da8] flex items-center justify-center flex-shrink-0">
                        <Award className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={2} />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm sm:text-base font-bold text-[--esap-gray-900] mb-1">Certificado de Grado</h4>
                        <p className="text-xs sm:text-sm text-[--esap-gray-600]">Documento oficial que certifica la obtención del título profesional</p>
                      </div>
                      <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-[#1e5da8] flex-shrink-0" strokeWidth={2} />
                    </div>
                  </div>
                </div>

                {/* Important Notice */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex gap-3">
                    <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" strokeWidth={2} />
                    <div>
                      <h4 className="text-sm font-bold text-blue-900 mb-1">Certificado Oficial</h4>
                      <p className="text-xs text-blue-700">
                        Este documento tiene validez oficial y lleva el sello digital de ESAP. 
                        Se generará en formato PDF con código de verificación único.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-4 sm:px-6 md:px-8 py-4 border-t border-[--esap-gray-200] bg-[--esap-gray-50] flex items-center justify-between gap-3 flex-shrink-0">
                <button
                  onClick={onClose}
                  className="px-4 sm:px-6 py-2 sm:py-3 border-2 border-[--esap-gray-400] bg-white text-[--esap-gray-700] rounded-xl text-xs sm:text-sm font-bold hover:bg-[--esap-gray-50] transition-all active:scale-95"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-[#1e5da8] to-[#154a85] text-white rounded-xl text-xs sm:text-sm font-bold hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <motion.div
                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" strokeWidth={2} />
                      Generar Certificado
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
