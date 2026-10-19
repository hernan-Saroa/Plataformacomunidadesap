import { BadRequestException, Body, Controller, Header, HttpCode, Injectable, Module, NotFoundException, Param, ParseUUIDPipe, Post, Get, UseGuards } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { Public } from '../auth/public.decorator';
import { RundCatalogosGuard } from './rund-catalogos.module';

const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const uuid = (value: unknown): value is string => typeof value === 'string' && UUID.test(value);
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const exacto = (raw: unknown, claves: string[]) => record(raw) && Object.keys(raw).length === claves.length && claves.every(k => k in raw);
const RESULTADOS = ['COMPLETO', 'ENMASCARADO', 'DENEGADO'];

/**
 * Propietario PTA de los soportes y la bitácora RUND históricos. Carpeta Digital (auth)
 * los consulta por esta API interna en lugar de leer el esquema academic_work_plan.
 */
@Injectable()
export class RundCarpetaHistoricoService {
  constructor(private readonly db: DataSource) {}

  async soportesPorPersonas(raw: unknown) {
    if (!exacto(raw, ['personaIds'])) throw new BadRequestException('Consulta de soportes históricos inválida.');
    const personaIds = (raw as Record<string, unknown>).personaIds;
    if (!Array.isArray(personaIds) || !personaIds.length || personaIds.length > 500 || !personaIds.every(uuid)
      || new Set(personaIds.map(id => id.toLowerCase())).size !== personaIds.length) throw new BadRequestException('Consulta de soportes históricos inválida.');
    // Misma selección que Carpeta Digital hacía por SQL: solo soportes con archivo o enlace.
    const items = await this.db.query(`SELECT d."personaId" AS persona_id, s.id, s.bloque, s.tipo_soporte, s.documento_carpeta_id,
        s.nombre_archivo, s.estado, s.fecha_vencimiento, s.observacion, s."createdAt", s.docente_id, d."periodoCarga" AS periodo_carga
      FROM academic_work_plan."RundSoporteCampo" s JOIN academic_work_plan."Docente" d ON d.id::text = s.docente_id::text
      WHERE d."personaId" = ANY($1::uuid[])
        AND (NULLIF(TRIM(s.nombre_archivo),'') IS NOT NULL OR NULLIF(TRIM(s.documento_carpeta_id),'') IS NOT NULL)`, [personaIds]);
    return { consulta: { personaIds }, items, total: items.length };
  }

  async perfilesPorPersona(personaId: string) {
    // Un tope superior a 200 permite al consumidor detectar una lista incompleta.
    const items = await this.db.query(`SELECT id, "personaId" AS persona_id, "periodoCarga" AS periodo_carga, estado
      FROM academic_work_plan."Docente" WHERE "personaId"=$1 ORDER BY "periodoCarga" DESC NULLS LAST, id LIMIT 201`, [personaId]);
    return { items, total: items.length };
  }

  async personaDeSoporte(soporteId: string) {
    const items = await this.db.query(`SELECT d."personaId" AS persona_id FROM academic_work_plan."RundSoporteCampo" s
      JOIN academic_work_plan."Docente" d ON d.id::text = s.docente_id::text WHERE s.id = $1`, [soporteId]);
    if (!items.length) throw new NotFoundException('Soporte histórico no encontrado.');
    return { personaId: items[0].persona_id };
  }

  async verificarOriginal(raw: unknown) {
    if (!exacto(raw, ['url', 'recursoId', 'endpoints'])) throw new BadRequestException('Consulta de originales inválida.');
    const { url, recursoId, endpoints } = raw as Record<string, unknown>;
    if (typeof url !== 'string' || !url || typeof recursoId !== 'string' || !recursoId || !Array.isArray(endpoints)
      || endpoints.length > 20 || !endpoints.every(e => typeof e === 'string' && e)) throw new BadRequestException('Consulta de originales inválida.');
    const soportes = await this.db.query(`SELECT id FROM academic_work_plan."RundSoporteCampo"
      WHERE LOWER(documento_carpeta_id)=LOWER($1) LIMIT 1`, [url]);
    if (soportes.length) return { esOriginalHistorico: true };
    const accesos = await this.db.query(`SELECT id FROM academic_work_plan."RundAccesoDatosLog"
      WHERE recurso_id=$1 AND endpoint=ANY($2::text[]) LIMIT 1`, [recursoId, endpoints]);
    return { esOriginalHistorico: accesos.length > 0 };
  }

  async registrarAcceso(raw: unknown) {
    if (!exacto(raw, ['actorId', 'roles', 'endpoint', 'recursoId', 'campos', 'resultado'])) throw new BadRequestException('Acceso inválido.');
    const a = raw as Record<string, unknown>;
    const textos = (v: unknown) => Array.isArray(v) && v.length <= 50 && v.every(x => typeof x === 'string' && x.length <= 200);
    if (typeof a.actorId !== 'string' || !a.actorId || typeof a.endpoint !== 'string' || !a.endpoint
      || typeof a.recursoId !== 'string' || !a.recursoId || !textos(a.roles) || !textos(a.campos)
      || typeof a.resultado !== 'string' || !RESULTADOS.includes(a.resultado)) throw new BadRequestException('Acceso inválido.');
    await this.db.query(`INSERT INTO academic_work_plan."RundAccesoDatosLog"
      (id,actor_id,roles,endpoint,recurso_id,campos,resultado) VALUES ($1,$2,$3::text[],$4,$5,$6::text[],$7)`,
    [randomUUID(), a.actorId, a.roles, a.endpoint, a.recursoId, a.campos, a.resultado]);
    return { registrado: true };
  }
}

@Public()
@UseGuards(RundCatalogosGuard)
@Controller('internal/rund/v1/carpeta-historica')
export class RundCarpetaHistoricoController {
  constructor(private readonly historico: RundCarpetaHistoricoService) {}

  @Post('soportes') @HttpCode(200) @Header('Cache-Control', 'private, no-store')
  soportes(@Body() consulta: unknown) { return this.historico.soportesPorPersonas(consulta); }

  @Get('perfiles/:personaId') @Header('Cache-Control', 'private, no-store')
  perfiles(@Param('personaId', new ParseUUIDPipe()) personaId: string) { return this.historico.perfilesPorPersona(personaId); }

  @Get('soportes/:soporteId/persona') @Header('Cache-Control', 'private, no-store')
  persona(@Param('soporteId', new ParseUUIDPipe()) soporteId: string) { return this.historico.personaDeSoporte(soporteId); }

  @Post('originales/verificar') @HttpCode(200) @Header('Cache-Control', 'private, no-store')
  original(@Body() consulta: unknown) { return this.historico.verificarOriginal(consulta); }

  @Post('accesos') @HttpCode(200) @Header('Cache-Control', 'private, no-store')
  acceso(@Body() acceso: unknown) { return this.historico.registrarAcceso(acceso); }
}

@Module({ controllers: [RundCarpetaHistoricoController], providers: [RundCatalogosGuard, RundCarpetaHistoricoService] })
export class RundCarpetaHistoricoModule {}
