import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DisciplinaryNews, NewsOrigin, NewsStatus } from './entities/disciplinary-news.entity';
import { Sequence } from './entities/sequence.entity';
import { DisciplinaryProfessional } from './entities/disciplinary-professional.entity';
import { DisciplinaryProcess, ProcessStage, ProcessStatus } from './entities/disciplinary-process.entity';
import { StageConfiguration } from './entities/stage-configuration.entity';
import { SystemConfiguration } from './entities/system-configuration.entity';

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
  ) { }

  /**
   * Ejecuta el seed con datos de prueba
   */
  async seed(): Promise<void> {
    await this.initializeSequences();
    await this.seedConfigurations();

    const { abogado, apoyo } = await this.createProfessionals();
    const noticias = await this.createSampleNews();

    if (abogado) {
      await this.createSampleProcesses(abogado, apoyo || abogado, noticias);
    }

    console.log('Seed disciplinario completado');
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
    const stageCount = await this.stageConfigRepository.count();
    if (stageCount === 0) {
      await this.stageConfigRepository.save([
        { etapa: ProcessStage.EVALUACION, diasHabiles: 10, descripcion: 'Valoración inicial', activo: true },
        { etapa: ProcessStage.INDAGACION_PREVIA, diasHabiles: 40, descripcion: 'Indagación previa', activo: true },
        { etapa: ProcessStage.INVESTIGACION, diasHabiles: 60, descripcion: 'Investigación', activo: true },
        { etapa: ProcessStage.JUZGAMIENTO, diasHabiles: 30, descripcion: 'Juzgamiento', activo: true },
      ]);
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

  private async createProfessionals(): Promise<{ jefe: DisciplinaryProfessional, abogado: DisciplinaryProfessional, apoyo: DisciplinaryProfessional | null }> {
    let jefe = await this.professionalRepository.findOne({ where: { email: 'jefe@esap.edu.co' } });
    if (!jefe) {
      jefe = this.professionalRepository.create({
        nombreCompleto: 'Hernan Buitrago',
        email: 'jefe@esap.edu.co',
        cargo: 'Jefe de Oficina',
        estado: 'ACTIVO',
      });
      await this.professionalRepository.save(jefe);
    }

    let abogado = await this.professionalRepository.findOne({ where: { email: 'tomas@esap.edu.co' } });
    if (!abogado) {
      abogado = this.professionalRepository.create({
        nombreCompleto: 'Tomas Gutierrez',
        email: 'tomas@esap.edu.co',
        cargo: 'Profesional Universitario',
        capacidadMaxima: 10,
        estado: 'ACTIVO',
      });
      await this.professionalRepository.save(abogado);
    }

    let apoyo = await this.professionalRepository.findOne({ where: { email: 'maria.garcia@esap.edu.co' } });
    if (!apoyo) {
      apoyo = this.professionalRepository.create({
        nombreCompleto: 'Maria Garcia Londono',
        email: 'maria.garcia@esap.edu.co',
        cargo: 'Profesional Especializado',
        capacidadMaxima: 12,
        estado: 'ACTIVO',
      });
      await this.professionalRepository.save(apoyo);
    }

    return { jefe, abogado, apoyo };
  }

  private async createSampleNews(): Promise<DisciplinaryNews[]> {
    const existingNews = await this.newsRepository.count();
    if (existingNews > 0) {
      return this.newsRepository.find();
    }

    const news = [
      {
        origen: NewsOrigin.QUEJOSO,
        territorial: 'BOGOTA',
        dependenciaDenunciado: 'TALENTO HUMANO',
        denunciante: {
          nombre: 'Pedro Sanchez Ruiz',
          cedula: '1012345678',
          email: 'pedro.sanchez@example.com',
          cargo: 'Ciudadano',
        },
        disciplinable: {
          nombre: 'Juan Perez Gomez',
          cedula: '80123456',
          cargo: 'Profesional Territorial',
        },
        hechos: 'Presunto acoso laboral en territorial Bogota.',
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
          nombre: 'Roberto Perez Mendez',
          cedula: '5555555555',
          cargo: 'Tesorero Regional',
        },
        hechos: 'Presunta irregularidad en el manejo de fondos publicos segun auditoria interna.',
        adjuntos: [],
        estado: NewsStatus.RADICADA,
      },
      {
        origen: NewsOrigin.ANONIMO,
        territorial: 'CALI',
        dependenciaDenunciado: 'CONTRATACION',
        denunciante: { nombre: 'Anonimo' },
        disciplinable: {
          nombre: 'Carlos Ruiz',
          cedula: '111222333',
          cargo: 'Contratista',
        },
        hechos: 'Posible favorecimiento en proceso de licitacion.',
        adjuntos: [],
        estado: NewsStatus.DEVUELTA,
      },
      {
        origen: NewsOrigin.REMISION,
        territorial: 'BARRANQUILLA',
        dependenciaDenunciado: 'PLANEACION',
        denunciante: { nombre: 'Oficina Control Interno', email: 'oci@esap.edu.co' },
        disciplinable: {
          nombre: 'Luisa Fernandez',
          cedula: '321654987',
          cargo: 'Profesional Planeacion',
        },
        hechos: 'Remision por posible conflicto de interes en contratacion.',
        adjuntos: [],
        estado: NewsStatus.RADICADA,
      },
    ];

    const created: DisciplinaryNews[] = [];

    for (const newsData of news) {
      const year = new Date().getFullYear();
      const seqNews = await this.sequenceRepository.findOne({
        where: { name: `DISCIPLINARY_NEWS_${year}` },
      });

      if (!seqNews) {
        console.error('Secuencia no inicializada');
        return created;
      }

      seqNews.currentValue++;
      await this.sequenceRepository.save(seqNews);

      const radicado = `ND-${year}-${String(seqNews.currentValue).padStart(3, '0')}`;

      const noticia = this.newsRepository.create({
        radicado,
        ...newsData,
        fechaRecepcion: new Date(),
      });

      const saved = await this.newsRepository.save(noticia);
      created.push(saved);
      console.log(`Noticia creada: ${radicado}`);
    }

    return created;
  }

  private async createSampleProcesses(abogado: DisciplinaryProfessional, apoyo: DisciplinaryProfessional, noticias: DisciplinaryNews[]): Promise<void> {
    const existingProcesses = await this.processRepository.count();
    if (existingProcesses > 0) {
      return;
    }

    if (noticias.length < 2) {
      console.log('No hay suficientes noticias para crear procesos');
      return;
    }

    const processesData = [
      {
        news: noticias[0],
        etapaActual: ProcessStage.EVALUACION,
        estado: ProcessStatus.ACTIVO,
        diasVencimiento: 10,
        abogado: abogado,
        observaciones: 'Asignado para valoracion inicial',
      },
      {
        news: noticias[1],
        etapaActual: ProcessStage.INDAGACION_PREVIA,
        estado: ProcessStatus.ACTIVO,
        diasVencimiento: 40,
        abogado: apoyo,
        observaciones: 'En indagacion previa',
      },
      {
        news: noticias[2],
        etapaActual: ProcessStage.INVESTIGACION,
        estado: ProcessStatus.ACTIVO,
        diasVencimiento: 60,
        abogado: abogado,
        observaciones: 'Pruebas en curso',
      },
      {
        news: noticias[3] || noticias[0],
        etapaActual: ProcessStage.JUZGAMIENTO,
        estado: ProcessStatus.ACTIVO,
        diasVencimiento: 30,
        abogado: apoyo,
        observaciones: 'Etapa de juzgamiento programada',
      },
    ];

    for (const procData of processesData) {
      const year = new Date().getFullYear();
      const seqProc = await this.sequenceRepository.findOne({
        where: { name: `DISCIPLINARY_PROCESS_${year}` },
      });

      if (!seqProc) {
        console.error('Secuencia de procesos no inicializada');
        return;
      }

      seqProc.currentValue++;
      await this.sequenceRepository.save(seqProc);

      const radicadoProceso = `P-${String(seqProc.currentValue).padStart(3, '0')}-${year}`;
      const fechaVencimiento = this.addDays(new Date(), procData.diasVencimiento);
      const fechaPrescripcion = this.addYears(new Date(), 15);

      const proceso = this.processRepository.create({
        radicadoProceso,
        news: procData.news,
        newsId: procData.news.id,
        etapaActual: procData.etapaActual,
        estado: procData.estado,
        abogadoAsignado: procData.abogado,
        abogadoAsignadoId: procData.abogado.id,
        fechaPrescripcion,
        fechaVencimientoEtapa: fechaVencimiento,
        observaciones: procData.observaciones,
      });

      await this.processRepository.save(proceso);

      if (procData.news.estado !== NewsStatus.ASIGNADA) {
        await this.newsRepository.update(procData.news.id, { estado: NewsStatus.ASIGNADA });
      }

      console.log(`Proceso creado: ${radicadoProceso}`);
    }
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  private addYears(date: Date, years: number): Date {
    const result = new Date(date);
    result.setFullYear(result.getFullYear() + years);
    return result;
  }
}
