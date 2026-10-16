import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuthIdentityClient } from './auth-identity.client';
import type { ManualExecutionActor } from './auth-identity-manual-execution.service';
import { RUND_BANK_PERMISSIONS } from '../auth/rund-permission-catalog';

const uuid = (value: unknown): value is string => typeof value === 'string'
  && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value);

/** Solo hechos locales por solicitud/actor; no importa el consumidor de correo. */
@Injectable()
export class AuthIdentityManualMailStatusService {
  constructor(private readonly db: DataSource, private readonly identities: AuthIdentityClient) {}

  private async authorize(actor: ManualExecutionActor) {
    if (!uuid(actor.actorId) || !Number.isFinite(actor.expiresAt) || actor.expiresAt <= Date.now() / 1000)
      throw new UnauthorizedException('La sesion requiere autenticacion vigente.');
    if (actor.roles.some(role => ['GESTION_PROFESORAL', 'SUPER_ADMIN', 'ADMIN'].includes(role))) return;
    let permissions: string[];
    try { permissions = await this.identities.permisosRoles(actor.roles); }
    catch { throw new ForbiddenException('No se pudo confirmar la autorizacion RUND vigente.'); }
    if (!permissions.includes(RUND_BANK_PERMISSIONS.MANAGE))
      throw new ForbiddenException('La consulta de correo requiere autorizacion RUND vigente.');
    if (actor.expiresAt <= Date.now() / 1000) throw new UnauthorizedException('La sesion requiere autenticacion vigente.');
  }

  async consultar(requestId: string, actor: ManualExecutionActor) {
    if (!uuid(requestId)) throw new BadRequestException('Solicitud manual invalida.');
    const current = { ...actor, actorId: actor?.actorId?.toLowerCase(), roles: Array.isArray(actor?.roles) ? [...actor.roles] : [] };
    await this.authorize(current);
    let row: any;
    try {
      [row] = await this.db.query(`SELECT s.solicitud_id,s.intencion_id,s.entrada_manual IS NOT NULL AS capturada,
        n.estado AS estado_nativo,j.estado AS estado_auth,e.decision,
        n.huella_contexto=s.huella_contexto AND n.contexto=s.entrada_manual->'contexto' AS contexto_coincide,
        n.docente_id IS NOT NULL AND n.confirmada_en IS NOT NULL AS recibo_completo,
        n.resultado_nativo->'authUserCreated' AS cuenta_nativa_nueva,
        j.recibo_auth#>'{resultado,usuarioCreado}' AS cuenta_auth_nueva,
        m.intencion_id IS NOT NULL AS aviso_registrado,m.estado AS estado_correo
        FROM rund.identidad_solicitud s LEFT JOIN rund.identidad_contexto_nativo n USING(intencion_id)
        LEFT JOIN rund.identidad_operacion j USING(intencion_id) LEFT JOIN rund.identidad_ejecucion e USING(intencion_id)
        LEFT JOIN rund.identidad_correo m USING(intencion_id) WHERE s.actor_id=$1 AND s.solicitud_id=$2`,
      [current.actorId, requestId.toLowerCase()]);
    } catch { throw new ServiceUnavailableException('No fue posible consultar el estado del correo RUND.'); }
    // No entregar ni un recibo mínimo con permiso o sesión vencidos durante I/O.
    await this.authorize(current);
    if (!row) throw new NotFoundException('Solicitud no registrada para este actor.');
    if (!row.capturada) throw new ConflictException('La solicitud no conserva captura manual.');
    const fail = () => { throw new ServiceUnavailableException('RUND no confirma un estado de correo coherente.'); };
    if (row.solicitud_id !== requestId.toLowerCase() || !uuid(row.intencion_id)) fail();
    const confirmed = row.estado_nativo === 'CONFIRMADA';
    let state: 'SIN_CONFIRMAR' | 'NO_APLICA' | 'PENDIENTE' | 'ENVIANDO' | 'ENVIADO' | 'INCIERTO';
    if (!confirmed) {
      if (![null, 'PREPARADA'].includes(row.estado_nativo) || row.aviso_registrado || row.estado_correo !== null) fail();
      state = 'SIN_CONFIRMAR';
    } else {
      if (row.estado_auth !== 'AUTH_APLICADA' || row.decision !== 'EN_CURSO' || row.contexto_coincide !== true
        || row.recibo_completo !== true || typeof row.cuenta_nativa_nueva !== 'boolean'
        || row.cuenta_auth_nueva !== row.cuenta_nativa_nueva) fail();
      if (row.cuenta_nativa_nueva === false) {
        if (row.aviso_registrado || row.estado_correo !== null) fail();
        state = 'NO_APLICA';
      } else {
        if (row.aviso_registrado !== true || !['PENDIENTE', 'ENVIANDO', 'ENVIADO', 'INCIERTO'].includes(row.estado_correo)) fail();
        state = row.estado_correo;
      }
    }
    return { version: 1 as const, solicitudId: row.solicitud_id, intencionId: row.intencion_id,
      estado: state, registroConfirmado: confirmed, requiereRevision: state === 'INCIERTO' };
  }
}
