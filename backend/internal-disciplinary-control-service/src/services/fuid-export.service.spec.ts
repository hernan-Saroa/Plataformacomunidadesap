import { FuidExportService, FuidItemDto } from './fuid-export.service';

describe('FuidExportService', () => {
  let service: FuidExportService;

  beforeEach(() => {
    service = new FuidExportService();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  it('debe generar el libro de Excel con la plantilla oficial EI-FO-003', async () => {
    const items: FuidItemDto[] = [
      {
        radicado: 'P-137-2026',
        nombreDisciplinado: 'ana lucia',
        asunto: 'Noticia Disciplinaria Inicial',
        descriptorIdentificacion: 'NED: ana lucia',
        fechaExtremaInicial: '2026/08/01',
        fechaExtremaFinal: '2026/10/14',
        codigoCCDU: '780',
        codigoSerieTVD: '780',
        serie: 'PROCESOS JURÍDICOS',
        subserie: 'PROCESOS DISCIPLINARIOS',
        cantidadDocumentos: 2,
        tamanoDocumentos: '1.45 MB',
        notas: 'Indagación',
      },
    ];

    const workbook = await service.generar(items, {
      elaboradoPor: 'JUAN CARLOS RAMIREZ',
    });

    const worksheet = workbook.getWorksheet('TVD PERIODO 1');
    expect(worksheet).toBeDefined();

    // Validar cabecera
    expect(worksheet!.getCell('E5').value).toBe('ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA (ESAP)');
    expect(worksheet!.getCell('J6').value).toBe('OFICINA DE CONTROL INTERNO DISCIPLINARIO');

    // Validar detalle fila 13
    expect(worksheet!.getCell('B13').value).toBe(1);
    expect(worksheet!.getCell('D13').value).toBe('P-137-2026');
    expect(worksheet!.getCell('E13').value).toBe('Expediente P-137-2026');
    expect(worksheet!.getCell('F13').value).toBe('NED: ana lucia');
    expect(worksheet!.getCell('G13').value).toBe('2026/08/01');
    expect(worksheet!.getCell('H13').value).toBe('2026/10/14');
    expect(worksheet!.getCell('K13').value).toBe('780 – PROCESOS JURÍDICOS');
    expect(worksheet!.getCell('L13').value).toBe('05 – PROCESOS DISCIPLINARIOS');
    expect(worksheet!.getCell('N13').value).toBe('X');
    expect(worksheet!.getCell('V13').value).toBe(2);
    expect(worksheet!.getCell('W13').value).toBe('1.45 MB');
    expect(worksheet!.getCell('X13').value).toBe('Indagación');

    // Validar pie
    expect(worksheet!.getCell('B112').value).toBe('ELABORADO POR: JUAN CARLOS RAMIREZ');
  });

  it('debe dejar vacías la fecha final y el descriptor si el proceso no está cerrado', async () => {
    const items: FuidItemDto[] = [
      {
        radicado: 'P-200-2026',
        nombreDisciplinado: 'pedro perez',
        descriptorIdentificacion: 'NED: pedro perez',
        fechaExtremaInicial: '2026/08/01',
        fechaExtremaFinal: '2026/10/14',
        notas: 'Indagación',
        cerrado: false,
      },
      {
        radicado: 'P-201-2026',
        nombreDisciplinado: 'maria gomez',
        fechaExtremaInicial: '2026/07/01',
        fechaExtremaFinal: '2026/09/30',
        notas: 'Finalizado',
        cerrado: true,
      },
    ];

    const workbook = await service.generar(items);
    const ws = workbook.getWorksheet('TVD PERIODO 1')!;

    // Proceso activo
    expect(ws.getCell('F13').value).toBe('');
    expect(ws.getCell('G13').value).toBe('2026/08/01');
    expect(ws.getCell('H13').value).toBe('');

    // Proceso cerrado
    expect(ws.getCell('F14').value).toBe('NED: maria gomez');
    expect(ws.getCell('H14').value).toBe('2026/09/30');
  });

  it('debe usar fuente tamaño 11 sin subrayado en las filas de detalle', async () => {
    const workbook = await service.generar([{ radicado: 'P-300-2026', cerrado: true }]);
    const ws = workbook.getWorksheet('TVD PERIODO 1')!;

    for (const col of ['D', 'F', 'H', 'U', 'X']) {
      const font = ws.getCell(`${col}13`).font;
      expect(font?.size).toBe(11);
      expect(font?.underline).toBeFalsy();
    }
  });
});
