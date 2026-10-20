import { ConflictException } from '@nestjs/common';
import { isDeepStrictEqual } from 'util';
import { IdentityWriteCommand } from './rund-identity-command';
import { RundAuthWriteManager } from './rund-identity-write.adapter';

const personFields=['tip_identificacion','nom_largo','nom_tercero','pri_apellido','seg_apellido','gen_tercero',
  'fec_nacimiento','dir_email','tel_celular','id_seccional','fec_modificacion'];
interface ImageRow {id:string;revision:string;datos:Record<string,any>}
interface RoleImage {usuarioId:string;rolId:string;revision:string;datos:Record<string,any>}
export interface IdentityImage {version:1;persona:ImageRow|null;usuarios:ImageRow[];roles:RoleImage[]}
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(v);
const exact=(v:any,keys:string[])=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.prototype.hasOwnProperty.call(v,k));
const nullable=(v:unknown)=>v===null||typeof v==='string';
const revision=(v:unknown)=>typeof v==='string'&&/^\d+$/.test(v);

/** Imagen privada: columnas restaurables y xmin, sin hashes de contrasenas o credenciales. */
export async function identityImage(manager:RundAuthWriteManager,personaId:string|null):Promise<IdentityImage> {
  if(personaId===null)return {version:1,persona:null,usuarios:[],roles:[]};
  const [row]=await manager.query(`SELECT jsonb_build_object('version',1,'persona',
    (SELECT jsonb_build_object('id',p.id_person,'revision',p.xmin::text,'datos',jsonb_build_object(
      'tip_identificacion',p.tip_identificacion,'nom_largo',p.nom_largo,'nom_tercero',p.nom_tercero,
      'pri_apellido',p.pri_apellido,'seg_apellido',p.seg_apellido,'gen_tercero',p.gen_tercero,
      'fec_nacimiento',p.fec_nacimiento,'dir_email',p.dir_email,'tel_celular',p.tel_celular,
      'id_seccional',p.id_seccional::text,'fec_modificacion',p.fec_modificacion)) FROM auth.personas p WHERE p.id_person=$1),
    'usuarios',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',u.id_user,'revision',u.xmin::text,
      'datos',jsonb_build_object('username',u.username,'updated_at',to_char(u.updated_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'))) ORDER BY u.id_user)
      FROM auth."user" u WHERE u.id_person=$1),'[]'::jsonb),
    'roles',COALESCE((SELECT jsonb_agg(jsonb_build_object('usuarioId',r.id_user,'rolId',r.id_rol,'revision',r.xmin::text,
      'datos',jsonb_build_object('is_active',r.is_active,'created_at',to_char(r.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
        'updated_at',to_char(r.updated_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'))) ORDER BY r.id_user,r.id_rol)
      FROM auth.user_roles r JOIN auth."user" u ON u.id_user=r.id_user WHERE u.id_person=$1),'[]'::jsonb)) AS imagen`,[personaId]);
  if(!row?.imagen)throw new Error('Auth no pudo capturar la imagen de identidad.');
  return row.imagen;
}

/** Bloqueo solo durante la transaccion preparatoria remota; tambien excluye escritores sin advisory lock. */
export async function lockIdentityEffects(manager:RundAuthWriteManager) {
  await manager.query('LOCK TABLE auth.personas,auth."user",auth.user_roles IN EXCLUSIVE MODE');
}

export async function identityBefore(manager:RundAuthWriteManager,command:IdentityWriteCommand) {
  let people=await manager.query(`SELECT id_person FROM auth.personas
    WHERE UPPER(regexp_replace(BTRIM(num_identificacion::text),'\\.','','g'))=UPPER(regexp_replace(BTRIM($1::text),'\\.','','g')) LIMIT 2`,[command.payload.documentNumber]);
  if(!people.length&&command.options.relaxValidation)
    people=await manager.query('SELECT id_person FROM auth.personas WHERE LOWER(dir_email)=LOWER($1) LIMIT 2',[command.emailFinal]);
  if(people.length>1)throw new ConflictException('La identidad requiere resolver duplicados antes de aplicar.');
  return identityImage(manager,people[0]?.id_person||null);
}

