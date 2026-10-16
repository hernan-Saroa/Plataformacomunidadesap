export interface ManualCloseReceipt {
  solicitudId:string;intencionId:string;estado:'PENDIENTE'|'ABORTADA'|'CERRADA'|'REVISION_REQUERIDA'|'CONFIRMADA';
  estadoAuth:'PREPARADA'|'AUTH_REGISTRADA'|'AUTH_APLICADA'|'CANCELADA';decisionNativa:'EN_CURSO'|'ABORTADA'|null;
  estadoNativo:'PREPARADA'|'CONFIRMADA'|null;resolucionAuth:'COMPENSADA'|'REVISION_REQUERIDA'|null;
  casoRevisionId:string|null;puedeIniciarOtra:boolean;
}
export function validateManualClose(raw:unknown,id:string):ManualCloseReceipt {
  const data=raw as ManualCloseReceipt;
  const uuid=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(v);
  const fail=()=>{throw new Error('No fue posible confirmar el cierre de la solicitud RUND.');};
  const keys=['solicitudId','intencionId','estado','estadoAuth','decisionNativa','estadoNativo','resolucionAuth','casoRevisionId','puedeIniciarOtra'];
  if(!data||typeof data!=='object'||Array.isArray(data)||Object.keys(data).length!==keys.length||!keys.every(k=>Object.prototype.hasOwnProperty.call(data,k))
    ||data.solicitudId!==id||!uuid(data.intencionId)||!['PENDIENTE','ABORTADA','CERRADA','REVISION_REQUERIDA','CONFIRMADA'].includes(data.estado)
    ||!['PREPARADA','AUTH_REGISTRADA','AUTH_APLICADA','CANCELADA'].includes(data.estadoAuth)
    ||![null,'EN_CURSO','ABORTADA'].includes(data.decisionNativa)||![null,'PREPARADA','CONFIRMADA'].includes(data.estadoNativo)
    ||![null,'COMPENSADA','REVISION_REQUERIDA'].includes(data.resolucionAuth)||typeof data.puedeIniciarOtra!=='boolean')fail();
  const confirmed=data.estadoNativo==='CONFIRMADA',aborted=data.decisionNativa==='ABORTADA';
  const closed=aborted&&data.estadoNativo==='PREPARADA'&&(data.estadoAuth==='CANCELADA'||data.resolucionAuth==='COMPENSADA');
  const review=aborted&&data.estadoNativo==='PREPARADA'&&data.resolucionAuth==='REVISION_REQUERIDA';
  const expected=confirmed?'CONFIRMADA':closed?'CERRADA':review?'REVISION_REQUERIDA':aborted?'ABORTADA':'PENDIENTE';
  if(data.estado!==expected||data.puedeIniciarOtra!==closed||(review?!uuid(data.casoRevisionId):data.casoRevisionId!==null))fail();
  if(aborted&&data.estadoNativo!=='PREPARADA'||confirmed&&(data.estadoAuth!=='AUTH_APLICADA'||data.decisionNativa!=='EN_CURSO')
    ||data.resolucionAuth&&(!aborted||data.estadoAuth!=='AUTH_APLICADA'||data.estadoNativo!=='PREPARADA'))fail();
  return data;
}
