import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { DatosAutomaticosInforme } from '../entities/datos-automaticos-informe.entity';
import { InformeLey } from '../entities/informe-ley.entity';
import { Auditoria, FaseAuditoria } from '../../auditorias/entities/auditoria.entity';
import { PlanMejoramiento, PlanMejoramientoEstado } from '../../planes-mejoramiento/entities/plan-mejoramiento.entity';
import { Hallazgo } from '../../hallazgos/entities/hallazgo.entity';

@Injectable()
export class DatosAutomaticosService {
  constructor(
    @InjectRepository(DatosAutomaticosInforme)
    private readonly datosRepository: Repository<DatosAutomaticosInforme>,
    @InjectRepository(InformeLey)
    private readonly informeRepository: Repository<InformeLey>,
    @InjectRepository(Auditoria)
    private readonly auditoriaRepository: Repository<Auditoria>,
    @InjectRepository(PlanMejoramiento)
    private readonly planRepository: Repository<PlanMejoramiento>,
    @InjectRepository(Hallazgo)
    private readonly hallazgoRepository: Repository<Hallazgo>,
  ) {}

  /**
   * Obtener datos automáticos para un informe específico
   * Según el tipo de informe, consulta diferentes fuentes de datos
   */
  async obtenerDatosAutomaticos(
    informe: InformeLey,
    periodo: string,
  ): Promise<Record<string, any>> {
    const datos: Record<string, any> = {
      nombreInforme: informe.nombre,
      codigoInforme: informe.codigo,
      periodo,
      fechaGeneracion: new Date().toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      baseNormativa: informe.normativa || '',
      responsable: informe.responsable,
    };

    // Según el código del informe, obtener datos específicos
    switch (informe.codigo) {
      case 'INF-PORM':
      case 'INF-ANUAL-OCI':
        // Informes de control interno - incluir datos de auditorías y planes
        datos.datosAutomaticos = await this.obtenerDatosControlInterno(periodo);
        break;

      case 'INF-TRIM-AUSTERIDAD':
        // Informe de austeridad - datos financieros
        datos.datosFinancieros = await this.obtenerDatosFinancieros(periodo);
        break;

      case 'INF-TRIM-PLANES-MEJORA':
        // Informe de planes de mejoramiento
        datos.planesMejoramiento = await this.obtenerDatosPlanesMejoramiento(periodo);
        break;

      case 'INF-TRIM-INDICADORES':
        // Indicadores OCI
        datos.indicadores = await this.obtenerIndicadoresOCI(periodo);
        break;

      default:
        // Datos básicos para otros informes
        datos.datosAutomaticos = [];
    }

    return datos;
  }

