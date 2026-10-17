import { BadRequestException, ConflictException, ForbiddenException, HttpException, Injectable, NotFoundException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { AuthIdentityClient } from './auth-identity.client';
import type { MailReviewActor } from './auth-identity-mail-review.service';
import { RUND_BANK_PERMISSIONS } from '../auth/rund-permission-catalog';

const uuid = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(v);
const timestamp = (v: unknown) => typeof v === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{6}Z$/.test(v)
  && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v.replace(/(\.\d{3})\d{3}Z$/,'$1Z');

/** Cierre administrativo opcional. Solo inserta un recibo propio; nunca envía o concilia. */
@Injectable()
export class AuthIdentityMailReviewCloseService {
  constructor(private readonly db: DataSource, private readonly identities: AuthIdentityClient) {}
  private id(v: unknown) { if (!uuid(v)) throw new BadRequestException('Identificador de revision invalido.'); return v.toLowerCase(); }
  private actor(a: MailReviewActor): MailReviewActor {
    return { actorId: typeof a?.actorId === 'string' ? a.actorId.toLowerCase() : '',
      roles: Array.isArray(a?.roles) ? a.roles.filter(r => typeof r === 'string') : [], expiresAt: a?.expiresAt };
  }
  private async authorize(a: MailReviewActor) {
    if (!uuid(a.actorId) || !Number.isFinite(a.expiresAt) || a.expiresAt <= Date.now()/1000)
      throw new UnauthorizedException('La sesion requiere autenticacion vigente.');
    if (a.roles.some(r => ['GESTION_PROFESORAL','SUPER_ADMIN','ADMIN'].includes(r))) return;
    let permissions: string[];
    try { permissions = await this.identities.permisosRoles(a.roles); }
    catch { throw new ForbiddenException('No se pudo confirmar la autorizacion RUND vigente.'); }
    if (!permissions.includes(RUND_BANK_PERMISSIONS.MANAGE)) throw new ForbiddenException('El cierre requiere autorizacion RUND vigente.');
    if (a.expiresAt <= Date.now()/1000) throw new UnauthorizedException('La sesion requiere autenticacion vigente.');
  }
  private async safe<T>(work: () => Promise<T>): Promise<T> {
    try { return await work(); }
    catch (e) { if (e instanceof HttpException) throw e; throw new ServiceUnavailableException('No fue posible confirmar el cierre de revision de correo RUND.'); }
  }
  private async read(manager: Pick<EntityManager,'query'>, id: string) {
    const [r] = await manager.query(`SELECT c.caso_id,c.intencion_id,c.intento_id,c.estado,c.asumida_por,
      m.estado AS estado_correo,m.intento_id AS intento_actual,
      e.intento_id AS intento_resultado,e.resultado,
      x.caso_id AS cierre_caso,x.intencion_id AS cierre_intencion,x.intento_id AS cierre_intento,x.cerrada_por,x.motivo,
      to_char(x.cerrada_en AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS fecha_cerrada
      FROM rund.identidad_correo_revision c JOIN rund.identidad_correo m USING(intencion_id)
      LEFT JOIN rund.identidad_correo_resultado e USING(intencion_id)
      LEFT JOIN rund.identidad_correo_revision_cierre x ON x.caso_id=c.caso_id WHERE c.caso_id=$1`, [id]);
    if (!r) throw new NotFoundException('Caso de revision no registrado.');
    if (r.caso_id !== id || !uuid(r.intencion_id) || !uuid(r.intento_id) || r.intento_actual !== r.intento_id
      || !['PENDIENTE','EN_REVISION'].includes(r.estado)
      || (r.estado === 'PENDIENTE' ? r.asumida_por !== null : !uuid(r.asumida_por))) throw new Error();
    const closed = r.cierre_caso !== null;
    if (closed && (r.cierre_caso !== id || r.cierre_intencion !== r.intencion_id || r.cierre_intento !== r.intento_id
      || r.estado_correo !== 'ENVIADO' || r.intento_resultado !== r.intento_id || r.resultado !== 'ACEPTADO'
      || !uuid(r.cerrada_por) || !timestamp(r.fecha_cerrada) || r.motivo !== 'ACEPTACION_REGISTRADA'
      || (r.estado === 'EN_REVISION' && r.cerrada_por !== r.asumida_por))) throw new Error();
    if (!closed && [r.cierre_intencion,r.cierre_intento,r.cerrada_por,r.fecha_cerrada,r.motivo].some(v => v !== null)) throw new Error();
    return { version: 1 as const, casoId: id, intencionId: r.intencion_id, cerrada: closed,
      cerradaPor: closed ? r.cerrada_por : null, cerradaEn: closed ? r.fecha_cerrada : null,
      motivo: closed ? 'ACEPTACION_REGISTRADA' : null };
  }
  async consultar(value: string, actor: MailReviewActor) {
    const id = this.id(value), a = this.actor(actor); await this.authorize(a);
    return this.safe(async () => { const result = await this.read(this.db,id); await this.authorize(a); return result; });
  }
  async cerrar(value: string, actor: MailReviewActor) {
    const id = this.id(value), a = this.actor(actor); await this.authorize(a);
    return this.safe(() => this.db.transaction(async manager => {
      await manager.query("SET LOCAL lock_timeout='5s'");
      const [link] = await manager.query('SELECT intencion_id FROM rund.identidad_correo_revision WHERE caso_id=$1',[id]);
      if (!link) throw new NotFoundException('Caso de revision no registrado.');
      const [mail] = await manager.query('SELECT * FROM rund.identidad_correo WHERE intencion_id=$1 FOR UPDATE',[link.intencion_id]);
      const [review] = await manager.query('SELECT * FROM rund.identidad_correo_revision WHERE caso_id=$1 FOR UPDATE',[id]);
      if (!mail || !review || review.intencion_id !== link.intencion_id || review.intento_id !== mail.intento_id) throw new Error();
      const [previous] = await manager.query('SELECT cerrada_por FROM rund.identidad_correo_revision_cierre WHERE caso_id=$1',[id]);
      if (previous) {
        if (previous.cerrada_por !== a.actorId) throw new ConflictException('El caso ya fue cerrado por otro responsable.');
      } else {
        const [event] = await manager.query('SELECT intento_id,resultado FROM rund.identidad_correo_resultado WHERE intencion_id=$1',[link.intencion_id]);
        if (mail.estado !== 'ENVIADO' || event?.resultado !== 'ACEPTADO' || event.intento_id !== review.intento_id)
          throw new ConflictException('El cierre requiere aceptacion registrada del mismo intento.');
        if (!['PENDIENTE','EN_REVISION'].includes(review.estado) || (review.estado === 'EN_REVISION' && review.asumida_por !== a.actorId))
          throw new ConflictException('El cierre corresponde al responsable asignado.');
        const [saved] = await manager.query(`INSERT INTO rund.identidad_correo_revision_cierre
          (caso_id,intencion_id,intento_id,cerrada_por) VALUES($1,$2,$3,$4) RETURNING caso_id`, [id,link.intencion_id,review.intento_id,a.actorId]);
        if (saved?.caso_id !== id) throw new Error();
      }
      const result = await this.read(manager,id); await this.authorize(a); return result;
    }));
  }
}
