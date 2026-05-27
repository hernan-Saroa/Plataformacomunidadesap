import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@esap-mfe/shared-ui/dialog';
import { Button } from '@esap-mfe/shared-ui/button';
import { Textarea } from '@esap-mfe/shared-ui/textarea';
import { Label } from '@esap-mfe/shared-ui/label';
import { AlertTriangle, Send } from 'lucide-react';
import { toast } from 'sonner';

interface ModalDevolverActuacionProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (mensaje: string) => void;
  actuacionTitulo?: string;
}

export function ModalDevolverActuacion({
  isOpen,
  onClose,
  onConfirm,
  actuacionTitulo
}: ModalDevolverActuacionProps) {
  const [mensaje, setMensaje] = useState('');

  const handleConfirm = () => {
    if (!mensaje.trim()) {
      toast.error('Debe ingresar un mensaje explicando el motivo de la devolución.');
      return;
    }
    onConfirm(mensaje.trim());
    setMensaje('');
  };

  const handleClose = () => {
    setMensaje('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md border-0 p-0 overflow-hidden shadow-2xl rounded-xl">
        <DialogHeader className="bg-gradient-to-r from-red-600 to-rose-600 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                Devolver Actuación
              </DialogTitle>
              <DialogDescription className="text-red-50 mt-1 opacity-90">
                {actuacionTitulo ? `Devolviendo: ${actuacionTitulo}` : 'Indique el motivo de la devolución'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-4">
          <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 text-sm text-orange-800">
            Al devolver esta actuación, el registro quedará marcado como <strong>DEVUELTO</strong> y el creador será notificado con su mensaje.
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold text-[--esap-gray-700]">
              Motivo de Devolución <span className="text-red-500">*</span>
            </Label>
            <Textarea
              placeholder="Escriba aquí los detalles y correcciones necesarias..."
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              className="min-h-[120px] resize-none"
            />
          </div>
        </div>

        <div className="px-6 py-4 bg-[--esap-gray-50] border-t border-[--esap-gray-200] flex justify-end gap-3">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!mensaje.trim()}
            className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Enviar Devolución
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
