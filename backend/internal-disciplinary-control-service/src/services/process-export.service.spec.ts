import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProcessExportService } from './process-export.service';
import { DisciplinaryProcess, ProcessStage, ProcessStatus } from '../entities/disciplinary-process.entity';
import { DisciplinaryProcessActuacion } from '../entities/disciplinary-process-actuacion.entity';
import { ReglaAlerta } from '../entities/regla-alerta.entity';
import { TerminosCalculatorService } from './terminos-calculator.service';
import { AutoStatus, AutoType } from '../entities/legal-auto.entity';

describe('ProcessExportService', () => {
  let service: ProcessExportService;

  const mockProcessRepository = {
    find: jest.fn(),
  };

  const mockActuacionesRepository = {
    find: jest.fn(),
  };

  const mockReglaAlertaRepository = {
    find: jest.fn(),
  };

  const mockTerminosCalculatorService = {
    calculateVencimientoEtapa: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessExportService,
        {
          provide: getRepositoryToken(DisciplinaryProcess),
          useValue: mockProcessRepository,
        },
        {
          provide: getRepositoryToken(DisciplinaryProcessActuacion),
          useValue: mockActuacionesRepository,
        },
        {
          provide: getRepositoryToken(ReglaAlerta),
          useValue: mockReglaAlertaRepository,
        },
        {
          provide: TerminosCalculatorService,
          useValue: mockTerminosCalculatorService,
        },
      ],
    }).compile();

    service = module.get<ProcessExportService>(ProcessExportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateVencimientosReport', () => {
    it('debe generar el reporte Excel incluyendo la etapa Evaluación con fórmula, resultado y semaforización', async () => {
      const now = new Date();
      const fechaEntradaEval = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 5);
      const fechaVencEval = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 25);

      mockReglaAlertaRepository.find.mockResolvedValue([
        { diasAnticipacion: 5, activa: true },
      ]);

      mockActuacionesRepository.find.mockResolvedValue([
        {
          processId: 'proc-1',
          tipo: 'cambio_etapa',
          etapa: 'EVALUACION',
          fechaActuacion: fechaEntradaEval,
        },
      ]);

      mockTerminosCalculatorService.calculateVencimientoEtapa.mockResolvedValue({
        dias: 30,
        fechaVencimiento: fechaVencEval,
      });

      const mockProcess: Partial<DisciplinaryProcess> = {
        id: 'proc-1',
        radicadoProceso: 'P-001-2026',
        etapaActual: ProcessStage.EVALUACION,
        estado: ProcessStatus.ACTIVO,
        fechaInicioEtapa: fechaEntradaEval,
        createdAt: new Date(),
        news: {
          id: 'news-1',
          territorial: 'Bogotá',
          conducta: 'Presunta falta',
          conductas: ['Presunta falta'],
          disciplinable: [{ cedula: '12345678', nombre: 'Juan Pérez', cargo: 'Docente' }],
        } as any,
        autos: [],
      };

      mockProcessRepository.find.mockResolvedValue([mockProcess]);

      const workbook = await service.generateVencimientosReport();
      expect(workbook).toBeDefined();

      const worksheet = workbook.getWorksheet('Base');
      expect(worksheet).toBeDefined();

      // Verificar fila de encabezados
      expect(worksheet.getCell(1, 1).value).toBe('No. DE TRAMITE DISCIPLINARIO');
      expect(worksheet.getCell(1, 6).value).toBe('II. ESTADO DEL PROCESO');
      expect(worksheet.getCell(1, 20).value).toBe('Fecha Vencimiento IP ID y P');
      expect(worksheet.getCell(1, 21).value).toBe('FECHA AUTO DE CIERRE EVALUACION ID\nD/M/A');
      expect(worksheet.getCell(1, 22).value).toBe('Fecha Vencimiento Evaluacion ID');
      expect(worksheet.getCell(1, 24).value).toBe('Vencimientos');

      // Fila 2: proceso en evaluación
      const row = 2;
      expect(worksheet.getCell(row, 1).value).toBe('P-001-2026');
      expect(worksheet.getCell(row, 6).value).toBe('04 EVALUACIÓN ID');

      // Columna 21 (U): Fecha entrada evaluación
      expect(worksheet.getCell(row, 21).value).toEqual(fechaEntradaEval);

      // Columna 22 (V): Fecha Vencimiento Evaluacion ID con fórmula y resultado
      const cellV = worksheet.getCell(row, 22).value as any;
      expect(cellV.formula).toContain('IF(U2="",""');
      expect(cellV.result).toEqual(fechaVencEval);

      // Columna 24 (X): Vencimientos (última columna)
      const cellX = worksheet.getCell(row, 24);
      const cellXVal = cellX.value as any;

      // La fórmula debe contemplar EVALUACIÓN, ARCHIVADO e INHIBIDO
      expect(cellXVal.formula).toContain('04 EVALUACIÓN ID');
      expect(cellXVal.formula).toContain('ARCHIVADO');
      expect(cellXVal.formula).toContain('INHIBIDO');
      expect(cellXVal.formula).toContain('V2'); // Evalúa la columna V para Evaluación

      // El resultado precalculado debe ser "EN TÉRMINOS" porque faltan 25 días (> 6 días)
      expect(cellXVal.result).toBe('EN TÉRMINOS');

      // Semáforo: celda coloreada en verde
      expect(cellX.fill).toEqual({
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD1FAE5' },
      });
      expect(cellX.font?.color).toEqual({ argb: 'FF065F46' });
      expect(cellX.font?.bold).toBe(true);
    });

    it('debe manejar procesos ARCHIVADOS e INHIBIDOS correctamente en Estado y Vencimientos', async () => {
      mockReglaAlertaRepository.find.mockResolvedValue([]);
      mockActuacionesRepository.find.mockResolvedValue([]);

      const procArchivado: Partial<DisciplinaryProcess> = {
        id: 'proc-arch',
        radicadoProceso: 'P-002-2026',
        etapaActual: ProcessStage.INVESTIGACION,
        estado: ProcessStatus.ARCHIVADO,
        createdAt: new Date(),
        autos: [
          {
            id: 'auto-arch',
            tipo: AutoType.AUTO_ARCHIVO,
            estado: AutoStatus.APROBADO,
            updatedAt: new Date(),
          } as any,
        ],
      };

      const procInhibido: Partial<DisciplinaryProcess> = {
        id: 'proc-inhib',
        radicadoProceso: 'P-003-2026',
        etapaActual: ProcessStage.INHIBITORIO,
        estado: ProcessStatus.ARCHIVADO,
        createdAt: new Date(),
        autos: [
          {
            id: 'auto-inhib',
            tipo: AutoType.AUTO_INHIBITORIO,
            estado: AutoStatus.APROBADO,
            updatedAt: new Date(),
          } as any,
        ],
      };

      mockProcessRepository.find.mockResolvedValue([procArchivado, procInhibido]);

      const workbook = await service.generateVencimientosReport();
      const worksheet = workbook.getWorksheet('Base');

      // Proceso Archivado (Fila 2)
      expect(worksheet.getCell(2, 6).value).toBe('ARCHIVADO');
      const cellXArch = worksheet.getCell(2, 24);
      expect((cellXArch.value as any).result).toBe('ARCHIVADO');
      expect(cellXArch.fill).toEqual({
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE2E8F0' },
      });
      expect(worksheet.getCell(2, 23).value).toBe('Auto de Archivo');

      // Proceso Inhibido (Fila 3)
      expect(worksheet.getCell(3, 6).value).toBe('INHIBIDO');
      const cellXInhib = worksheet.getCell(3, 24);
      expect((cellXInhib.value as any).result).toBe('INHIBIDO');
      expect(cellXInhib.fill).toEqual({
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEDE9FE' },
      });
      expect(worksheet.getCell(3, 23).value).toBe('Auto Inhibitorio');
    });

    it('debe marcar VENCIDO y ETAPA POR VENCER con sus respectivos colores según umbral', async () => {
      const now = new Date();
      const vencidoDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2);
      const porVencerDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);

      mockReglaAlertaRepository.find.mockResolvedValue([
        { diasAnticipacion: 5, activa: true },
      ]);
      mockActuacionesRepository.find.mockResolvedValue([]);

      mockTerminosCalculatorService.calculateVencimientoEtapa
        .mockResolvedValueOnce({ dias: 30, fechaVencimiento: vencidoDate })
        .mockResolvedValueOnce({ dias: 30, fechaVencimiento: porVencerDate });

      const procVencido: Partial<DisciplinaryProcess> = {
        id: 'proc-vencido',
        radicadoProceso: 'P-004-2026',
        etapaActual: ProcessStage.INVESTIGACION,
        estado: ProcessStatus.ACTIVO,
        fechaInicioEtapa: new Date(),
        createdAt: new Date(),
        autos: [],
      };

      const procPorVencer: Partial<DisciplinaryProcess> = {
        id: 'proc-por-vencer',
        radicadoProceso: 'P-005-2026',
        etapaActual: ProcessStage.INVESTIGACION,
        estado: ProcessStatus.ACTIVO,
        fechaInicioEtapa: new Date(),
        createdAt: new Date(),
        autos: [],
      };

      mockProcessRepository.find.mockResolvedValue([procVencido, procPorVencer]);

      const workbook = await service.generateVencimientosReport();
      const worksheet = workbook.getWorksheet('Base');

      // Vencido (Fila 2)
      const cellVencido = worksheet.getCell(2, 24);
      expect((cellVencido.value as any).result).toBe('VENCIDO');
      expect(cellVencido.fill).toEqual({
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFEE2E2' },
      });
      expect(cellVencido.font?.color).toEqual({ argb: 'FF991B1B' });

      // Por Vencer (Fila 3)
      const cellPorVencer = worksheet.getCell(3, 24);
      expect((cellPorVencer.value as any).result).toBe('ETAPA POR VENCER');
      expect(cellPorVencer.fill).toEqual({
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFEF3C7' },
      });
      expect(cellPorVencer.font?.color).toEqual({ argb: 'FF92400E' });
    });

    it('no debe fiarse solo del auto de archivo si el proceso fue restaurado o está ACTIVO', async () => {
      const now = new Date();
      const fvFuture = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 20);

      mockReglaAlertaRepository.find.mockResolvedValue([
        { diasAnticipacion: 5, activa: true },
      ]);
      mockActuacionesRepository.find.mockResolvedValue([]);
      mockTerminosCalculatorService.calculateVencimientoEtapa.mockResolvedValue({
        dias: 30,
        fechaVencimiento: fvFuture,
      });

      // Proceso que en el pasado tuvo AUTO_ARCHIVO aprobado, pero fue RESTAURADO a ACTIVO
      const procRestaurado: Partial<DisciplinaryProcess> = {
        id: 'proc-restaurado',
        radicadoProceso: 'P-006-2026',
        etapaActual: ProcessStage.INVESTIGACION,
        estado: ProcessStatus.ACTIVO,
        restaurado: true,
        fechaInicioEtapa: now,
        createdAt: now,
        autos: [
          {
            id: 'auto-arch-historico',
            tipo: AutoType.AUTO_ARCHIVO,
            estado: AutoStatus.APROBADO,
            updatedAt: new Date(now.getTime() - 1000000),
          } as any,
        ],
      };

      mockProcessRepository.find.mockResolvedValue([procRestaurado]);

      const workbook = await service.generateVencimientosReport();
      const worksheet = workbook.getWorksheet('Base');

      // Columna F (6): Etapa debe ser la activa (Investigación), NO 'ARCHIVADO'
      expect(worksheet.getCell(2, 6).value).toBe('03 INVESTIGACIÓN DISCIPLINARIA');

      // Columna W (23): Decisión NO debe ser 'Auto de Archivo' ya que está activo en trámite
      expect(worksheet.getCell(2, 23).value).toBe('');

      // Columna X (24): Vencimientos debe calcularse normalmente (EN TÉRMINOS), NO 'ARCHIVADO'
      const cellX = worksheet.getCell(2, 24);
      expect((cellX.value as any).result).toBe('EN TÉRMINOS');
      expect(cellX.fill).toEqual({
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD1FAE5' },
      });
      expect(cellX.font?.color).toEqual({ argb: 'FF065F46' });
    });

    it('no debe marcar ARCHIVADO si el proceso fue apelado y está en SEGUNDA_INSTANCIA', async () => {
      const now = new Date();
      const fvFuture = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 15);

      mockReglaAlertaRepository.find.mockResolvedValue([]);
      mockActuacionesRepository.find.mockResolvedValue([]);
      mockTerminosCalculatorService.calculateVencimientoEtapa.mockResolvedValue({
        dias: 15,
        fechaVencimiento: fvFuture,
      });

      const procApelado: Partial<DisciplinaryProcess> = {
        id: 'proc-apelado',
        radicadoProceso: 'P-007-2026',
        etapaActual: ProcessStage.SEGUNDA_INSTANCIA,
        estado: ProcessStatus.ACTIVO,
        fechaInicioEtapa: now,
        createdAt: now,
        autos: [
          {
            id: 'auto-arch-apelado',
            tipo: AutoType.AUTO_ARCHIVO,
            estado: AutoStatus.APROBADO,
            updatedAt: new Date(now.getTime() - 500000),
          } as any,
        ],
      };

      mockProcessRepository.find.mockResolvedValue([procApelado]);

      const workbook = await service.generateVencimientosReport();
      const worksheet = workbook.getWorksheet('Base');

      // Columna F (6): Etapa de Segunda Instancia
      expect(worksheet.getCell(2, 6).value).toBe('07 SEGUNDA INSTANCIA');
      expect(worksheet.getCell(2, 23).value).toBe('');

      const cellX = worksheet.getCell(2, 24);
      expect((cellX.value as any).result).not.toBe('ARCHIVADO');
    });

    it('no debe marcar ARCHIVADO si hubo un auto posterior al auto de archivo', async () => {
      const now = new Date();
      const fvFuture = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 25);

      mockReglaAlertaRepository.find.mockResolvedValue([]);
      mockActuacionesRepository.find.mockResolvedValue([]);
      mockTerminosCalculatorService.calculateVencimientoEtapa.mockResolvedValue({
        dias: 30,
        fechaVencimiento: fvFuture,
      });

      const procConAutoPosterior: Partial<DisciplinaryProcess> = {
        id: 'proc-posterior',
        radicadoProceso: 'P-008-2026',
        etapaActual: ProcessStage.INVESTIGACION,
        estado: ProcessStatus.ACTIVO,
        fechaInicioEtapa: now,
        createdAt: now,
        autos: [
          {
            id: 'auto-arch-old',
            tipo: AutoType.AUTO_ARCHIVO,
            estado: AutoStatus.APROBADO,
            updatedAt: new Date(now.getTime() - 2000000),
          } as any,
          {
            id: 'auto-apertura-posterior',
            tipo: AutoType.AUTO_APERTURA_INVESTIGACION,
            estado: AutoStatus.APROBADO,
            updatedAt: new Date(now.getTime() - 1000000),
          } as any,
        ],
      };

      mockProcessRepository.find.mockResolvedValue([procConAutoPosterior]);

      const workbook = await service.generateVencimientosReport();
      const worksheet = workbook.getWorksheet('Base');

      expect(worksheet.getCell(2, 6).value).toBe('03 INVESTIGACIÓN DISCIPLINARIA');
      expect(worksheet.getCell(2, 23).value).toBe('');
      const cellX = worksheet.getCell(2, 24);
      expect((cellX.value as any).result).toBe('EN TÉRMINOS');
    });
  });
});
