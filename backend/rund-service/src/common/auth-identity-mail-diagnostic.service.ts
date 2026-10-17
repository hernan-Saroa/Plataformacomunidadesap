import { BadRequestException, ConflictException, ForbiddenException, HttpException, Injectable, NotFoundException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuthIdentityClient } from './auth-identity.client';
import { AuthIdentityMailValidationClient } from './auth-identity-mail-validation.client';
import type { MailReviewActor } from './auth-identity-mail-review.service';
import { identityWriteFingerprint } from './auth-identity-command';
import { nativeBusinessFingerprint, restoreNativeBusinessContext } from '../modules/banco-docentes/rund-native-business-context';
import { RUND_BANK_PERMISSIONS } from '../auth/rund-permission-catalog';

const uuid = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(v);
const reasons = ['OPERACION_NO_ELEGIBLE','IDENTIDAD_NO_VIGENTE','CREDENCIALES_NO_VIGENTES'] as const;
type Diagnosis = 'VIGENCIA_CONFIRMADA_AL_CONSULTAR' | 'VIGENCIA_RECHAZADA' | 'VIGENCIA_NO_CONFIRMADA'
  | 'SIN_RESULTADO_OBSERVADO' | 'RESULTADO_INCIERTO' | 'INCERTIDUMBRE_PENDIENTE_CONCILIAR'
  | 'ACEPTACION_PENDIENTE_CONCILIAR' | 'ACEPTACION_REGISTRADA' | 'ENVIADO_SIN_RESULTADO_REGISTRADO';
type NextStep = 'VALIDAR_AL_ENVIAR' | 'REVISAR_VIGENCIA' | 'RESTABLECER_CONSULTA_AUTH' | 'REGISTRAR_REVISION'
  | 'CONTINUAR_REVISION' | 'REVISION_OPERATIVA' | 'CONCILIAR_RESULTADO' | 'CERRAR_REVISION' | 'REVISAR_HISTORICO' | 'NINGUNO';
const projection = `SELECT m.intencion_id,m.estado,m.intento_id,n.contexto,n.huella_contexto,n.resultado_nativo,
  o.operacion_auth_id,o.huella_comando,rund.correo_bienvenida_elegible(m.intencion_id) AS elegible,
  e.intento_id AS intento_resultado,e.resultado,c.caso_id,c.intento_id AS intento_caso,
  x.caso_id AS cierre_caso,x.intento_id AS intento_cierre
  FROM rund.identidad_correo m JOIN rund.identidad_contexto_nativo n USING(intencion_id)
  JOIN rund.identidad_operacion o USING(intencion_id)
  LEFT JOIN rund.identidad_correo_resultado e USING(intencion_id)
  LEFT JOIN rund.identidad_correo_revision c USING(intencion_id)
  LEFT JOIN rund.identidad_correo_revision_cierre x ON x.caso_id=c.caso_id WHERE m.intencion_id=$1`;

/** Diagnóstico explícito, sin escrituras, bloqueos, envíos, retries o conciliación. */
@Injectable()
export class AuthIdentityMailDiagnosticService {
  constructor(private readonly db: DataSource, private readonly identities: AuthIdentityClient,
    private readonly validation: AuthIdentityMailValidationClient) {}

  private async authorize(a: MailReviewActor) {
    if (!uuid(a.actorId) || !Number.isFinite(a.expiresAt) || a.expiresAt <= Date.now()/1000)
      throw new UnauthorizedException('La sesion requiere autenticacion vigente.');
    if (a.roles.some(r => ['GESTION_PROFESORAL','SUPER_ADMIN','ADMIN'].includes(r))) return;
    let permissions: string[];
    try { permissions = await this.identities.permisosRoles(a.roles); }
    catch { throw new ForbiddenException('No se pudo confirmar la autorizacion RUND vigente.'); }
    if (!permissions.includes(RUND_BANK_PERMISSIONS.MANAGE)) throw new ForbiddenException('El diagnostico requiere autorizacion RUND vigente.');
    if (a.expiresAt <= Date.now()/1000) throw new UnauthorizedException('La sesion requiere autenticacion vigente.');
  }

  private async read(id: string) {
    const [r] = await this.db.query(projection,[id]);
    if (!r) throw new NotFoundException('Aviso de correo RUND no registrado.');
    if (r.intencion_id !== id || !['PENDIENTE','ENVIANDO','ENVIADO','INCIERTO'].includes(r.estado)
      || (r.estado === 'PENDIENTE' ? r.intento_id !== null : !uuid(r.intento_id))
      || (r.resultado === null ? r.intento_resultado !== null : r.intento_resultado !== r.intento_id
        || !['ACEPTADO','INCIERTO'].includes(r.resultado) || r.estado === 'PENDIENTE'
        || (r.estado !== 'ENVIANDO' && r.estado !== (r.resultado === 'ACEPTADO' ? 'ENVIADO' : 'INCIERTO')))
      || (r.caso_id === null ? r.intento_caso !== null : !uuid(r.caso_id) || r.intento_caso !== r.intento_id || r.estado === 'PENDIENTE')
      || (r.cierre_caso === null ? r.intento_cierre !== null : r.cierre_caso !== r.caso_id || r.intento_cierre !== r.intento_id
        || r.estado !== 'ENVIADO' || r.resultado !== 'ACEPTADO')) throw new Error();
    return r;
  }

