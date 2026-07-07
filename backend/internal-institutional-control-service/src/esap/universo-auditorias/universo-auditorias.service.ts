import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProcesoAuditable, NivelRiesgo } from './entities/proceso-auditable.entity';
import { TipoProceso } from './entities/tipo-proceso.entity';
import { CreateProcesoAuditableDto } from './dto/create-proceso-auditable.dto';
import { UpdateProcesoAuditableDto } from './dto/update-proceso-auditable.dto';
import { CreateTipoProcesoDto, UpdateTipoProcesoDto } from './dto/tipo-proceso.dto';

@Injectable()
export class UniversoAuditoriasService {
  constructor(
    @InjectRepository(ProcesoAuditable)
    private readonly procesoRepository: Repository<ProcesoAuditable>,
    @InjectRepository(TipoProceso)
    private readonly tipoProcesoRepository: Repository<TipoProceso>,
  ) {}

  private readonly tiposProcesoDefault: Array<Pick<TipoProceso, 'codigo' | 'nombre' | 'color' | 'orden'>> = [
    { codigo: 'estrategico', nombre: 'Estratégico', color: 'bg-purple-100 text-purple-700', orden: 1 },
    { codigo: 'misional', nombre: 'Misional', color: 'bg-blue-100 text-blue-700', orden: 2 },
    { codigo: 'apoyo', nombre: 'Apoyo', color: 'bg-green-100 text-green-700', orden: 3 },
    { codigo: 'transversal', nombre: 'Transversal', color: 'bg-emerald-100 text-emerald-700', orden: 4 },
    { codigo: 'evaluacion', nombre: 'Evaluación', color: 'bg-orange-100 text-orange-700', orden: 5 },
    { codigo: 'territorial', nombre: 'Territorial', color: 'bg-teal-100 text-teal-700', orden: 6 },
  ];

