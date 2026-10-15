import { Controller, Get, Header, Injectable, ServiceUnavailableException, UseGuards } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Public } from '../auth/decorators/public.decorator';
import { RundIdentityGuard } from './rund-identity.controller';

@Injectable()
export class RundBancoService {
  constructor(private readonly db: DataSource) {}

  async proyeccion() {
    // Una sola sentencia obtiene identidades, roles y catálogos del mismo snapshot.
    // No pagina antes de que RUND aplique filtros que dependen de sus perfiles.
    const [row] = await this.db.query(`WITH docentes AS (
      SELECT u.id_user, u.username, u.is_active, u.created_at, u.updated_at,
        p.id_person, p.num_identificacion, p.tip_identificacion, p.nom_largo,
        p.nom_tercero, p.pri_apellido, p.seg_apellido, p.gen_tercero,
        p.fec_nacimiento::text AS fec_nacimiento, p.dir_email, p.tel_celular,
        p.id_seccional::text AS id_seccional, p.id_sede::text AS id_sede,
        ARRAY(SELECT DISTINCT r2.code FROM auth.user_roles ur2
          JOIN auth.role r2 ON r2.id=ur2.id_rol AND COALESCE(r2.is_active,true)=true
          WHERE ur2.id_user=u.id_user AND COALESCE(ur2.is_active,true)=true ORDER BY r2.code) AS roles
      FROM auth."user" u JOIN auth.personas p ON p.id_person=u.id_person
      WHERE EXISTS (SELECT 1 FROM auth.user_roles ur
        JOIN auth.role r ON r.id=ur.id_rol AND COALESCE(r.is_active,true)=true
        WHERE ur.id_user=u.id_user AND COALESCE(ur.is_active,true)=true
          AND (UPPER(r.code)='DOCENTE' OR UPPER(r.name)='DOCENTE'))
    ), seccionales AS (
      SELECT id_seccional::text AS id_seccional, nom_seccional, cod_seccional FROM auth.seccionales
    ), sedes AS (
      SELECT id_sede::text AS id_sede, nom_sede FROM auth.sedes
    ) SELECT jsonb_build_object('version',1,
      'items',COALESCE((SELECT jsonb_agg(to_jsonb(d) ORDER BY id_user) FROM docentes d),'[]'::jsonb),
      'total',(SELECT count(*) FROM docentes),
      'seccionales',COALESCE((SELECT jsonb_agg(to_jsonb(s) ORDER BY id_seccional) FROM seccionales s),'[]'::jsonb),
      'seccionalesTotal',(SELECT count(*) FROM seccionales),
      'sedes',COALESCE((SELECT jsonb_agg(to_jsonb(s) ORDER BY id_sede) FROM sedes s),'[]'::jsonb),
      'sedesTotal',(SELECT count(*) FROM sedes)) AS proyeccion`);
    if (!row?.proyeccion) throw new ServiceUnavailableException('No fue posible obtener la proyección del banco.');
    return row.proyeccion;
  }
}

@Public()
@UseGuards(RundIdentityGuard)
@Controller('internal/rund/v1/banco')
export class RundBancoController {
  constructor(private readonly banco: RundBancoService) {}

  @Get('proyeccion')
  @Header('Cache-Control', 'private, no-store')
  proyeccion() { return this.banco.proyeccion(); }
}
