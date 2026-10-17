export type MailState = 'PENDIENTE' | 'ENVIANDO' | 'ENVIADO' | 'INCIERTO';
export type ValidityReason = 'OPERACION_NO_ELEGIBLE' | 'IDENTIDAD_NO_VIGENTE' | 'CREDENCIALES_NO_VIGENTES';
export interface MailOmission {
  version: 1; intencionId: string; omitida: boolean; motivo: ValidityReason | null;
  omitidaPor: string | null; omitidaEn: string | null; envioBloqueado: boolean;
}
export interface MailReview {
  version: 1; casoId: string; intencionId: string; estado: 'PENDIENTE' | 'EN_REVISION'; creadaEn: string;
  registradaPor: string; asumidaPor: string | null; asumidaEn: string | null;
  estadoCorreoInicial: 'ENVIANDO' | 'INCIERTO'; estadoCorreo: Exclude<MailState,'PENDIENTE'>;
  resultadoRegistrado: boolean; requiereRevision: boolean;
}
export interface MailReviewClosure {
  version: 1; casoId: string; intencionId: string; cerrada: boolean;
  cerradaPor: string | null; cerradaEn: string | null; motivo: 'ACEPTACION_REGISTRADA' | null;
}
export type Diagnosis = 'VIGENCIA_CONFIRMADA_AL_CONSULTAR' | 'VIGENCIA_RECHAZADA' | 'VIGENCIA_NO_CONFIRMADA'
  | 'SIN_RESULTADO_OBSERVADO' | 'RESULTADO_INCIERTO' | 'INCERTIDUMBRE_PENDIENTE_CONCILIAR'
  | 'ACEPTACION_PENDIENTE_CONCILIAR' | 'ACEPTACION_REGISTRADA' | 'ENVIADO_SIN_RESULTADO_REGISTRADO';
export type MailNextStep = 'VALIDAR_AL_ENVIAR' | 'REVISAR_VIGENCIA' | 'RESTABLECER_CONSULTA_AUTH' | 'REGISTRAR_REVISION'
  | 'CONTINUAR_REVISION' | 'REVISION_OPERATIVA' | 'CONCILIAR_RESULTADO' | 'CERRAR_REVISION' | 'REVISAR_HISTORICO' | 'NINGUNO';
export interface MailDiagnostic {
  version: 1; intencionId: string; estadoCorreo: MailState; diagnostico: Diagnosis; motivoVigencia: ValidityReason | null;
  casoId: string | null; cierreRegistrado: boolean; requiereIntervencion: boolean; siguientePaso: MailNextStep; permiteReenvio: false;
}
export interface MailOperationsSnapshot {
  omision: MailOmission; diagnostico: MailDiagnostic | null; revision: MailReview | null; cierre: MailReviewClosure | null;
}
export const mailOperationsFailure = () => new Error('No fue posible confirmar la gestión del correo RUND.');
export const mailUuid = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(v);
const exact = (v: any, keys: string[]) => !!v && typeof v === 'object' && !Array.isArray(v)
  && Object.keys(v).length === keys.length && keys.every(k => Object.prototype.hasOwnProperty.call(v,k));
const timestamp = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{6}Z$/.test(v)
  && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v.replace(/(\.\d{3})\d{3}Z$/,'$1Z');
const reason = (v: unknown) => ['OPERACION_NO_ELEGIBLE','IDENTIDAD_NO_VIGENTE','CREDENCIALES_NO_VIGENTES'].includes(v as string);

