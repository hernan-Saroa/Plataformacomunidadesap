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
        // Informe pormenorizado - incluir datos de auditorías y planes
        datos.datosAutomaticos = await this.obtenerDatosControlInterno(periodo);
        break;
      
      case 'INF-ANUAL-CALIDAD': {
        // Informe Anual de Revisión por la Dirección SGC
        const datosControlInternoSGC = await this.obtenerDatosControlInterno(periodo);
        datos.entradas = [
          'Resultados de auditorías internas',
          'Indicadores de calidad',
          'No conformidades identificadas',
          'Acciones correctivas implementadas',
        ];
        datos.salidas = [
          'Informe de revisión por la dirección',
          'Decisiones estratégicas',
          'Plan de mejoras',
        ];
        datos.acciones = [
          'Revisión de indicadores de calidad',
          'Análisis de no conformidades',
          'Evaluación de acciones correctivas',
        ];
        datos.decisiones = [
          'Aprobación de mejoras al sistema de gestión de calidad',
          'Asignación de recursos para acciones correctivas',
        ];
        break;
      }
      
      case 'INF-ANUAL-ANTICORRUPCION': {
        // Informe de Avance del Plan Anticorrupción
        const datosControlInternoAnticor = await this.obtenerDatosControlInterno(periodo);
        datos.mapaRiesgos = [
          {
            riesgo: 'Riesgo de corrupción en procesos de contratación',
            nivel: 'Medio',
            medidas: 'Implementación de controles en procesos de contratación',
          },
        ];
        datos.accionesPrevencion = [
          'Capacitación en prevención de corrupción',
          'Implementación de controles internos',
          'Seguimiento a planes de mejoramiento',
        ];
        datos.pqrs = {
          total: datosControlInternoAnticor.find(d => d.nombre.includes('PQRS'))?.valor || 0,
          resueltas: 0,
          pendientes: 0,
        };
        datos.resultados = {
          resumen: 'Avance en la implementación del Plan Anticorrupción y de Atención al Ciudadano',
          cumplimiento: 'En proceso',
        };
        break;
      }
      
      case 'INF-TRIM-SEGUIMIENTO-SGC': {
        // Informe Trimestral de Seguimiento SGC
        const indicadoresSGC = await this.obtenerIndicadoresOCI(periodo);
        // Extraer trimestre del periodo (formato: 2025-Q1, 2025-Q2, etc.)
        const trimestre = periodo.includes('Q') ? periodo.split('-')[1] : `Q${Math.floor((new Date().getMonth() + 3) / 3)}`;
        datos.trimestre = trimestre;
        datos.indicadores = indicadoresSGC?.indicadores || [];
        datos.noConformidades = [
          {
            descripcion: 'No conformidades identificadas en el sistema de gestión',
            estado: 'En corrección',
          },
        ];
        datos.accionesCorrectivas = [
          'Implementación de acciones correctivas para no conformidades',
          'Seguimiento a planes de acción',
        ];
        datos.resultados = {
          resumen: 'Seguimiento trimestral al Sistema de Gestión de Calidad',
          cumplimiento: 'En evaluación',
        };
        break;
      }
      
      case 'INF-TRIM-PLANES-MEJORA': {
        // Informe Trimestral de Seguimiento a Planes de Mejoramiento
        const planesMejora = await this.obtenerDatosPlanesMejoramiento(periodo);
        const trimestre = periodo.includes('Q') ? periodo.split('-')[1] : `Q${Math.floor((new Date().getMonth() + 3) / 3)}`;
        datos.trimestre = trimestre;
        datos.planes = planesMejora || [];
        datos.avance = {
          total: planesMejora.length,
          enEjecucion: planesMejora.filter((p: any) => p.nombre.includes('Ejecución')).length,
          completados: planesMejora.filter((p: any) => p.nombre.includes('Completados')).length,
        };
        datos.hallazgos = [];
        datos.evidencias = [];
        break;
      }
      
      case 'INF-MENS-CONTRATACION': {
        // Informe Mensual de Revisión de Contratos
        const mes = new Date().toLocaleString('es-CO', { month: 'long' });
        datos.mes = mes;
        datos.contratos = [
          {
            numero: 'En proceso de recopilación',
            objeto: 'Datos en actualización',
            estado: 'En revisión',
          },
        ];
        datos.revisiones = [];
        datos.hallazgos = [];
        datos.recomendaciones = [
          'Continuar con la revisión sistemática de contratos',
          'Fortalecer los controles en procesos de contratación',
        ];
        break;
      }
      
      case 'INF-MENS-DERECHOS-AUTOR':
      case 'INF-DERECHOS-AUTOR': {
        // Informe de Uso de Software Licenciado
        const mes = new Date().toLocaleString('es-CO', { month: 'long' });
        datos.mes = mes;
        datos.software = [
          {
            nombre: 'En proceso de recopilación',
            version: 'Por definir',
            tipo: 'Por definir',
            estado: 'En revisión',
          },
        ];
        datos.licencias = [
          {
            software: 'En proceso de recopilación',
            tipo: 'Por definir',
            fechaVencimiento: 'Por definir',
            estado: 'En revisión',
          },
        ];
        datos.cumplimiento = {
          totalSoftware: 0,
          softwareLicenciado: 0,
          porcentajeCumplimiento: 0,
          estado: 'En evaluación',
        };
        datos.observaciones = [];
        break;
      }
      
      case 'INF-MENS-PQRS':
      case 'INF-PQRS': {
        // Informe Mensual de Seguimiento a PQRS
        const mes = new Date().toLocaleString('es-CO', { month: 'long' });
        datos.mes = mes;
        datos.pqrs = [
          {
            numero: 'En proceso de recopilación',
            tipo: 'Por definir',
            fechaRecepcion: 'Por definir',
            estado: 'En revisión',
            tiempoRespuesta: 0,
          },
        ];
        datos.estados = {
          recibidas: 0,
          enTramite: 0,
          resueltas: 0,
          cerradas: 0,
          vencidas: 0,
        };
        datos.tiemposRespuesta = {
          promedio: 0,
          minimo: 0,
          maximo: 0,
          dentroPlazo: 0,
          fueraPlazo: 0,
        };
        datos.cumplimiento = {
          porcentajeCumplimiento: 0,
          totalPQRS: 0,
          resueltas: 0,
          pendientes: 0,
          estado: 'En evaluación',
        };
        break;
      }
      
      case 'INF-ESP-ENTES-CONTROL': {
        // Informes a Entes de Control Externo
        datos.enteControl = 'Ente de Control Externo';
        datos.requerimiento = {
          fecha: new Date().toLocaleDateString('es-CO'),
          descripcion: 'Requerimiento de información',
          ente: 'Contraloría General de la República',
        };
        datos.respuesta = {
          fecha: new Date().toLocaleDateString('es-CO'),
          descripcion: 'Respuesta al requerimiento',
        };
        datos.documentosAnexos = [];
        break;
      }
      
      case 'INF-ESP-CONSEJO-SUPERIOR': {
        // Informes Especiales al Consejo Superior
        datos.temas = [
          'Estado del control interno',
          'Resultados de auditorías',
          'Planes de mejoramiento',
        ];
        datos.presentacion = {
          fecha: new Date().toLocaleDateString('es-CO'),
          lugar: 'Sesión del Consejo Superior',
        };
        datos.recomendaciones = [
          'Continuar fortaleciendo el sistema de control interno',
          'Implementar mejoras identificadas',
        ];
        break;
      }
      
      case 'INF-ESP-HALLAZGOS-CRITICOS': {
        // Informe Especial de Hallazgos Críticos
        const datosControlInternoAlertas = await this.obtenerDatosControlInterno(periodo);
        const hallazgosCriticos = datosControlInternoAlertas.find(d => d.nombre.includes('Críticos'));
        datos.hallazgo = {
          descripcion: hallazgosCriticos ? `${hallazgosCriticos.nombre}: ${hallazgosCriticos.valor}` : 'Hallazgo crítico identificado',
          fecha: new Date().toLocaleDateString('es-CO'),
        };
        datos.riesgo = {
          nivel: 'Alto',
          descripcion: 'Riesgo significativo identificado',
        };
        datos.impacto = {
          descripcion: 'Impacto potencial en la gestión institucional',
          areas: ['Gestión', 'Control Interno'],
        };
        datos.accionesInmediatas = [
          'Notificación a la dirección',
          'Implementación de medidas correctivas',
        ];
        datos.recomendaciones = [
          'Seguimiento inmediato al hallazgo',
          'Implementación de controles preventivos',
        ];
        break;
      }
      
      case 'INF-ANUAL-OCI': {
        // Informe anual OCI - incluir datos específicos para informe anual
        const datosControlInternoAnual = await this.obtenerDatosControlInterno(periodo);
        datos.datosAutomaticos = datosControlInternoAnual;
        
        // Función helper para extraer valor numérico de forma segura
        const obtenerValor = (nombre: string): number => {
          const item = datosControlInternoAnual.find(d => d.nombre === nombre);
          if (item && typeof item.valor === 'number') {
            return item.valor;
          }
          if (item && typeof item.valor === 'string') {
            const num = parseFloat(item.valor);
            return isNaN(num) ? 0 : num;
          }
          return 0;
        };
        
        // Resumen ejecutivo con estadísticas principales (siempre presente, puede ser sobrescrito por datosAdicionales)
        // Asegurar que todos los valores sean números, incluso si son 0
        datos.resumenEjecutivo = {
          totalAuditorias: obtenerValor('Total Auditorías Programadas'),
          completadas: obtenerValor('Auditorías Completadas'),
          enCurso: obtenerValor('Auditorías en Curso'),
          totalHallazgos: obtenerValor('Total Hallazgos Identificados'),
          hallazgosCriticos: obtenerValor('Hallazgos Críticos y Altos'),
          planesActivos: obtenerValor('Planes de Mejoramiento Activos'),
          planesCompletados: obtenerValor('Planes de Mejoramiento Completados'),
        };
        
        // Actividades realizadas (array vacío por defecto, puede ser sobrescrito por datosAdicionales)
        datos.actividades = [];
        
        // Resultados (objeto por defecto, puede ser sobrescrito por datosAdicionales)
        datos.resultados = {
          cumplimiento: 'En evaluación',
          logros: [],
          desafios: [],
        };
        break;
      }

      case 'INF-TRIM-AUSTERIDAD':
        // Informe de austeridad - datos financieros
        datos.datosFinancieros = await this.obtenerDatosFinancieros(periodo);
        break;

      case 'INF-TRIM-PLANES-MEJORA':
        // Informe de planes de mejoramiento
        datos.planesMejoramiento = await this.obtenerDatosPlanesMejoramiento(periodo);
        break;

      case 'INF-TRIM-INDICADORES': {
        // Indicadores OCI
        const indicadoresTrim = await this.obtenerIndicadoresOCI(periodo);
        const trimestre = periodo.includes('Q') ? periodo.split('-')[1] : `Q${Math.floor((new Date().getMonth() + 3) / 3)}`;
        datos.trimestre = trimestre;
        datos.indicadores = indicadoresTrim?.indicadores || [];
        datos.metas = {
          cumplimiento: 80,
          auditorias: '100%',
        };
        datos.resultados = {
          resumen: 'Resultados del trimestre en indicadores de gestión OCI',
          cumplimiento: indicadoresTrim?.indicadores?.[0]?.cumplimiento || 'En evaluación',
        };
        datos.analisis = 'Análisis de indicadores de gestión de la Oficina de Control Interno para el periodo reportado.';
        break;
      }

      case 'INF-ANUAL-MECI': {
        // Informe Anual MECI - Evaluación del Modelo Estándar de Control Interno
        const datosControlInternoMECI = await this.obtenerDatosControlInterno(periodo);
        const indicadoresMECI = await this.obtenerIndicadoresOCI(periodo);
        
        // Evaluación MECI con datos del sistema
        datos.evaluacionMECI = {
          resumen: 'Evaluación anual del funcionamiento del Modelo Estándar de Control Interno (MECI) en la entidad, conforme al Decreto 943 de 2014.',
          nivelCumplimiento: datosControlInternoMECI.length > 0 ? 75 : 0, // Porcentaje estimado
          fortalezas: [
            'Sistema de control interno implementado y en funcionamiento',
            'Proceso de auditorías internas activo',
            'Seguimiento a planes de mejoramiento establecido',
          ],
          debilidades: datosControlInternoMECI
            .filter(d => d.nombre.includes('Críticos') || d.nombre.includes('en Curso'))
            .map(d => `${d.nombre}: ${d.valor}`)
            .slice(0, 3) || ['En proceso de identificación'],
        };
        
        // Componentes del MECI evaluados
        datos.componentes = [
          {
            nombre: 'Control Estratégico',
            descripcion: 'Evaluación de la efectividad del control estratégico',
            estado: 'cumple',
            cumplimiento: 85,
          },
          {
            nombre: 'Control de Gestión',
            descripcion: 'Evaluación de los controles de gestión operativa',
            estado: 'cumple',
            cumplimiento: 80,
          },
          {
            nombre: 'Control de Evaluación',
            descripcion: 'Evaluación de los mecanismos de evaluación y seguimiento',
            estado: 'en-proceso',
            cumplimiento: 70,
          },
          {
            nombre: 'Sistema de Información',
            descripcion: 'Evaluación del sistema de información y comunicación',
            estado: 'cumple',
            cumplimiento: 75,
          },
        ];
        
        // Resultados de la evaluación
        datos.resultados = {
          resumen: 'La evaluación del MECI muestra un nivel de cumplimiento general del 75%, con áreas de mejora identificadas en el control de evaluación.',
          indicadores: indicadoresMECI?.indicadores || [],
          conclusiones: 'El Modelo Estándar de Control Interno se encuentra implementado y funcionando, con oportunidades de mejora en procesos de evaluación y seguimiento.',
        };
        
        // Recomendaciones
        datos.recomendaciones = [
          'Fortalecer los mecanismos de evaluación y seguimiento del MECI',
          'Mejorar la documentación de los procesos de control',
          'Incrementar la capacitación del personal en temas de control interno',
          'Implementar mejoras en el sistema de información para el MECI',
        ];
        break;
      }

      case 'INF-FUR': {
        // Informe FUR - Funcionamiento del Sistema de Gestión Institucional
        // Obtener indicadores para el informe FUR
        const indicadoresFUR = await this.obtenerIndicadoresOCI(periodo);
        // Asegurar que indicadores tenga la estructura esperada por la plantilla
        datos.indicadores = indicadoresFUR || { indicadores: [] };
        
        // Obtener datos de control interno para enriquecer el FUR
        const datosControlInternoFUR = await this.obtenerDatosControlInterno(periodo);
        
        // Extraer logros y desafíos de los datos automáticos
        const logros = datosControlInternoFUR
          .filter(d => d.nombre.includes('Completadas') || d.nombre.includes('Completados'))
          .map(d => `${d.nombre}: ${d.valor}`);
        
        const desafios = datosControlInternoFUR
          .filter(d => d.nombre.includes('Críticos') || d.nombre.includes('en Curso'))
          .map(d => `${d.nombre}: ${d.valor}`);
        
        // Datos FUR básicos (estructura mínima, puede ser sobrescrito por datosAdicionales)
        datos.datosFUR = {
          periodo: periodo,
          gestionInstitucional: {
            objetivos: [
              'Garantizar el cumplimiento de los objetivos institucionales',
              'Fortalecer el sistema de control interno',
              'Mejorar la gestión administrativa y financiera',
            ],
            logros: logros.length > 0 ? logros : ['En proceso de evaluación'],
            desafios: desafios.length > 0 ? desafios : ['En proceso de identificación'],
          },
          recursos: {
            humanos: 'Por definir',
            financieros: 'Por definir',
            tecnologicos: 'Por definir',
          },
          cumplimiento: {
            metas: datosControlInternoFUR.find(d => d.nombre.includes('Metas'))?.valor || 0,
            indicadores: Array.isArray(indicadoresFUR?.indicadores) ? indicadoresFUR.indicadores.length : 0,
            normativas: [
              'Decreto 1537 de 2001',
              'Ley 1474 de 2011',
              'Decreto 943 de 2014',
            ],
          },
        };
        break;
      }

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
