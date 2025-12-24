import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { Button } from '../ui/button';
import { PTARevisionView } from './PTARevisionView';

interface PTARevisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  pta: any;
  docente?: any;
  modo?: 'visualizacion' | 'aprobacion';
  rol?: 'director' | 'programacion';
  onAprobar?: (ptaId: string, observaciones: string) => void;
  onRechazar?: (ptaId: string, motivo: string, observaciones: string) => void;
}

export function PTARevisionModal({
  isOpen,
  onClose,
  pta,
  docente,
  modo = 'visualizacion',
  rol,
  onAprobar,
  onRechazar
}: PTARevisionModalProps) {
  if (!isOpen || !pta) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-gray-900">
            {modo === 'aprobacion' ? 'Revisión y Aprobación de PTA' : 'Detalles del PTA'}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        {/* Content */}
        <div className="p-6">
          <PTARevisionView
            pta={pta}
            docente={docente}
            modo={modo}
            rol={rol}
            onAprobar={onAprobar}
            onRechazar={onRechazar}
            onCerrar={onClose}
          />
        </div>
      </motion.div>
    </div>
  );
}