import { BadRequestException, Body, Controller, Header, HttpCode, Injectable, Post, UseGuards } from '@nestjs/common';
import { createHash } from 'crypto';
import { DataSource } from 'typeorm';
import { Public } from '../auth/decorators/public.decorator';
import { RundIdentityGuard } from './rund-identity.controller';

export interface RundIdentityValidationQuery {
  version: 1;
  operacionId: string;
  documento: string;
  correo: string;
  resolverPorCorreo: boolean;
}

@Injectable()
export class RundIdentityValidationService {
  constructor(private readonly db: DataSource) {}

  async validar(raw: unknown) {
    const keys = ['version', 'operacionId', 'documento', 'correo', 'resolverPorCorreo'];
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new BadRequestException('Prevalidación de identidad inválida.');
    const value = raw as Record<string, unknown>;
    if (Object.keys(value).length !== keys.length || Object.keys(value).some(key => !keys.includes(key))
      || value.version !== 1 || typeof value.operacionId !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value.operacionId)
      || typeof value.documento !== 'string' || !value.documento.trim()
      || typeof value.correo !== 'string' || !value.correo || value.correo !== value.correo.trim().toLowerCase()
      || typeof value.resolverPorCorreo !== 'boolean') throw new BadRequestException('Prevalidación de identidad inválida.');
    const consulta: RundIdentityValidationQuery = { version: 1, operacionId: value.operacionId, documento: value.documento,
      correo: value.correo, resolverPorCorreo: value.resolverPorCorreo };
    // Una sola sentencia: todas las comprobaciones comparten el snapshot de PostgreSQL.
    // Es la selección previa a la escritura actual, sin reservar IDs, bloquear o mutar filas.
    const [resultado] = await this.db.query(`WITH por_documento AS (
        SELECT id_person FROM auth.personas
        WHERE UPPER(regexp_replace(BTRIM(num_identificacion::text), '\\.', '', 'g'))
          = UPPER(regexp_replace(BTRIM($1::text), '\\.', '', 'g')) LIMIT 1
      ), por_correo AS (
        SELECT id_person FROM auth.personas WHERE $3::boolean AND NOT EXISTS(SELECT 1 FROM por_documento)
          AND LOWER(dir_email)=LOWER($2) LIMIT 1
      ), elegida AS (
        SELECT id_person,'documento'::text AS origen FROM por_documento
        UNION ALL SELECT id_person,'correo'::text FROM por_correo
      ), conflicto AS (
        SELECT owner_id FROM (
          SELECT p.id_person::text AS owner_id FROM auth.personas p WHERE LOWER(p.dir_email)=LOWER($2)
          UNION SELECT u.id_person::text FROM auth."user" u WHERE LOWER(u.username)=LOWER($2)
        ) owners WHERE owner_id IS NULL OR (SELECT id_person FROM elegida) IS NULL
          OR owner_id::uuid<>(SELECT id_person FROM elegida) LIMIT 1
      ), cuenta AS (
        SELECT id_user FROM auth."user" WHERE id_person=(SELECT id_person FROM elegida) LIMIT 1
      ), rol AS (
        SELECT id FROM auth.role WHERE UPPER(code)='DOCENTE' OR UPPER(name)='DOCENTE'
        ORDER BY CASE WHEN UPPER(code)='DOCENTE' THEN 0 ELSE 1 END LIMIT 1
      ) SELECT (SELECT id_person FROM elegida) AS "personaId",(SELECT id_user FROM cuenta) AS "usuarioId",
        (SELECT id FROM rol) AS "rolDocenteId",COALESCE((SELECT origen FROM elegida),'ninguna') AS coincidencia,
        EXISTS(SELECT 1 FROM conflicto) AS "conflictoCorreo"`, [consulta.documento, consulta.correo, consulta.resolverPorCorreo]);
    if (!resultado) throw new Error('Auth no confirmó la prevalidación de identidad.');
    const huella = createHash('sha256').update(JSON.stringify([consulta.version, consulta.operacionId, consulta.documento,
      consulta.correo, consulta.resolverPorCorreo, resultado.personaId, resultado.usuarioId, resultado.rolDocenteId,
      resultado.coincidencia, resultado.conflictoCorreo])).digest('hex');
    return { consulta, resultado, huella, reserva: false as const };
  }
}

@Public()
@UseGuards(RundIdentityGuard)
@Controller('internal/rund/v1/personas/escritura')
export class RundIdentityValidationController {
  constructor(private readonly validation: RundIdentityValidationService) {}

  @Post('validar')
  @HttpCode(200)
  @Header('Cache-Control', 'private, no-store')
  validar(@Body() consulta: unknown) { return this.validation.validar(consulta); }
}
