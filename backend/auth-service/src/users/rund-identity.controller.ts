import { BadRequestException, CanActivate, ConflictException, Controller, ExecutionContext, Get, Header, Injectable,
  NotFoundException, Param, ServiceUnavailableException, UnauthorizedException, UseGuards, Body, Post, HttpCode } from '@nestjs/common';
import { createHash, timingSafeEqual } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { Public } from '../auth/decorators/public.decorator';

export type RundCoincidenciasConsulta =
  | { tipo: 'unicidad'; documento: string | null; personaIds: string[] }
  | { tipo: 'nombre-fecha'; nombre: string; fechaNacimiento: string };

@Injectable()
export class RundIdentityGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = String(this.config.get<string>('INTERNAL_SERVICE_TOKEN') || '').trim();
    if (!expected) throw new ServiceUnavailableException('Credencial interna de identidad no configurada.');
    const actual = context.switchToHttp().getRequest().headers['x-internal-service-token'];
    const digest = (value: string) => createHash('sha256').update(value).digest();
    if (typeof actual !== 'string' || !timingSafeEqual(digest(actual), digest(expected))) throw new UnauthorizedException();
    return true;
  }
}

@Injectable()
export class RundIdentityService {
  constructor(private readonly db: DataSource) {}

  async permisosRoles(raw: unknown) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new BadRequestException('Consulta de permisos inválida.');
    const q = raw as Record<string, unknown>;
    const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(item => typeof item === 'string');
    if (!strings(q.roles) || !strings(q.codigos)) throw new BadRequestException('Consulta de permisos inválida.');
    // Los candidatos los fija el servidor RUND. No normalizar aquí los códigos persistidos.
    const consulta = { roles: q.roles, codigos: q.codigos };
    const items = await this.db.query(
      `SELECT DISTINCT p.code FROM auth.role_permissions rp
       JOIN auth.role r ON r.id = rp.id_rol AND COALESCE(r.is_active, true) = true
       JOIN auth.permission p ON p.id_permission = rp.id_permission AND COALESCE(p.is_active, true) = true
       WHERE COALESCE(rp.is_active, true) = true
         AND UPPER(r.code) = ANY($1::text[]) AND p.code = ANY($2::text[])`,
      [consulta.roles, consulta.codigos],
    );
    return { consulta, items, total: items.length };
  }

  async rolDocenteSync() {
    const roles = await this.db.query(`SELECT id FROM auth.role WHERE UPPER(code) = 'DOCENTE' AND is_active = true`);
    if (roles.length !== 1) throw new ServiceUnavailableException('No fue posible resolver el rol DOCENTE activo de auth.');
    return { rolId: roles[0].id };
  }

  async revalidarSync(raw: unknown) {
    const uuid = (value: unknown) => typeof value === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new BadRequestException('Consulta de sincronización inválida.');
    const q = raw as Record<string, unknown>;
    if (![q.personaId, q.usuarioId, q.rolId].every(uuid)) throw new BadRequestException('Consulta de sincronización inválida.');
    const consulta = { personaId: q.personaId as string, usuarioId: q.usuarioId as string, rolId: q.rolId as string };
    const rows = await this.db.query(`SELECT p.id_person, p.num_identificacion, p.dir_email,
            p.id_seccional::text AS territorial_id, s.nom_seccional AS territorial_nombre, p.id_sede::text AS sede_id,
            u.is_active AS usuario_activo,
            EXISTS(SELECT 1 FROM auth.user_roles ur JOIN auth.role r ON r.id = ur.id_rol
              WHERE ur.id_user = u.id_user AND ur.id_rol = $3 AND ur.is_active = true AND r.is_active = true) AS rol_docente_activo
          FROM auth.personas p JOIN auth."user" u ON u.id_person = p.id_person
          LEFT JOIN auth.seccionales s ON s.id_seccional = p.id_seccional
          WHERE p.id_person = $1 AND u.id_user = $2 LIMIT 1`, [consulta.personaId, consulta.usuarioId, consulta.rolId]);
    return { consulta, encontrada: rows.length > 0, identidad: rows[0] ?? null };
  }

  async destinatarioAviso(raw: unknown) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) || typeof (raw as Record<string, unknown>).clave !== 'string') {
      throw new BadRequestException('Consulta de destinatario inválida.');
    }
    // No recortar: conservar la comparación exacta de UUID y los espacios del username histórico.
    const consulta = (raw as { clave: string }).clave;
    const rows = await this.db.query(`SELECT id_user FROM auth."user"
      WHERE COALESCE(is_active,true)=true AND
        (id_user::text=$1 OR id_person::text=$1 OR lower(username)=lower($1))
      ORDER BY (id_user::text=$1) DESC LIMIT 1`, [consulta]);
    return { consulta, encontrado: rows.length > 0, usuarioId: rows[0]?.id_user ?? null };
  }

  private key(value: string): string {
    const key = String(value ?? '').trim();
    if (!key || key.length > 256) throw new BadRequestException('Identificador de consulta inválido.');
    return key;
  }

  async porDocumento(documento: string) {
    const key = this.key(documento);
    const rows = await this.db.query(`SELECT id_person AS "personaId", num_identificacion AS documento,
      nom_largo AS "nombreCompleto" FROM auth.personas WHERE num_identificacion=$1 LIMIT 2`, [key]);
    if (rows.length > 1) throw new ConflictException('El documento no identifica una única persona.');
    if (!rows.length) throw new NotFoundException('Persona no encontrada.');
    return rows[0];
  }

  async resolver(clave: string) {
    const key = this.key(clave);
    const rows = await this.db.query(`SELECT p.id_person AS "personaId" FROM auth.personas p
      LEFT JOIN auth."user" u ON u.id_person=p.id_person
      WHERE p.id_person::text=$1 OR u.id_user::text=$1
      ORDER BY CASE WHEN p.id_person::text=$1 THEN 0 ELSE 1 END LIMIT 1`, [key]);
    if (!rows.length) throw new NotFoundException('Persona no encontrada.');
    return rows[0];
  }

  async perfilPta(cedula: string) {
    if (!/^\d{1,20}$/.test(cedula)) throw new BadRequestException('Identificador de consulta inválido.');
    const rows = await this.db.query(`SELECT p.id_person AS "personaId",
      regexp_replace(BTRIM(p.num_identificacion), '\\.', '', 'g') AS documento,
      COALESCE(NULLIF(BTRIM(p.nom_largo), ''),
        NULLIF(CONCAT_WS(' ', p.nom_tercero, p.pri_apellido, p.seg_apellido), '')) AS "nombreCompleto",
      p.id_seccional::text AS "territorialId"
      FROM auth.personas p WHERE regexp_replace(BTRIM(p.num_identificacion), '\\.', '', 'g')=$1 LIMIT 2`, [cedula]);
    if (rows.length > 1) throw new ConflictException('El documento normalizado no identifica una única persona.');
    // Ausencia explícita con HTTP 200: un 404 de ruta no puede recomendar un alta duplicada.
    return rows.length ? { encontrada: true, ...rows[0] } : { encontrada: false, documento: cedula };
  }

  private fichaKey(value: string): string {
    // El documento exacto conserva puntos, ceros y espacios persistidos.
    if (typeof value !== 'string' || !value.length || value.length > 256) {
      throw new BadRequestException('Identificador de consulta inválido.');
    }
    return value;
  }

  private async ficha(consulta: string, porPersona: boolean) {
    const key = this.fichaKey(consulta);
    if (porPersona && !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(key)) {
      throw new BadRequestException('Identificador de persona inválido.');
    }
    const rows = await this.db.query(`SELECT p.id_person AS "personaId", p.num_identificacion,
      p.tip_identificacion, p.nom_largo, p.nom_tercero, p.pri_apellido, p.seg_apellido,
      p.gen_tercero, p.fec_nacimiento::text AS fec_nacimiento, p.dir_email, p.tel_celular
      FROM auth.personas p WHERE ${porPersona ? 'p.id_person=$1::uuid' : 'p.num_identificacion=$1'} LIMIT 2`, [key]);
    if (rows.length > 1) throw new ConflictException('La consulta no identifica una única persona.');
    return { consulta: key, encontrada: rows.length > 0, persona: rows[0] || null };
  }

  fichaPorPersona(personaId: string) { return this.ficha(personaId, true); }
  fichaPorDocumento(documento: string) { return this.ficha(documento, false); }

  async personasPorAlias(clave: string) {
    const key = this.fichaKey(clave);
    const rows = await this.db.query(`SELECT DISTINCT p.id_person AS "personaId" FROM auth.personas p
      LEFT JOIN auth."user" u ON u.id_person=p.id_person
      WHERE p.id_person::text=$1 OR u.id_user::text=$1
        OR UPPER(regexp_replace(BTRIM(p.num_identificacion::text), '\\.', '', 'g'))
          = UPPER(regexp_replace(BTRIM($1::text), '\\.', '', 'g'))`, [key]);
    return { clave: key, personaIds: rows.map(row => row.personaId), total: rows.length };
  }

  async coincidencias(raw: unknown) {
    const uuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(v);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new BadRequestException('Consulta de coincidencias inválida.');
    const q = raw as Record<string, unknown>;
    let consulta: RundCoincidenciasConsulta, where: string, values: unknown[];
    if (q.tipo === 'unicidad' && (q.documento === null || typeof q.documento === 'string')
      && Array.isArray(q.personaIds) && q.personaIds.every(uuid)
      && new Set(q.personaIds.map(id => id.toLowerCase())).size === q.personaIds.length) {
      consulta = { tipo: 'unicidad', documento: q.documento as string | null, personaIds: q.personaIds };
      where = `(UPPER(regexp_replace(BTRIM(p.num_identificacion::text), '\\.', '', 'g'))
        = UPPER(regexp_replace(BTRIM($1::text), '\\.', '', 'g')) OR p.id_person=ANY($2::uuid[]))`;
      values = [consulta.documento, consulta.personaIds];
    } else if (q.tipo === 'nombre-fecha' && typeof q.nombre === 'string' && typeof q.fechaNacimiento === 'string'
      && /^\d{4}-\d{2}-\d{2}$/.test(q.fechaNacimiento) && Number.isFinite(Date.parse(q.fechaNacimiento))
      && new Date(q.fechaNacimiento).toISOString().slice(0, 10) === q.fechaNacimiento) {
      consulta = { tipo: 'nombre-fecha', nombre: q.nombre, fechaNacimiento: q.fechaNacimiento };
      where = 'UPPER(TRIM(p.nom_largo))=$1 AND p.fec_nacimiento::date=$2::date';
      values = [consulta.nombre, consulta.fechaNacimiento];
    } else throw new BadRequestException('Consulta de coincidencias inválida.');
    const items = await this.db.query(`SELECT p.id_person AS "personaId", p.num_identificacion AS documento,
      p.nom_largo AS nombre${consulta.tipo === 'nombre-fecha' ? ', p.fec_nacimiento::text AS "fechaNacimiento"' : ''}
      FROM auth.personas p WHERE ${where}`, values);
    // Todas las personas candidatas; un documento repetido es un resultado del diagnóstico.
    return { consulta, items, total: items.length };
  }
}

