import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Public } from '../../auth/public.decorator';
import { getRequestRoleCodes } from '../banco-docentes/banco-docentes-sensitive-data';
import { MacroDocentePermissionGuard } from './macro-docente-permission.guard';
import { MACRO_DOCENTE_PERMISOS, RequierePermisoMacroDocente } from './macro-docente-permission.decorator';
import { MacroDocenteService } from './macro-docente.service';

/**
 * REQ-RUND-F020 / F022 — Macro Docente: historial nacional de asignaturas
 * dictadas por docente, consultas puntuales de entes de control, y acceso
 * externo temporal auditado.
 *
 * Autorización por PERMISO (pta.macro_docente.*, ver
 * macro-docente-permission.decorator.ts), no por rol fijo en código: qué
 * roles tienen cada permiso se administra en auth.role_permissions (migración
 * 418), igual que ya hace la aprobación por componente del PTA. Así se puede
 * dar/quitar acceso a un rol sin tocar ni redeployar este archivo.
 */
@Controller(['macro-docente', 'pta/macro-docente'])
@UseGuards(MacroDocentePermissionGuard)
export class MacroDocenteController {
  constructor(private readonly service: MacroDocenteService) {}

  private requestContext(req: any): { actorId: string; roles: string[]; ip?: string } {
    const roles = getRequestRoleCodes(req?.user);
    const forwarded = req?.headers?.['x-forwarded-for'];
    const ip = String(Array.isArray(forwarded) ? forwarded[0] : forwarded || req?.ip || req?.socket?.remoteAddress || '')
      .split(',')[0]
      .trim() || undefined;
    return {
      actorId: String(req?.user?.userId || req?.user?.email || req?.user?.username || 'SISTEMA'),
      roles,
      ip,
    };
  }

  @Get()
  @RequierePermisoMacroDocente(MACRO_DOCENTE_PERMISOS.CONSULTAR)
  async getHistorial(
    @Query('docenteId') docenteId: string | undefined,
    @Query('periodo') periodo: string | undefined,
    @Query('territorial') territorial: string | undefined,
    @Query('cetap') cetap: string | undefined,
    @Query('programa') programa: string | undefined,
    @Query('nucleoTematico') nucleoTematico: string | undefined,
    @Query('page') page: string | undefined,
    @Query('limit') limit: string | undefined,
    @Req() req: any,
  ) {
    const filters = {
      docenteId,
      periodo,
      territorial,
      cetap,
      programa,
      nucleoTematico,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    };
    const result = await this.service.getHistorial(filters);
    const context = this.requestContext(req);
    await this.service.logConsulta({
      tipoConsulta: 'MACRO_DOCENTE',
      actorId: context.actorId,
      roles: context.roles,
      docenteId: docenteId || null,
      periodo: periodo || null,
      filtros: filters,
      totalResultados: result.total,
      ip: context.ip,
      failClosed: false,
    });
    return { success: true, ...result };
  }

  /** REQ-RUND-F022 — "¿qué dictó el docente X en el período Y?" */
  @Get('consulta')
  @RequierePermisoMacroDocente(MACRO_DOCENTE_PERMISOS.CONSULTAR)
  async getConsultaPuntual(
    @Query('docenteId') docenteId: string,
    @Query('periodo') periodo: string,
    @Req() req: any,
  ) {
    const items = await this.service.getConsultaPuntual(docenteId, periodo);
    const context = this.requestContext(req);
    await this.service.logConsulta({
      tipoConsulta: 'CONSULTA_PUNTUAL',
      actorId: context.actorId,
      roles: context.roles,
      docenteId,
      periodo,
      totalResultados: items.length,
      ip: context.ip,
      failClosed: false,
    });
    return { success: true, items, total: items.length };
  }

  // ═══════════════════════════════════════════════════════════════
  // Acceso externo temporal (otorgado siempre por quien tenga el permiso
  // pta.macro_docente.gestionar_accesos_externos — GGP/Dirección)
  // ═══════════════════════════════════════════════════════════════

  @Post('accesos-externos')
  @RequierePermisoMacroDocente(MACRO_DOCENTE_PERMISOS.GESTIONAR_ACCESOS_EXTERNOS)
  async crearAccesoExterno(@Body() body: any, @Req() req: any) {
    const context = this.requestContext(req);
    const acceso = await this.service.crearAccesoExterno(body, context.actorId);
    return { success: true, data: acceso };
  }

  @Get('accesos-externos')
  @RequierePermisoMacroDocente(MACRO_DOCENTE_PERMISOS.GESTIONAR_ACCESOS_EXTERNOS)
  async listarAccesosExternos() {
    const [accesos, bitacora] = await Promise.all([
      this.service.listarAccesosExternos(),
      this.service.listarBitacora(100),
    ]);
    return { success: true, data: { accesos, bitacora } };
  }

  @Delete('accesos-externos/:id')
  @RequierePermisoMacroDocente(MACRO_DOCENTE_PERMISOS.GESTIONAR_ACCESOS_EXTERNOS)
  async revocarAccesoExterno(@Param('id') id: string, @Req() req: any) {
    const context = this.requestContext(req);
    const acceso = await this.service.revocarAccesoExterno(id, context.actorId);
    return { success: true, data: acceso };
  }

  /**
   * Acceso público (sin sesión ESAP) para el ente externo: la vigencia y el
   * docente cubierto ya fueron definidos por quien creó el acceso. Sin
   * @RequierePermisoMacroDocente el guard deja pasar sin exigir usuario.
   * Falla cerrado si no se puede auditar la consulta.
   */
  @Public()
  @Get('externo/:token')
  async getHistorialExterno(
    @Param('token') token: string,
    @Query('periodo') periodo: string | undefined,
    @Query('page') page: string | undefined,
    @Query('limit') limit: string | undefined,
    @Req() req: any,
  ) {
    const acceso = await this.service.validarAccesoExterno(token);
    const filters = {
      periodo,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    };
    const result = await this.service.getHistorialParaAccesoExterno(acceso, filters);
    const context = this.requestContext(req);
    await this.service.logConsulta({
      tipoConsulta: 'EXTERNA',
      actorId: `ENTE_EXTERNO:${acceso.enteNombre}`,
      accesoExternoId: acceso.id,
      docenteId: acceso.docenteId,
      periodo: periodo || null,
      filtros: filters,
      totalResultados: result.total,
      ip: context.ip,
      failClosed: true,
    });
    return { success: true, ...result };
  }
}
