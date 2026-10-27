import { Body, ConflictException, Controller, ForbiddenException, Get, Param, ParseUUIDPipe, Post, Query, Req, SetMetadata } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { Request } from 'express';
import { DataSource } from 'typeorm';

import { PERMISO_PORTAL_VER } from '../auth/programacion-permissions.js';
import { ProgramacionPermissionsService } from '../auth/programacion-permissions.service.js';
import { EscrituraEn } from '../acceso/escritura.decorator.js';
import { CLAVE_PUBLICA } from '../auth/jwt-auth.guard.js';
import { idUserDe, rolesDe } from '../acceso/roles.js';
import { tokenDe } from '../acceso/token.js';
import { ConcertacionService } from './concertacion.service.js';
import { NivelesRequestService } from '../acceso/niveles-request.service.js';
import { PermisosPtaService } from './permisos-pta.service.js';

/**
 * Concertación de la docencia — EFDS-2315. Apagada por defecto.
 *
 * Orden nuevo (EFDS-2374, INTEGRACION-claude.md §23): el programador envía lo
 * asignado; revisores y aprobadores deciden con los permisos del PTA
 * (pta.review/approve.academica.<nivel>); el docente acepta (firma) o reporta una
 * novedad desde el portal. Toda escritura pasa además por el guard global
 * (periodo cerrado, EFDS-2301).
 */
@Controller('concertacion')
export class ConcertacionController {
  constructor(
    private readonly concertacion: ConcertacionService,
    private readonly permisosPta: PermisosPtaService,
    private readonly permisos: ProgramacionPermissionsService,
    private readonly niveles: NivelesRequestService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  /** El docente del usuario autenticado (identidad y vinculación del RUND). */
  private async docente(req: Request) {
    const idUser = idUserDe(req);
    const filas = await this.dataSource.query(
      `SELECT u.id_person::text AS "idPerson", d."tipoVinculacion" AS vinculacion
         FROM auth."user" u
         JOIN academic_work_plan."Docente" d ON d."personaId" = u.id_person
        WHERE u.id_user::text = $1
        ORDER BY d."updatedAt" DESC NULLS LAST LIMIT 1`, [idUser]);
    if (!filas.length) throw new ForbiddenException('El usuario autenticado no es un docente del RUND.');
    const portal = await this.permisos.resolvePortal(rolesDe(req));
    if (!portal.has(PERMISO_PORTAL_VER)) throw new ForbiddenException('No tiene acceso al portal docente.');
    return { idPerson: filas[0].idPerson, idUser, vinculacion: filas[0].vinculacion ?? null };
  }

  /** GET /concertacion/configuracion — si está encendida, modo de firma y revisiones requeridas. */
  // Pública: solo dice si está encendida y el corte. La consulta el PTA para el
  // interruptor único (EFDS-2315), sin token de usuario.
  @SetMetadata(CLAVE_PUBLICA, true)
  @Get('configuracion')
  async configuracion() {
    return { success: true, data: await this.concertacion.configuracion() };
  }

  /** GET /concertacion/mia?periodo= — concertaciones del docente autenticado. */
  @Get('mia')
  async mia(@Req() req: Request, @Query('periodo') periodo: string) {
    const d = await this.docente(req);
    return { success: true, data: await this.concertacion.delDocente(d.idPerson, String(periodo ?? '')) };
  }

  /**
   * POST /concertacion/enviar { idPeriodo, documento } — el PROGRAMADOR envía a revisión lo
   * asignado al docente, en los niveles que asigna (EFDS-2374).
   */
  @Post('enviar')
  @EscrituraEn({ periodo: { body: 'idPeriodo' } })
  async enviar(@Req() req: Request, @Body() body: { idPeriodo?: string; documento?: string }) {
    const niveles = await this.niveles.asignables(req);
    const data = await this.concertacion.enviar(
      { idUser: idUserDe(req), niveles }, String(body?.documento ?? ''), String(body?.idPeriodo ?? ''), tokenDe(req));
    return { success: true, data };
  }

  /** GET /concertacion/programador?periodo= — lo enviado, devuelto y con novedad, en sus niveles. */
  @Get('programador')
  async programador(@Req() req: Request, @Query('periodo') periodo: string) {
    const niveles = await this.niveles.asignables(req);
    return { success: true, data: await this.concertacion.delProgramador(niveles, String(periodo ?? '')) };
  }

  /** El docente ya no envía (EFDS-2374): se responde con el motivo, no con un 404 mudo. */
  @Post(':idPeriodo/enviar')
  @EscrituraEn({ periodo: { param: 'idPeriodo' } })
  async enviarDocente() {
    throw new ConflictException('El docente ya no envía su docencia: la envía el programador y usted la acepta en «Mi programación».');
  }

  /** POST /concertacion/:id/aceptar { codigo } — el docente acepta su programación y firma. */
  @Post(':id/aceptar')
  @EscrituraEn({ concertacion: { param: 'id' } })
  async aceptar(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string, @Body() body: { codigo?: string }) {
    const d = await this.docente(req);
    return { success: true, data: await this.concertacion.aceptar(id, d, body?.codigo, tokenDe(req)) };
  }

  /** POST /concertacion/:id/novedad { tipo, justificacion } — el docente reporta una novedad. */
  @Post(':id/novedad')
  @EscrituraEn({ concertacion: { param: 'id' } })
  async novedad(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string, @Body() body: { tipo?: string; justificacion?: string }) {
    const d = await this.docente(req);
    return { success: true, data: await this.concertacion.reportarNovedad(id, d, body?.tipo, body?.justificacion) };
  }

  /** GET /concertacion/bandeja?periodo= — por decidir, en los niveles donde el usuario decide. */
  @Get('bandeja')
  async bandeja(@Req() req: Request, @Query('periodo') periodo?: string) {
    const permisos = await this.permisosPta.resolver(idUserDe(req));
    return { success: true, data: await this.concertacion.bandeja(permisos, idUserDe(req), periodo || undefined) };
  }

  /** GET /concertacion/:id — detalle con firmas y revisiones. */
  @Get(':id')
  async detalle(@Param('id', ParseUUIDPipe) id: string) {
    return { success: true, data: await this.concertacion.detalle(id) };
  }

  /** POST /concertacion/:id/revisar — revisión requerida (hoy 'academica'), firmada. */
  @Post(':id/revisar')
  @EscrituraEn({ concertacion: { param: 'id' } })
  async revisar(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string, @Body() body: { tipo?: string; codigo?: string }) {
    const permisos = await this.permisosPta.resolver(idUserDe(req));
    return { success: true, data: await this.concertacion.revisar(id, body?.tipo ?? 'academica', idUserDe(req), permisos, body?.codigo) };
  }

  /** POST /concertacion/:id/devolver — con comentario obligatorio. */
  @Post(':id/devolver')
  @EscrituraEn({ concertacion: { param: 'id' } })
  async devolver(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string, @Body() body: { comentario?: string }) {
    const permisos = await this.permisosPta.resolver(idUserDe(req));
    return { success: true, data: await this.concertacion.devolver(id, idUserDe(req), permisos, body?.comentario) };
  }

  /** POST /concertacion/:id/aprobar — firmada; queda POR_ACEPTAR (la ve el docente). */
  @Post(':id/aprobar')
  @EscrituraEn({ concertacion: { param: 'id' } })
  async aprobar(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string, @Body() body: { codigo?: string }) {
    const permisos = await this.permisosPta.resolver(idUserDe(req));
    return { success: true, data: await this.concertacion.aprobar(id, idUserDe(req), permisos, body?.codigo) };
  }
}
