import { BadRequestException, ForbiddenException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { AuthIdentityClient } from './auth-identity.client';
import { AuthIdentityManualEntryService } from './auth-identity-manual-entry.service';
import type { ManualExecutionActor } from './auth-identity-manual-execution.service';
import { RUND_BANK_PERMISSIONS } from '../auth/rund-permission-catalog';
import { canViewRundSensitiveData, maskIdentityDocument } from '../modules/banco-docentes/banco-docentes-sensitive-data';

export const MANUAL_CAPTURE_FIELDS = [
  'orderIndex','documentNumber','documentType','fullName','primer_nombre','segundo_nombre','primer_apellido','segundo_apellido',
  'territorialNombre','vinculacionLabel','tipoVinculacion','regimenNormativo','dedicacionLabel','dedicacion','escalafon',
  'nucleoTematico','nivelFormacion','perfilAcademicoPro','perfilAcademico','pregrado','especializacion','maestria','doctorado',
  'posDoctorado','investigacion','origenVinculacion','actoAdministrativoVinculacion','correoInstitucional','correoAlternativo',
  'telefono','ultimaEvaluacion','situacionAdministrativa','fechaInicioVinculacion','fechaFinVinculacion','puntajeSalarial',
  'genero','sexoBiologico','fechaNacimiento','edadReferencia','rangoEdad','horasAsignables','dedicacionHorasSemana',
  'situacionCategoria','estado','periodoCarga','observaciones','idRund',
] as const;
const uuid=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value);

/** Lectura privada por propietario; nunca devuelve el envelope, rawPayload, auditoría o comando Auth. */
@Injectable()
export class AuthIdentityManualCaptureService {
  constructor(private readonly entries:AuthIdentityManualEntryService,private readonly identities:AuthIdentityClient) {}
  private async authorize(actor:ManualExecutionActor) {
    if(!uuid(actor?.actorId)||!Number.isFinite(actor.expiresAt)||actor.expiresAt<=Date.now()/1000)
      throw new UnauthorizedException('La sesion requiere autenticacion vigente.');
    if(actor.roles.some(role=>['GESTION_PROFESORAL','SUPER_ADMIN','ADMIN'].includes(role)))return;
    let permissions:string[];
    try{permissions=await this.identities.permisosRoles(actor.roles);}catch{throw new ForbiddenException('No se pudo confirmar la autorizacion RUND vigente.');}
    if(!permissions.includes(RUND_BANK_PERMISSIONS.MANAGE))throw new ForbiddenException('La captura requiere autorizacion RUND vigente.');
    if(actor.expiresAt<=Date.now()/1000)throw new UnauthorizedException('La sesion requiere autenticacion vigente.');
  }
  async consultar(requestId:string,actor:ManualExecutionActor) {
    if(!uuid(requestId))throw new BadRequestException('Solicitud manual invalida.');
    const current={...actor,actorId:actor?.actorId?.toLowerCase(),roles:[...(actor?.roles||[])]};
    await this.authorize(current);
    const {intencionId,context}=await this.entries.restaurarCaptura(requestId,current.actorId);
    // Revalidar después de la lectura: el permiso o la sesión pudieron vencer durante I/O.
    await this.authorize(current);
    if(!uuid(intencionId))throw new ServiceUnavailableException('La captura manual no es coherente.');
    const payload=context.escritura.payload;
    const campos:Record<string,string|number|null>={};
    for(const key of MANUAL_CAPTURE_FIELDS) {
      const value=payload[key];
      if(value===undefined||value===null)campos[key]=null;
      else if(value instanceof Date&&Number.isFinite(value.getTime()))campos[key]=value.toISOString();
      else if(typeof value==='string'&&!value.includes('\0')&&value.length<=512*1024)campos[key]=value;
      else if(typeof value==='number'&&Number.isFinite(value))campos[key]=value;
      else throw new ServiceUnavailableException('La captura manual no es coherente.');
    }
    // Mostrar los valores efectivos del contexto, sin identificar registros internos de Auth.
    campos.fullName=context.escritura.finalFullName;
    campos.correoInstitucional=context.escritura.emailFinal;
    campos.telefono=context.escritura.phoneFinal;
    campos.territorialNombre=context.escritura.territorial?.nombre||campos.territorialNombre;
    const accesoCompleto=canViewRundSensitiveData({roles:current.roles});
    if(!accesoCompleto){campos.documentNumber=maskIdentityDocument(campos.documentNumber);campos.puntajeSalarial=null;}
    return {version:1,solicitudId:requestId.toLowerCase(),intencionId,campos,
      proteccionDatos:{accesoCompleto,camposEnmascarados:accesoCompleto?[]:['documentNumber','puntajeSalarial']}};
  }
}
