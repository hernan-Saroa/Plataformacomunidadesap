/**
 * Modal de Detalles del PTA
 * Vista completa de un Plan de Trabajo Académico
 */

import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { Button } from '../ui/button';
import { PTAResumenVisual } from './PTAResumenVisual';

interface PTADetallesModalProps {
  isOpen: boolean;
  onClose: () => void;
  pta: any;
  docente?: any;
}

export function PTADetallesModal({ isOpen, onClose, pta, docente }: PTADetallesModalProps) {
  if (!isOpen || !pta) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-xl shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col"
        >
          {/* Header - Sticky */}
          <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-10 flex-shrink-0">
            <h2 className="text-xl font-bold text-gray-900">Detalles del PTA</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6">
            <PTAResumenVisual 
              pta={pta} 
              docente={docente}
              onCerrar={onClose}
            />
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}