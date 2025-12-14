/**
 * MODAL: CARGA MASIVA DE USUARIOS
 * Sistema de enrolamiento masivo CSV/Excel
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface MassEnrollmentModalProps {
  onClose: () => void;
}

export function MassEnrollmentModal({ onClose }: MassEnrollmentModalProps) {
  const [step, setStep] = useState<'upload' | 'validating' | 'results'>('upload');

  const handleDownloadTemplate = (type: 'csv' | 'excel') => {
    toast.success('Plantilla Descargada', { 
      description: `Plantilla ${type.toUpperCase()} lista para usar` 
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(2px)'
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl w-full overflow-hidden"
          style={{
            maxWidth: '800px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div 
            className="px-8 pt-8 pb-6 border-b"
            style={{
              background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)'
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div 
                  className="w-14 h-14 rounded-xl flex items-center justify-center"
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)'
                  }}
                >
                  <Upload className="w-7 h-7 text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="font-bold text-white text-2xl">
                    Carga Masiva de Usuarios
                  </h2>
                  <p className="font-normal mt-1 text-sm" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                    Sube archivo CSV o Excel con múltiples usuarios
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg transition-all"
                style={{ background: 'rgba(255, 255, 255, 0.1)' }}
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="px-8 py-6">
            <div className="space-y-6">
              {/* Paso 1: Descargar Plantilla */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2 text-lg" style={{ color: '#1F2937' }}>
                  <FileSpreadsheet className="w-5 h-5" style={{ color: '#003DA5' }} />
                  Paso 1: Descargar Plantilla
                </h3>
                <p className="text-sm mb-4" style={{ color: '#6B7280' }}>
                  Descarga la plantilla oficial para asegurar formato correcto de datos
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleDownloadTemplate('csv')}
                    className="flex-1 py-3 px-4 border-2 border-[#D1D5DB] rounded-lg hover:bg-[#F9FAFB] transition-all"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Download className="w-5 h-5" style={{ color: '#003DA5' }} />
                      <span className="font-medium text-sm">Plantilla CSV</span>
                    </div>
                  </button>
                  <button
                    onClick={() => handleDownloadTemplate('excel')}
                    className="flex-1 py-3 px-4 border-2 border-[#D1D5DB] rounded-lg hover:bg-[#F9FAFB] transition-all"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Download className="w-5 h-5" style={{ color: '#10B981' }} />
                      <span className="font-medium text-sm">Plantilla Excel</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Paso 2: Cargar Archivo */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2 text-lg" style={{ color: '#1F2937' }}>
                  <Upload className="w-5 h-5" style={{ color: '#003DA5' }} />
                  Paso 2: Cargar Archivo
                </h3>
                <p className="text-sm mb-4" style={{ color: '#6B7280' }}>
                  Formatos aceptados: .csv, .xlsx, .xls • Máximo: 5 MB • Hasta 1,000 registros
                </p>
                <div 
                  className="border-2 border-dashed rounded-xl p-12 text-center cursor-pointer hover:border-[#003DA5] hover:bg-[#F0F6FF] transition-all"
                  style={{ borderColor: '#D1D5DB' }}
                  onClick={() => toast.info('Carga Masiva', { description: 'Selector de archivos próximamente' })}
                >
                  <Upload className="w-12 h-12 mx-auto mb-4" style={{ color: '#9CA3AF' }} />
                  <p className="font-semibold mb-2" style={{ color: '#1F2937' }}>
                    Arrastra aquí tu archivo
                  </p>
                  <p className="text-sm mb-4" style={{ color: '#6B7280' }}>
                    o haz clic para seleccionar
                  </p>
                  <button className="px-6 py-2 bg-[#003DA5] text-white rounded-lg text-sm font-medium">
                    Seleccionar archivo
                  </button>
                </div>
              </div>

              {/* Advertencias */}
              <div className="bg-[#FEF3C7] border-l-4 border-[#F59E0B] p-4 rounded-r-lg">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#F59E0B' }} />
                  <div>
                    <p className="font-semibold text-sm mb-1" style={{ color: '#92400E' }}>
                      Importante
                    </p>
                    <ul className="text-xs space-y-1" style={{ color: '#92400E' }}>
                      <li>• Verifica que todos los correos sean @esap.edu.co</li>
                      <li>• Los documentos no deben estar previamente registrados</li>
                      <li>• Se enviará código de verificación a cada usuario</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div 
            className="px-8 py-6 border-t flex items-center justify-end gap-3"
            style={{ background: '#F9FAFB' }}
          >
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-lg font-medium text-sm"
              style={{
                background: 'transparent',
                color: '#003DA5',
                border: '1px solid #003DA5'
              }}
            >
              Cancelar
            </button>
            <button
              onClick={() => toast.info('Carga Masiva', { description: 'Funcionalidad completa próximamente' })}
              className="px-6 py-3 rounded-lg font-medium text-sm"
              style={{
                background: '#003DA5',
                color: '#FFFFFF'
              }}
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                <span>Procesar Archivo</span>
              </div>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
