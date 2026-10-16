import { createHash } from 'crypto';
import { identityWriteCommand, IdentityWriteCommand } from '../../common/auth-identity-command';
import { capturarDatosCarga } from './rund-carga-original';
import type { RundNativeWriteInput } from './rund-native-profile-write';

export interface RundNativeBusinessContext {
  version: 1;
  comandoAuth: IdentityWriteCommand;
  escritura: Omit<RundNativeWriteInput, 'identity'>;
}
const record=(v:any)=>v&&typeof v==='object'&&!Array.isArray(v);
const nonempty=(v:any)=>typeof v==='string'&&v.trim()!=='';

/** Canonicalizacion JSON del contexto servidor: fechas ISO, claves ordenadas, sin binarios o credenciales. */
function snapshot(value:any, seen=new Set<any>(), depth=0):any {
  if(depth>32)throw new Error('Contexto demasiado profundo.');
  if(value===null||typeof value==='boolean')return value;
  if(typeof value==='string'&&!value.includes('\0'))return value;
  if(typeof value==='number'&&Number.isFinite(value))return value;
  if(value instanceof Date&&Number.isFinite(value.getTime()))return value.toISOString();
  if(!value||typeof value!=='object'||seen.has(value))throw new Error('Contexto no serializable.');
  if(!Array.isArray(value)&&![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw new Error('Objeto de contexto incompatible.');
  seen.add(value);
  try {
    if(Array.isArray(value))return value.map(v=>snapshot(v,seen,depth+1));
    const result:any={};
    for(const key of Object.keys(value).sort()) {
      if(/^(?:__proto__|prototype|constructor|password|password_hash|authorization|cookie|jwt|otp|token|tokenAcceso|outerManager)$/i.test(key))
        throw new Error('Campo no admitido en contexto.');
      if(value[key]!==undefined)result[key]=snapshot(value[key],seen,depth+1);
    }
    return result;
  }finally{seen.delete(value);}
}

/** Recibe solamente datos ya normalizados y autorizados por el proceso servidor. No valida permisos/OTP. */
export function nativeBusinessContext(command:unknown, input:Omit<RundNativeWriteInput,'identity'>):RundNativeBusinessContext {
  const comandoAuth=identityWriteCommand(command),options=input?.options,audit=options?.audit;
  if(!record(input)||!record(input.payload)||!record(input.rawPayload)||!record(options)||!record(audit)
    ||Object.keys(input).some(k=>!['payload','rawPayload','options','territorial','emailFinal','phoneFinal','finalFullName'].includes(k))
    ||Object.keys(options).some(k=>!['bulkImport','preserveTerritorial','rejectExisting','relaxValidation','audit'].includes(k))
    ||['bulkImport','preserveTerritorial','rejectExisting','relaxValidation'].some(k=>options[k]!==undefined&&typeof options[k]!=='boolean')
    ||input.payload.documentNumber!==comandoAuth.payload.documentNumber||!nonempty(input.payload.periodoCarga)
    ||input.emailFinal!==comandoAuth.emailFinal||input.phoneFinal!==comandoAuth.phoneFinal||input.finalFullName!==comandoAuth.finalFullName
    ||Boolean(options.relaxValidation)!==comandoAuth.options.relaxValidation||Boolean(options.preserveTerritorial)!==comandoAuth.options.preserveTerritorial
    ||audit.actorId!==comandoAuth.actorId||!['MODAL','MASIVO','AUTOGESTION','API'].includes(audit.canalOrigen)
    ||(input.rawPayload.canal_origen!=null&&input.rawPayload.canal_origen!==audit.canalOrigen)
    ||(input.rawPayload.cargadoPor!=null&&input.rawPayload.cargadoPor!==audit.actorId))throw new Error('Contexto nativo incompatible.');
  if((input.territorial?.id||null)!==(comandoAuth.territorial?.id||null)
    ||(input.territorial&&(!nonempty(input.territorial.nombre)||Object.keys(input.territorial).some(k=>!['id','nombre','codigo'].includes(k)))))
    throw new Error('Territorial de contexto incompatible.');
  if(audit.requiredSupport&&(!record(audit.requiredSupport)||audit.requiredSupport.type!=='soporte_edicion_perfil'
    ||!nonempty(audit.requiredSupport.id)||!nonempty(audit.requiredSupport.docenteId)))throw new Error('Soporte de contexto incompatible.');
  const raw=input.rawPayload;
  const result=snapshot({version:1,comandoAuth,escritura:{payload:input.payload,
    rawPayload:{...capturarDatosCarga(raw),canal_origen:raw.canal_origen??null,cargadoPor:raw.cargadoPor??null,
      __previewId:raw.__previewId??null,__sourceRowNumber:raw.__sourceRowNumber??null},
    options:{bulkImport:options.bulkImport===true,preserveTerritorial:options.preserveTerritorial===true,
      rejectExisting:options.rejectExisting===true,relaxValidation:options.relaxValidation===true,audit},
    territorial:input.territorial||null,emailFinal:input.emailFinal,phoneFinal:input.phoneFinal,finalFullName:input.finalFullName}});
  if(Buffer.byteLength(JSON.stringify(result),'utf8')>1024*1024)throw new Error('Contexto demasiado grande.');
  return result;
}

export function nativeBusinessFingerprint(context:RundNativeBusinessContext):string {
  return createHash('sha256').update(JSON.stringify(snapshot(context))).digest('hex');
}

export function restoreNativeBusinessContext(raw:any):RundNativeBusinessContext {
  if(!record(raw)||raw.version!==1||Object.keys(raw).length!==3)throw new Error('Contexto persistido incompatible.');
  const context=nativeBusinessContext(raw.comandoAuth,raw.escritura);
  if(nativeBusinessFingerprint(context)!==nativeBusinessFingerprint(raw))throw new Error('Contexto persistido no canonico.');
  for(const key of ['fechaInicioVinculacion','fechaFinVinculacion']) {
    const value=context.escritura.payload[key];
    if(value!=null){const date=new Date(value);if(!Number.isFinite(date.getTime()))throw new Error('Fecha nativa incompatible.');context.escritura.payload[key]=date;}
  }
  return context;
}