  async diagnosticar(value: string, actor: MailReviewActor) {
    if (!uuid(value)) throw new BadRequestException('Identificador de correo RUND invalido.');
    const id=value.toLowerCase(), a: MailReviewActor = {actorId: typeof actor?.actorId === 'string' ? actor.actorId.toLowerCase() : '',
      roles: Array.isArray(actor?.roles) ? actor.roles.filter(r=>typeof r==='string') : [], expiresAt: actor?.expiresAt};
    await this.authorize(a);
    try {
      const row=await this.read(id);
      let diagnostic: Diagnosis, next: NextStep, reason: typeof reasons[number] | null = null;
      if (row.estado === 'PENDIENTE') {
        const context=restoreNativeBusinessContext(row.contexto), command=context.comandoAuth;
        if (row.elegible !== true || !uuid(row.operacion_auth_id) || nativeBusinessFingerprint(context) !== row.huella_contexto
          || identityWriteFingerprint(command) !== row.huella_comando || row.resultado_nativo?.email !== command.emailFinal
          || row.resultado_nativo?.authUserCreated !== true) throw new Error();
        let observed;
        try { observed=await this.validation.validar(row.operacion_auth_id,command); }
        catch { /* Ausencia de respuesta no se convierte en rechazo o aceptación. */ }
        if (observed && (observed.version !== 1 || observed.operacionId !== row.operacion_auth_id
          || observed.huellaComando !== row.huella_comando || typeof observed.apta !== 'boolean'
          || (observed.apta ? observed.motivo !== null : !reasons.includes(observed.motivo as typeof reasons[number])))) throw new Error();
        // Un consumidor puede reservar mientras se consulta Auth. Nunca entregar ese diagnóstico anterior.
        if (JSON.stringify(await this.read(id)) !== JSON.stringify(row))
          throw new ConflictException('El estado del correo cambio durante el diagnostico; consulte nuevamente.');
        if (!observed) { diagnostic='VIGENCIA_NO_CONFIRMADA'; next='RESTABLECER_CONSULTA_AUTH'; }
        else if (!observed.apta) { diagnostic='VIGENCIA_RECHAZADA'; next='REVISAR_VIGENCIA'; reason=observed.motivo; }
        else { diagnostic='VIGENCIA_CONFIRMADA_AL_CONSULTAR'; next='VALIDAR_AL_ENVIAR'; }
      } else if (row.estado === 'ENVIANDO' && row.resultado !== null) {
        diagnostic=row.resultado === 'ACEPTADO' ? 'ACEPTACION_PENDIENTE_CONCILIAR' : 'INCERTIDUMBRE_PENDIENTE_CONCILIAR';
        next='CONCILIAR_RESULTADO';
      } else if (row.estado === 'ENVIADO') {
        diagnostic=row.resultado === 'ACEPTADO' ? 'ACEPTACION_REGISTRADA' : 'ENVIADO_SIN_RESULTADO_REGISTRADO';
        next=row.resultado === null ? 'REVISAR_HISTORICO' : row.caso_id !== null && row.cierre_caso === null ? 'CERRAR_REVISION' : 'NINGUNO';
      } else {
        diagnostic=row.estado === 'INCIERTO' ? 'RESULTADO_INCIERTO' : 'SIN_RESULTADO_OBSERVADO';
        next=row.caso_id === null ? 'REGISTRAR_REVISION' : 'CONTINUAR_REVISION';
        // Un resultado INCIERTO registrado no admite abrir un caso de 018: requiere política operativa.
        if (row.resultado !== null && row.caso_id === null) next='REVISION_OPERATIVA';
      }
      await this.authorize(a);
      return { version: 1 as const, intencionId:id, estadoCorreo:row.estado, diagnostico:diagnostic,
        motivoVigencia:reason, casoId:row.caso_id, cierreRegistrado:row.cierre_caso !== null,
        requiereIntervencion:!['NINGUNO','VALIDAR_AL_ENVIAR'].includes(next), siguientePaso:next, permiteReenvio:false as const };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new ServiceUnavailableException('No fue posible confirmar el diagnostico del correo RUND.');
    }
  }
}
