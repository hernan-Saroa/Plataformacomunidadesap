export type RundProfile = { id:string; clave:string; persona_id:string; propietario:'rund'|'pta'; periodo_carga:string|null; estado:string };
export type RundProfileCatalog = {persona_id:string;complete:true;propietario_predeterminado:'rund'|'pta';perfiles:RundProfile[]};
type Api={get<T=any>(url:string,params?:any,options?:any):Promise<T>;post<T=any>(url:string,data?:any,options?:any):Promise<T>};
const OPTIONS={retries:0,skipErrorToast:true,preserveResponse:true};

function unwrap(value:any):any {
  for(let i=0;i<3;i++) {
    if(!value || value.success===false || value.exito===false) throw new Error(value?.message || 'El propietario no confirmó la operación.');
    if(typeof value==='object' && !Array.isArray(value) && 'data' in value) value=value.data; else return value;
  }
  throw new Error('Respuesta del propietario inválida.');
}
const validId=(id:any)=>typeof id==='string' && id.length>0 && id.length<=255 && id.trim()===id && !/[\/\\\u0000-\u001f]/.test(id) && !['.','..'].includes(id);
export const profileBase=(p:RundProfile)=>`/${p.propietario}/api/v1/pta/banco-docentes/${encodeURIComponent(p.id)}`;
export function defaultProfile(catalog:RundProfileCatalog) {
  const matches=catalog.perfiles.filter(p=>p.propietario===catalog.propietario_predeterminado);
  return matches.length===1?matches[0].clave:'';
}
export function profileDocuments(documents:any[],profile:RundProfile|null) {
  if(!profile) return [];
  return documents.filter(d=>!d.pendiente_de_guardar && d.persistido!==false && d.servicio_propietario!=='local' && d.rund_perfil_id===profile.id
    && d.rund_perfil_propietario===profile.propietario);
}
function category(block:string,type:string) {
  if(block==='IDENTIDAD') return 'IDENTIDAD'; if(block==='FORMACION')return 'TITULOS';
  if(type.includes('contrato'))return 'CONTRATOS'; if(type.includes('certif')||type.includes('evaluacion'))return 'CERTIFICADOS';
  if(type.includes('resolucion')||type.includes('acto_'))return 'RESOLUCIONES';
  if(type.includes('autorizacion')||type.includes('habeas'))return 'AUTORIZACIONES'; return 'OTROS';
}
export function createRundInlineClient(api:Api) {
  return {
    async catalog(person:string):Promise<RundProfileCatalog> {
      const input=String(person||'').replace(/^(persona|carpeta):/,'');
      const value=unwrap(await api.get(`/auth/api/v1/carpeta-digital/persona/${encodeURIComponent(input)}/perfiles-rund`,undefined,OPTIONS));
      if(!/^[0-9a-f-]{36}$/i.test(value.persona_id) || value.complete!==true || !['rund','pta'].includes(value.propietario_predeterminado)
        || !Array.isArray(value.perfiles) || value.perfiles.length>400 || new Set(value.perfiles.map((p:any)=>p?.clave)).size!==value.perfiles.length
        || value.perfiles.some((p:any)=>!p || !validId(p.id) || !['rund','pta'].includes(p.propietario) || p.clave!==`${p.propietario}:${p.id}`
          || p.persona_id!==value.persona_id || typeof p.estado!=='string' || !(p.periodo_carga===null || typeof p.periodo_carga==='string'))) {
        throw new Error('No se recibió el catálogo completo de perfiles.');
      }
      return value;
    },
    async upload(profile:RundProfile,block:string,type:string,file:File,existing?:any) {
      if(!validId(profile.id) || profile.clave!==`${profile.propietario}:${profile.id}` || !['pta','rund'].includes(profile.propietario)
        || !/^[A-Z_]+$/.test(block) || !/^[a-z0-9_]+$/.test(type))throw new Error('Seleccione un perfil y requisito válidos.');
      const form=new FormData();form.append('file',file);
      let path=profileBase(profile)+'/documentos';
      if(existing) {
        if(existing.rund_perfil_id!==profile.id || existing.rund_perfil_propietario!==profile.propietario || existing.contenido_restringido
          || !validId(existing.rund_documento_id) || !existing.documento_logico_id || !Number.isInteger(existing.version_actual)
          || existing.version_actual<1 || existing.servicio_propietario!==profile.propietario) {
          throw new Error('Gestione el reemplazo de este original desde su módulo propietario.');
        }
        path+=`/${encodeURIComponent(existing.rund_documento_id)}/reemplazo`;
      } else {
        form.append('categoria',category(block,type));form.append('bloque',block);form.append('tipoSoporte',type);
      }
      const saved=unwrap(await api.post(path,form,OPTIONS));
      if(!saved || typeof saved.id!=='string' || !saved.id || saved.docenteId!==profile.id || saved.bloque!==block
        || !saved.documentoLogicoId || saved.tipoSoporte!==type || saved.estado!=='ACTIVO' || !Number.isInteger(saved.version) || saved.version<1
        || (existing && (saved.id===existing.rund_documento_id || saved.documentoLogicoId!==existing.documento_logico_id
          || saved.version!==existing.version_actual+1))) throw new Error('El propietario no confirmó el documento guardado. Actualice antes de volver a intentarlo.');
      return saved;
    },
  };
}
