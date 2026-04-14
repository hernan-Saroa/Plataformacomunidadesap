/**
 * SEED SERVICE - DESHABILITADO
 *
 * Este servicio está configurado para NO cargar datos de prueba en la base de datos.
 * Solo inicializa las secuencias necesarias para el funcionamiento del sistema.
 *
 * Para habilitar datos de prueba, descomente las llamadas en el método seed().
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DisciplinaryNews } from './entities/disciplinary-news.entity';
import { Sequence } from './entities/sequence.entity';
import { DisciplinaryProfessional } from './entities/disciplinary-professional.entity';
import { DisciplinaryProcess } from './entities/disciplinary-process.entity';
import { StageConfiguration } from './entities/stage-configuration.entity';
import { SystemConfiguration } from './entities/system-configuration.entity';
import { LegalAuto } from './entities/legal-auto.entity';

@Injectable()
export class SeedService {
  constructor(
    @InjectRepository(DisciplinaryNews)
    private newsRepository: Repository<DisciplinaryNews>,
    @InjectRepository(Sequence)
    private sequenceRepository: Repository<Sequence>,
    @InjectRepository(DisciplinaryProfessional)
    private professionalRepository: Repository<DisciplinaryProfessional>,
    @InjectRepository(DisciplinaryProcess)
    private processRepository: Repository<DisciplinaryProcess>,
    @InjectRepository(StageConfiguration)
    private stageConfigRepository: Repository<StageConfiguration>,
    @InjectRepository(SystemConfiguration)
    private systemConfigRepository: Repository<SystemConfiguration>,
    @InjectRepository(LegalAuto)
    private autoRepository: Repository<LegalAuto>,
  ) { }

  /**
   * Ejecuta el seed con datos de prueba
   * NOTA: Este seed está deshabilitado para evitar carga de datos en producción
   */
  async seed(): Promise<void> {
    console.log('ℹ️ Seed deshabilitado - No se cargarán datos de prueba');

    // Solo inicializar secuencias si no existen
    await this.initializeSequences();

    console.log('✅ Secuencias inicializadas exitosamente');

    // Los siguientes métodos están comentados para evitar carga de datos de prueba:
    // await this.seedConfigurations();
    // const { abogado } = await this.createProfessionals();
    // await this.createSampleNews();
    // if (abogado) {
    //   await this.createSampleProcesses(abogado);
    //   await this.createSampleAutos();
    // }
  }

  private async initializeSequences(): Promise<void> {
    const year = new Date().getFullYear();

    let seqNews = await this.sequenceRepository.findOne({
      where: { name: `DISCIPLINARY_NEWS_${year}` },
    });
    if (!seqNews) {
      seqNews = this.sequenceRepository.create({
        name: `DISCIPLINARY_NEWS_${year}`,
        currentValue: 0,
      });
      await this.sequenceRepository.save(seqNews);
    }

    let seqProcess = await this.sequenceRepository.findOne({
      where: { name: `DISCIPLINARY_PROCESS_${year}` },
    });
    if (!seqProcess) {
      seqProcess = this.sequenceRepository.create({
        name: `DISCIPLINARY_PROCESS_${year}`,
        currentValue: 0,
      });
      await this.sequenceRepository.save(seqProcess);
    }
  }

  /**
   * DESHABILITADO: Crea configuraciones de etapas y sistema
   * Este método está deshabilitado para evitar carga de datos en producción
   */
  private async seedConfigurations(): Promise<void> {
    console.log('⚠️ Método seedConfigurations() está deshabilitado');

    // IMPORTANTE: Solo sembrar etapas si la tabla está COMPLETAMENTE vacía
    // Esto evita duplicados cuando hay etapas con nombres diferentes (con/sin acentos)
    const existingStagesCount = await this.stageConfigRepository.count();

    if (existingStagesCount === 0) {
      const stages = [
        { etapa: 'RECEPCION', orden: 1, diasHabiles: 3, descripcion: 'Recepción de la noticia', activo: true },
        { etapa: 'VALORACION', orden: 2, diasHabiles: 10, descripcion: 'Valoración inicial', activo: true },
        { etapa: 'INDAGACION_PREVIA', orden: 3, diasHabiles: 40, descripcion: 'Indagación previa', activo: true },
        { etapa: 'INVESTIGACION', orden: 4, diasHabiles: 60, descripcion: 'Investigación disciplinaria', activo: true },
        { etapa: 'EVALUACION', orden: 5, diasHabiles: 10, descripcion: 'Evaluación de investigación', activo: true },
        { etapa: 'JUZGAMIENTO', orden: 6, diasHabiles: 50, descripcion: 'Etapa de juzgamiento', activo: true },
        { etapa: 'SEGUNDA_INSTANCIA', orden: 7, diasHabiles: 10, descripcion: 'Segunda instancia', activo: true },
      ];

      for (const stage of stages) {
        try {
          await this.stageConfigRepository.save(stage);
        } catch (error) {
          console.warn(`⚠️ No se pudo crear la etapa ${stage.etapa}:`, error.message);
        }
      }
      console.log('✅ Etapas de configuración sembradas');
    } else {
      console.log(`ℹ️ Ya existen ${existingStagesCount} etapas configuradas, saltando seed de etapas`);
    }

    const systemCount = await this.systemConfigRepository.count();
    if (systemCount === 0) {
      await this.systemConfigRepository.save({
        roleCapacities: { especializado: 12, universitario: 10, coordinador: 8 },
        notificationSettings: {
          vencimiento7dias: true,
          vencimiento3dias: true,
          vencimiento1dia: true,
          procesoVencido: true,
          asignacionProceso: true,
        },
        alertSettings: { porcentajeRiesgo: 80, porcentajeCritico: 95, diasAnticipacion: 7 },
        securitySettings: { auditEnabled: true, digitalSignature: true, backupEnabled: true },
      });
    }
  }

  /**
   * DESHABILITADO: Crea profesionales de prueba
   * Este método está deshabilitado para evitar carga de datos en producción
   */
  private async createProfessionals(): Promise<{ jefe: DisciplinaryProfessional, abogado: DisciplinaryProfessional }> {
    let jefe = await this.professionalRepository.findOne({ where: { email: 'jefe@esap.edu.co' } });
    if (!jefe) {
      jefe = this.professionalRepository.create({
        nombreCompleto: 'Hernán Buitrago',
        email: 'jefe@esap.edu.co',
        cargo: 'Jefe de Oficina',
        estado: 'ACTIVO',
      });
      await this.professionalRepository.save(jefe);
    }

    let abogado = await this.professionalRepository.findOne({ where: { email: 'tomas@esap.edu.co' } });
    if (!abogado) {
      abogado = this.professionalRepository.create({
        nombreCompleto: 'Tomás Gutiérrez',
        email: 'tomas@esap.edu.co',
        cargo: 'Profesional Universitario',
        capacidadMaxima: 10,
        estado: 'ACTIVO',
      });
      await this.professionalRepository.save(abogado);
    }

    return { jefe, abogado: abogado! };
  }

  /**
   * DESHABILITADO: Crea noticias disciplinarias de prueba
   * Este método está deshabilitado para evitar carga de datos en producción
   */
  private async createSampleNews(): Promise<void> {
    const existingNews = await this.newsRepository.count();
    if (existingNews > 0) return;

    const news = [
      {
        origen: 'QUEJOSO',
        territorial: 'BOGOTA',
        dependenciaDenunciado: 'RECURSOS HUMANOS',
        denunciante: {
          nombre: 'Juan Carlos López',
          cedula: '1234567890',
          email: 'juan.lopez@example.com',
          cargo: 'Ciudadano',
        },
        disciplinable: {
          nombre: 'María González García',
          cedula: '9876543210',
          cargo: 'Jefe de Departamento',
        },
        hechos: 'Se alega incumplimiento en los procedimientos administrativos y trato discriminatorio hacia el personal.',
        adjuntos: [],
        estado: 'RADICADA',
      },
      {
        origen: 'OFICIO',
        territorial: 'MEDELLIN',
        dependenciaDenunciado: 'TESORERIA',
        denunciante: {
          nombre: 'Inspector ESAP',
          email: 'inspector@esap.gov.co',
          cargo: 'Inspector',
        },
        disciplinable: {
          nombre: 'Roberto Pérez Mendez',
          cedula: '5555555555',
          cargo: 'Tesorero Regional',
        },
        hechos: 'Presunta irregularidad en el manejo de fondos públicos según auditoría interna.',
        adjuntos: [],
        estado: 'ASIGNADA',
      },
      {
        origen: 'ANONIMO',
        territorial: 'CALI',
        dependenciaDenunciado: 'CONTRATACION',
        denunciante: {
          nombre: 'Anónimo',
        },
        disciplinable: {
          nombre: 'Carlos Ruiz',
          cedula: '111222333',
          cargo: 'Contratista',
        },
        hechos: 'Posible favorecimiento en proceso de licitación.',
        adjuntos: [],
        estado: 'DEVUELTA',
      },
    ];

    for (const newsData of news) {
      const year = new Date().getFullYear();
      let seqNews = await this.sequenceRepository.findOne({
        where: { name: `DISCIPLINARY_NEWS_${year}` },
      });

      if (!seqNews) continue; // Should exist from initializeSequences

      seqNews.currentValue++;
      await this.sequenceRepository.save(seqNews);

      const radicado = `ND-${year}-${String(seqNews.currentValue).padStart(3, '0')}`;

      const noticia = this.newsRepository.create({
        radicado,
        ...newsData,
        fechaRecepcion: new Date(),
      } as any);

      await this.newsRepository.save(noticia);
      console.log(`✅ Noticia creada: ${radicado}`);
    }
  }

  /**
   * DESHABILITADO: Crea procesos disciplinarios de prueba
   * Este método está deshabilitado para evitar carga de datos en producción
   */
  private async createSampleProcesses(abogado: DisciplinaryProfessional): Promise<void> {
    const existingProcesses = await this.processRepository.count();
    if (existingProcesses > 0) return;

    const noticias = await this.newsRepository.find({ take: 2 });
    if (noticias.length < 2) return;

    const processesData = [
      {
        news: noticias[0],
        etapaActual: 'EVALUACION',
        estado: 'ACTIVO',
      },
      {
        news: noticias[1],
        etapaActual: 'INDAGACION_PREVIA',
        estado: 'ACTIVO',
      },
    ];

    for (const procData of processesData) {
      const year = new Date().getFullYear();
      let seqProc = await this.sequenceRepository.findOne({
        where: { name: `DISCIPLINARY_PROCESS_${year}` },
      });

      if (!seqProc) continue;

      seqProc.currentValue++;
      await this.sequenceRepository.save(seqProc);

      const radicadoProceso = `P-${String(seqProc.currentValue).padStart(3, '0')}-${year}`;

      const proceso = this.processRepository.create({
        radicadoProceso,
        news: procData.news,
        etapaActual: procData.etapaActual,
        estado: procData.estado,
        abogadoAsignado: abogado,
      } as any);

      await this.processRepository.save(proceso);
      console.log(`✅ Proceso creado: ${radicadoProceso}`);
    }
  }

  /**
   * DESHABILITADO: Crea autos procesales de prueba
   * Este método está deshabilitado para evitar carga de datos en producción
   */
  private async createSampleAutos(): Promise<void> {
    const count = await this.autoRepository.count();
    if (count > 0) return;

    const processes = await this.processRepository.find({ relations: ['news'] });
    if (processes.length === 0) return;

    const autoRevision = this.autoRepository.create({
      process: processes[0],
      processId: processes[0].id,
      tipo: 'AUTO_APERTURA_INDAGACION',
      contenido: '<h2>AUTO DE APERTURA</h2><p>Texto de prueba</p>',
      estado: 'REVISION_JEFE',
      currentVersion: 1,
      comentarios: 'Favor revisar',
      createdAt: new Date(),
    } as any);
    await this.autoRepository.save(autoRevision);

    console.log('✅ Autos de prueba creados');
  }
}
