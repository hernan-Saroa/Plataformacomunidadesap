import { BadRequestException, Body, ConflictException, Controller, Header, HttpCode, Injectable, NotFoundException, Param, Post, ServiceUnavailableException, UseGuards } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { isDeepStrictEqual } from 'util';
import { Public } from '../auth/decorators/public.decorator';
import { RundIdentityGuard } from './rund-identity.controller';
import { identityWriteCommand, identityWriteFingerprint, IdentityWriteCommand } from './rund-identity-command';
import { validIdentityImage } from './rund-identity-effects';

const uuid = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(v);
type Reason = 'OPERACION_NO_ELEGIBLE' | 'IDENTIDAD_NO_VIGENTE' | 'CREDENCIALES_NO_VIGENTES';

/** Lectura propietaria: nunca devuelve hashes, destinatarios o claves ni modifica cuentas. */
@Injectable()
export class RundIdentityMailValidationService {
  constructor(private readonly db: DataSource) {}

  private read(id: string, command: IdentityWriteCommand) {
    return this.db.query(`SELECT o.estado,o.huella_comando,o.resultado,
      e.huella_comando AS huella_efecto,e.persona_id,e.usuario_id,e.preimagen,e.postimagen,
      EXISTS(SELECT 1 FROM auth.rund_identidad_compensacion c WHERE c.operacion_id=o.operacion_id) AS resuelta,
      p.id_person,p.num_identificacion,p.dir_email,p.xmin::text AS revision_persona,
      u.id_user,u.id_person AS persona_usuario,u.username,u.password_hash,u.password_temp,u.is_active,
      u.xmin::text AS revision_usuario,
      EXISTS(SELECT 1 FROM auth.user_roles ur JOIN auth.role r ON r.id=ur.id_rol
        WHERE ur.id_user=e.usuario_id AND ur.is_active=true
        AND (UPPER(r.code)='DOCENTE' OR UPPER(r.name)='DOCENTE')) AS rol_docente,
      (EXISTS(SELECT 1 FROM auth.personas otra WHERE otra.id_person<>e.persona_id AND
        (LOWER(BTRIM(otra.dir_email))=$2 OR UPPER(regexp_replace(BTRIM(otra.num_identificacion::text),'\\.','','g'))
          =UPPER(regexp_replace(BTRIM($3::text),'\\.','','g'))))
       OR EXISTS(SELECT 1 FROM auth."user" otro WHERE otro.id_user<>e.usuario_id AND LOWER(BTRIM(otro.username))=$2)) AS conflicto
      FROM auth.rund_identidad_operacion o
      LEFT JOIN auth.rund_identidad_efecto e USING(operacion_id)
      LEFT JOIN auth.personas p ON p.id_person=e.persona_id
      LEFT JOIN auth."user" u ON u.id_user=e.usuario_id
      WHERE o.operacion_id=$1`, [id, command.emailFinal, command.payload.documentNumber]);
  }

  async validar(value: unknown, raw: unknown) {
    if (!uuid(value) || !raw || typeof raw !== 'object' || Array.isArray(raw) || Object.keys(raw).length !== 2)
      throw new BadRequestException('Consulta de correo inválida.');
    const body = raw as Record<string, unknown>;
    let command: IdentityWriteCommand;
    try { command = identityWriteCommand(body.comando); }
    catch { throw new BadRequestException('Comando de identidad inválido.'); }
    const id = value.toLowerCase(), hash = identityWriteFingerprint(command);
    if (body.huellaComando !== hash) throw new ConflictException('La huella no corresponde al comando.');
    const receipt = (motivo: Reason | null) => ({ validacion: {
      version: 1, operacionId: id, huellaComando: hash, apta: motivo === null, motivo,
    } });
    try {
      const [row] = await this.read(id, command);
      if (!row) throw new NotFoundException('Operación no registrada.');
      if (row.huella_comando !== hash) throw new ConflictException('La huella no corresponde a la operación.');
      if (row.estado !== 'APLICADA' || row.resuelta !== false || row.resultado?.usuarioCreado !== true
        || row.huella_efecto !== hash || !validIdentityImage(row.preimagen) || !validIdentityImage(row.postimagen)
        || !uuid(row.persona_id) || !uuid(row.usuario_id)
        || row.resultado.personaId !== row.persona_id || row.resultado.usuarioId !== row.usuario_id
        || row.postimagen.persona?.id !== row.persona_id || row.preimagen.usuarios.some(u => u.id === row.usuario_id))
        return receipt('OPERACION_NO_ELEGIBLE');
      const captured = row.postimagen.usuarios.find(u => u.id === row.usuario_id);
      if (!captured || row.id_person !== row.persona_id || row.id_user !== row.usuario_id
        || row.persona_usuario !== row.persona_id || row.num_identificacion !== command.payload.documentNumber
        || row.dir_email !== command.emailFinal || row.username !== command.emailFinal
        || captured.datos.username !== command.emailFinal || row.rol_docente !== true || row.conflicto !== false
        || row.revision_persona !== row.postimagen.persona.revision)
        return receipt('IDENTIDAD_NO_VIGENTE');
      // El alta vigente crea la cuenta inactiva y temporal. Cualquier cambio de la
      // fila desde su postimagen requiere revisión, incluso un reset al mismo valor.
      if (row.is_active !== false || row.password_temp !== true || captured.revision !== row.revision_usuario
        || typeof row.password_hash !== 'string' || !/^\$2[ab]\$10\$[./A-Za-z0-9]{53}$/.test(row.password_hash)
        || !await bcrypt.compare(command.payload.documentNumber, row.password_hash))
        return receipt('CREDENCIALES_NO_VIGENTES');
      // bcrypt es asíncrono: una segunda lectura impide devolver apta si la cuenta,
      // su propietario, el rol o una resolución cambiaron durante la comparación.
      const [current] = await this.read(id, command);
      return receipt(isDeepStrictEqual(current, row) ? null : 'IDENTIDAD_NO_VIGENTE');
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) throw error;
      throw new ServiceUnavailableException('Auth no confirma la vigencia del correo de bienvenida.');
    }
  }
}

@Public()
@UseGuards(RundIdentityGuard)
@Controller('internal/rund/v1/personas/escritura/operaciones')
export class RundIdentityMailValidationController {
  constructor(private readonly validation: RundIdentityMailValidationService) {}

  @Post(':operacionId/correo/validar')
  @HttpCode(200)
  @Header('Cache-Control', 'private, no-store')
  validar(@Param('operacionId') id: string, @Body() raw: unknown) { return this.validation.validar(id, raw); }
}