export function validIdentityImage(value:any):value is IdentityImage {
  if(!exact(value,['version','persona','usuarios','roles'])||value.version!==1||!Array.isArray(value.usuarios)||!Array.isArray(value.roles))return false;
  const imageRow=(r:any,fields:string[])=>exact(r,['id','revision','datos'])&&uuid(r.id)&&revision(r.revision)&&exact(r.datos,fields)&&fields.every(k=>nullable(r.datos[k]));
  if(value.persona!==null&&!imageRow(value.persona,personFields))return false;
  if(!value.usuarios.every(u=>imageRow(u,['username','updated_at']))||new Set(value.usuarios.map(u=>u.id)).size!==value.usuarios.length)return false;
  if(!value.roles.every(r=>exact(r,['usuarioId','rolId','revision','datos'])&&uuid(r.usuarioId)&&uuid(r.rolId)&&revision(r.revision)
    &&value.usuarios.some(u=>u.id===r.usuarioId)&&exact(r.datos,['is_active','created_at','updated_at'])
    &&(r.datos.is_active===null||typeof r.datos.is_active==='boolean')&&nullable(r.datos.created_at)&&nullable(r.datos.updated_at)))return false;
  if(new Set(value.roles.map(r=>r.usuarioId+'/'+r.rolId)).size!==value.roles.length)return false;
  return value.persona!==null||(!value.usuarios.length&&!value.roles.length);
}

export function imageValues(image:IdentityImage) {
  return {version:image.version,persona:image.persona?{id:image.persona.id,datos:image.persona.datos}:null,
    usuarios:image.usuarios.map(({id,datos})=>({id,datos})),roles:image.roles.map(({usuarioId,rolId,datos})=>({usuarioId,rolId,datos}))};
}

/**
 * Valores comparables tras restaurar. Auth mantiene con triggers (migración 160) `fec_modificacion` de la persona y `updated_at`
 * de la cuenta: cualquier UPDATE, incluida la restauración, los reescribe con la hora actual, así que no pueden quedar
 * literalmente iguales a la imagen previa. El resto de columnas, cuentas y roles sí deben coincidir exactamente.
 */
export function restoredValues(image:IdentityImage) {
  const values=imageValues(image);
  if(values.persona){const {fec_modificacion:_stamp,...datos}=values.persona.datos;values.persona={...values.persona,datos};}
  values.usuarios=values.usuarios.map(u=>{const {updated_at:_stamp,...datos}=u.datos;return {...u,datos};});
  return values;
}

export async function restoreIdentityEffects(manager:RundAuthWriteManager,before:IdentityImage,after:IdentityImage) {
  if(!before.persona||!after.persona||before.persona.id!==after.persona.id)throw new Error('Restauracion requiere una persona existente coincidente.');
  if(!isDeepStrictEqual(before.persona.datos,after.persona.datos))
    await manager.query(`UPDATE auth.personas p SET ${personFields.map(f=>`${f}=r.${f}`).join(',')}
      FROM jsonb_populate_record(NULL::auth.personas,$2::jsonb) r WHERE p.id_person=$1`,[before.persona.id,JSON.stringify(before.persona.datos)]);
  for(const user of before.usuarios) {
    const next=after.usuarios.find(u=>u.id===user.id);
    if(!next)throw new Error('La aplicacion no puede eliminar una cuenta anterior.');
    if(!isDeepStrictEqual(user.datos,next.datos))await manager.query('UPDATE auth."user" SET username=$2,updated_at=$3::timestamptz WHERE id_user=$1',
      [user.id,user.datos.username,user.datos.updated_at]);
  }
  for(const role of after.roles) {
    const previous=before.roles.find(r=>r.usuarioId===role.usuarioId&&r.rolId===role.rolId);
    if(!previous)await manager.query('DELETE FROM auth.user_roles WHERE id_user=$1 AND id_rol=$2',[role.usuarioId,role.rolId]);
    else if(!isDeepStrictEqual(previous.datos,role.datos))await manager.query(
      'UPDATE auth.user_roles SET is_active=$3,created_at=$4::timestamptz,updated_at=$5::timestamptz WHERE id_user=$1 AND id_rol=$2',
      [role.usuarioId,role.rolId,previous.datos.is_active,previous.datos.created_at,previous.datos.updated_at]);
  }
}
