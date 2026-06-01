import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PeriodoAcademicoEntity } from './entities/periodo-academico.entity';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/public.decorator';

@UseGuards(RolesGuard)
@Controller(['periodos-academicos', 'pta/periodos-academicos'])
export class PeriodoAcademicoController {
  constructor(
    @InjectRepository(PeriodoAcademicoEntity)
    private readonly repo: Repository<PeriodoAcademicoEntity>,
  ) {}

  @Public()
  @Get()
  async list() {
    let periods = await this.repo.find({
      order: { anio: 'DESC', semestre: 'DESC' },
    });

    if (periods.length === 0) {
      const defaultPeriod = this.repo.create({
        codigo: '2025-2',
        anio: 2025,
        semestre: 2,
        fechaInicio: new Date('2025-08-01'),
        fechaFin: new Date('2025-12-15'),
        estado: 'en_curso',
      });
      try {
        await this.repo.save(defaultPeriod);
        periods = [defaultPeriod];
      } catch (e) {
        console.warn('Error seeding default period:', e);
      }
    }
    return periods;
  }

  @Roles('GESTION_PROFESORAL', 'SUPER_ADMIN', 'super_admin')
  @Post()
  async create(@Body() body: any) {
    const { anio, semestre, fechaInicio, fechaFin } = body;

    const parsedAnio = parseInt(anio, 10);
    const parsedSemestre = parseInt(semestre, 10);

    if (isNaN(parsedAnio) || parsedAnio < 2020 || parsedAnio > 2050) {
      throw new BadRequestException('El año debe ser un número entero entre 2020 y 2050.');
    }

    if (parsedSemestre !== 1 && parsedSemestre !== 2) {
      throw new BadRequestException('El semestre debe ser 1 o 2.');
    }

    if (!fechaInicio || !fechaFin) {
      throw new BadRequestException('Se requieren las fechas de inicio y fin.');
    }

    const start = new Date(fechaInicio);
    const end = new Date(fechaFin);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Las fechas de inicio y fin deben ser fechas válidas.');
    }

    if (end <= start) {
      throw new BadRequestException('La fecha de fin debe ser posterior a la fecha de inicio.');
    }

    const codigo = `${parsedAnio}-${parsedSemestre}`;

    // Validar si ya existe el código o la combinación de año y semestre
    const existing = await this.repo.findOne({
      where: [{ codigo }, { anio: parsedAnio, semestre: parsedSemestre }],
    });

    if (existing) {
      throw new ConflictException(`Ya existe un periodo académico configurado para ${codigo}.`);
    }

    const newPeriod = this.repo.create({
      codigo,
      anio: parsedAnio,
      semestre: parsedSemestre,
      fechaInicio: start,
      fechaFin: end,
      estado: 'planeacion',
    });

    return this.repo.save(newPeriod);
  }

  @Roles('GESTION_PROFESORAL', 'SUPER_ADMIN', 'super_admin')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    const period = await this.repo.findOne({ where: { id } });
    if (!period) {
      throw new NotFoundException('Periodo académico no encontrado.');
    }

    const { fechaInicio, fechaFin, estado } = body;

    if (fechaInicio) {
      const start = new Date(fechaInicio);
      if (isNaN(start.getTime())) {
        throw new BadRequestException('Fecha de inicio no válida.');
      }
      period.fechaInicio = start;
    }

    if (fechaFin) {
      const end = new Date(fechaFin);
      if (isNaN(end.getTime())) {
        throw new BadRequestException('Fecha de fin no válida.');
      }
      period.fechaFin = end;
    }

    if (new Date(period.fechaFin) <= new Date(period.fechaInicio)) {
      throw new BadRequestException('La fecha de fin debe ser posterior a la fecha de inicio.');
    }

    if (estado) {
      const validStates = ['planeacion', 'concertacion', 'en_curso', 'cerrado'];
      if (!validStates.includes(estado)) {
        throw new BadRequestException(`El estado debe ser uno de: ${validStates.join(', ')}`);
      }
      period.estado = estado;
    }

    return this.repo.save(period);
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
      GROUP BY p.id, p.codigo, p.nombre
      ORDER BY p.nombre
    `;

    const cetapsQuery = `
      SELECT 
        c.id, 
        c.nombre, 
        dt.nombre AS "dtNombre", 
        COUNT(DISTINCT o.id_programa)::int AS "activePrograms"
      FROM academic_work_plan.oferta_cetap_programa o
      INNER JOIN academic_work_plan.cetap c ON o.id_cetap = c.id
      INNER JOIN academic_work_plan.direccion_territorial dt ON c.id_direccion_territorial = dt.id
      WHERE o.id_periodo_academico = $1 AND o.activa = TRUE
      GROUP BY c.id, c.nombre, dt.nombre
      ORDER BY c.nombre
    `;

    const [programs, cetaps] = await Promise.all([
      this.repo.query(programsQuery, [id]),
      this.repo.query(cetapsQuery, [id])
    ]);

    return {
      success: true,
      periodo: period,
      programs,
      cetaps
    };
  }
}
