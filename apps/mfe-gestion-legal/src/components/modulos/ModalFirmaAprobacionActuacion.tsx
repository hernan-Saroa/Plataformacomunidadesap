import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@esap-mfe/shared-ui/dialog';
import { Button } from '@esap-mfe/shared-ui/button';
import { Input } from '@esap-mfe/shared-ui/input';
import { Label } from '@esap-mfe/shared-ui/label';
import { Shield, Upload, FileSignature, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ModalFirmaAprobacionActuacionProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { token: string; firmaFile: File }) => void;
  actuacionTitulo?: string;
}

export function ModalFirmaAprobacionActuacion({
  isOpen,
  onClose,
  onConfirm,
  actuacionTitulo
}: ModalFirmaAprobacionActuacionProps) {
  const [token, setToken] = useState('');
  const [firmaFile, setFirmaFile] = useState<File | null>(null);

  const handleConfirm = () => {
    if (!token) {
      toast.error('Debe ingresar el token de firma (OTP).');
      return;
    }
    if (!firmaFile) {
      toast.error('Debe adjuntar la firma digitalizada.');
      return;
    }
    onConfirm({ token, firmaFile });
    // Reset state after confirm
    setToken('');
    setFirmaFile(null);
  };

  const handleClose = () => {
    setToken('');
    setFirmaFile(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md border-0 p-0 overflow-hidden shadow-2xl rounded-xl">
        <DialogHeader className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                Firma de Aprobación
              </DialogTitle>
              <DialogDescription className="text-teal-50 mt-1 opacity-90">
                {actuacionTitulo ? `Aprobando: ${actuacionTitulo}` : 'Firma la actuación para continuar'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex gap-3 text-sm text-blue-800">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-600" />
            <p>
              Estás a punto de aprobar esta actuación. Ingresa el <strong>Token OTP</strong> generado en tu aplicación de autenticación y adjunta tu firma digitalizada.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-[--esap-gray-700] flex items-center gap-2">
                Token de Firma (OTP) <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="Ej. 123456"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                maxLength={6}
                className="font-mono text-center tracking-[0.5em] text-lg uppercase"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-[--esap-gray-700] flex items-center gap-2">
                Firma Digitalizada <span className="text-red-500">*</span>
              </Label>
              <div className="border-2 border-dashed border-[--esap-gray-300] rounded-xl p-4 transition-colors hover:border-[--esap-primary] bg-[--esap-gray-50]">
                <Input
                  type="file"
                  id="firmaFile"
                  accept="image/png, image/jpeg, image/jpg"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setFirmaFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
                <Label
                  htmlFor="firmaFile"
                  className="flex flex-col items-center justify-center cursor-pointer gap-2 py-2"
                >
                  <div className="p-3 bg-white rounded-full shadow-sm">
                    {firmaFile ? (
                      <FileSignature className="w-6 h-6 text-emerald-500" />
                    ) : (
                      <Upload className="w-6 h-6 text-[--esap-gray-400]" />
                    )}
                  </div>
                  <span className="text-sm font-medium text-[--esap-gray-600] text-center">
                    {firmaFile ? firmaFile.name : 'Haz clic para seleccionar imagen de firma'}
                  </span>
                  {!firmaFile && (
                    <span className="text-xs text-[--esap-gray-400]">
                      PNG, JPG (Máx. 2MB)
                    </span>
                  )}
                </Label>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-[--esap-gray-50] border-t border-[--esap-gray-200] flex justify-end gap-3">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!token || !firmaFile}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Firmar y Aprobar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
