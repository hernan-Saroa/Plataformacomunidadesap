import { mailOperationsFailure, mailReview, mailUuid, type MailReview } from './rundMailOperationsContracts';

export type MailReviewState = MailReview['estado'];
export interface MailReviewQuery { limite?:number; estado?:MailReviewState|null; cursor?:string }
export interface MailReviewPage { casos:MailReview[]; siguienteCursor:string|null }
interface Position { creadaEn:string; casoId:string }
interface Cursor extends Position { version:1; estado:MailReviewState|null }
const exact=(v:any,keys:string[])=>!!v&&typeof v==='object'&&!Array.isArray(v)
  &&Object.keys(v).length===keys.length&&keys.every(k=>Object.prototype.hasOwnProperty.call(v,k));
const after=(a:Position,b:Position)=>a.creadaEn>b.creadaEn
  ||a.creadaEn===b.creadaEn&&a.casoId.toLowerCase()>b.casoId.toLowerCase();

/** Cursor del propietario: conserva los seis decimales, sin convertirlos a milisegundos. */
export function mailReviewCursor(value:unknown,state:MailReviewState|null):Cursor {
  try {
    if(typeof value!=='string'||value.length>512||!/^[-\w]+$/.test(value))throw Error();
    const binary=atob(value.replace(/-/g,'+').replace(/_/g,'/'));
    if(btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')!==value)throw Error();
    const c=JSON.parse(binary) as Cursor;
    if(!exact(c,['version','creadaEn','casoId','estado'])||c.version!==1||c.estado!==state||!mailUuid(c.casoId)
      ||typeof c.creadaEn!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{6}Z$/.test(c.creadaEn)
      ||!Number.isFinite(Date.parse(c.creadaEn))||new Date(c.creadaEn).toISOString()!==c.creadaEn.replace(/(\.\d{3})\d{3}Z$/,'$1Z'))throw Error();
    return {...c};
  } catch { throw mailOperationsFailure(); }
}

export function mailReviewQuery(raw:MailReviewQuery={}) {
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(k=>!['limite','estado','cursor'].includes(k)))throw mailOperationsFailure();
  const limite=raw.limite===undefined?25:raw.limite,estado=raw.estado??null;
  if(!Number.isInteger(limite)||limite<1||limite>100||estado!==null&&!['PENDIENTE','EN_REVISION'].includes(estado))throw mailOperationsFailure();
  const position=raw.cursor===undefined?null:mailReviewCursor(raw.cursor,estado);
  return {limite,estado,position,params:{limite:String(limite),...(estado===null?{}:{estado}),...(position?{cursor:raw.cursor}:{})}};
}

export function mailReviewPage(raw:unknown,query:ReturnType<typeof mailReviewQuery>):MailReviewPage {
  const v=raw as MailReviewPage;
  if(!exact(v,['casos','siguienteCursor'])||!Array.isArray(v.casos)||v.casos.length>query.limite)throw mailOperationsFailure();
  const cases=new Set<string>(),intentions=new Set<string>();let previous:Position|null=query.position;
  const casos=v.casos.map(row=>{
    if(!mailUuid(row?.intencionId))throw mailOperationsFailure();
    const c=mailReview(row,row.intencionId);
    if(cases.has(c.casoId.toLowerCase())||intentions.has(c.intencionId.toLowerCase())
      ||query.estado!==null&&c.estado!==query.estado||previous&&!after(c,previous))throw mailOperationsFailure();
    cases.add(c.casoId.toLowerCase());intentions.add(c.intencionId.toLowerCase());previous=c;return c;
  });
  if(v.siguienteCursor!==null){
    const next=mailReviewCursor(v.siguienteCursor,query.estado),last=casos[casos.length-1];
    if(casos.length!==query.limite||!last||next.creadaEn!==last.creadaEn||next.casoId.toLowerCase()!==last.casoId.toLowerCase())throw mailOperationsFailure();
  }
  return {casos,siguienteCursor:v.siguienteCursor};
}
