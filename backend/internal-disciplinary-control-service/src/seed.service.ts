import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DisciplinaryNews, NewsOrigin, NewsStatus } from './entities/disciplinary-news.entity';
import { Sequence } from './entities/sequence.entity';
import { DisciplinaryProfessional } from './entities/disciplinary-professional.entity';
import { DisciplinaryProcess, ProcessStage, ProcessStatus } from './entities/disciplinary-process.entity';

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
  ) { }

  /**
   * Ejecuta el seed con datos de prueba
   */
  async seed(): Promise<void> {
    // Inicializar secuencias
    await this.initializeSequences();

    // Crear profesionales
    const { abogado } = await this.createProfessionals();

    // Crear noticias de prueba
    await this.createSampleNews();

    // Crear procesos de prueba
    if (abogado) {
      await this.createSampleProcesses(abogado);
    }

    console.log('✅ Seed completado exitosamente');
  }

  private async initializeSequences(): Promise<void> {
    const year = new Date().getFullYear();

    // Secuencia de noticias
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

    // Secuencia de procesos
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

  private async createProfessionals(): Promise<{ jefe: DisciplinaryProfessional, abogado: DisciplinaryProfessional }> {
    // Jefe
    let jefe = await this.professionalRepository.findOne({ where: { email: 'jefe@esap.edu.co' } });
    if (!jefe) {
      jefe = this.professionalRepository.create({
        nombreCompleto: 'Hernán Buitrago',
        email: 'jefe@esap.edu.co',
        cargo: 'Jefe de Oficina',
        estado: 'ACTIVO',
      });
      await this.professionalRepository.save(jefe);
      console.log('✅ Profesional creado: Hernán Buitrago');
    }

    // Abogado
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
      console.log('✅ Profesional creado: Tomás Gutiérrez');
    }

    return { jefe, abogado };
  }

  private async createSampleNews(): Promise<void> {
    const existingNews = await this.newsRepository.count();
    if (existingNews > 0) {
      console.log('ℹ️  Las noticias ya existen, saltando seed de noticias');
      return;
    }

    const news = [
      {
        origen: NewsOrigin.QUEJOSO,
        territorial: 'BOGOTA',
        dependenciaDenunciado: 'RECURSOS HUMANOS',
        denunciante: [{
          nombre: 'Juan Carlos López',
          cedula: '1234567890',
          email: 'juan.lopez@example.com',
          cargo: 'Ciudadano',
        }],
        disciplinable: [{
          nombre: 'María González García',
          cedula: '9876543210',
          cargo: 'Jefe de Departamento',
        }],
        hechos: 'Se alega incumplimiento en los procedimientos administrativos y trato discriminatorio hacia el personal.',
        adjuntos: [],
        estado: NewsStatus.RADICADA,
      },
      {
        origen: NewsOrigin.OFICIO,
        territorial: 'MEDELLIN',
        dependenciaDenunciado: 'TESORERIA',
        denunciante: [{
          nombre: 'Inspector ESAP',
          email: 'inspector@esap.gov.co',
          cargo: 'Inspector',
        }],
        disciplinable: [{
          nombre: 'Roberto Pérez Mendez',
          cedula: '5555555555',
          cargo: 'Tesorero Regional',
        }],
        hechos: 'Presunta irregularidad en el manejo de fondos públicos según auditoría interna.',
        adjuntos: [],
        estado: NewsStatus.ASIGNADA,
      },
      {
        origen: NewsOrigin.ANONIMO,
        territorial: 'CALI',
        dependenciaDenunciado: 'CONTRATACION',
        denunciante: [{
          nombre: 'Anónimo',
        }],
        disciplinable: [{
          nombre: 'Carlos Ruiz',
          cedula: '111222333',
          cargo: 'Contratista',
        }],
        hechos: 'Posible favorecimiento en proceso de licitación.',
        adjuntos: [],
        estado: NewsStatus.DEVUELTA,
      },
    ];

    for (const newsData of news) {
      const year = new Date().getFullYear();
      const seqNews = await this.sequenceRepository.findOne({
        where: { name: `DISCIPLINARY_NEWS_${year}` },
      });

      if (!seqNews) {
        console.error('Secuencia no inicializada');
        return;
      }

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
    if (existingProcesses > 0) {
      console.log('ℹ️  Los procesos ya existen, saltando seed de procesos');
      return;
    }

    // Buscar noticias para asociar (asumimos que existen por el paso anterior)
    const noticias = await this.newsRepository.find({ take: 2 });
    if (noticias.length < 2) {
      console.log('⚠️ No hay suficientes noticias para crear procesos');
      return;
    }

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
}
