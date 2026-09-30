import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocenteEntity } from '../../entities/docente.entity';
import { SoporteDocumentalEntity } from '../../entities/soporte-documental.entity';
import { SituacionAdministrativaEntity } from '../../entities/situacion-administrativa.entity';

@Injectable()
export class EstadisticasService {
  constructor(
    @InjectRepository(DocenteEntity)
    private readonly docenteRepo: Repository<DocenteEntity>,
    @InjectRepository(SoporteDocumentalEntity)
    private readonly soporteRepo: Repository<SoporteDocumentalEntity>,
    @InjectRepository(SituacionAdministrativaEntity)
    private readonly situacionRepo: Repository<SituacionAdministrativaEntity>,
  ) {}

  async getDashboardSummary() {
    const totalDocentes = await this.docenteRepo.count({ where: { isActive: true } });
    const activos = await this.docenteRepo.count({ where: { estadoRund: 'ACTIVO', isActive: true } });
    const enRevision = await this.docenteRepo.count({ where: { estadoRund: 'EN_REVISION', isActive: true } });
    const pendientesValidacion = await this.docenteRepo.count({ where: { estadoRund: 'PENDIENTE_VALIDACION', isActive: true } });

    // Por escalafón
    const porEscalafon = await this.docenteRepo
      .createQueryBuilder('docente')
      .select('docente.escalafonDocente', 'escalafon')
      .addSelect('COUNT(*)', 'total')
      .where('docente.isActive = true')
      .groupBy('docente.escalafonDocente')
      .getRawMany();

    // Por categoría Minciencias
    const porMinciencias = await this.docenteRepo
      .createQueryBuilder('docente')
      .select('docente.categoriaMinciencias', 'categoria')
      .addSelect('COUNT(*)', 'total')
      .where('docente.isActive = true')
      .groupBy('docente.categoriaMinciencias')
      .getRawMany();

    // Soportes pendientes
    const soportesPendientes = await this.soporteRepo.count({ where: { estadoValidacion: 'PENDIENTE' } });

    // Situaciones administrativas vigentes
    const novedadesVigentes = await this.situacionRepo.count({ where: { estado: 'VIGENTE' } });

    return {
      totalDocentes,
      activos,
      enRevision,
      pendientesValidacion,
      soportesPendientes,
      novedadesVigentes,
      porEscalafon: porEscalafon.map((r) => ({ escalafon: r.escalafon, total: parseInt(r.total, 10) })),
      porMinciencias: porMinciencias.map((r) => ({ categoria: r.categoria, total: parseInt(r.total, 10) })),
    };
  }
}