/** Public omite el JWT de usuario; el guard exige exclusivamente la credencial interna. */
@Public()
@UseGuards(RundIdentityGuard)
@Controller('internal/rund/v1/personas')
export class RundIdentityController {
  constructor(private readonly identities: RundIdentityService) {}

  @Post('permisos-roles')
  @HttpCode(200)
  @Header('Cache-Control', 'private, no-store')
  permisosRoles(@Body() consulta: unknown) { return this.identities.permisosRoles(consulta); }

  @Get('sincronizacion/rol-docente')
  @Header('Cache-Control', 'private, no-store')
  rolDocenteSync() { return this.identities.rolDocenteSync(); }

  @Post('sincronizacion/revalidar')
  @HttpCode(200)
  @Header('Cache-Control', 'private, no-store')
  revalidarSync(@Body() consulta: unknown) { return this.identities.revalidarSync(consulta); }

  @Post('destinatario-aviso')
  @HttpCode(200)
  @Header('Cache-Control', 'private, no-store')
  destinatarioAviso(@Body() consulta: unknown) { return this.identities.destinatarioAviso(consulta); }

  @Get('por-documento/:documento')
  @Header('Cache-Control', 'private, no-store')
  porDocumento(@Param('documento') documento: string) { return this.identities.porDocumento(documento); }

  @Get('resolver/:clave')
  @Header('Cache-Control', 'private, no-store')
  resolver(@Param('clave') clave: string) { return this.identities.resolver(clave); }

  @Get('perfil-pta/:cedula')
  @Header('Cache-Control', 'private, no-store')
  perfilPta(@Param('cedula') cedula: string) { return this.identities.perfilPta(cedula); }

  @Get('ficha/por-persona/:personaId')
  @Header('Cache-Control', 'private, no-store')
  fichaPorPersona(@Param('personaId') personaId: string) { return this.identities.fichaPorPersona(personaId); }

  @Get('ficha/por-documento/:documento')
  @Header('Cache-Control', 'private, no-store')
  fichaPorDocumento(@Param('documento') documento: string) { return this.identities.fichaPorDocumento(documento); }

  @Get('por-alias/:clave')
  @Header('Cache-Control', 'private, no-store')
  personasPorAlias(@Param('clave') clave: string) { return this.identities.personasPorAlias(clave); }

  @Post('coincidencias')
  @HttpCode(200)
  @Header('Cache-Control', 'private, no-store')
  coincidencias(@Body() consulta: unknown) { return this.identities.coincidencias(consulta); }
}
