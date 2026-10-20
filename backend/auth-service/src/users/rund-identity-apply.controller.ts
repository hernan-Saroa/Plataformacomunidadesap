import { BadRequestException, Body, ConflictException, Controller, Header, HttpCode, Injectable, NotFoundException, Param, Post, ServiceUnavailableException, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { Public } from '../auth/decorators/public.decorator';
import { RundIdentityGuard } from './rund-identity.controller';
import { identityWriteCommand, identityWriteFingerprint } from './rund-identity-command';
import { identityWriteNormalization } from './rund-identity-write.normalization';
import { upsertRundAuthIdentityWithManager } from './rund-identity-write.adapter';
import { identityBefore, identityImage, lockIdentityEffects } from './rund-identity-effects';

@Injectable()
export class RundIdentityApplyService {
  constructor(private readonly db: DataSource, private readonly config: ConfigService) {}

  async aplicar(id: string, raw: unknown) {
    if (String(this.config.get('RUND_IDENTITY_APPLY_ENABLED') || '').toLowerCase() !== 'true')
      throw new ServiceUnavailableException('Aplicación remota de identidad no habilitada.');
    if (typeof id !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)
      || !raw || typeof raw !== 'object' || Array.isArray(raw) || Object.keys(raw).length !== 2)
      throw new BadRequestException('Aplicación de identidad inválida.');
    const body = raw as Record<string,unknown>;
    let comando: ReturnType<typeof identityWriteCommand>;
    try { comando=identityWriteCommand(body.comando); } catch { throw new BadRequestException('Comando de identidad inválido.'); }
    const huella=identityWriteFingerprint(comando), operacionId=id.toLowerCase();
    if (body.huellaComando !== huella) throw new ConflictException('La huella no corresponde al comando.');
    return this.db.transaction(async manager => {
      await manager.query("SET LOCAL lock_timeout='5s'");
      // Serializa ejecutores remotos; no promete coordinar escritores locales/externos aún activos.
      await manager.query('SELECT pg_advisory_xact_lock($1,$2)',[7184,63]);
      const [op]=await manager.query('SELECT * FROM auth.rund_identidad_operacion WHERE operacion_id=$1 FOR UPDATE',[operacionId]);
      if (!op) throw new NotFoundException('Operación no registrada.');
      if (op.huella_comando !== huella || op.estado==='CANCELADA') throw new ConflictException('La operación no admite ese comando.');
      const [resolution]=await manager.query('SELECT estado FROM auth.rund_identidad_compensacion WHERE operacion_id=$1',[operacionId]);
      if(resolution?.estado==='COMPENSADA')throw new ConflictException('La identidad de esta operacion ya fue compensada.');
      if (op.estado!=='APLICADA') {
        if (op.estado!=='REGISTRADA') throw new ConflictException('Estado de operación incompatible.');
        await lockIdentityEffects(manager);
        // La precondición se comprueba bajo bloqueo del propietario, en la misma transacción
        // que aplica identidad y recibo. Un GET previo desde RUND no sustituye este control.
        if (comando.identidadEsperada) {
          const expected = comando.identidadEsperada;
          const [current] = await manager.query(`SELECT id_person::text AS "personaId", num_identificacion,
            tip_identificacion, nom_largo, gen_tercero, fec_nacimiento::text AS fec_nacimiento
            FROM auth.personas WHERE id_person=$1::uuid FOR UPDATE`, [expected.personaId]);
          if (!current || Object.keys(expected).some(key => current[key] !== expected[key]))
            throw new ConflictException('La identidad cambió desde la revisión de las sugerencias. Actualice el perfil.');
        }
        const before=await identityBefore(manager,comando);
        if (comando.identidadEsperada && before.persona?.id !== comando.identidadEsperada.personaId)
          throw new ConflictException('La identidad resuelta no corresponde al perfil revisado.');
        const result=await upsertRundAuthIdentityWithManager(manager,{
          ...comando,payload:{...comando.payload,fechaNacimiento:comando.payload.fechaNacimiento===null?null:new Date(comando.payload.fechaNacimiento+'T00:00:00.000Z')},
          territorial:comando.territorial===null?undefined:comando.territorial,
        },identityWriteNormalization);
        const resultado={personaId:result.authPersonId,usuarioId:result.authUser.id_user,usuarioCreado:result.authUserCreated,
          camposModificados:result.personaChangedFields,cambios:result.profileChanges};
        const after=await identityImage(manager,result.authPersonId);
        if(after.persona?.id!==result.authPersonId||!after.usuarios.some(u=>u.id===result.authUser.id_user)
          ||(before.persona&&before.persona.id!==result.authPersonId))throw new Error('La imagen no corresponde a la identidad aplicada.');
        // SELECT externo conserva rows tanto con pg como con TypeORM (UPDATE directo devuelve [rows,count]).
        const [updated]=await manager.query(`WITH aplicada AS (UPDATE auth.rund_identidad_operacion SET estado='APLICADA',aplicada_en=CURRENT_TIMESTAMP,resultado=$2::jsonb
          WHERE operacion_id=$1 AND estado='REGISTRADA' RETURNING *) SELECT * FROM aplicada`,[operacionId,JSON.stringify(resultado)]);
        if (!updated) throw new Error('Auth no confirmó el recibo aplicado.');
        await manager.query(`INSERT INTO auth.rund_identidad_efecto
          (operacion_id,huella_comando,persona_id,usuario_id,preimagen,postimagen) VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb)`,
          [operacionId,huella,result.authPersonId,result.authUser.id_user,JSON.stringify(before),JSON.stringify(after)]);
        Object.assign(op,updated);
      }
      if (!op.resultado || !op.aplicada_en) throw new Error('Recibo aplicado incompleto.');
      return {operacion:{operacionId:op.operacion_id,version:op.version,huellaComando:op.huella_comando,estado:'APLICADA',
        registradaEn:op.registrada_en,canceladaEn:null,identidadAplicada:true,aplicadaEn:op.aplicada_en,resultado:op.resultado}};
    });
  }
}

@Public()
@UseGuards(RundIdentityGuard)
@Controller('internal/rund/v1/personas/escritura/operaciones')
export class RundIdentityApplyController {
  constructor(private readonly identities: RundIdentityApplyService) {}
  @Post(':operacionId/aplicar')
  @HttpCode(200)
  @Header('Cache-Control','private, no-store')
  aplicar(@Param('operacionId') id:string,@Body() raw:unknown) { return this.identities.aplicar(id,raw); }
}
