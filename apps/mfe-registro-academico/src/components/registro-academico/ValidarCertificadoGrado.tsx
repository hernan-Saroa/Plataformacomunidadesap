import { ShieldAlert } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@esap-mfe/shared-ui/dialog';
import { Button } from '@esap-mfe/shared-ui/button';

interface ValidarCertificadoGradoProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
}

export function ValidarCertificadoGrado({
  isOpen,
  onClose,
  onBack,
}: ValidarCertificadoGradoProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Validacion de certificados de grado</DialogTitle>
              <DialogDescription>
                Este validador no quedo migrado completamente al MFE y requiere integracion adicional.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          El frontend compila con este placeholder, pero la experiencia completa de verificacion de titulos
          sigue pendiente de portar desde <code>_src_legacy_backup</code>.
        </div>

        <DialogFooter className="gap-2 sm:justify-end">
          {onBack ? (
            <Button variant="outline" onClick={onBack}>
              Volver
            </Button>
          ) : null}
          <Button onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
