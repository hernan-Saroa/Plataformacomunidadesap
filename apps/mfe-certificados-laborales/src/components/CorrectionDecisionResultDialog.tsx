import { Check, CheckCircle2, ClipboardCheck, Mail, AlertCircle } from 'lucide-react';
import { Button } from '@esap-mfe/shared-ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@esap-mfe/shared-ui/dialog';

export type CorrectionDecisionResult = {
  decision: 'approved' | 'rejected';
  requestNumber: string;
  email: string;
  emailSent: boolean;
};

export function CorrectionDecisionResultDialog({ result, onClose }: {
  result: CorrectionDecisionResult | null;
  onClose: () => void;
}) {
  const approved = result?.decision === 'approved';
  return (
    <Dialog open={result !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        hideCloseButton
        overlayClassName="correction-decision-overlay"
        className="correction-decision-dialog correction-result-dialog"
        data-decision={result?.decision}
      >
        {result && <>
          <div className="correction-result-dialog__hero">
            <div className="correction-result-dialog__icon" aria-hidden="true">
              {approved ? <CheckCircle2 /> : <ClipboardCheck />}
              <span><Check /></span>
            </div>
            <span className="correction-result-dialog__eyebrow">Solicitud finalizada</span>
            <DialogHeader>
              <DialogTitle className="correction-result-dialog__title">
                {approved
                  ? (result.emailSent ? 'Certificado enviado con éxito' : 'Corrección aprobada')
                  : 'Rechazo registrado con éxito'}
              </DialogTitle>
              <DialogDescription className="correction-result-dialog__description">
                {approved
                  ? (result.emailSent ? 'La corrección quedó aprobada y el certificado PDF fue enviado al solicitante.' : 'La corrección quedó registrada, pero el envío del correo no fue confirmado.')
                  : (result.emailSent ? 'La decisión quedó registrada y se envió al solicitante el motivo del rechazo.' : 'El rechazo quedó registrado, pero el envío del correo no fue confirmado.')}
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="correction-result-dialog__body">
            <div className="correction-result-dialog__request">
              <span>Solicitud</span><strong>{result.requestNumber}</strong>
            </div>
            <div className="correction-result-dialog__notification" data-sent={result.emailSent}>
              {result.emailSent ? <Mail aria-hidden="true" /> : <AlertCircle aria-hidden="true" />}
              <div>
                <strong>{result.emailSent ? 'Envío confirmado' : 'Correo sin confirmar'}</strong>
                <span>{result.email || 'Correo del solicitante'}</span>
              </div>
            </div>
            <Button onClick={onClose} className="correction-result-dialog__close">
              <Check aria-hidden="true" />Entendido
            </Button>
          </div>
        </>}
      </DialogContent>
    </Dialog>
  );
}
