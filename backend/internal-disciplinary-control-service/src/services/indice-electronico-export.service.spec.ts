import { IndiceElectronicoExportService, limpiarNombreArchivo } from './indice-electronico-export.service';

describe('IndiceElectronicoExportService', () => {
  let service: IndiceElectronicoExportService;

  beforeEach(() => {
    service = new IndiceElectronicoExportService();
  });

  describe('limpiarNombreArchivo', () => {
    it('debe limpiar prefijos timestamp_uuid_', () => {
      const input = '1789006090889_dde3901a-80dc-434a-9e96-7cd2b5b3cd6b_Auto_Apertura.pdf';
      expect(limpiarNombreArchivo(input)).toBe('Auto_Apertura.pdf');
    });

    it('debe limpiar prefijos uuid_', () => {
      const input = 'dde3901a-80dc-434a-9e96-7cd2b5b3cd6b_Queja.docx';
      expect(limpiarNombreArchivo(input)).toBe('Queja.docx');
    });

    it('debe limpiar prefijos timestamp_', () => {
      const input = '1789006090889_Evidencia.xlsx';
      expect(limpiarNombreArchivo(input)).toBe('Evidencia.xlsx');
    });
  });

  describe('generar', () => {
    it('debe conservar los enlaces a documentos PDF sin sobreescribirlos arbitrariamente', async () => {
      const expediente = {
        radicado: 'RAD-2026-001',
        asunto: 'Investigación preliminar',
        responsable: 'Abogado Instructor',
      };

      const documentos = [
        {
          descripcionPrincipal: 'Auto de Apertura de Indagación Preliminar.pdf',
          tipologiaDocumental: 'Auto',
          anexos: '0',
          fechaCreacion: '2026-01-10',
          fechaIncorporacion: '2026-01-10',
          paginaInicio: 1,
          paginaFinal: 5,
          formato: 'PDF',
          tamanoKB: '120 KB',
          archivoAcceso: 'Auto_Apertura.pdf',
          urlAcceso: 'http://localhost:4000/control-disciplinario/api/v1/disciplinary-autos/1234-5678/pdf?token=mocktoken',
        },
        {
          descripcionPrincipal: 'Queja disciplinaria.docx',
          tipologiaDocumental: 'Queja',
          anexos: '1',
          fechaCreacion: '2026-01-11',
          fechaIncorporacion: '2026-01-11',
          paginaInicio: 6,
          paginaFinal: 10,
          formato: 'DOCX',
          tamanoKB: '45 KB',
          archivoAcceso: 'Queja.docx',
          urlAcceso: 'http://localhost:4000/control-disciplinario/files/Queja.docx?token=mocktoken',
        },
      ];

      const workbook = await service.generar(expediente, documentos);
      expect(workbook).toBeDefined();

      const worksheet = workbook.getWorksheet('Formato EI-FO-020');
      expect(worksheet).toBeDefined();

      // Fila 10: Auto de Apertura (PDF)
      const cellK10 = worksheet!.getCell('K10');
      expect(cellK10.value).toBeDefined();
      const valK10 = cellK10.value as any;
      expect(valK10.text).toBe('Auto_Apertura.pdf');
      expect(valK10.hyperlink).toBe(
        'http://localhost:4000/control-disciplinario/api/v1/disciplinary-autos/1234-5678/pdf?token=mocktoken',
      );

      // Fila 11: Queja (DOCX)
      const cellK11 = worksheet!.getCell('K11');
      const valK11 = cellK11.value as any;
      expect(valK11.text).toBe('Queja.docx');
      expect(valK11.hyperlink).toBe(
        'http://localhost:4000/control-disciplinario/files/Queja.docx?token=mocktoken',
      );
    });
  });
});