  /**
   * Obtener datos de control interno (auditorías, planes, hallazgos)
   */
  private async obtenerDatosControlInterno(periodo: string): Promise<any[]> {
    // Extraer año del periodo (formato: "2025-S1", "2025-Q1", "2025", "2025-01")
    const año = this.extraerAñoDelPeriodo(periodo);
    const fechaInicio = new Date(año, 0, 1); // 1 de enero del año
    const fechaFin = new Date(año, 11, 31, 23, 59, 59); // 31 de diciembre del año

    // 1. Total Auditorías Programadas (todas las auditorías del año)
    const totalAuditorias = await this.auditoriaRepository
      .createQueryBuilder('auditoria')
      .where('auditoria.fechaInicio >= :fechaInicio', { fechaInicio })
      .andWhere('auditoria.fechaInicio <= :fechaFin', { fechaFin })
      .getCount();

    // 2. Auditorías Completadas
    const auditoriasCompletadas = await this.auditoriaRepository
      .createQueryBuilder('auditoria')
      .where('auditoria.fase = :fase', { fase: FaseAuditoria.COMPLETADA })
      .andWhere('auditoria.fechaFin >= :fechaInicio', { fechaInicio })
      .andWhere('auditoria.fechaFin <= :fechaFin', { fechaFin })
      .getCount();

    // 3. Auditorías en Curso
    const auditoriasEnCurso = await this.auditoriaRepository.count({
      where: {
        fase: FaseAuditoria.EN_CURSO,
      },
    });

    // 4. Total de Hallazgos
    const totalHallazgos = await this.hallazgoRepository.count();
    
    // 5. Hallazgos Críticos - buscar por categoría o palabras clave en título/descripción
    const hallazgosCriticos = await this.hallazgoRepository
      .createQueryBuilder('hallazgo')
      .where('hallazgo.categoria = :categoria', { categoria: 'critico' })
      .orWhere('LOWER(hallazgo.titulo) LIKE :critico', { critico: '%crítico%' })
      .orWhere('LOWER(hallazgo.titulo) LIKE :alto', { alto: '%alto%' })
      .orWhere('LOWER(hallazgo.descripcion) LIKE :criticoDesc', { criticoDesc: '%crítico%' })
      .getCount();

    // 6. Planes de Mejoramiento Activos
    const planesActivos = await this.planRepository.count({
      where: {
        estado: PlanMejoramientoEstado.EN_EJECUCION,
      },
    });

    // 7. Planes de Mejoramiento Completados (en el periodo)
    const planesCompletados = await this.planRepository
      .createQueryBuilder('plan')
      .where('plan.estado = :estado', { estado: PlanMejoramientoEstado.COMPLETADO })
      .andWhere('plan.updatedAt >= :fechaInicio', { fechaInicio })
      .andWhere('plan.updatedAt <= :fechaFin', { fechaFin })
      .getCount();

    return [
      {
        nombre: 'Total Auditorías Programadas',
        valor: totalAuditorias,
        tipo: 'numero',
        descripcion: `Auditorías programadas para el periodo ${periodo}`,
      },
      {
        nombre: 'Auditorías Completadas',
        valor: auditoriasCompletadas,
        tipo: 'numero',
        descripcion: `Auditorías finalizadas en el periodo ${periodo}`,
      },
      {
        nombre: 'Auditorías en Curso',
        valor: auditoriasEnCurso,
        tipo: 'numero',
        descripcion: 'Auditorías actualmente en ejecución',
      },
      {
        nombre: 'Total Hallazgos Identificados',
        valor: totalHallazgos,
        tipo: 'numero',
        descripcion: 'Total de hallazgos registrados en el sistema',
      },
      {
        nombre: 'Hallazgos Críticos y Altos',
        valor: hallazgosCriticos,
        tipo: 'numero',
        descripcion: 'Hallazgos con gravedad crítica o alta',
      },
      {
        nombre: 'Planes de Mejoramiento Activos',
        valor: planesActivos,
        tipo: 'numero',
        descripcion: 'Planes de mejoramiento en ejecución',
      },
      {
        nombre: 'Planes de Mejoramiento Completados',
        valor: planesCompletados,
        tipo: 'numero',
        descripcion: `Planes completados en el periodo ${periodo}`,
      },
    ];
  }

  /**
   * Extraer año del periodo (soporta múltiples formatos)
   */
  private extraerAñoDelPeriodo(periodo: string): number {
    // Formatos: "2025-S1", "2025-Q1", "2025", "2025-01"
    const match = periodo.match(/^(\d{4})/);
    if (match) {
      return parseInt(match[1], 10);
    }
    // Si no se puede extraer, usar año actual
    return new Date().getFullYear();
  }

  /**
   * Obtener datos financieros para informe de austeridad
   */
  private async obtenerDatosFinancieros(periodo: string): Promise<Record<string, any>> {
    // TODO: Integrar con sistema financiero o SIIF
    return {
      periodo,
      gastos: [],
      medidasAusteridad: [],
    };
  }

  /**
   * Obtener datos de planes de mejoramiento
   */
  private async obtenerDatosPlanesMejoramiento(periodo: string): Promise<any[]> {
    const año = this.extraerAñoDelPeriodo(periodo);
    const fechaInicio = new Date(año, 0, 1);
    const fechaFin = new Date(año, 11, 31, 23, 59, 59);

    // Obtener todos los planes del periodo
    const planes = await this.planRepository
      .createQueryBuilder('plan')
      .leftJoinAndSelect('plan.acciones', 'acciones')
      .where('plan.createdAt >= :fechaInicio', { fechaInicio })
      .andWhere('plan.createdAt <= :fechaFin', { fechaFin })
      .getMany();

    // Calcular estadísticas
    const totalPlanes = planes.length;
    const planesEnEjecucion = planes.filter(p => p.estado === PlanMejoramientoEstado.EN_EJECUCION).length;
    const planesCompletados = planes.filter(p => p.estado === PlanMejoramientoEstado.COMPLETADO).length;
    const planesFormulacion = planes.filter(p => p.estado === PlanMejoramientoEstado.BORRADOR || p.estado === PlanMejoramientoEstado.REVISION).length;

    // Total de acciones
    const totalAcciones = planes.reduce((sum, p) => sum + (p.acciones?.length || 0), 0);
    const accionesCompletadas = planes.reduce(
      (sum, p) => sum + (p.acciones?.filter(a => a.estado === 'completada' || a.estado === 'implementada').length || 0),
      0,
    );

    return [
      {
        nombre: 'Total Planes de Mejoramiento',
        valor: totalPlanes,
        tipo: 'numero',
      },
      {
        nombre: 'Planes en Formulación',
        valor: planesFormulacion,
        tipo: 'numero',
      },
      {
        nombre: 'Planes en Ejecución',
        valor: planesEnEjecucion,
        tipo: 'numero',
      },
      {
        nombre: 'Planes Completados',
        valor: planesCompletados,
        tipo: 'numero',
      },
      {
        nombre: 'Total Acciones Correctivas',
        valor: totalAcciones,
        tipo: 'numero',
      },
      {
        nombre: 'Acciones Completadas',
        valor: accionesCompletadas,
        tipo: 'numero',
      },
      {
        nombre: 'Porcentaje de Cumplimiento',
        valor: totalAcciones > 0 ? ((accionesCompletadas / totalAcciones) * 100).toFixed(1) : 0,
        tipo: 'porcentaje',
      },
    ];
  }

