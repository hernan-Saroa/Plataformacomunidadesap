export interface ManualMailReceipt {
  version: 1;
  solicitudId: string;
  intencionId: string;
  estado: 'SIN_CONFIRMAR' | 'NO_APLICA' | 'PENDIENTE' | 'ENVIANDO' | 'ENVIADO' | 'INCIERTO';
  registroConfirmado: boolean;
  requiereRevision: boolean;
}

export function validateManualMail(raw: unknown, id: string): ManualMailReceipt {
  const data = raw as ManualMailReceipt;
  const keys = ['version', 'solicitudId', 'intencionId', 'estado', 'registroConfirmado', 'requiereRevision'];
  const uuid = (value: unknown) => typeof value === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value);
  if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).length !== keys.length
    || !keys.every(key => Object.prototype.hasOwnProperty.call(data, key)) || data.version !== 1
    || data.solicitudId !== id || !uuid(data.intencionId)
    || !['SIN_CONFIRMAR', 'NO_APLICA', 'PENDIENTE', 'ENVIANDO', 'ENVIADO', 'INCIERTO'].includes(data.estado)
    || data.registroConfirmado !== (data.estado !== 'SIN_CONFIRMAR') || data.requiereRevision !== (data.estado === 'INCIERTO'))
    throw new Error('No fue posible confirmar el estado del correo RUND.');
  return data;
}
