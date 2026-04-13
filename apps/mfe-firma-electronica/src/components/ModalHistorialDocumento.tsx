/**
 * ModalHistorialDocumento - Modal para ver historial detallado de un documento
 * (Componente placeholder - se puede expandir en el futuro)
 */

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@esap-mfe/shared-ui/dialog';
import { Button } from '@esap-mfe/shared-ui/button';
import { X } from 'lucide-react';

interface ModalHistorialDocumentoProps {
  isOpen: boolean;
  onClose: () => void;
  documento: any;
}

export function ModalHistorialDocumento({
  isOpen,
  onClose,
  documento
}: ModalHistorialDocumentoProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogDescription className="sr-only">
          Historial del documento {documento?.nombre}
        </DialogDescription>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <DialogTitle className="text-xl font-bold">
              Historial del Documento
            </DialogTitle>
            <Button onClick={onClose} variant="ghost" size="sm">
              <X className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-gray-600">
            Componente en desarrollo. Mostrará timeline completo del documento.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
