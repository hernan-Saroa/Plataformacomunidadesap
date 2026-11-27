import { describe, expect, it } from 'vitest';
import {
  AccionPlanMejoramiento,
  calcularAvancePorFasePhvaUI,
  construirNombreArchivoPlan,
  formatearPorcentaje,
  mapearAccionBackend,
  normalizarEstadoPlanUI,
} from './planesMejoramientoPhva';
import {
  construirFilasExportacionAcciones,
  generarDocumentoPdfPlan,
  generarWorkbookExcelPlan,
} from './exportPlanMejoramiento';

describe('planesMejoramientoPhva (Bug 2418)', () => {
  it('mapea correctamente acciones del backend y calcula avance por fase PHVA', () => {
    const acciones: AccionPlanMejoramiento[] = [
      mapearAccionBackend({
        id: '1',
        nombre: 'Definir matriz',
        fasePhva: 'PLANEAR',
        pesoPorcentual: '33.33',
        estado: 'EJECUTADA',
        responsable: 'Ana',
        fechaLimite: '2026-12-01',
        fechaEjecucion: '2026-11-26T10:00:00Z',
      }),
      mapearAccionBackend({
        id: '2',
        nombre: 'Aplicar control',
        fasePhva: 'HACER',
        pesoPorcentual: '33.33',
        estado: 'PENDIENTE',
      }),
      mapearAccionBackend({
        id: '3',
        nombre: 'Auditar resultado',
        fasePhva: 'VERIFICAR',
        pesoPorcentual: '33.34',
        estado: 'EJECUTADA',
      }),
    ];

    const resumen = calcularAvancePorFasePhvaUI(acciones);
    expect(resumen.PLANEAR.porcentajeAvance).toBe(100);
    expect(resumen.HACER.porcentajeAvance).toBe(0);
    expect(resumen.VERIFICAR.porcentajeAvance).toBe(100);
    expect(resumen.ACTUAR.total).toBe(0);
  });

  it('formatea porcentajes y normaliza estados del plan', () => {
    expect(formatearPorcentaje(25)).toBe('25%');
    expect(formatearPorcentaje(33.33)).toBe('33.33%');
    expect(formatearPorcentaje(100)).toBe('100%');

    expect(normalizarEstadoPlanUI('CERRADO')).toBe('COMPLETADO');
    expect(normalizarEstadoPlanUI('COMPLETADO')).toBe('COMPLETADO');
    expect(normalizarEstadoPlanUI('EN_EJECUCION')).toBe('EN_EJECUCION');
    expect(normalizarEstadoPlanUI('ABIERTO')).toBe('EN_EJECUCION');
  });

  it('construye nombre de archivo con código del plan y fecha de generación', () => {
    const fecha = new Date(2026, 10, 26); // 2026-11-26
    expect(construirNombreArchivoPlan('PM-CGR-2026-001', 'pdf', fecha)).toBe(
      'PM-CGR-2026-001_2026-11-26.pdf',
    );
    expect(construirNombreArchivoPlan('PM-CGR-2026-001', 'xlsx', fecha)).toBe(
      'PM-CGR-2026-001_2026-11-26.xlsx',
    );
  });

  it('genera exportación individual Excel y PDF con código, ente, severidad, acciones PHVA, pesos y cumplimiento', async () => {
    const fecha = new Date(2026, 10, 26);
    const acciones: AccionPlanMejoramiento[] = [
      {
        id: '1',
        nombre: 'Acción Planear',
        descripcion: 'Detalle P',
        fasePhva: 'PLANEAR',
        pesoPorcentual: 50,
        estado: 'EJECUTADA',
        porcentajeAvance: 100,
        responsable: 'Laura Gómez',
        fechaLimite: '2026-12-10',
        fechaEjecucion: '2026-11-26T15:00:00Z',
      },
      {
        id: '2',
        nombre: 'Acción Actuar',
        descripcion: 'Detalle A',
        fasePhva: 'ACTUAR',
        pesoPorcentual: 50,
        estado: 'PENDIENTE',
        porcentajeAvance: 0,
        responsable: 'Carlos Ruiz',
        fechaLimite: '2026-12-20',
        fechaEjecucion: null,
      },
    ];

    const filas = construirFilasExportacionAcciones(acciones);
    expect(filas[0]).toMatchObject({
      fasePhva: 'Planear',
      peso: '50%',
      responsable: 'Laura Gómez',
      estado: 'Ejecutada',
    });
    expect(filas[1]).toMatchObject({
      fasePhva: 'Actuar',
      peso: '50%',
      estado: 'Pendiente',
      fechaEjecucion: '—',
    });

    const datos = {
      codigo: 'PM-OCI-2026-009',
      titulo: 'Hallazgo de control documental',
      enteControlNombre: 'Oficina de Control Interno',
      hallazgo: 'Falta de estandarización en actas',
      documentoOrigen: 'Informe OCI-012',
      severidad: 'ALTO',
      responsable: 'Dra. Ana María',
      areaResponsable: 'Dirección Jurídica',
      estadoNombre: 'En Ejecución',
      avancePorcentaje: 50,
      fechaRecepcion: '2026-11-01',
      fechaRespuesta: '2026-11-15',
      fechaInicio: '2026-11-05',
      fechaFinEstimada: '2026-12-30',
      acciones,
    };

    const { workbook, filename: xlsxName } = await generarWorkbookExcelPlan(datos, fecha);
    expect(xlsxName).toBe('PM-OCI-2026-009_2026-11-26.xlsx');
    const sheet = workbook.getWorksheet('Plan de Mejoramiento');
    expect(sheet).toBeDefined();
    const allValues: string[] = [];
    sheet?.eachRow((row) => {
      row.eachCell((cell) => {
        if (cell.value != null) allValues.push(String(cell.value));
      });
    });
    const joined = allValues.join(' | ');
    expect(joined).toContain('PM-OCI-2026-009');
    expect(joined).toContain('Oficina de Control Interno');
    expect(joined).toContain('Alta');
    expect(joined).toContain('Planear');
    expect(joined).toContain('Actuar');
    expect(joined).toContain('50%');
    expect(joined).toContain('Ejecutada');

    const { doc, filename: pdfName } = generarDocumentoPdfPlan(datos, fecha);
    expect(pdfName).toBe('PM-OCI-2026-009_2026-11-26.pdf');
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });
});
