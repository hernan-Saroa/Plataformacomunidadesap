import { API_MODE, CORS_CONFIG, MICROSERVICE_URLS, config, getApiGatewayBaseUrl } from '../../config/environment';

export interface RundOperatorPrincipal { version:1; actorId:string }
export interface RundOperatorConnection {
  resolve(options?:{signal?:AbortSignal}):Promise<RundOperatorPrincipal>;
  subscribe(listener:()=>void):()=>void;
}
const failure=()=>new Error('No fue posible confirmar la sesión del operador RUND.');

/** Auth /me usa el userId derivado del sub verificado. No acepta persona, email o caché como suplentes. */
export async function readRundOperator(signal?:AbortSignal):Promise<RundOperatorPrincipal> {
  if (signal?.aborted) throw failure();
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(abort, config.API_TIMEOUT);
  try {
    // El cliente general puede leer/escribir caché offline incluso con no-store.
    // Esta comprobación exige HTTP y usa solo la cookie HttpOnly del navegador.
    const url = API_MODE === 'direct'
      ? `${MICROSERVICE_URLS.auth.replace(/\/$/, '')}/me`
      : `${getApiGatewayBaseUrl().replace(/\/$/, '')}/auth/api/v1/me`;
    const response = await fetch(url, { ...CORS_CONFIG, method: 'GET', cache: 'no-store',
      redirect: 'error', headers: { Accept: 'application/json' }, signal: controller.signal });
    if (!response.ok) throw failure();
    const data: unknown = await response.json();
    if (controller.signal.aborted || !data || typeof data !== 'object' || Array.isArray(data)) throw failure();
    const id = (data as Record<string, unknown>).userId;
    if (typeof id !== 'string' || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id)) throw failure();
    return { version: 1, actorId: id.toLowerCase() };
  } catch {
    throw failure();
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}

/** Frontera en memoria por apertura/identidad del shell; no guarda principal o credenciales. */
export class RundOperatorSession {
  private active=false;
  private revision=0;
  private readonly pending=new Set<AbortController>();
  private readonly listeners=new Set<()=>void>();
  readonly connection:RundOperatorConnection={
    resolve:options=>this.resolve(options?.signal),
    subscribe:listener=>{this.listeners.add(listener);return ()=>{this.listeners.delete(listener);};},
  };
  constructor(private readonly read:(signal?:AbortSignal)=>Promise<RundOperatorPrincipal>=readRundOperator) {}
  activate(){this.active=true;this.invalidate();}
  deactivate(){this.active=false;this.invalidate();}
  invalidate(){
    this.revision++;
    for(const controller of this.pending)controller.abort();
    this.pending.clear();
    for(const listener of this.listeners){try{listener();}catch{/* Un consumidor no impide invalidar a los demás. */}}
  }
  private async resolve(signal?:AbortSignal) {
    if(!this.active||signal?.aborted)throw failure();
    const revision=this.revision,controller=new AbortController(),abort=()=>controller.abort();
    signal?.addEventListener('abort',abort,{once:true});this.pending.add(controller);
    try{
      const principal=await this.read(controller.signal);
      if(!this.active||revision!==this.revision||controller.signal.aborted)throw failure();
      return principal;
    }catch{throw failure();}
    finally{signal?.removeEventListener('abort',abort);this.pending.delete(controller);}
  }
}
