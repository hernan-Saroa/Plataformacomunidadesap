import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { InformeLey } from './entities/informe-ley.entity';
import { EntregaInformeLey } from './entities/entrega-informe-ley.entity';
import { CreateInformeLeyDto } from './dto/create-informe-ley.dto';
import { UpdateInformeLeyDto } from './dto/update-informe-ley.dto';
import { CreateEntregaDto } from './dto/create-entrega.dto';
import { UpdateEntregaDto } from './dto/update-entrega.dto';

@Injectable()
export class InformesLeyService {
  constructor(
    @InjectRepository(InformeLey)
    private readonly informeRepository: Repository<InformeLey>,
    @InjectRepository(EntregaInformeLey)
    private readonly entregaRepository: Repository<EntregaInformeLey>,
  ) {}

  // ==================== CRUD INFORMES ====================

  async findAll(filters?: {
    categoria?: string;
    periodicidad?: string;
    activo?: boolean;
    search?: string;
  }): Promise<InformeLey[]> {
    const query = this.informeRepository.createQueryBuilder('informe')
      .leftJoinAndSelect('informe.entregas', 'entregas')
      .orderBy('informe.codigo', 'ASC');

    if (filters?.categoria) {
      query.andWhere('informe.categoria = :categoria', { categoria: filters.categoria });
    }

    if (filters?.periodicidad) {
      query.andWhere('informe.periodicidad = :periodicidad', { periodicidad: filters.periodicidad });
    }

    if (filters?.activo !== undefined) {
      query.andWhere('informe.activo = :activo', { activo: filters.activo });
    }

    if (filters?.search) {
      query.andWhere(
        '(informe.nombre ILIKE :search OR informe.codigo ILIKE :search OR informe.descripcion ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    return query.getMany();
  }

  async findOne(id: string): Promise<InformeLey> {
    const informe = await this.informeRepository.findOne({
      where: { id },
      relations: ['entregas'],
    });

    if (!informe) {
      throw new NotFoundException(`Informe de ley con ID ${id} no encontrado`);
    }

    return informe;
  }

  async findByCodigo(codigo: string): Promise<InformeLey | null> {
    return this.informeRepository.findOne({
      where: { codigo },
      relations: ['entregas'],
    });
  }

  async create(createDto: CreateInformeLeyDto): Promise<InformeLey> {
    // Verificar que no exista un informe con el mismo código
    const existente = await this.findByCodigo(createDto.codigo);
    if (existente) {
      throw new BadRequestException(`Ya existe un informe con el código ${createDto.codigo}`);
    }

    const informe = this.informeRepository.create({
      ...createDto,
      area: createDto.area,
      areaResponsable: createDto.areaResponsable || createDto.area,
      activo: createDto.activo ?? true,
      tienePlantilla: createDto.tienePlantilla ?? false,
      requiereAprobacion: createDto.requiereAprobacion ?? false,
      diasAnticipacionAlerta: createDto.diasAnticipacionAlerta ?? 7,
      tipo: 'ley',
    });

    return this.informeRepository.save(informe);
  }

  async update(id: string, updateDto: UpdateInformeLeyDto): Promise<InformeLey> {
    const informe = await this.findOne(id);

    // Si se actualiza el código, verificar que no exista otro con ese código
    if (updateDto.codigo && updateDto.codigo !== informe.codigo) {
      const existente = await this.findByCodigo(updateDto.codigo);
      if (existente) {
        throw new BadRequestException(`Ya existe un informe con el código ${updateDto.codigo}`);
      }
    }

    Object.assign(informe, updateDto);
    return this.informeRepository.save(informe);
  }

  async delete(id: string): Promise<void> {
    const informe = await this.findOne(id);
    await this.informeRepository.remove(informe);
  }

  // ==================== CRUD ENTREGAS ====================

  async findAllEntregas(filters?: {
    informeId?: string;
    estado?: string;
    periodo?: string;
    fechaDesde?: Date;
    fechaHasta?: Date;
  }): Promise<EntregaInformeLey[]> {
    const query = this.entregaRepository.createQueryBuilder('entrega')
      .leftJoinAndSelect('entrega.informeLey', 'informe')
      .orderBy('entrega.fechaVencimiento', 'DESC');

    if (filters?.informeId) {
      query.andWhere('entrega.informeId = :informeId', { informeId: filters.informeId });
    }

    if (filters?.estado) {
      query.andWhere('entrega.estado = :estado', { estado: filters.estado });
    }

    if (filters?.periodo) {
      query.andWhere('entrega.periodo = :periodo', { periodo: filters.periodo });
    }

    if (filters?.fechaDesde) {
      query.andWhere('entrega.fechaVencimiento >= :fechaDesde', { fechaDesde: filters.fechaDesde });
    }

    if (filters?.fechaHasta) {
      query.andWhere('entrega.fechaVencimiento <= :fechaHasta', { fechaHasta: filters.fechaHasta });
    }

    return query.getMany();
  }

  async findOneEntrega(id: string): Promise<EntregaInformeLey> {
    const entrega = await this.entregaRepository.findOne({
      where: { id },
      relations: ['informeLey'],
    });

    if (!entrega) {
      throw new NotFoundException(`Entrega con ID ${id} no encontrada`);
    }

    return entrega;
  }

  async getEntregasByInforme(informeId: string): Promise<EntregaInformeLey[]> {
    await this.findOne(informeId); // Verificar que el informe existe
    return this.entregaRepository.find({
      where: { informeId },
      relations: ['informeLey'],
      order: { fechaVencimiento: 'DESC' },
    });
  }

  async createEntrega(createDto: CreateEntregaDto): Promise<EntregaInformeLey> {
    // Verificar que el informe existe
    const informe = await this.findOne(createDto.informeId);

    // Verificar que no exista una entrega para el mismo periodo
    const existente = await this.entregaRepository.findOne({
      where: {
        informeId: createDto.informeId,
        periodo: createDto.periodo,
      },
    });

    if (existente) {
      throw new BadRequestException(
        `Ya existe una entrega para el informe ${informe.codigo} en el periodo ${createDto.periodo}`
      );
    }

    const entrega = this.entregaRepository.create({
      ...createDto,
      fechaVencimiento: new Date(createDto.fechaVencimiento),
      fechaEntrega: createDto.fechaEntrega ? new Date(createDto.fechaEntrega) : undefined,
      fechaElaboracion: createDto.fechaElaboracion ? new Date(createDto.fechaElaboracion) : undefined,
      fechaAprobacion: createDto.fechaAprobacion ? new Date(createDto.fechaAprobacion) : undefined,
      fechaRadicacion: createDto.fechaRadicacion ? new Date(createDto.fechaRadicacion) : undefined,
      estado: createDto.estado || 'pendiente',
    });

    return this.entregaRepository.save(entrega);
  }

  async updateEntrega(id: string, updateDto: UpdateEntregaDto): Promise<EntregaInformeLey> {
    const entrega = await this.findOneEntrega(id);

    // Si se actualiza el periodo, verificar que no exista otra entrega con ese periodo
    if (updateDto.periodo && updateDto.periodo !== entrega.periodo) {
      const existente = await this.entregaRepository.findOne({
        where: {
          informeId: entrega.informeId,
          periodo: updateDto.periodo,
        },
      });

      if (existente) {
        throw new BadRequestException(
          `Ya existe una entrega para el periodo ${updateDto.periodo}`
        );
      }
    }

    // Convertir fechas string a Date
    if (updateDto.fechaVencimiento) {
      entrega.fechaVencimiento = new Date(updateDto.fechaVencimiento);
    }
    if (updateDto.fechaEntrega) {
      entrega.fechaEntrega = new Date(updateDto.fechaEntrega);
    }
    if (updateDto.fechaElaboracion) {
      entrega.fechaElaboracion = new Date(updateDto.fechaElaboracion);
    }
    if (updateDto.fechaAprobacion) {
      entrega.fechaAprobacion = new Date(updateDto.fechaAprobacion);
    }
    if (updateDto.fechaRadicacion) {
      entrega.fechaRadicacion = new Date(updateDto.fechaRadicacion);
    }

    Object.assign(entrega, {
      ...updateDto,
      fechaVencimiento: entrega.fechaVencimiento,
      fechaEntrega: entrega.fechaEntrega,
      fechaElaboracion: entrega.fechaElaboracion,
      fechaAprobacion: entrega.fechaAprobacion,
      fechaRadicacion: entrega.fechaRadicacion,
    });

    return this.entregaRepository.save(entrega);
  }

  async deleteEntrega(id: string): Promise<void> {
    const entrega = await this.findOneEntrega(id);
    await this.entregaRepository.remove(entrega);
  }

  // ==================== FUNCIONES ESPECIALES ====================

  async getEstadisticas(): Promise<{
    totalInformes: number;
    informesActivos: number;
    entregasPendientes: number;
    entregasEnProceso: number;
    entregasCompletadas: number;
    entregasVencidas: number;
    porcentajeCumplimiento: number;
    proximosVencimientos: number;
    alertasActivas: number;
  }> {
    const totalInformes = await this.informeRepository.count();
    const informesActivos = await this.informeRepository.count({ where: { activo: true } });

    const entregasPendientes = await this.entregaRepository.count({ where: { estado: 'pendiente' } });
    const entregasEnProceso = await this.entregaRepository.count({ where: { estado: 'en-proceso' } });
    const entregasCompletadas = await this.entregaRepository.count({ where: { estado: 'entregado' } });
    const entregasVencidas = await this.entregaRepository.count({ where: { estado: 'vencido' } });

    const totalEntregas = entregasPendientes + entregasEnProceso + entregasCompletadas + entregasVencidas;
    const porcentajeCumplimiento = totalEntregas > 0
      ? Math.round((entregasCompletadas / totalEntregas) * 100)
      : 0;

    // Próximos vencimientos (7 días)
    const hoy = new Date();
    const proximaSemana = new Date(hoy.getTime() + 7 * 24 * 60 * 60 * 1000);
    const proximosVencimientos = await this.entregaRepository.count({
      where: {
        fechaVencimiento: Between(hoy, proximaSemana),
        estado: 'pendiente',
      },
    });

    const alertasActivas = entregasPendientes + entregasVencidas;

    return {
      totalInformes,
      informesActivos,
      entregasPendientes,
      entregasEnProceso,
      entregasCompletadas,
      entregasVencidas,
      porcentajeCumplimiento,
      proximosVencimientos,
      alertasActivas,
    };
  }

  async getCalendarioAnual(year: number): Promise<{
    mes: number;
    mesNombre: string;
    entregas: EntregaInformeLey[];
  }[]> {
    const inicioAno = new Date(year, 0, 1);
    const finAno = new Date(year, 11, 31);

    const entregas = await this.entregaRepository.find({
      where: {
        fechaVencimiento: Between(inicioAno, finAno),
      },
      relations: ['informeLey'],
      order: { fechaVencimiento: 'ASC' },
    });

    const meses = Array.from({ length: 12 }, (_, i) => {
      const mes = i + 1;
      const inicioMes = new Date(year, i, 1);
      const finMes = new Date(year, i + 1, 0);

      const entregasMes = entregas.filter(e => {
        const fecha = new Date(e.fechaVencimiento);
        return fecha >= inicioMes && fecha <= finMes;
      });

      return {
        mes,
        mesNombre: inicioMes.toLocaleDateString('es-CO', { month: 'long' }),
        entregas: entregasMes,
      };
    });

    return meses;
  }

  async getProximosVencimientos(dias: number = 7): Promise<EntregaInformeLey[]> {
    const hoy = new Date();
    const fechaLimite = new Date(hoy.getTime() + dias * 24 * 60 * 60 * 1000);

    return this.entregaRepository.find({
      where: {
        fechaVencimiento: Between(hoy, fechaLimite),
        estado: 'pendiente',
      },
      relations: ['informeLey'],
      order: { fechaVencimiento: 'ASC' },
    });
  }

  async getEntregasVencidas(): Promise<EntregaInformeLey[]> {
    const hoy = new Date();

    return this.entregaRepository.find({
      where: {
        fechaVencimiento: LessThanOrEqual(hoy),
        estado: 'pendiente',
      },
      relations: ['informeLey'],
      order: { fechaVencimiento: 'ASC' },
    });
  }

  async getEstadisticasPorCategoria(): Promise<{
    categoria: string;
    total: number;
    completados: number;
    pendientes: number;
    vencidos: number;
    porcentaje: number;
  }[]> {
    const informes = await this.findAll({ activo: true });
    const entregas = await this.findAllEntregas();

    const categorias = ['financiero', 'administrativo', 'contractual', 'talento-humano', 'transparencia', 'control'];

    return categorias.map(categoria => {
      const informesCategoria = informes.filter(i => i.categoria === categoria);
      const entregasCategoria = entregas.filter(e =>
        informesCategoria.some(i => i.id === e.informeId)
      );

      const completados = entregasCategoria.filter(e => e.estado === 'entregado').length;
      const pendientes = entregasCategoria.filter(e => e.estado === 'pendiente' || e.estado === 'en-proceso').length;
      const vencidos = entregasCategoria.filter(e => e.estado === 'vencido').length;
      const total = entregasCategoria.length;

      const porcentaje = total > 0 ? Math.round((completados / total) * 100) : 0;

      return {
        categoria,
        total,
        completados,
        pendientes,
        vencidos,
        porcentaje,
      };
    });
  }

  async getEstadisticasPorPeriodicidad(): Promise<{
    periodicidad: string;
    total: number;
    completados: number;
    pendientes: number;
    vencidos: number;
    porcentaje: number;
  }[]> {
    const informes = await this.findAll({ activo: true });
    const entregas = await this.findAllEntregas();

    const periodicidades = ['mensual', 'bimestral', 'trimestral', 'cuatrimestral', 'semestral', 'anual'];

    return periodicidades.map(periodicidad => {
      const informesPeriodicidad = informes.filter(i => i.periodicidad === periodicidad);
      const entregasPeriodicidad = entregas.filter(e =>
        informesPeriodicidad.some(i => i.id === e.informeId)
      );

      const completados = entregasPeriodicidad.filter(e => e.estado === 'entregado').length;
      const pendientes = entregasPeriodicidad.filter(e => e.estado === 'pendiente' || e.estado === 'en-proceso').length;
      const vencidos = entregasPeriodicidad.filter(e => e.estado === 'vencido').length;
      const total = entregasPeriodicidad.length;

      const porcentaje = total > 0 ? Math.round((completados / total) * 100) : 0;

      return {
        periodicidad,
        total,
        completados,
        pendientes,
        vencidos,
        porcentaje,
      };
    });
  }

  async actualizarEstadosVencidos(): Promise<number> {
    const hoy = new Date();
    const entregasVencidas = await this.entregaRepository.find({
      where: {
        fechaVencimiento: LessThanOrEqual(hoy),
        estado: 'pendiente',
      },
    });

    if (entregasVencidas.length > 0) {
      await this.entregaRepository.update(
        entregasVencidas.map(e => e.id),
        { estado: 'vencido' }
      );
    }

    return entregasVencidas.length;
  }

  /**
   * Subir archivo para una entrega de informe
   */
  async uploadArchivoEntrega(
    entregaId: string,
    archivo: {
      nombre: string;
      url: string;
      tamano: number;
      formato: 'PDF' | 'Word' | 'Excel';
    },
    usuarioId: string,
    usuarioNombre: string,
  ): Promise<EntregaInformeLey> {
    const entrega = await this.findOneEntrega(entregaId);
    if (!entrega) {
      throw new NotFoundException(`Entrega con ID ${entregaId} no encontrada`);
    }

    // Actualizar información del archivo
    entrega.archivoNombre = archivo.nombre;
    entrega.archivoUrl = archivo.url;
    entrega.archivoTamano = archivo.tamano;
    entrega.formatoArchivo = archivo.formato;
    
    // Actualizar generadoPor si no existe
    if (!entrega.generadoPor) {
      entrega.generadoPor = usuarioNombre;
    }

    // Si el estado es 'pendiente' y ahora tiene archivo, cambiar a 'en-proceso'
    if (entrega.estado === 'pendiente' && archivo.url) {
      entrega.estado = 'en-proceso';
    }

    // updatedAt se actualiza automáticamente por el decorador @UpdateDateColumn
    return this.entregaRepository.save(entrega);
  }
}

