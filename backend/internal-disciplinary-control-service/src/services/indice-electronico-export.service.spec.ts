import {
  IndiceElectronicoExportService,
  limpiarNombreArchivo,
  TRD_CODIGO_IDENTIFICACION_EXPEDIENTE,
  TRD_SERIE,
  TRD_SUBSERIE,
} from './indice-electronico-export.service';

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

    it('debe incluir en el bloque de identificación NÚMERO DE EXPEDIENTE (P-XXXX-AAAA), CÓDIGO IDENTIFICACIÓN EXPEDIENTE, SERIE y SUBSERIE vigentes', async () => {
      const expediente = {
        radicado: 'P-137-2026',
        asunto: 'Proceso Disciplinario Ordinario',
        responsable: 'Dra. María González Pérez',
      };

      const workbook = await service.generar(expediente, []);
      const worksheet = workbook.getWorksheet('Formato EI-FO-020');
      expect(worksheet).toBeDefined();

      // Celda A6: Debe contener NÚMERO DE EXPEDIENTE, CÓDIGO IDENTIFICACIÓN EXPEDIENTE e INSTRUMENTO ARCHIVÍSTICO
      const valA6 = String(worksheet!.getCell('A6').value);
      expect(valA6).toContain('NÚMERO DE EXPEDIENTE: P-137-2026');
      expect(valA6).toContain(`CÓDIGO IDENTIFICACIÓN EXPEDIENTE: ${TRD_CODIGO_IDENTIFICACION_EXPEDIENTE}`);
      expect(valA6).toContain('INSTRUMENTO ARCHIVÍSTICO: TRD V4 - TRD (2021 a Actualidad)');

      // Celda F6: Debe contener UNIDAD PRODUCTORA con su código (150)
      expect(worksheet!.getCell('F6').value).toBe('UNIDAD PRODUCTORA: 150 – OFICINA DE CONTROL INTERNO DISCIPLINARIO');

      // Celda A7: SERIE [Código serie] – PROCESOS JURÍDICOS (250 – PROCESOS JURÍDICOS)
      const valA7 = String(worksheet!.getCell('A7').value);
      expect(valA7).toBe(`SERIE: ${TRD_SERIE}`);

      // Celda C7: SUBSERIE [Código subserie] – PROCESOS DISCIPLINARIOS (05 – PROCESOS DISCIPLINARIOS)
      const valC7 = String(worksheet!.getCell('C7').value);
      expect(valC7).toBe(`SUBSERIE: ${TRD_SUBSERIE}`);
    });

    it('debe respetar la clasificación histórica de expedientes ya registrados (ej. TRD V1-V3 con serie 780 y subserie 60)', async () => {
      const expedienteHistorico = {
        radicado: 'P-012-2012',
        asunto: 'Proceso Histórico Periodo 2',
        responsable: 'Abogado Anterior',
        codigoSerie: '780',
        nombreSerie: 'PROCESOS JURÍDICOS',
        codigoSubserie: '60',
        nombreSubserie: 'PROCESOS DISCIPLINARIOS',
        codigoIdentificacionExpediente: '12_160_780_60',
      };

      const workbook = await service.generar(expedienteHistorico, []);
      const worksheet = workbook.getWorksheet('Formato EI-FO-020');
      expect(worksheet).toBeDefined();

      const valA6 = String(worksheet!.getCell('A6').value);
      expect(valA6).toContain('NÚMERO DE EXPEDIENTE: P-012-2012');
      expect(valA6).toContain('CÓDIGO IDENTIFICACIÓN EXPEDIENTE: 12_160_780_60');
      expect(valA6).toContain('TRD V2 - TRD (2007 a 2014)');

      expect(worksheet!.getCell('F6').value).toBe('UNIDAD PRODUCTORA: 10200 – OFICINA DE CONTROL INTERNO DISCIPLINARIO');

      const valA7 = String(worksheet!.getCell('A7').value);
      expect(valA7).toBe('SERIE: 780 – PROCESOS JURÍDICOS');

      const valC7 = String(worksheet!.getCell('C7').value);
      expect(valC7).toBe('SUBSERIE: 60 – PROCESOS DISCIPLINARIOS');
    });

    it('debe mostrar TVD y periodo 1998 a 2006 para expedientes del periodo 1', async () => {
      const expedienteV1 = {
        radicado: 'P-005-2004',
        asunto: 'Proceso Histórico TVD',
      };
      const workbook = await service.generar(expedienteV1, []);
      const worksheet = workbook.getWorksheet('Formato EI-FO-020');
      expect(worksheet).toBeDefined();

      const valA6 = String(worksheet!.getCell('A6').value);
      expect(valA6).toContain('INSTRUMENTO ARCHIVÍSTICO: TRD V1 - TVD (1998 a 2006)');
      expect(worksheet!.getCell('F6').value).toBe('UNIDAD PRODUCTORA: 1101 – OFICINA DE CONTROL INTERNO DISCIPLINARIO');
      expect(worksheet!.getCell('A7').value).toBe('SERIE: 75 – PROCESOS');
      expect(worksheet!.getCell('C7').value).toBe('SUBSERIE: 01 – PROCESOS DISCIPLINARIOS');
    });

    it('debe mostrar "N/A" en SUBSERIE si un expediente no tiene subserie', async () => {
      const expedienteSinSubserie = {
        radicado: 'P-045-2026',
        asunto: 'Investigación sin subserie documental',
        responsable: 'Dr. Juan Pérez López',
        tieneSubserie: false,
      };

      const workbook = await service.generar(expedienteSinSubserie, []);
      const worksheet = workbook.getWorksheet('Formato EI-FO-020');
      expect(worksheet).toBeDefined();

      const valC7 = String(worksheet!.getCell('C7').value);
      expect(valC7).toBe('SUBSERIE: N/A');
    });

    it('debe mostrar "N/A" si subserie se especifica explícitamente como "N/A"', async () => {
      const expedienteSubserieNA = {
        radicado: 'P-099-2026',
        asunto: 'Caso especial',
        responsable: 'Abogado Instructor',
        subserie: 'N/A',
      };

      const workbook = await service.generar(expedienteSubserieNA, []);
      const worksheet = workbook.getWorksheet('Formato EI-FO-020');

      const valC7 = String(worksheet!.getCell('C7').value);
      expect(valC7).toBe('SUBSERIE: N/A');
    });

    it('al exportar varios expedientes, cada índice debe llevar su propio número de expediente y sus códigos', async () => {
      const exp1 = {
        radicado: 'P-137-2026',
        asunto: 'Proceso 1',
      };
      const exp2 = {
        radicado: 'P-205-2026',
        asunto: 'Proceso 2',
        tieneSubserie: false,
      };

      const wb1 = await service.generar(exp1, []);
      const ws1 = wb1.getWorksheet('Formato EI-FO-020');

      const wb2 = await service.generar(exp2, []);
      const ws2 = wb2.getWorksheet('Formato EI-FO-020');

      expect(String(ws1!.getCell('A6').value)).toContain('NÚMERO DE EXPEDIENTE: P-137-2026');
      expect(String(ws1!.getCell('C7').value)).toBe(`SUBSERIE: ${TRD_SUBSERIE}`);

      expect(String(ws2!.getCell('A6').value)).toContain('NÚMERO DE EXPEDIENTE: P-205-2026');
      expect(String(ws2!.getCell('C7').value)).toBe('SUBSERIE: N/A');
    });

    it('debe conservar la estructura del formato EI-FO-020 (logos, código, versión, fecha y celdas combinadas)', async () => {
      const expediente = {
        radicado: 'P-137-2026',
        asunto: 'Proceso con validación de estructura',
      };

      const workbook = await service.generar(expediente, []);
      const worksheet = workbook.getWorksheet('Formato EI-FO-020');
      expect(worksheet).toBeDefined();

      // Estructura oficial del encabezado institucional
      expect(String(worksheet!.getCell('C1').value)).toContain('FORMATO ÍNDICE ELECTRÓNICO');
      expect(String(worksheet!.getCell('I1').value)).toBe('CÓDIGO: EI-FO-020');
      expect(String(worksheet!.getCell('I2').value)).toBe('VERSIÓN: 01');
      expect(String(worksheet!.getCell('I3').value)).toBe('FECHA: 10/04/2024');

      // Celdas combinadas preservadas
      const merges = worksheet!.model.merges;
      expect(merges).toContain('A6:B6');
      expect(merges).toContain('C6:E6');
      expect(merges).toContain('F6:K6');
      expect(merges).toContain('A7:B7');
      expect(merges).toContain('C7:D7');
    });
  });
});