  private normalizarCodigoTipo(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  private async resolveTipoProceso(tipoProcesoId?: string, tipo?: string): Promise<TipoProceso | null> {
    if (tipoProcesoId) {
      const tipoProceso = await this.tipoProcesoRepository.findOne({ where: { id: tipoProcesoId } });
      if (!tipoProceso) {
        throw new BadRequestException(`Tipo de proceso con ID ${tipoProcesoId} no encontrado`);
      }
      return tipoProceso;
    }

    if (!tipo) return null;

    const codigo = this.normalizarCodigoTipo(tipo);
    const tipoProceso = await this.tipoProcesoRepository
      .createQueryBuilder('tipoProceso')
      .where('tipoProceso.codigo = :codigo', { codigo })
      .orWhere('LOWER(tipoProceso.nombre) = LOWER(:tipo)', { tipo })
      .getOne();

    return tipoProceso || null;
  }

  async findTiposProceso(soloActivos = true): Promise<TipoProceso[]> {
    const query = this.tipoProcesoRepository
      .createQueryBuilder('tipoProceso')
      .orderBy('tipoProceso.orden', 'ASC')
      .addOrderBy('tipoProceso.nombre', 'ASC');

    if (soloActivos) {
      query.where('tipoProceso.activo = :activo', { activo: true });
    }

    return query.getMany();
  }

  async seedTiposProcesoDefaults(): Promise<TipoProceso[]> {
    for (const tipoDefault of this.tiposProcesoDefault) {
      const existente = await this.tipoProcesoRepository.findOne({ where: { codigo: tipoDefault.codigo } });
      if (existente) {
        await this.tipoProcesoRepository.save({
          ...existente,
          nombre: tipoDefault.nombre,
          color: tipoDefault.color,
          orden: tipoDefault.orden,
          activo: true,
        });
      } else {
        await this.tipoProcesoRepository.save(this.tipoProcesoRepository.create({
          ...tipoDefault,
          activo: true,
        }));
      }
    }

    return this.findTiposProceso(false);
  }

  async createTipoProceso(createDto: CreateTipoProcesoDto): Promise<TipoProceso> {
    const codigo = this.normalizarCodigoTipo(createDto.codigo || createDto.nombre);
    if (!codigo) {
      throw new BadRequestException('El código del tipo de proceso es obligatorio');
    }

    const existente = await this.tipoProcesoRepository.findOne({ where: { codigo } });
    if (existente) {
      if (!existente.activo) {
        return this.tipoProcesoRepository.save({
          ...existente,
          nombre: createDto.nombre,
          color: createDto.color || existente.color,
          orden: createDto.orden ?? existente.orden,
          activo: true,
        });
      }
      throw new BadRequestException(`Ya existe un tipo de proceso con el código ${codigo}`);
    }

    const maxOrden = await this.tipoProcesoRepository
      .createQueryBuilder('tipoProceso')
      .select('COALESCE(MAX(tipoProceso.orden), 0)', 'max')
      .getRawOne<{ max: number }>();

    const tipoProceso = this.tipoProcesoRepository.create({
      codigo,
      nombre: createDto.nombre,
      color: createDto.color || 'bg-gray-100 text-gray-700',
      orden: createDto.orden ?? Number(maxOrden?.max || 0) + 1,
      activo: true,
    });

    return this.tipoProcesoRepository.save(tipoProceso);
  }

  async updateTipoProceso(id: string, updateDto: UpdateTipoProcesoDto): Promise<TipoProceso> {
    const tipoProceso = await this.tipoProcesoRepository.findOne({ where: { id } });
    if (!tipoProceso) {
      throw new NotFoundException(`Tipo de proceso con ID ${id} no encontrado`);
    }

    if (updateDto.codigo) {
      const codigo = this.normalizarCodigoTipo(updateDto.codigo);
      const existente = await this.tipoProcesoRepository.findOne({ where: { codigo } });
      if (existente && existente.id !== id) {
        throw new BadRequestException(`Ya existe un tipo de proceso con el código ${codigo}`);
      }
      tipoProceso.codigo = codigo;
    }

    if (updateDto.nombre !== undefined) tipoProceso.nombre = updateDto.nombre;
    if (updateDto.color !== undefined) tipoProceso.color = updateDto.color;
    if (updateDto.orden !== undefined) tipoProceso.orden = updateDto.orden;
    if (updateDto.activo !== undefined) tipoProceso.activo = updateDto.activo;

    const saved = await this.tipoProcesoRepository.save(tipoProceso);
    await this.procesoRepository.update({ tipoProcesoId: saved.id }, { tipo: saved.codigo });
    return saved;
  }

  async inactivarTipoProceso(id: string): Promise<TipoProceso> {
    const procesosAsociados = await this.procesoRepository.count({ where: { tipoProcesoId: id, activo: true } });
    if (procesosAsociados > 0) {
      throw new BadRequestException('No se puede inactivar un tipo con procesos activos asociados');
    }

    return this.updateTipoProceso(id, { activo: false });
  }

  /**
   * Calcula el riesgo inherente (probabilidad * impacto)
   */
  private calcularRiesgoInherente(probabilidad: number, impacto: number): number {
    return probabilidad * impacto;
  }

  /**
   * Calcula el riesgo residual = Probabilidad × Impacto ÷ Nivel de Control
   * (riesgo inherente ÷ nivel de control)
   * - Nivel control 1 (bajo): riesgo alto → auditoría prioritaria
   * - Nivel control 3 (alto): riesgo bajo → puede postergarse
   */
  private calcularRiesgoResidual(riesgoInherente: number, nivelControl: number): number {
    return nivelControl > 0 ? riesgoInherente / nivelControl : riesgoInherente;
  }

  /**
   * Determina el nivel de riesgo según el riesgo residual (rango 0.33-9 con división)
   * Umbrales alineados con score 0-100: Rojo 90+, Amarillo 50-89, Verde 0-49
   */
  private determinarNivelRiesgo(riesgoResidual: number): NivelRiesgo {
    if (riesgoResidual >= 8) return NivelRiesgo.ALTO;   // score ~89-100
    if (riesgoResidual >= 4.5) return NivelRiesgo.MEDIO; // score ~50-89
    return NivelRiesgo.BAJO;                             // score 0-49
  }

  /**
   * Calcula la priorización en años según el nivel de riesgo
   */
  private calcularPriorizacionAnos(nivelRiesgo: NivelRiesgo): number {
    switch (nivelRiesgo) {
      case NivelRiesgo.ALTO:
        return 1; // Auditoría anual obligatoria
      case NivelRiesgo.MEDIO:
        return 2; // Auditoría cada 2 años
      case NivelRiesgo.BAJO:
        return 3; // Auditoría cada 3 años
      default:
        return 4;
    }
  }

  /**
   * Calcula la prioridad numérica (inversa de años: menos años = mayor prioridad)
   */
  private calcularPrioridad(priorizacionAnos: number): number {
    return 5 - priorizacionAnos; // 1 año = prioridad 4, 2 años = 3, 3 años = 2, 4 años = 1
  }

  /**
   * Calcula la próxima auditoría basado en la última auditoría y la frecuencia
   */
  private calcularProximaAuditoria(
    ultimaAuditoria: Date | undefined,
    frecuenciaAuditoria: string
  ): Date | undefined {
    if (!ultimaAuditoria) {
      return undefined;
    }

    const fechaUltima = new Date(ultimaAuditoria);
    const proxima = new Date(fechaUltima);

    // Calcular años a sumar según la frecuencia
    let anosASumar = 1; // Por defecto anual

    if (frecuenciaAuditoria.toLowerCase().includes('anual')) {
      anosASumar = 1;
    } else if (frecuenciaAuditoria.toLowerCase().includes('bienal')) {
      anosASumar = 2;
    } else if (frecuenciaAuditoria.toLowerCase().includes('trienal')) {
      anosASumar = 3;
    } else if (frecuenciaAuditoria.toLowerCase().includes('cuatrienal')) {
      anosASumar = 4;
    } else {
      // Intentar extraer número de años del string (ej: "Cada 2 años")
      const match = frecuenciaAuditoria.match(/\d+/);
      if (match) {
        anosASumar = parseInt(match[0], 10);
      }
    }

    proxima.setFullYear(proxima.getFullYear() + anosASumar);
    return proxima;
  }

  /**
   * Procesa y calcula todos los valores de riesgo automáticamente
   * Retorna tanto la evaluación de riesgo completa como los valores calculados para el proceso
   */
  private procesarEvaluacionRiesgo(evaluacionRiesgo: any): {
    evaluacionRiesgo: any;
    prioridad: number;
    priorizacionAnos: number;
  } {
    const probabilidad = evaluacionRiesgo.probabilidad || 1;
    const impacto = evaluacionRiesgo.impacto || 1;
    const nivelControl = evaluacionRiesgo.nivelControl || 1;

    const riesgoInherente = this.calcularRiesgoInherente(probabilidad, impacto);
    const riesgoResidual = this.calcularRiesgoResidual(riesgoInherente, nivelControl);
    
    // Si viene nivelRiesgo desde DAFP, usarlo; sino calcularlo
    const nivelRiesgo = evaluacionRiesgo.nivelRiesgo || this.determinarNivelRiesgo(riesgoResidual);
    const priorizacionAnos = this.calcularPriorizacionAnos(nivelRiesgo);
    const prioridad = this.calcularPrioridad(priorizacionAnos);

    // ✅ Lógica de Horas Estimadas (Hrs) según Nivel de Riesgo
    let horasEstimadas = evaluacionRiesgo.horasEstimadas || 0;
    if (!horasEstimadas) {
      if (nivelRiesgo.toLowerCase() === 'alto') horasEstimadas = 120;
      else if (nivelRiesgo.toLowerCase() === 'medio') horasEstimadas = 80;
      else horasEstimadas = 40;
    }

    // ✅ Ponderación DAFP (Valor decimal 0.0 - 5.0)
    const ponderacionFinalDafp = evaluacionRiesgo.ponderacionFinalDafp || 
                                (nivelRiesgo.toLowerCase() === 'alto' ? 4.5 : 
                                 nivelRiesgo.toLowerCase() === 'medio' ? 3.0 : 1.5);

    return {
      evaluacionRiesgo: {
        probabilidad,
        impacto,
        nivelControl,
        riesgoInherente,
        riesgoResidual,
        nivelRiesgo,
        madurezControl: evaluacionRiesgo.madurezControl,
        controles: evaluacionRiesgo.controles,
        factoresRiesgo: evaluacionRiesgo.factoresRiesgo || [],
        
        // 📊 Campos DAFP requeridos por la UI
        riesgosExtremos: evaluacionRiesgo.riesgosExtremos || 0,
        riesgosAltos: evaluacionRiesgo.riesgosAltos || 0,
        riesgosModerados: evaluacionRiesgo.riesgosModerados || 0,
        riesgosBajos: evaluacionRiesgo.riesgosBajos || 0,
        totalRiesgos: evaluacionRiesgo.totalRiesgos || 0,
        requerimientoComite: evaluacionRiesgo.requerimientoComite || false,
        requerimientoEntesReg: evaluacionRiesgo.requerimientoEntesReg || false,
        
        // 🛡️ Criticidad y Score
        nivelCriticidadDafp: evaluacionRiesgo.nivelCriticidadDafp || nivelRiesgo,
        exposicion: evaluacionRiesgo.exposicion ?? 0,
        mitigantes: evaluacionRiesgo.mitigantes ?? 0,
        scoreRiesgo: evaluacionRiesgo.scoreRiesgo ?? 0,
        
        // 🕒 Cálculo de Horas y Ciclo
        horasEstimadas,
        ponderacionFinalDafp,
        auditable: evaluacionRiesgo.auditable ?? (nivelRiesgo.toLowerCase() !== 'bajo'),
        decisionFinal: evaluacionRiesgo.decisionFinal || (nivelRiesgo.toLowerCase() === 'alto' ? 'INCLUIR PLAN ANUAL' : 'POR EVALUAR'),
        cicloRotacionDafp: evaluacionRiesgo.cicloRotacionDafp || `${priorizacionAnos} años`,
        añosProgramados: evaluacionRiesgo.añosProgramados || Array.from({length: priorizacionAnos}, (_, i) => i + 1),
      },
      prioridad,
      priorizacionAnos,
    };
  }

  /**
   * Obtiene todos los procesos auditables con filtros opcionales
   */
  async findAll(filters?: {
    tipo?: string;
    macroproceso?: string;
    nivelRiesgo?: string;
    territorial?: string;
    search?: string;
    soloActivos?: boolean;
  }): Promise<ProcesoAuditable[]> {
    const query = this.procesoRepository.createQueryBuilder('proceso')
      .leftJoinAndSelect('proceso.tipoProceso', 'tipoProceso')
      .orderBy('proceso.prioridad', 'DESC')
      .addOrderBy('proceso.createdAt', 'DESC');

    // Por defecto solo procesos activos (catálogo parametrizado)
    const soloActivos = filters?.soloActivos !== false;
    if (soloActivos) {
      query.andWhere('(proceso.activo IS NULL OR proceso.activo = :activo)', { activo: true });
    }

    if (filters?.tipo) {
      query.andWhere('proceso.tipo = :tipo', { tipo: filters.tipo });
    }

    if (filters?.macroproceso) {
      query.andWhere('proceso.macroproceso = :macroproceso', { macroproceso: filters.macroproceso });
    }

    if (filters?.nivelRiesgo) {
      query.andWhere("proceso.evaluacion_riesgo->>'nivelRiesgo' = :nivelRiesgo", { nivelRiesgo: filters.nivelRiesgo });
    }

    if (filters?.territorial) {
      query.andWhere('proceso.territorial = :territorial', { territorial: filters.territorial });
    }

    if (filters?.search) {
      query.andWhere(
        '(proceso.nombre ILIKE :search OR proceso.codigo ILIKE :search OR proceso.descripcion ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    return query.getMany();
  }

  /**
   * Obtiene un proceso auditable por ID
   */
  async findOne(id: string): Promise<ProcesoAuditable> {
    const proceso = await this.procesoRepository.findOne({
      where: { id },
      relations: ['tipoProceso'],
    });

    if (!proceso) {
      throw new NotFoundException(`Proceso auditable con ID ${id} no encontrado`);
    }

    return proceso;
  }

  /**
   * Busca un proceso por código
   */
  async findByCodigo(codigo: string): Promise<ProcesoAuditable | null> {
    return this.procesoRepository.findOne({
      where: { codigo },
    });
  }

  /**
   * Crea un nuevo proceso auditable
   */
  async create(createDto: CreateProcesoAuditableDto): Promise<ProcesoAuditable> {
    // Verificar que no exista un proceso con el mismo código
    const existente = await this.findByCodigo(createDto.codigo);
    if (existente) {
      throw new BadRequestException(`Ya existe un proceso con el código ${createDto.codigo}`);
    }

    // Procesar evaluación de riesgo
    const { evaluacionRiesgo: evaluacionRiesgoCompleta, prioridad, priorizacionAnos } = 
      this.procesarEvaluacionRiesgo(createDto.evaluacionRiesgo);
    const tipoProceso = await this.resolveTipoProceso(createDto.tipoProcesoId, createDto.tipo);

    // Calcular ultimaAuditoria y proximaAuditoria
    const ultimaAuditoria = createDto.ultimaAuditoria ? new Date(createDto.ultimaAuditoria) : undefined;
    let proximaAuditoria = createDto.proximaAuditoria ? new Date(createDto.proximaAuditoria) : undefined;

    // Si hay ultimaAuditoria pero no proximaAuditoria, calcularla automáticamente
    if (ultimaAuditoria && !proximaAuditoria) {
      proximaAuditoria = this.calcularProximaAuditoria(ultimaAuditoria, createDto.frecuenciaAuditoria || 'anual');
    }

    const proceso = this.procesoRepository.create({
      codigo: createDto.codigo,
      nombre: createDto.nombre,
      descripcion: createDto.descripcion || createDto.nombre,
      tipo: tipoProceso?.codigo || createDto.tipo,
      tipoProcesoId: tipoProceso?.id,
      tipoProceso: tipoProceso || undefined,
      macroproceso: createDto.macroproceso,
      unidadesAuditables: createDto.unidadesAuditables || [],
      responsable: createDto.responsable || 'Sin asignar',
      dependencia: createDto.dependencia,
      territorial: createDto.territorial,
      evaluacionRiesgo: evaluacionRiesgoCompleta,
      frecuenciaAuditoria: createDto.frecuenciaAuditoria || 'anual',
      ultimaAuditoria,
      resultadoUltimaAuditoria: createDto.resultadoUltimaAuditoria,
      proximaAuditoria,
      prioridad,
      priorizacionAnos,
      activo: true,
    });

    return this.procesoRepository.save(proceso);
  }

  /**
   * Actualiza un proceso auditable existente
   */
  async update(id: string, updateDto: UpdateProcesoAuditableDto): Promise<ProcesoAuditable> {
    const proceso = await this.findOne(id);

    // Si se actualiza el código, verificar que no exista otro con ese código
    if (updateDto.codigo && updateDto.codigo !== proceso.codigo) {
      const existente = await this.findByCodigo(updateDto.codigo);
      if (existente) {
        throw new BadRequestException(`Ya existe un proceso con el código ${updateDto.codigo}`);
      }
      proceso.codigo = updateDto.codigo;
    }

    // Actualizar campos básicos
    if (updateDto.nombre) proceso.nombre = updateDto.nombre;
    if (updateDto.descripcion) proceso.descripcion = updateDto.descripcion;
    if (updateDto.tipoProcesoId !== undefined || updateDto.tipo) {
      const tipoProceso = await this.resolveTipoProceso(updateDto.tipoProcesoId, updateDto.tipo);
      proceso.tipoProcesoId = tipoProceso?.id;
      proceso.tipoProceso = tipoProceso || undefined;
      proceso.tipo = tipoProceso?.codigo || updateDto.tipo || proceso.tipo;
    }
    if (updateDto.macroproceso) proceso.macroproceso = updateDto.macroproceso;
    if (updateDto.unidadesAuditables !== undefined) proceso.unidadesAuditables = updateDto.unidadesAuditables;
    if (updateDto.responsable) proceso.responsable = updateDto.responsable;
    if (updateDto.dependencia) proceso.dependencia = updateDto.dependencia;
    if (updateDto.territorial !== undefined) proceso.territorial = updateDto.territorial;
    if (updateDto.frecuenciaAuditoria) proceso.frecuenciaAuditoria = updateDto.frecuenciaAuditoria;
    
    // Manejar actualización de ultimaAuditoria y calcular proximaAuditoria automáticamente
    if (updateDto.ultimaAuditoria !== undefined) {
      proceso.ultimaAuditoria = updateDto.ultimaAuditoria ? new Date(updateDto.ultimaAuditoria) : undefined;
      
      // Si se establece ultimaAuditoria, calcular proximaAuditoria automáticamente
      if (proceso.ultimaAuditoria) {
        const frecuencia = updateDto.frecuenciaAuditoria || proceso.frecuenciaAuditoria;
        proceso.proximaAuditoria = this.calcularProximaAuditoria(proceso.ultimaAuditoria, frecuencia);
      } else {
        // Si se elimina ultimaAuditoria, también eliminar proximaAuditoria
        proceso.proximaAuditoria = undefined;
      }
    }
    
    // Manejar actualización de resultadoUltimaAuditoria
    if (updateDto.resultadoUltimaAuditoria !== undefined) {
      proceso.resultadoUltimaAuditoria = updateDto.resultadoUltimaAuditoria;
    }
    
    // Si se actualiza frecuenciaAuditoria y hay ultimaAuditoria, recalcular proximaAuditoria
    if (updateDto.frecuenciaAuditoria && proceso.ultimaAuditoria) {
      proceso.proximaAuditoria = this.calcularProximaAuditoria(
        proceso.ultimaAuditoria,
        updateDto.frecuenciaAuditoria
      );
    }
    
    // Solo actualizar proximaAuditoria manualmente si se envía explícitamente y no hay ultimaAuditoria
    if (updateDto.proximaAuditoria !== undefined && !proceso.ultimaAuditoria) {
      proceso.proximaAuditoria = updateDto.proximaAuditoria ? new Date(updateDto.proximaAuditoria) : undefined;
    }

    // Si se actualiza la evaluación de riesgo, recalcular todo
    if (updateDto.evaluacionRiesgo) {
      const { evaluacionRiesgo: evaluacionRiesgoCompleta, prioridad, priorizacionAnos } = 
        this.procesarEvaluacionRiesgo(updateDto.evaluacionRiesgo);
      proceso.evaluacionRiesgo = evaluacionRiesgoCompleta;
      proceso.prioridad = prioridad;
      proceso.priorizacionAnos = priorizacionAnos;
    }

    // Si se actualiza la prioridad directamente (sin cambiar evaluación de riesgo)
    if (updateDto.prioridad !== undefined) {
      proceso.prioridad = updateDto.prioridad;
      proceso.priorizacionAnos = 5 - updateDto.prioridad;
    }

    if (updateDto.activo !== undefined) {
      proceso.activo = updateDto.activo;
    }

    return this.procesoRepository.save(proceso);
  }

  /**
   * Elimina un proceso auditable
   */
  async delete(id: string): Promise<void> {
    const proceso = await this.findOne(id);
    await this.procesoRepository.remove(proceso);
  }

  /**
   * Inactiva un proceso (sin eliminar - mantiene historial)
   */
  async inactivar(id: string): Promise<ProcesoAuditable> {
    return this.update(id, { activo: false });
  }

  /**
   * Reactiva un proceso
   */
  async activar(id: string): Promise<ProcesoAuditable> {
    return this.update(id, { activo: true });
  }

  /**
   * Obtiene la evaluación de riesgo de un proceso
   */
  async getEvaluacionRiesgo(procesoId: string): Promise<any> {
    const proceso = await this.findOne(procesoId);
    return proceso.evaluacionRiesgo;
  }

  /**
   * Evalúa el riesgo de un proceso (actualiza la evaluación)
   */
  async evaluarRiesgo(procesoId: string, evaluacionRiesgo: any): Promise<ProcesoAuditable> {
    return this.update(procesoId, { evaluacionRiesgo });
  }

  /**
   * Obtiene la matriz de riesgo (agrupada por nivel)
   */
  async getMatrizRiesgo(): Promise<{
    alto: ProcesoAuditable[];
    medio: ProcesoAuditable[];
    bajo: ProcesoAuditable[];
  }> {
    const procesos = await this.findAll();
    
    return {
      alto: procesos.filter(p => p.evaluacionRiesgo.nivelRiesgo === NivelRiesgo.ALTO),
      medio: procesos.filter(p => p.evaluacionRiesgo.nivelRiesgo === NivelRiesgo.MEDIO),
      bajo: procesos.filter(p => p.evaluacionRiesgo.nivelRiesgo === NivelRiesgo.BAJO),
    };
  }

  /**
   * Obtiene la priorización de auditorías
   */
  async getPriorizacion(): Promise<{
    anual: ProcesoAuditable[];
    bienal: ProcesoAuditable[];
    trienal: ProcesoAuditable[];
    cuatrienal: ProcesoAuditable[];
  }> {
    const procesos = await this.findAll();
    
    return {
      anual: procesos.filter(p => p.priorizacionAnos === 1),
      bienal: procesos.filter(p => p.priorizacionAnos === 2),
      trienal: procesos.filter(p => p.priorizacionAnos === 3),
      cuatrienal: procesos.filter(p => p.priorizacionAnos === 4),
    };
  }
}
