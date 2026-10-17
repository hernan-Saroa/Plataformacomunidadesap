import type { Diagnosis, MailDiagnostic, MailOmission, MailReview, MailReviewClosure } from './rundMailOperationsContracts';
// Datos ficticios compartidos únicamente por pruebas de cliente y vista.
export const actor='abcdef00-1111-4111-8111-111111111111',intention='abcdef00-2222-4222-8222-222222222222';
export const caseId='abcdef00-3333-4333-8333-333333333333',other='abcdef00-4444-4444-8444-444444444444';
export const date='2026-10-16T12:00:00.123456Z';
export const omission=(omitted=false,owner=actor):MailOmission=>({version:1,intencionId:intention,omitida:omitted,
  motivo:omitted?'CREDENCIALES_NO_VIGENTES':null,omitidaPor:omitted?owner:null,omitidaEn:omitted?date:null,envioBloqueado:omitted});
export const review=(state:'ENVIANDO'|'INCIERTO'|'ENVIADO'='INCIERTO',owner:string|null=null):MailReview=>({version:1,casoId:caseId,intencionId:intention,
  estado:owner?'EN_REVISION':'PENDIENTE',creadaEn:date,registradaPor:actor,asumidaPor:owner,asumidaEn:owner?'2026-10-16T12:01:00.123456Z':null,
  estadoCorreoInicial:state==='INCIERTO'?'INCIERTO':'ENVIANDO',estadoCorreo:state,resultadoRegistrado:state!=='ENVIANDO',requiereRevision:state!=='ENVIADO'});
export const closure=(closed=false,owner=actor):MailReviewClosure=>({version:1,casoId:caseId,intencionId:intention,cerrada:closed,
  cerradaPor:closed?owner:null,cerradaEn:closed?'2026-10-16T12:02:00.123456Z':null,motivo:closed?'ACEPTACION_REGISTRADA':null});
export function diagnostic(kind:Diagnosis='RESULTADO_INCIERTO',hasCase=false,closed=false):MailDiagnostic{
  const states={VIGENCIA_CONFIRMADA_AL_CONSULTAR:'PENDIENTE',VIGENCIA_RECHAZADA:'PENDIENTE',VIGENCIA_NO_CONFIRMADA:'PENDIENTE',
    SIN_RESULTADO_OBSERVADO:'ENVIANDO',RESULTADO_INCIERTO:'INCIERTO',INCERTIDUMBRE_PENDIENTE_CONCILIAR:'ENVIANDO',
    ACEPTACION_PENDIENTE_CONCILIAR:'ENVIANDO',ACEPTACION_REGISTRADA:'ENVIADO',ENVIADO_SIN_RESULTADO_REGISTRADO:'ENVIADO'}as const;
  const steps={VIGENCIA_CONFIRMADA_AL_CONSULTAR:'VALIDAR_AL_ENVIAR',VIGENCIA_RECHAZADA:'REVISAR_VIGENCIA',VIGENCIA_NO_CONFIRMADA:'RESTABLECER_CONSULTA_AUTH',
    SIN_RESULTADO_OBSERVADO:hasCase?'CONTINUAR_REVISION':'REGISTRAR_REVISION',RESULTADO_INCIERTO:hasCase?'CONTINUAR_REVISION':'REVISION_OPERATIVA',
    INCERTIDUMBRE_PENDIENTE_CONCILIAR:'CONCILIAR_RESULTADO',ACEPTACION_PENDIENTE_CONCILIAR:'CONCILIAR_RESULTADO',
    ACEPTACION_REGISTRADA:hasCase&&!closed?'CERRAR_REVISION':'NINGUNO',ENVIADO_SIN_RESULTADO_REGISTRADO:'REVISAR_HISTORICO'}as const;
  return{version:1,intencionId:intention,estadoCorreo:states[kind],diagnostico:kind,motivoVigencia:kind==='VIGENCIA_RECHAZADA'?'CREDENCIALES_NO_VIGENTES':null,
    casoId:hasCase?caseId:null,cierreRegistrado:closed,requiereIntervencion:!['NINGUNO','VALIDAR_AL_ENVIAR'].includes(steps[kind]),siguientePaso:steps[kind],permiteReenvio:false};
}
