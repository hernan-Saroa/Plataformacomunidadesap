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
    expect(worksheet!.getCell('N13').value).toBe('X');
    expect(worksheet!.getCell('V13').value).toBe(2);
    expect(worksheet!.getCell('W13').value).toBe('1.45 MB');
    expect(worksheet!.getCell('X13').value).toBe('Indagación');

    // Validar pie
    expect(worksheet!.getCell('B112').value).toBe('ELABORADO POR: JUAN CARLOS RAMIREZ');
  });
});
