import { BadRequestException, Body, Controller, Header, HttpCode, Injectable, Post, ServiceUnavailableException, UseGuards } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Public } from '../auth/decorators/public.decorator';
import { RundIdentityGuard } from './rund-identity.controller';

@Injectable()
export class RundBulkPreviewService {
  constructor(private readonly db: DataSource) {}

  async consultar(raw: unknown) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new BadRequestException('Consulta de preview inválida.');
    const value = raw as Record<string, unknown>, keys = ['version', 'documento', 'correo'];
    if (Object.keys(value).length !== 3 || Object.keys(value).some(key => !keys.includes(key)) || value.version !== 1
      || typeof value.documento !== 'string' || !value.documento.trim() || value.documento.includes('\0')
      || typeof value.correo !== 'string' || !value.correo || value.correo.includes('\0')
      || value.correo !== value.correo.trim().toLowerCase()) throw new BadRequestException('Consulta de preview inválida.');
    const consulta = { version: 1 as const, documento: value.documento, correo: value.correo };
    try {
      // Una sentencia y un snapshot. No resuelve identidad por correo, reserva IDs o lee credenciales.
      const [result] = await this.db.query(`WITH persona AS (
        SELECT id_person,tip_identificacion,nom_largo,nom_tercero,pri_apellido,seg_apellido,
          gen_tercero,fec_nacimiento,dir_email,tel_celular,id_seccional
        FROM auth.personas WHERE UPPER(regexp_replace(BTRIM(num_identificacion::text), '\\.', '', 'g'))
          = UPPER(regexp_replace(BTRIM($1::text), '\\.', '', 'g')) LIMIT 1
      ), cuenta AS (
        SELECT id_user,username FROM auth."user" WHERE id_person=(SELECT id_person FROM persona) LIMIT 1
      ), conflicto AS (
        SELECT owner_id FROM (
          SELECT p.id_person::text AS owner_id FROM auth.personas p WHERE LOWER(p.dir_email)=LOWER($2)
          UNION SELECT u.id_person::text FROM auth."user" u WHERE LOWER(u.username)=LOWER($2)
        ) owners WHERE owner_id IS NULL OR (SELECT id_person FROM persona) IS NULL
          OR owner_id::uuid<>(SELECT id_person FROM persona) LIMIT 1
      ) SELECT (SELECT jsonb_build_object('id_person',id_person,'tip_identificacion',tip_identificacion,
          'nom_largo',nom_largo,'nom_tercero',nom_tercero,'pri_apellido',pri_apellido,'seg_apellido',seg_apellido,
          'gen_tercero',gen_tercero,'fec_nacimiento',fec_nacimiento::text,'dir_email',dir_email,
          'tel_celular',tel_celular,'id_seccional',id_seccional::text) FROM persona) AS persona,
        (SELECT jsonb_build_object('id_user',id_user,'username',username) FROM cuenta) AS usuario,
        EXISTS(SELECT 1 FROM auth.role WHERE UPPER(code)='DOCENTE' OR UPPER(name)='DOCENTE') AS "rolDocenteDisponible",
        EXISTS(SELECT 1 FROM conflicto) AS "conflictoCorreo"`, [consulta.documento, consulta.correo]);
      if (!result || typeof result.rolDocenteDisponible !== 'boolean' || typeof result.conflictoCorreo !== 'boolean'
        || !('persona' in result) || !('usuario' in result)) throw new Error();
      return { consulta, persona: result.persona, usuario: result.usuario,
        rolDocenteDisponible: result.rolDocenteDisponible, conflictoCorreo: result.conflictoCorreo, reserva: false as const };
    } catch { throw new ServiceUnavailableException('No fue posible consultar la identidad del preview en Auth.'); }
  }
}

@Public()
@UseGuards(RundIdentityGuard)
@Controller('internal/rund/v1/personas/previsualizacion-masiva')
export class RundBulkPreviewController {
  constructor(private readonly previews: RundBulkPreviewService) {}
  @Post()
  @HttpCode(200)
  @Header('Cache-Control', 'private, no-store')
  consultar(@Body() body: unknown) { return this.previews.consultar(body); }
}