  /**
   * Obtener indicadores de la OCI
   */
  private async obtenerIndicadoresOCI(periodo: string): Promise<Record<string, any>> {
    const año = this.extraerAñoDelPeriodo(periodo);
    const fechaInicio = new Date(año, 0, 1);
    const fechaFin = new Date(año, 11, 31, 23, 59, 59);

    // Obtener datos base
    const totalAuditorias = await this.auditoriaRepository
      .createQueryBuilder('auditoria')
      .where('auditoria.fechaInicio >= :fechaInicio', { fechaInicio })
      .andWhere('auditoria.fechaInicio <= :fechaFin', { fechaFin })
      .getCount();

    const auditoriasCompletadas = await this.auditoriaRepository
      .createQueryBuilder('auditoria')
      .where('auditoria.fase = :fase', { fase: FaseAuditoria.COMPLETADA })
      .andWhere('auditoria.fechaFin >= :fechaInicio', { fechaInicio })
      .andWhere('auditoria.fechaFin <= :fechaFin', { fechaFin })
      .getCount();

    const planesActivos = await this.planRepository.count({
      where: {
        estado: PlanMejoramientoEstado.EN_EJECUCION,
      },
    });

    const totalHallazgos = await this.hallazgoRepository.count();
    
    // Buscar hallazgos críticos por categoría o palabras clave
    const hallazgosCriticos = await this.hallazgoRepository
      .createQueryBuilder('hallazgo')
      .where('hallazgo.categoria = :categoria', { categoria: 'critico' })
      .orWhere('LOWER(hallazgo.titulo) LIKE :critico', { critico: '%crítico%' })
      .orWhere('LOWER(hallazgo.titulo) LIKE :alto', { alto: '%alto%' })
      .getCount();

    // Calcular indicadores
    const porcentajeCumplimientoAuditorias =
      totalAuditorias > 0 ? ((auditoriasCompletadas / totalAuditorias) * 100).toFixed(1) : '0';

    const porcentajeHallazgosCriticos =
      totalHallazgos > 0 ? ((hallazgosCriticos / totalHallazgos) * 100).toFixed(1) : '0';

    return {
      periodo,
      indicadores: [
        {
          nombre: 'Cumplimiento del Programa de Auditorías',
          valor: porcentajeCumplimientoAuditorias,
          unidad: '%',
          meta: 80,
          cumplimiento: parseFloat(porcentajeCumplimientoAuditorias) >= 80 ? 'CUMPLE' : 'NO CUMPLE',
        },
        {
          nombre: 'Total Auditorías Ejecutadas',
          valor: auditoriasCompletadas,
          unidad: 'auditorías',
          meta: totalAuditorias,
        },
        {
          nombre: 'Planes de Mejoramiento Activos',
          valor: planesActivos,
          unidad: 'planes',
        },
        {
          nombre: 'Porcentaje de Hallazgos Críticos',
          valor: porcentajeHallazgosCriticos,
          unidad: '%',
          meta: 20, // Meta: menos del 20% de hallazgos críticos
          cumplimiento: parseFloat(porcentajeHallazgosCriticos) <= 20 ? 'CUMPLE' : 'NO CUMPLE',
        },
      ],
    };
  }

  /**
   * Guardar datos automáticos generados
   */
  async guardarDatosAutomaticos(
    entregaId: string,
    tipoDato: string,
    datos: Record<string, any>,
    fuenteDatos: string = 'sistema',
  ): Promise<DatosAutomaticosInforme> {
    const datosAutomaticos = this.datosRepository.create({
      entregaId,
      tipoDato,
      datos,
      fuenteDatos,
      fechaGeneracion: new Date(),
    });

    return this.datosRepository.save(datosAutomaticos);
  }

  /**
   * Obtener datos automáticos guardados para una entrega
   */
  async obtenerDatosGuardados(entregaId: string): Promise<DatosAutomaticosInforme[]> {
    return this.datosRepository.find({
      where: { entregaId },
      order: { fechaGeneracion: 'DESC' },
    });
  }
}
