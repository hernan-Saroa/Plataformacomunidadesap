import { normalizePtaStatus } from './ptaStatusVisuals';

const APPROVED_STATES = new Set(['APROBADO', 'EN_FIRME', 'FINALIZADO']);
const SUBMITTED_STATES = new Set([
  'PENDIENTE_APROBACION', 'PENDIENTE_JEFATURA', 'PENDIENTE_DECANATURA',
  'PENDIENTE_GESTION_PROFESORAL',
]);
const UNSIGNED_STATES = new Set([
  'BORRADOR', 'PROPUESTO_POR_DIRECCION', 'NOTIFICADO_DOCENTE',
  'ACEPTADO_DOCENTE', 'MODIFICADO_DOCENTE', 'OBJETADO_DOCENTE',
  'EN_CONCERTACION', 'AJUSTE_REQUERIDO', 'DEVUELTO',
  'REVISION_DOCENTE_N1', 'REVISION_DOCENTE_N2', 'REVISION_DOCENTE_N3',
]);

/** Firmas de la versión vigente; no altera los avales conservados por componente. */
export function getPtaSignatureStatus(pta: any) {
  const estado = normalizePtaStatus(pta?.estado);
  const fecha = pta?.fecha_envio_revision;
  const fechaEnvio = typeof fecha === 'string' && fecha.trim() && Number.isFinite(Date.parse(fecha))
    ? fecha : null;
  const aprobador = APPROVED_STATES.has(estado);
  // La fecha del historial puede pertenecer al envío anterior. Una reapertura
  // (incluida la edición autorizada) la invalida hasta que el docente reenvíe.
  // Los estados enviados/aprobados cubren también los PTA históricos sin fecha.
  const docente = !UNSIGNED_STATES.has(estado)
    && (aprobador || SUBMITTED_STATES.has(estado) || Boolean(fechaEnvio));
  return { docente, aprobador, fechaDocente: docente ? fechaEnvio : null };
}
