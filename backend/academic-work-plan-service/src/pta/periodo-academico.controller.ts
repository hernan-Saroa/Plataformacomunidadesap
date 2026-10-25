import {
  Controller,
  Delete,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { PeriodoAcademicoEntity } from './entities/periodo-academico.entity';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/public.decorator';
import { PtaService } from './pta.service';
import { efectoDeActivar } from './periodo-activacion';
import { fechaCivil, fechaCivilGuardada } from './fecha-periodo';
import { PtaPermissionsService } from './auth/pta-permissions.service';

/** Permiso propio de activar un periodo extraordinario (migración 672, EFDS-2346). */
export const PERMISO_ACTIVAR_EXTRAORDINARIO = 'pta.periodos.activar_extraordinario';

/** Código de un periodo personalizado: año, guion y 1 a 5 letras o dígitos (p. ej. 2027-INT). */
const CODIGO_PERSONALIZADO = /^\d{4}-[A-Z0-9]{1,5}$/;

/** El periodo ACTIVO de la plataforma es el principal: en curso y no extraordinario (EFDS-2346). */
export const esPrincipalEnCurso = (p: { estado: string; extraordinario?: boolean }) =>
  p.estado === 'en_curso' && !p.extraordinario;

@UseGuards(RolesGuard)
@Controller(['periodos-academicos', 'pta/periodos-academicos'])
export class PeriodoAcademicoController {
  constructor(
    @InjectRepository(PeriodoAcademicoEntity)
    private readonly repo: Repository<PeriodoAcademicoEntity>,
    private readonly ptaService: PtaService,
    private readonly permisos: PtaPermissionsService,
  ) {}

  @Public()
  @Get()
  async list() {
    let periods = await this.repo.find({
      order: { createdAt: 'DESC', anio: 'DESC', semestre: 'DESC' },
    });

    if (periods.length === 0) {
      const defaultPeriod = this.repo.create({
        codigo: '2025-2',
        anio: 2025,
        semestre: 2,
        fechaInicio: '2025-08-01',
        fechaFin: '2025-12-15',
        estado: 'en_curso',
      });
      try {
        await this.repo.save(defaultPeriod);
        periods = [defaultPeriod];
      } catch (e) {
        console.warn('Error seeding default period:', e);
      }
    }
    // EFDS-2346: con un extraordinario en curso, el principal va antes que él. Así
    // quien busca «el activo» con el primer en curso de la lista recibe el principal.
    const principal = periods.findIndex(esPrincipalEnCurso);
    const extra = periods.findIndex((p) => p.estado === 'en_curso' && p.extraordinario);
    if (principal > -1 && extra > -1 && extra < principal) {
      const [p] = periods.splice(principal, 1);
      periods.splice(extra, 0, p);
    }
    return periods;
  }

  /**
   * POST /periodos-academicos/:id/activar-extraordinario { motivo } — EFDS-2346.
   *
   * Pone el periodo en curso COMO EXTRAORDINARIO, a la vez que el principal. Es una
   * excepción: permiso propio, motivo obligatorio, cualquier tipo de periodo, uno a
   * la vez. No cierra el principal, no mueve otros periodos y no termina ningún PTA.
   */
  @Roles('GESTION_PROFESORAL', 'ADMIN_PROGRAMACION', 'SUPER_ADMIN', 'super_admin')
  @Post(':id/activar-extraordinario')
  async activarExtraordinario(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    const idUser = String(req?.user?.userId ?? req?.user?.sub ?? '');
    const ctx = await this.permisos.resolveForUser(idUser);
    if (!ctx.isSuperUser && !ctx.permissions.has(PERMISO_ACTIVAR_EXTRAORDINARIO)) {
      throw new ForbiddenException('Activar un periodo extraordinario requiere el permiso «Periodos — Activar periodo extraordinario».');
    }
    const motivo = String(body?.motivo ?? '').trim();
    if (motivo.length < 10) throw new BadRequestException('Explique el motivo del periodo extraordinario (mínimo 10 caracteres).');
    const period = await this.repo.findOne({ where: { id } });
    if (!period) throw new NotFoundException('Periodo académico no encontrado.');
    if (period.estado === 'en_curso') {
      throw new ConflictException(`El periodo ${period.codigo} ya está en curso${period.extraordinario ? ' como extraordinario' : ''}.`);
    }
    if (period.estado === 'cerrado') {
      throw new ConflictException(`El periodo ${period.codigo} está cerrado: no se activa como extraordinario.`);
    }
    const otro = await this.repo.findOne({ where: { estado: 'en_curso', extraordinario: true } });
    if (otro) {
      throw new ConflictException(`Ya hay un periodo extraordinario en curso (${otro.codigo}): ciérrelo antes de activar otro.`);
    }
    period.estado = 'en_curso';
    period.extraordinario = true;
    period.motivoExtraordinario = motivo;
    period.extraordinarioPor = idUser || null;
    period.extraordinarioEn = new Date();
    try {
      return await this.repo.save(period);
    } catch (error) {
      this.rethrowDatabaseError(error, period.codigo);
    }
  }

  @Roles('GESTION_PROFESORAL', 'ADMIN_PROGRAMACION', 'SUPER_ADMIN', 'super_admin')
  @Post()
  async create(@Body() body: any) {
    const { anio, semestre, fechaInicio, fechaFin } = body;
    // EFDS-2346: un periodo personalizado (p. ej. interperiodo) es un periodo más, con
    // las mismas reglas; lo distinguen su código y su nombre, no un semestre.
    const personalizado = String(body?.tipo ?? 'semestral') === 'personalizado';
    if (!personalizado && body?.tipo != null && body.tipo !== 'semestral') {
      throw new BadRequestException("El tipo de periodo debe ser 'semestral' o 'personalizado'.");
    }

    const parsedAnio = parseInt(anio, 10);
    const parsedSemestre = personalizado ? null : parseInt(semestre, 10);

    if (isNaN(parsedAnio) || parsedAnio < 2020 || parsedAnio > 2050) {
      throw new BadRequestException('El año debe ser un número entero entre 2020 y 2050.');
    }

    if (!personalizado && parsedSemestre !== 1 && parsedSemestre !== 2) {
      throw new BadRequestException('El semestre debe ser 1 o 2.');
    }
    const nombre = String(body?.nombre ?? '').trim();
    const codigoPersonalizado = String(body?.codigo ?? '').trim().toUpperCase();
    if (personalizado) {
      if (!nombre) throw new BadRequestException('Un periodo personalizado necesita un nombre (p. ej. «Interperiodo 2027»).');
      if (!CODIGO_PERSONALIZADO.test(codigoPersonalizado) || !codigoPersonalizado.startsWith(`${parsedAnio}-`)) {
        throw new BadRequestException(`El código debe ser el año, un guion y hasta 5 letras o dígitos (p. ej. ${parsedAnio}-INT).`);
      }
      if (/^\d{4}-[12]$/.test(codigoPersonalizado)) {
        throw new BadRequestException('Ese código es de un periodo semestral.');
      }
    }

    if (!fechaInicio || !fechaFin) {
      throw new BadRequestException('Se requieren las fechas de inicio y fin.');
    }

    // Fechas civiles (sin hora ni zona): ver fecha-periodo.ts.
    const start = fechaCivil(fechaInicio, 'Las fechas de inicio y fin deben ser fechas válidas.');
    const end = fechaCivil(fechaFin, 'Las fechas de inicio y fin deben ser fechas válidas.');

    if (end <= start) {
      throw new BadRequestException('La fecha de fin debe ser posterior a la fecha de inicio.');
    }

    const codigo = personalizado ? codigoPersonalizado : `${parsedAnio}-${parsedSemestre}`;

    // Validar si ya existe el código o la combinación de año y semestre
    const existing = await this.repo.findOne({
      where: personalizado ? [{ codigo }] : [{ codigo }, { anio: parsedAnio, semestre: parsedSemestre! }],
    });

    if (existing) {
      throw new ConflictException(`Ya existe un periodo académico configurado para ${codigo}.`);
    }

    await this.validateNoDateOverlap(start, end);

    const newPeriod = this.repo.create({
      codigo,
      anio: parsedAnio,
      semestre: parsedSemestre,
      tipo: personalizado ? 'personalizado' : 'semestral',
      nombre: personalizado ? nombre : null,
      fechaInicio: start,
      fechaFin: end,
      estado: 'planeacion',
    });

    // Nota: la finalización de los PTA de períodos anteriores NO ocurre al crear el
    // período (queda en 'planeacion'), sino cuando el período se pone "en curso"
    // (ver update()). Así no se cierran PTAs activos por planear un período futuro.
    try {
      return await this.repo.save(newPeriod);
    } catch (error) {
      this.rethrowDatabaseError(error, codigo);
    }
  }

  @Roles('GESTION_PROFESORAL', 'ADMIN_PROGRAMACION', 'SUPER_ADMIN', 'super_admin')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    const period = await this.repo.findOne({ where: { id } });
    if (!period) {
      throw new NotFoundException('Periodo académico no encontrado.');
    }

    const { anio, semestre, fechaInicio, fechaFin, estado } = body;
    // EFDS-2346: el personalizado no tiene semestre; su identidad (código) no se edita.
    const personalizado = period.tipo === 'personalizado';
    if (personalizado && (anio !== undefined || semestre !== undefined)) {
      throw new BadRequestException('El año y el código de un periodo personalizado no se modifican.');
    }
    if (personalizado && body?.nombre !== undefined) {
      const nombre = String(body.nombre ?? '').trim();
      if (!nombre) throw new BadRequestException('El nombre del periodo personalizado no puede quedar vacío.');
      period.nombre = nombre;
    }
    const parsedAnio = anio !== undefined ? parseInt(anio, 10) : period.anio;
    const parsedSemestre = semestre !== undefined
      ? parseInt(semestre, 10)
      : period.semestre;
    const identityChanged =
      parsedAnio !== period.anio || parsedSemestre !== period.semestre;

    if (isNaN(parsedAnio) || parsedAnio < 2020 || parsedAnio > 2050) {
      throw new BadRequestException('El año debe ser un número entero entre 2020 y 2050.');
    }
    if (!personalizado && parsedSemestre !== 1 && parsedSemestre !== 2) {
      throw new BadRequestException('El semestre debe ser 1 o 2.');
    }

    if (identityChanged) {
      if (period.estado !== 'planeacion') {
        throw new BadRequestException(
          'El año y semestre solo pueden modificarse mientras el periodo esté en planeación.',
        );
      }

      const usage = await this.getPeriodUsage(period.id, period.codigo);
      if (usage.total > 0) {
        throw new ConflictException(
          'No se puede cambiar el año o semestre porque el periodo ya tiene catálogo, CETAP o PTA asociados.',
        );
      }

      const nextCode = `${parsedAnio}-${parsedSemestre}`;
      const duplicate = await this.repo
        .createQueryBuilder('period')
        .where('period.id <> :id', { id })
        .andWhere('(period.codigo = :code OR (period.anio = :year AND period.semestre = :semester))', {
          code: nextCode,
          year: parsedAnio,
          semester: parsedSemestre,
        })
        .getOne();
      if (duplicate) {
        throw new ConflictException(
          `Ya existe un periodo académico configurado para ${nextCode}.`,
        );
      }

      period.anio = parsedAnio;
      period.semestre = parsedSemestre;
      period.codigo = nextCode;
    }

    if (fechaInicio) {
      period.fechaInicio = fechaCivil(fechaInicio, 'Fecha de inicio no válida.');
    }

    if (fechaFin) {
      period.fechaFin = fechaCivil(fechaFin, 'Fecha de fin no válida.');
    }

    if (fechaCivilGuardada(period.fechaFin) <= fechaCivilGuardada(period.fechaInicio)) {
      throw new BadRequestException('La fecha de fin debe ser posterior a la fecha de inicio.');
    }

    if (fechaInicio || fechaFin) {
      await this.validateNoDateOverlap(
        fechaCivilGuardada(period.fechaInicio),
        fechaCivilGuardada(period.fechaFin),
        period.id,
      );
    }

    if (estado) {
      const validStates = ['planeacion', 'concertacion', 'en_curso', 'cerrado'];
      if (!validStates.includes(estado)) {
        throw new BadRequestException(`El estado debe ser uno de: ${validStates.join(', ')}`);
      }

      // EFDS-2346: la regla de «exactamente un activo» es del PRINCIPAL. El
      // extraordinario se cierra por aquí sin exigir otro activo.
      if (estado !== 'en_curso' && esPrincipalEnCurso(period)) {
        const activeCount = await this.repo.count({ where: { estado: 'en_curso', extraordinario: false } });
        if (activeCount <= 1) {
          throw new BadRequestException(
            'Debe haber exactamente un periodo activo ("En Curso") en el sistema. ' +
            'Active otro periodo para archivar o cambiar el estado de este automáticamente.'
          );
        }
      }
      if (estado === 'en_curso' && period.estado === 'en_curso' && period.extraordinario) {
        throw new ConflictException(
          `El periodo ${period.codigo} está en curso como extraordinario: ciérrelo antes de activarlo como periodo principal.`);
      }

      period.estado = estado;

      if (estado === 'en_curso') {
        period.extraordinario = false;
        const allOtherPeriods = await this.repo.find();
        for (const p of allOtherPeriods) {
          if (p.id !== period.id) {
            // Misma regla que la vista previa de impacto (periodo-activacion.ts):
            // el extraordinario en curso no se toca.
            const efecto = efectoDeActivar(period, p);
            if (efecto) p.estado = efecto;
            await this.repo.save(p);
          }
        }

        // Reactivar un período recupera primero el estado funcional de sus PTAs;
        // después, los PTAs de los demás períodos quedan en cierre reversible.
        // Best-effort: un fallo de sincronización no bloquea la gestión del periodo.
        try {
          await this.ptaService.restaurarPtasPorReactivacionPeriodo(period.codigo);
          await this.ptaService.finalizarPtasPorNuevoPeriodo(period.codigo);
        } catch (e) {
          console.warn('No se pudieron sincronizar los PTA al activar el período:', (e as any)?.message);
        }
      }
    }

    try {
      return await this.repo.save(period);
    } catch (error) {
      this.rethrowDatabaseError(error, period.codigo);
    }
  }

  @Roles('GESTION_PROFESORAL', 'SUPER_ADMIN', 'super_admin')
  @Delete(':id')
  async remove(@Param('id') id: string) {
    const period = await this.repo.findOne({ where: { id } });
    if (!period) {
      throw new NotFoundException('Periodo académico no encontrado.');
    }

    if (period.estado === 'en_curso') {
      throw new BadRequestException('No se puede eliminar el periodo académico activo.');
    }
    if (period.estado !== 'planeacion') {
      throw new BadRequestException(
        'Solo se pueden eliminar periodos que estén en planeación.',
      );
    }

    const usage = await this.getPeriodUsage(period.id, period.codigo);
    if (usage.total > 0) {
      throw new ConflictException(
        `No se puede eliminar ${period.codigo}: tiene ${usage.ofertas} ofertas, `
        + `${usage.cetaps} CETAP y ${usage.ptas} PTA asociados.`,
      );
    }

    try {
      await this.repo.remove(period);
    } catch (error) {
      this.rethrowDatabaseError(error, period.codigo);
    }
    return {
      success: true,
      id,
      codigo: period.codigo,
      message: `Periodo ${period.codigo} eliminado correctamente.`,
    };
  }

  /**
   * GET /periodos-academicos/:id/impacto-activacion — EFDS-2328.
   *
   * Vista previa, de solo lectura, de lo que haría activar el periodo: cuántos
   * PTA quedan terminados y de qué periodos, y qué periodos se cierran o
   * vuelven a planeación. Usa las MISMAS reglas que la activación
   * (CONDICION_PTA_A_FINALIZAR y efectoDeActivar), para que la confirmación no
   * pueda diferir de lo que pasa. La consume la pantalla de periodos de
   * Programación Académica antes de activar.
   */
  @Roles('GESTION_PROFESORAL', 'ADMIN_PROGRAMACION', 'SUPER_ADMIN', 'super_admin')
  @Get(':id/impacto-activacion')
  async impactoActivacion(@Param('id') id: string) {
    const period = await this.repo.findOne({ where: { id } as any });
    if (!period) {
      throw new NotFoundException('Periodo académico no encontrado.');
    }
    // Si la regla de terminación falla en esta base, la activación también falla
    // (la atrapa como advertencia y NO termina ningún PTA). La vista previa lo
    // dice en vez de inventar un número: `ptasATerminar: null` + `advertencia`.
    let porPeriodo: Array<{ codigo: string | null; ptas: number }> | null = null;
    let advertencia: string | null = null;
    try {
      porPeriodo = await this.ptaService.contarPtasAFinalizarPorNuevoPeriodo(period.codigo);
    } catch (e: any) {
      advertencia = 'La regla que termina los PTA al activar falla en esta base de datos'
        + ` (${e?.message ?? 'error de consulta'}). Activar NO terminará ningún PTA hasta corregirla.`;
    }
    const otros = await this.repo.find();
    const cerrar = otros.filter((p) => efectoDeActivar(period, p) === 'cerrado' && p.estado !== 'cerrado');
    const aPlaneacion = otros.filter((p) => efectoDeActivar(period, p) === 'planeacion' && p.estado !== 'planeacion');
    return {
      codigo: period.codigo,
      yaActivo: period.estado === 'en_curso',
      ptasATerminar: porPeriodo ? porPeriodo.reduce((s, x) => s + x.ptas, 0) : null,
      porPeriodo: porPeriodo ?? [],
      periodosACerrar: cerrar.map((p) => p.codigo),
      periodosAPlaneacion: aPlaneacion.map((p) => p.codigo),
      advertencia,
    };
  }

  @Public()
  @Get(':id/detalle')
  async getDetail(@Param('id') id: string) {
    const period = await this.repo.findOne({ where: { id } });
    if (!period) {
      throw new NotFoundException('Periodo académico no encontrado.');
    }

    const programsQuery = `
      SELECT 
        p.id, 
        p.codigo, 
        p.nombre, 
        COUNT(DISTINCT o.id_cetap)::int AS "activeCetaps", 
        COUNT(DISTINCT a.id)::int AS "subjectsCount"
      FROM academic_work_plan.oferta_cetap_programa o
      INNER JOIN academic_work_plan.programa p ON o.id_programa = p.id
      LEFT JOIN academic_work_plan.asignatura a ON a.id_programa = p.id AND a.activa = TRUE
      WHERE o.id_periodo_academico = $1 AND o.activa = TRUE
        AND NOT EXISTS (
          SELECT 1
            FROM academic_work_plan.periodo_cetap override
           WHERE override.id_periodo_academico = o.id_periodo_academico
             AND override.id_cetap = o.id_cetap
             AND override.activo = FALSE
        )
      GROUP BY p.id, p.codigo, p.nombre
      ORDER BY p.nombre
    `;

    // Primero intentar con oferta_cetap_programa (requiere programas asignados)
    const cetapsFromOfertas = `
      SELECT 
        c.id, 
        c.codigo,
        c.nombre, 
        dt.nombre AS "dtNombre", 
        COUNT(DISTINCT o.id_programa)::int AS "activePrograms"
      FROM academic_work_plan.oferta_cetap_programa o
      INNER JOIN academic_work_plan.cetap c ON o.id_cetap = c.id
      INNER JOIN academic_work_plan.direccion_territorial dt ON c.id_direccion_territorial = dt.id
      WHERE o.id_periodo_academico = $1 AND o.activa = TRUE
        AND NOT EXISTS (
          SELECT 1
            FROM academic_work_plan.periodo_cetap override
           WHERE override.id_periodo_academico = o.id_periodo_academico
             AND override.id_cetap = o.id_cetap
             AND override.activo = FALSE
        )
      GROUP BY c.id, c.codigo, c.nombre, dt.nombre
      ORDER BY c.nombre
    `;

    // NOTA: A propósito ya NO se incluyen los CETAP provenientes de
    // academic_work_plan.periodo_cetap (la activación ESTRUCTURAL por periodo del
    // módulo "Estructura Organizacional"). En el módulo de Programas Académicos los
    // CETAP solo tienen sentido si OFRECEN programas en el periodo; por eso aquí la
    // única fuente es oferta_cetap_programa. Así un periodo sin programas/ofertas
    // muestra 0 CETAP (no CETAP "sueltos" del catálogo estructural).

    // Programas creados directamente para este período (migración 359).
    // Se consultan aparte y se combinan con los provenientes de ofertas para
    // que el detalle del período muestre también los programas creados en él
    // aunque todavía no tengan oferta/CETAP asignado. Si la columna no existe
    // (migración no aplicada), el catch deja la lista vacía y no afecta nada.
    //
    // Además, si el período consultado es el ACTIVO (en_curso), se incluyen los
    // programas heredados/sin período propio y sin ofertas, que viven en el
    // período activo (mismo criterio que el listado de programas).
    // EFDS-2346: el ACTIVO es el principal; el extraordinario no hereda los programas sin periodo.
    const periodoActivo = esPrincipalEnCurso(period);
    const programsPropiosQuery = `
      SELECT
        p.id,
        p.codigo,
        p.nombre,
        0::int AS "activeCetaps",
        COUNT(DISTINCT a.id)::int AS "subjectsCount"
      FROM academic_work_plan.programa p
      LEFT JOIN academic_work_plan.asignatura a ON a.id_programa = p.id AND a.activa = TRUE
      WHERE p.id_periodo_academico = $1
        ${periodoActivo ? `OR (
          p.id_periodo_academico IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM academic_work_plan.oferta_cetap_programa o2
            WHERE o2.id_programa = p.id AND o2.activa = TRUE
          )
        )` : ''}
      GROUP BY p.id, p.codigo, p.nombre
      ORDER BY p.nombre
    `;

    let programs: any[] = [];
    let programsPropios: any[] = [];
    let cetapsOfertas = [];

    try {
      programs = await this.repo.query(programsQuery, [id]);
    } catch (e) {
      console.warn('Error querying programs for period:', e.message);
    }

    try {
      programsPropios = await this.repo.query(programsPropiosQuery, [id]);
    } catch (e) {
      console.warn('Error querying owned programs for period:', e.message);
    }

    // Combinar ambas fuentes por id de programa (la oferta conserva activeCetaps reales).
    if (programsPropios.length > 0) {
      const programsById = new Map<string, any>();
      [...programsPropios, ...programs].forEach((prog: any) => {
        const key = String(prog.id);
        const current = programsById.get(key);
        programsById.set(key, {
          ...current,
          ...prog,
          activeCetaps: Math.max(
            Number(current?.activeCetaps || 0),
            Number(prog.activeCetaps || 0),
          ),
          subjectsCount: Math.max(
            Number(current?.subjectsCount || 0),
            Number(prog.subjectsCount || 0),
          ),
        });
      });
      programs = Array.from(programsById.values()).sort((a: any, b: any) =>
        String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es'),
      );
    }

    try {
      cetapsOfertas = await this.repo.query(cetapsFromOfertas, [id]);
    } catch (e) {
      console.warn('Error querying oferta_cetap_programa:', e.message);
    }

    // Los CETAP del periodo son ÚNICAMENTE los que ofrecen programas (oferta activa).
    const cetaps = [...cetapsOfertas].sort((a: any, b: any) =>
      String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es'),
    );

    return {
      success: true,
      periodo: period,
      programs,
      cetaps
    };
  }

  private async validateNoDateOverlap(
    start: string,
    end: string,
    excludeId?: string,
  ): Promise<void> {
    const parameters: any[] = [start, end];
    let exclusion = '';
    if (excludeId) {
      parameters.push(excludeId);
      exclusion = 'AND id <> $3';
    }

    const overlaps = await this.repo.query(
      `SELECT codigo
       FROM academic_work_plan.periodo_academico
       WHERE daterange(fecha_inicio, fecha_fin, '[]')
         && daterange($1::date, $2::date, '[]')
         ${exclusion}
       LIMIT 1`,
      parameters,
    );
    if (overlaps.length > 0) {
      throw new ConflictException(
        `Las fechas se cruzan con el periodo ${overlaps[0].codigo}.`,
      );
    }
  }

  private async getPeriodUsage(
    periodId: string,
    periodCode: string,
  ): Promise<{ ofertas: number; cetaps: number; ptas: number; total: number }> {
    const [row] = await this.repo.query(
      `SELECT
         (SELECT COUNT(*)::int
          FROM academic_work_plan.oferta_cetap_programa
          WHERE id_periodo_academico = $1) AS ofertas,
         (SELECT COUNT(*)::int
          FROM academic_work_plan.periodo_cetap
          WHERE id_periodo_academico = $1) AS cetaps,
         (SELECT COUNT(*)::int
          FROM academic_work_plan."PlanTrabajoAcademico"
          WHERE periodo = $2) AS ptas`,
      [periodId, periodCode],
    );
    const ofertas = Number(row?.ofertas || 0);
    const cetaps = Number(row?.cetaps || 0);
    const ptas = Number(row?.ptas || 0);
    return {
      ofertas,
      cetaps,
      ptas,
      total: ofertas + cetaps + ptas,
    };
  }

  private rethrowDatabaseError(error: unknown, code: string): never {
    if (error instanceof QueryFailedError) {
      const driverError = error.driverError as {
        code?: string;
        constraint?: string;
      };
      if (driverError.code === '23505') {
        throw new ConflictException(
          `Ya existe un periodo académico configurado para ${code}.`,
        );
      }
      if (driverError.code === '23503') {
        throw new ConflictException(
          `No se puede eliminar ${code} porque tiene información asociada.`,
        );
      }
      if (driverError.code === '23514') {
        throw new BadRequestException(
          'El semestre, las fechas o el estado del periodo no son válidos.',
        );
      }
    }
    throw error;
  }
}
