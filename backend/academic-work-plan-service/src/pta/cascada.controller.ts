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
import { obtenerNombreVisibleAsignatura } from './utils/asignatura-nombre.util';

@Public()
@Controller(['cascada', 'pta/cascada'])
export class CascadaController {
  private static readonly SIN_PENSUM = '__SIN_PENSUM__';

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
    let data: any[] = [];

    console.log('[BACKEND DEBUG] cascada.controller getProgramas params:', { cetapId, periodCodigo });

    // The cetapId may come from either academic_work_plan.cetap.id or auth.sedes.id_sede.
    // Use a raw query that resolves both ID types via cross-schema lookup (nombre_normalizado).
    
    if (periodCodigo) {
      // Si se provee un periodo explícito, filtrar estrictamente por ese periodo sin fallback.
      data = await this.programaRepo.manager.query(
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
        [cetapId, periodCodigo],
      );
    } else {
      // Si no se provee periodo, traer todos los programas históricamente ofertados en el CETAP
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

  @Get('pensums')
  async getPensums(@Query('programa_id') programaId: string) {
    const rows = await this.asignaturaRepo
      .createQueryBuilder('asignatura')
      .select('asignatura.pensum', 'pensum')
      .addSelect('COUNT(asignatura.id)', 'total')
      .where('asignatura.id_programa = :programaId', { programaId })
      .andWhere('asignatura.activa = true')
      .groupBy('asignatura.pensum')
      .orderBy('asignatura.pensum', 'ASC', 'NULLS LAST')
      .getRawMany();

    const data = rows.map((row: any) => {
      const pensum = String(row.pensum || '').trim();
      return {
        value: pensum || CascadaController.SIN_PENSUM,
        label: pensum || 'Sin pensum registrado',
        pensum: pensum || null,
        totalAsignaturas: Number(row.total || 0),
      };
    });

    return { success: true, data };
  }

  @Get('asignaturas')
  async getAsignaturas(
    @Query('programa_id') programaId: string,
    @Query('pensum') pensum?: string,
  ) {
    const query = this.asignaturaRepo
      .createQueryBuilder('asignatura')
      .leftJoinAndSelect('asignatura.programaRel', 'programaRel')
      .leftJoinAndSelect('asignatura.ubicacionSemestralRel', 'ubicacionSemestralRel')
      .leftJoinAndSelect('asignatura.nucleoTematicoRel', 'nucleoTematicoRel')
      .where('asignatura.id_programa = :programaId', { programaId })
      .andWhere('asignatura.activa = true');

    if (pensum === CascadaController.SIN_PENSUM) {
      query.andWhere("(asignatura.pensum IS NULL OR TRIM(asignatura.pensum) = '')");
    } else if (pensum !== undefined && pensum !== '') {
      query.andWhere('asignatura.pensum = :pensum', { pensum });
    }

    const asignaturas = await query
      .orderBy('asignatura.idUbicacionSemestral', 'ASC')
      .addOrderBy('asignatura.nombre', 'ASC')
      .getMany();

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

      const horasPtaFinal = asig.horasPta ?? horasPta;
      const horasClase = asig.horasClase ?? Math.round(horasPtaFinal / 3);

      return {
        id: asig.id,
        codigo: asig.codigo,
        nombre: asig.nombre,
        nombreVisible: obtenerNombreVisibleAsignatura(asig),
        nombreBase: asig.nombreBase,
        pensum: asig.pensum,
        pensumKey: asig.pensum || CascadaController.SIN_PENSUM,
        creditos: asig.creditos,
        semestre: asig.ubicacionSemestralRel?.etiqueta || String(asig.idUbicacionSemestral),
        nucleoTematico: asig.nucleoTematicoRel?.nombre || '',
        modalidad: asig.modalidad,
        horas_clase: horasClase,
        horas_pta: horasPtaFinal,
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

    const horasPtaFinal = asig.horasPta ?? horasPta;
    const horasClase = asig.horasClase ?? Math.round(horasPtaFinal / 3);

    const data = {
      id: asig.id,
      codigo: asig.codigo,
      nombre: asig.nombre,
      nombreVisible: obtenerNombreVisibleAsignatura(asig),
      nombreBase: asig.nombreBase,
      pensum: asig.pensum,
      pensumKey: asig.pensum || CascadaController.SIN_PENSUM,
      creditos: asig.creditos,
      semestre: asig.ubicacionSemestralRel?.etiqueta || String(asig.idUbicacionSemestral),
      nucleoTematico: asig.nucleoTematicoRel?.nombre || '',
      facultad: asig.facultadRel?.nombre || '',
      modalidad: asig.modalidad,
      horas_clase: horasClase,
      horas_pta: horasPtaFinal,
      tipo_excepcion: asig.tipoExcepcion,
      requiere_revision_modalidad: asig.requiereRevisionModalidad,
      activo: asig.activa,
    };

    return { success: true, data };
  }
}