export function mailOmission(raw: unknown, id: string): MailOmission {
  const v=raw as MailOmission;
  if (!exact(v,['version','intencionId','omitida','motivo','omitidaPor','omitidaEn','envioBloqueado']) || v.version!==1 || v.intencionId!==id
    || typeof v.omitida!=='boolean' || v.envioBloqueado!==v.omitida
    || (v.omitida ? !reason(v.motivo)||!mailUuid(v.omitidaPor)||!timestamp(v.omitidaEn) : [v.motivo,v.omitidaPor,v.omitidaEn].some(x=>x!==null))) throw mailOperationsFailure();
  return {...v};
}
export function mailReview(raw: unknown, intention: string, caseId?: string): MailReview {
  const v=raw as MailReview;
  if (!exact(v,['version','casoId','intencionId','estado','creadaEn','registradaPor','asumidaPor','asumidaEn','estadoCorreoInicial','estadoCorreo','resultadoRegistrado','requiereRevision'])
    || v.version!==1 || v.intencionId!==intention || !mailUuid(v.casoId) || caseId!==undefined&&v.casoId!==caseId || !timestamp(v.creadaEn) || !mailUuid(v.registradaPor)
    || !['PENDIENTE','EN_REVISION'].includes(v.estado) || !['ENVIANDO','INCIERTO'].includes(v.estadoCorreoInicial)
    || !['ENVIANDO','ENVIADO','INCIERTO'].includes(v.estadoCorreo) || typeof v.resultadoRegistrado!=='boolean' || v.requiereRevision!==(v.estadoCorreo!=='ENVIADO')
    || (v.estado==='PENDIENTE' ? v.asumidaPor!==null||v.asumidaEn!==null : !mailUuid(v.asumidaPor)||!timestamp(v.asumidaEn)||v.asumidaEn<v.creadaEn)) throw mailOperationsFailure();
  return {...v};
}
export function mailReviewClosure(raw: unknown, intention: string, caseId: string): MailReviewClosure {
  const v=raw as MailReviewClosure;
  if (!exact(v,['version','casoId','intencionId','cerrada','cerradaPor','cerradaEn','motivo']) || v.version!==1 || v.intencionId!==intention || v.casoId!==caseId
    || typeof v.cerrada!=='boolean' || (v.cerrada ? !mailUuid(v.cerradaPor)||!timestamp(v.cerradaEn)||v.motivo!=='ACEPTACION_REGISTRADA'
      : [v.cerradaPor,v.cerradaEn,v.motivo].some(x=>x!==null))) throw mailOperationsFailure();
  return {...v};
}
export function mailDiagnostic(raw: unknown, id: string): MailDiagnostic {
  const v=raw as MailDiagnostic;
  if (!exact(v,['version','intencionId','estadoCorreo','diagnostico','motivoVigencia','casoId','cierreRegistrado','requiereIntervencion','siguientePaso','permiteReenvio'])
    || v.version!==1 || v.intencionId!==id || !['PENDIENTE','ENVIANDO','ENVIADO','INCIERTO'].includes(v.estadoCorreo)
    || v.casoId!==null&&!mailUuid(v.casoId) || typeof v.cierreRegistrado!=='boolean' || v.permiteReenvio!==false
    || v.requiereIntervencion!==!['NINGUNO','VALIDAR_AL_ENVIAR'].includes(v.siguientePaso)
    || v.cierreRegistrado&&(v.casoId===null||v.diagnostico!=='ACEPTACION_REGISTRADA')
    || (v.diagnostico==='VIGENCIA_RECHAZADA' ? !reason(v.motivoVigencia) : v.motivoVigencia!==null)) throw mailOperationsFailure();
  const expected: Partial<Record<Diagnosis,{state:MailState;next:MailNextStep[]}>> = {
    VIGENCIA_CONFIRMADA_AL_CONSULTAR:{state:'PENDIENTE',next:['VALIDAR_AL_ENVIAR']},
    VIGENCIA_RECHAZADA:{state:'PENDIENTE',next:['REVISAR_VIGENCIA']}, VIGENCIA_NO_CONFIRMADA:{state:'PENDIENTE',next:['RESTABLECER_CONSULTA_AUTH']},
    SIN_RESULTADO_OBSERVADO:{state:'ENVIANDO',next:[v.casoId?'CONTINUAR_REVISION':'REGISTRAR_REVISION']},
    ACEPTACION_PENDIENTE_CONCILIAR:{state:'ENVIANDO',next:['CONCILIAR_RESULTADO']},
    INCERTIDUMBRE_PENDIENTE_CONCILIAR:{state:'ENVIANDO',next:['CONCILIAR_RESULTADO']},
    RESULTADO_INCIERTO:{state:'INCIERTO',next:v.casoId?['CONTINUAR_REVISION']:['REGISTRAR_REVISION','REVISION_OPERATIVA']},
    ACEPTACION_REGISTRADA:{state:'ENVIADO',next:[v.casoId&&!v.cierreRegistrado?'CERRAR_REVISION':'NINGUNO']},
    ENVIADO_SIN_RESULTADO_REGISTRADO:{state:'ENVIADO',next:['REVISAR_HISTORICO']},
  };
  const rule=expected[v.diagnostico];
  if (!rule||rule.state!==v.estadoCorreo||!rule.next.includes(v.siguientePaso)||v.estadoCorreo==='PENDIENTE'&&(v.casoId!==null||v.cierreRegistrado)) throw mailOperationsFailure();
  return {...v};
}
