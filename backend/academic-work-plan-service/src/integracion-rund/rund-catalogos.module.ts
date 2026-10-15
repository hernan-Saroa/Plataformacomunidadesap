import { BadRequestException, Body, CanActivate, ConflictException, Controller, ExecutionContext, Get, Header, HttpCode, Injectable, Module, Param, ParseUUIDPipe, Post,
  ServiceUnavailableException, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'crypto';
import { DataSource } from 'typeorm';
import { Public } from '../auth/public.decorator';

@Injectable()
export class RundCatalogosGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = String(this.config.get<string>('INTERNAL_SERVICE_TOKEN') || '').trim();
    if (!expected) throw new ServiceUnavailableException('Credencial interna de catálogos no configurada.');
    const actual = context.switchToHttp().getRequest().headers['x-internal-service-token'];
    const digest = (value: string) => createHash('sha256').update(value).digest();
    if (typeof actual !== 'string' || !timingSafeEqual(digest(actual), digest(expected))) throw new UnauthorizedException();
    return true;
  }
}

@Injectable()
export class RundCatalogosService {
  constructor(private readonly db: DataSource) {}

  async planesFirmes(raw: unknown) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new BadRequestException('Consulta de planes inválida.');
    const input = raw as Record<string, unknown>;
    if (Object.keys(input).some(key => !['docenteId', 'periodo'].includes(key))
      || Object.values(input).some(value => typeof value !== 'string' || !value)
      || (!input.docenteId && !input.periodo)) throw new BadRequestException('Indique docente o período.');
    // Misma selección del historial anterior: sin reinterpretar estados ni recortar planes.
    const consulta = { ...input };
    const values: unknown[] = [['APROBADO', 'APROBADO_DEF', 'EN_FIRME', 'RADICADO', 'EN_EJECUCION', 'FINALIZADO', 'TERMINADO']];
    let sql = `SELECT id,"docenteId",periodo,estado,
      jsonb_build_object('asignaturas',"datosEstructurados"->'asignaturas') AS "datosEstructurados"
      FROM academic_work_plan."PlanTrabajoAcademico" WHERE estado=ANY($1::text[])`;
    if (input.periodo) { values.push(input.periodo); sql += ` AND periodo=$${values.length}`; }
    if (input.docenteId) { values.push(input.docenteId); sql += ` AND "docenteId"=$${values.length}`; }
    sql += ' ORDER BY periodo DESC';
    const items = await this.db.query(sql, values);
    return { consulta, items, total: items.length };
  }

  async programasHistoricos(raw: unknown) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new BadRequestException('Consulta de programas inválida.');
    const programaIds = (raw as Record<string, unknown>).programaIds;
    const int8 = (id: unknown): id is string => typeof id === 'string' && /^[+-]?\d+$/.test(id)
      && BigInt(id) >= -9223372036854775808n && BigInt(id) <= 9223372036854775807n;
    if (!Array.isArray(programaIds) || programaIds.length > 500 || !programaIds.every(int8)
      || new Set(programaIds).size !== programaIds.length) throw new BadRequestException('Consulta de programas inválida.');
    // Repository<Programa>.find excluía deleted_at y conservaba los inactivos.
    const items = await this.db.query(`SELECT id::text AS id,nombre FROM academic_work_plan.programa
      WHERE id=ANY($1::bigint[]) AND deleted_at IS NULL`, [programaIds]);
    return { consulta: { programaIds }, items, total: items.length };
  }

  async identidadesHistoricas(raw: unknown) {
    const uuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new BadRequestException('Consulta histórica inválida.');
    const personaIds = (raw as Record<string, unknown>).personaIds;
    if (!Array.isArray(personaIds) || personaIds.length > 500 || !personaIds.every(uuid)
      || new Set(personaIds.map(id => id.toLowerCase())).size !== personaIds.length) throw new BadRequestException('Consulta histórica inválida.');
    const items = await this.db.query(`SELECT id AS "personaId", primer_nombre, segundo_nombre,
      primer_apellido, segundo_apellido, identificacion FROM academic_work_plan."Persona" WHERE id=ANY($1::uuid[])`, [personaIds]);
    return { consulta: { personaIds }, items, total: items.length };
  }

  async nombreHistorico(personaId: string) {
    // Conservar las cuatro partes históricas: nom_largo de Auth puede ser diferente.
    const items = await this.db.query(`SELECT id AS "personaId", primer_nombre, segundo_nombre,
      primer_apellido, segundo_apellido FROM academic_work_plan."Persona" WHERE id=$1`, [personaId]);
    return { items, total: items.length };
  }

  async territoriales() {
    // Sin filtro activo/período: el LEFT JOIN anterior también incluía datos históricos.
    const items = await this.db.query(`SELECT codigo, nombre FROM academic_work_plan.direccion_territorial ORDER BY codigo`);
    return { items, total: items.length };
  }

  async periodoActivo() {
    const items = await this.db.query(`SELECT codigo, estado FROM academic_work_plan.periodo_academico
      WHERE estado='en_curso' LIMIT 2`);
    if (items.length > 1) throw new ConflictException('PTA tiene varios períodos en curso. Debe confirmar un único período activo.');
    return { items, total: items.length };
  }
}

@Public()
@UseGuards(RundCatalogosGuard)
@Controller('internal/rund/v1/catalogos')
export class RundCatalogosController {
  constructor(private readonly catalogos: RundCatalogosService) {}

  @Post('programas-historicos')
  @HttpCode(200)
  @Header('Cache-Control', 'private, no-store')
  programas(@Body() consulta: unknown) { return this.catalogos.programasHistoricos(consulta); }

  @Get('territoriales')
  @Header('Cache-Control', 'private, no-store')
  territoriales() { return this.catalogos.territoriales(); }

  @Get('periodo-activo')
  @Header('Cache-Control', 'private, no-store')
  periodoActivo() { return this.catalogos.periodoActivo(); }
}

@Public()
@UseGuards(RundCatalogosGuard)
@Controller('internal/rund/v1/personas')
export class RundNombreHistoricoController {
  constructor(private readonly catalogos: RundCatalogosService) {}

  @Post('identidades-historicas')
  @HttpCode(200)
  @Header('Cache-Control', 'private, no-store')
  identidades(@Body() consulta: unknown) { return this.catalogos.identidadesHistoricas(consulta); }

  @Get(':personaId/nombre-historico')
  @Header('Cache-Control', 'private, no-store')
  nombre(@Param('personaId', new ParseUUIDPipe()) personaId: string) {
    return this.catalogos.nombreHistorico(personaId);
  }
}

@Public()
@UseGuards(RundCatalogosGuard)
@Controller('internal/rund/v1/planes')
export class RundPlanesHistoricosController {
  constructor(private readonly catalogos: RundCatalogosService) {}

  @Post('historial-firme')
  @HttpCode(200)
  @Header('Cache-Control', 'private, no-store')
  historial(@Body() consulta: unknown) { return this.catalogos.planesFirmes(consulta); }
}

@Module({ controllers: [RundCatalogosController, RundNombreHistoricoController, RundPlanesHistoricosController], providers: [RundCatalogosGuard, RundCatalogosService] })
export class RundCatalogosModule {}
