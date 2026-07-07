import { Controller, Get, Query, Param, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Public } from '../auth/public.decorator';
import { DireccionTerritorialEntity } from './entities/direccion-territorial.entity';
import { CetapEntity } from './entities/cetap.entity';
import { ProgramaEntity } from './entities/programa.entity';
import { AsignaturaEntity } from './entities/asignatura.entity';
import { OfertaCetapProgramaEntity } from './entities/oferta-cetap-programa.entity';
import { PeriodoAcademicoEntity } from './entities/periodo-academico.entity';
import { HorasPtaCalculator } from './horas-pta.calculator';

@Public()
@Controller(['cascada', 'pta/cascada'])
export class CascadaController {
  constructor(
    @InjectRepository(DireccionTerritorialEntity)
    private readonly dtRepo: Repository<DireccionTerritorialEntity>,
    @InjectRepository(CetapEntity)
    private readonly cetapRepo: Repository<CetapEntity>,
    @InjectRepository(ProgramaEntity)
    private readonly programaRepo: Repository<ProgramaEntity>,
    @InjectRepository(AsignaturaEntity)
    private readonly asignaturaRepo: Repository<AsignaturaEntity>,
  ) {}

  @Get('direcciones-territoriales')
  async getDireccionesTerritoriales() {
    const data = await this.dtRepo.find({
      where: { activo: true },
      order: { ordenVisualizacion: 'ASC' },
    });
    return { success: true, data };
  }

  @Get('cetaps')
  async getCetaps(
    @Query('direccion_territorial_id') dtId: string,
    @Query('periodo') periodoCodigo?: string,
  ) {
    const period = periodoCodigo || '2025-2';
    const query = this.cetapRepo.createQueryBuilder('cetap')
      .innerJoin('cetap.direccionTerritorial', 'dt')
      .where('dt.id = :dtId', { dtId })
      .andWhere('cetap.activo = true');

    if (period) {
      query.innerJoin(
        OfertaCetapProgramaEntity,
        'oferta',
        'oferta.id_cetap = cetap.id AND oferta.activa = true'
      )
      .innerJoin(
        PeriodoAcademicoEntity,
        'periodo',
        'oferta.id_periodo_academico = periodo.id AND periodo.codigo = :period',
        { period }
      );
    }

    const data = await query.orderBy('cetap.nombre', 'ASC').getMany();
    return { success: true, data };
  }

  @Get('programas')
  async getProgramas(
    @Query('cetap_id') cetapId: string,
    @Query('periodo') periodCodigo?: string,
  ) {
    const period = periodCodigo || '2025-2';

    // The cetapId may come from either academic_work_plan.cetap.id or auth.sedes.id_sede.
    // Use a raw query that resolves both ID types via cross-schema lookup (nombre_normalizado).
    // First try with exact periodo match, then fallback to any active oferta.
    let data = await this.programaRepo.manager.query(
      `
      SELECT DISTINCT p.*
      FROM academic_work_plan.programa p
      INNER JOIN academic_work_plan.oferta_cetap_programa ocp
        ON ocp.id_programa = p.id AND ocp.activa = true
      INNER JOIN academic_work_plan.periodo_academico per
        ON ocp.id_periodo_academico = per.id AND per.codigo = $2
      INNER JOIN academic_work_plan.cetap c
        ON c.id = ocp.id_cetap
      WHERE p.activo = true
        AND (
          c.id::text = $1
          OR c.nombre_normalizado = (
            SELECT LOWER(REPLACE(TRIM(s.nom_sede), ' ', ''))
            FROM auth.sedes s
            WHERE s.id_sede::text = $1
            LIMIT 1
          )
        )
      ORDER BY p.nombre ASC
      `,
      [cetapId, period],
    );

    // Fallback: if no results with exact periodo, try with any active oferta
    if (data.length === 0) {
      data = await this.programaRepo.manager.query(
        `
        SELECT DISTINCT p.*
        FROM academic_work_plan.programa p
        INNER JOIN academic_work_plan.oferta_cetap_programa ocp
          ON ocp.id_programa = p.id AND ocp.activa = true
        INNER JOIN academic_work_plan.cetap c
          ON c.id = ocp.id_cetap
        WHERE p.activo = true
          AND (
            c.id::text = $1
            OR c.nombre_normalizado = (
              SELECT LOWER(REPLACE(TRIM(s.nom_sede), ' ', ''))
              FROM auth.sedes s
              WHERE s.id_sede::text = $1
              LIMIT 1
            )
          )
        ORDER BY p.nombre ASC
        `,
        [cetapId],
      );
    }

    const nivelFormacionMap: Record<string, string> = {
      pregrado: 'Pregrado',
      especializacion: 'Especialización',
      maestria: 'Maestría',
    };
    const mappedData = data.map((p: any) => ({
      ...p,
      nivel: nivelFormacionMap[p.tipo] || p.tipo || 'Pregrado',
    }));

    return { success: true, data: mappedData };
  }

