import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DisciplinaryNews, NewsOrigin, NewsStatus } from './entities/disciplinary-news.entity';
import { Sequence } from './entities/sequence.entity';
import { DisciplinaryProfessional } from './entities/disciplinary-professional.entity';
import { DisciplinaryProcess, ProcessStage, ProcessStatus } from './entities/disciplinary-process.entity';
import { StageConfiguration } from './entities/stage-configuration.entity';
import { SystemConfiguration } from './entities/system-configuration.entity';
import { LegalAuto, AutoStatus, AutoType } from './entities/legal-auto.entity';

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
   */
  async seed(): Promise<void> {
    await this.initializeSequences();
    await this.seedConfigurations();

    const { abogado } = await this.createProfessionals();
    await this.createSampleNews();

    if (abogado) {
      await this.createSampleProcesses(abogado);
      await this.createSampleAutos();
    }

    console.log('✅ Seed completado exitosamente');
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

  private async seedConfigurations(): Promise<void> {
    const stages = [
      { etapa: ProcessStage.RECEPCION, diasHabiles: 3, descripcion: 'Recepción de la noticia', activo: true },
      { etapa: ProcessStage.VALORACION, diasHabiles: 10, descripcion: 'Valoración inicial', activo: true },
      { etapa: ProcessStage.INDAGACION_PREVIA, diasHabiles: 40, descripcion: 'Indagación previa', activo: true },
      { etapa: ProcessStage.INVESTIGACION, diasHabiles: 60, descripcion: 'Investigación disciplinaria', activo: true },
      { etapa: ProcessStage.EVALUACION, diasHabiles: 10, descripcion: 'Evaluación de investigación', activo: true },
      { etapa: ProcessStage.JUZGAMIENTO, diasHabiles: 50, descripcion: 'Etapa de juzgamiento', activo: true },
      { etapa: ProcessStage.SEGUNDA_INSTANCIA, diasHabiles: 10, descripcion: 'Segunda instancia', activo: true },
    ];

    for (const stage of stages) {
      const exists = await this.stageConfigRepository.findOne({ where: { etapa: stage.etapa } });
      if (!exists) {
        await this.stageConfigRepository.save(stage);
      }
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

  private async createSampleNews(): Promise<void> {
    const existingNews = await this.newsRepository.count();
    if (existingNews > 0) return;

    const news = [
      {
        origen: NewsOrigin.QUEJOSO,
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
        estado: NewsStatus.RADICADA,
      },
      {
        origen: NewsOrigin.OFICIO,
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
        estado: NewsStatus.ASIGNADA,
      },
      {
        origen: NewsOrigin.ANONIMO,
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
        estado: NewsStatus.DEVUELTA,
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
      });

      await this.newsRepository.save(noticia);
      console.log(`✅ Noticia creada: ${radicado}`);
    }
  }

  private async createSampleProcesses(abogado: DisciplinaryProfessional): Promise<void> {
    const existingProcesses = await this.processRepository.count();
    if (existingProcesses > 0) return;

    const noticias = await this.newsRepository.find({ take: 2 });
    if (noticias.length < 2) return;

    const processesData = [
      {
        news: noticias[0],
        etapaActual: ProcessStage.EVALUACION,
        estado: ProcessStatus.ACTIVO,
      },
      {
        news: noticias[1],
        etapaActual: ProcessStage.INDAGACION_PREVIA,
        estado: ProcessStatus.ACTIVO,
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
      });

      await this.processRepository.save(proceso);
      console.log(`✅ Proceso creado: ${radicadoProceso}`);
    }
  }

  private async createSampleAutos(): Promise<void> {
    const count = await this.autoRepository.count();
    if (count > 0) return;

    const processes = await this.processRepository.find({ relations: ['news'] });
    if (processes.length === 0) return;

    const autoRevision = this.autoRepository.create({
      process: processes[0],
      processId: processes[0].id,
      tipo: AutoType.AUTO_APERTURA_INDAGACION,
      contenido: '<h2>AUTO DE APERTURA</h2><p>Texto de prueba</p>',
      estado: AutoStatus.REVISION_JEFE,
      currentVersion: 1,
      comentarios: 'Favor revisar',
      createdAt: new Date(),
    } as any);
    await this.autoRepository.save(autoRevision);

    console.log('✅ Autos de prueba creados');
  }
}