  @Get('asignaturas')
  async getAsignaturas(@Query('programa_id') programaId: string) {
    const asignaturas = await this.asignaturaRepo.find({
      where: { idPrograma: programaId, activa: true },
      relations: ['programaRel', 'ubicacionSemestralRel', 'nucleoTematicoRel'],
      order: { idUbicacionSemestral: 'ASC', nombre: 'ASC' },
    });

    const data = asignaturas.map(asig => {
      const horasPta = HorasPtaCalculator.calcularHorasPTA(
        {
          creditos: asig.creditos,
          tipoExcepcion: asig.tipoExcepcion,
          horasFijasPta: asig.horasFijasPta,
        },
        {
          horasBasePorCredito: asig.programaRel.horasBasePorCredito,
          horasPregradoCentral: asig.programaRel.horasPregradoCentral,
        }
      );

      const horasClase = Math.round(horasPta / 3);

      return {
        id: asig.id,
        codigo: asig.codigo,
        nombre: asig.nombre,
        nombreBase: asig.nombreBase,
        creditos: asig.creditos,
        semestre: asig.ubicacionSemestralRel?.etiqueta || String(asig.idUbicacionSemestral),
        nucleoTematico: asig.nucleoTematicoRel?.nombre || '',
        modalidad: asig.modalidad,
        horas_clase: horasClase,
        horas_pta: horasPta,
        tipoExcepcion: asig.tipoExcepcion,
      };
    });

    return { success: true, data };
  }

  @Get('asignatura-detalle/:id')
  async getAsignaturaDetalle(@Param('id') id: string) {
    const asig = await this.asignaturaRepo.findOne({
      where: { id },
      relations: ['programaRel', 'ubicacionSemestralRel', 'nucleoTematicoRel', 'facultadRel'],
    });

    if (!asig) {
      throw new NotFoundException(`No se encontró la asignatura con ID ${id}`);
    }

    const horasPta = HorasPtaCalculator.calcularHorasPTA(
      {
        creditos: asig.creditos,
        tipoExcepcion: asig.tipoExcepcion,
        horasFijasPta: asig.horasFijasPta,
      },
      {
        horasBasePorCredito: asig.programaRel.horasBasePorCredito,
        horasPregradoCentral: asig.programaRel.horasPregradoCentral,
      }
    );

    const horasClase = Math.round(horasPta / 3);

    const data = {
      id: asig.id,
      codigo: asig.codigo,
      nombre: asig.nombre,
      nombreBase: asig.nombreBase,
      creditos: asig.creditos,
      semestre: asig.ubicacionSemestralRel?.etiqueta || String(asig.idUbicacionSemestral),
      nucleoTematico: asig.nucleoTematicoRel?.nombre || '',
      facultad: asig.facultadRel?.nombre || '',
      modalidad: asig.modalidad,
      horas_clase: horasClase,
      horas_pta: horasPta,
      tipo_excepcion: asig.tipoExcepcion,
      requiere_revision_modalidad: asig.requiereRevisionModalidad,
      activo: asig.activa,
    };

    return { success: true, data };
  }
}
