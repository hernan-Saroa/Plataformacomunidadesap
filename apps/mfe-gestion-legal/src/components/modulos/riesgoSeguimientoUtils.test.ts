import { describe, it, expect } from 'vitest';
import {
  construirFormDataSeguimiento,
  formatearFechaISO,
  formatearTamano,
  textoSeguimientosExportacion,
  validarEvidenciasNuevas,
  validarFormularioSeguimiento,
  type FormularioSeguimiento,
} from './riesgoSeguimientoUtils';
import type { RiesgoSeguimientosAPI, SeguimientoControlAPI } from '../../../../services/api/legal.service';

const EXT = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg'];
const ctx = { hoy: '2026-11-05', inicio: '2026-09-01', fin: '2026-12-31', archivos: [], maxMb: 10, extensiones: EXT };
const valido: FormularioSeguimiento = { cuatrimestre: 3, fechaEjecucion: '2026-10-01', comentarios: 'Revisado', resultado: 'APLICADO', efectividad: '90' };

describe('validarFormularioSeguimiento', () => {
  it('acepta un formulario completo', () => {
    expect(validarFormularioSeguimiento(valido, ctx)).toEqual({});
  });

  it('marca como obligatorios cuatrimestre, fecha, comentarios, resultado y efectividad', () => {
    const e = validarFormularioSeguimiento({ cuatrimestre: null, fechaEjecucion: '', comentarios: '  ', resultado: '', efectividad: '' }, { ...ctx, inicio: null, fin: null });
    expect(Object.keys(e).sort()).toEqual(['comentarios', 'cuatrimestre', 'efectividad', 'fechaEjecucion', 'resultado']);
  });

  it('la fecha no puede ser posterior a hoy, pero hoy sí es válida', () => {
    expect(validarFormularioSeguimiento({ ...valido, fechaEjecucion: '2026-11-06' }, ctx).fechaEjecucion).toMatch(/posterior a la fecha actual/);
    expect(validarFormularioSeguimiento({ ...valido, fechaEjecucion: '2026-11-05' }, ctx).fechaEjecucion).toBeUndefined();
  });

  it('la fecha debe caer en el cuatrimestre elegido', () => {
    expect(validarFormularioSeguimiento({ ...valido, fechaEjecucion: '2026-08-31' }, ctx).fechaEjecucion).toMatch(/dentro del cuatrimestre/);
  });

  it.each([['-1', true], ['0', false], ['100', false], ['101', true], ['12.5', true], ['abc', true]])('efectividad %s -> error=%s', (valor, hayError) => {
    expect(Boolean(validarFormularioSeguimiento({ ...valido, efectividad: valor }, ctx).efectividad)).toBe(hayError);
  });

  it('valida tipo y tamaño de las evidencias', () => {
    const grande = { name: 'g.pdf', size: 11 * 1024 * 1024 };
    expect(validarFormularioSeguimiento(valido, { ...ctx, archivos: [grande] }).evidencias).toMatch(/10 MB/);
    expect(validarFormularioSeguimiento(valido, { ...ctx, archivos: [{ name: 'x.exe', size: 1 }] }).evidencias).toMatch(/tipo no permitido/);
  });
});

describe('validarEvidenciasNuevas', () => {
  it('acepta PDF, Word, Excel e imágenes (sin distinguir mayúsculas)', () => {
    expect(validarEvidenciasNuevas([{ name: 'A.PDF', size: 1 }, { name: 'b.docx', size: 1 }, { name: 'c.XLSX', size: 1 }, { name: 'd.png', size: 1 }], 10, EXT)).toBeUndefined();
  });
  it('el límite es parametrizable', () => {
    expect(validarEvidenciasNuevas([{ name: 'a.pdf', size: 2 * 1024 * 1024 }], 1, EXT)).toMatch(/1 MB/);
    expect(validarEvidenciasNuevas([{ name: 'a.pdf', size: 2 * 1024 * 1024 }], 2, EXT)).toBeUndefined();
  });
});

describe('formateo', () => {
  it('formatearFechaISO no corre el día por zona horaria', () => {
    expect(formatearFechaISO('2026-05-01')).toBe('01/05/2026');
    expect(formatearFechaISO('2026-05-01T00:00:00.000Z')).toBe('01/05/2026');
  });
  it('formatearTamano', () => {
    expect(formatearTamano(512)).toBe('512 B');
    expect(formatearTamano(2048)).toBe('2.0 KB');
    expect(formatearTamano(3 * 1024 * 1024)).toBe('3.0 MB');
  });
});

describe('construirFormDataSeguimiento', () => {
  it('arma el multipart con campos, evidencias y las evidencias a conservar', () => {
    const archivo = new File(['x'], 'acta.pdf', { type: 'application/pdf' });
    const fd = construirFormDataSeguimiento({ ...valido, comentarios: ' ok ' }, [archivo], ['abc.pdf']);
    expect(fd.get('cuatrimestre')).toBe('3');
    expect(fd.get('comentarios')).toBe('ok');
    expect(fd.get('resultado')).toBe('APLICADO');
    expect(fd.get('efectividad')).toBe('90');
    expect(fd.get('evidenciasConservar')).toBe('["abc.pdf"]');
    expect((fd.getAll('evidencias')[0] as File).name).toBe('acta.pdf');
  });
  it('al crear no envía evidenciasConservar', () => {
    expect(construirFormDataSeguimiento(valido, []).has('evidenciasConservar')).toBe(false);
  });
});

describe('textoSeguimientosExportacion', () => {
  const seg: SeguimientoControlAPI = {
    id: 's1', riesgoId: 'r1', controlId: 'c1', vigencia: 2026, cuatrimestre: 2, cuatrimestreLabel: 'Cuatrimestre 2',
    fechaEjecucion: '2026-06-05', comentarios: 'Se revisó con el abogado', resultado: 'APLICADO_PARCIALMENTE', efectividad: 70,
    evidencias: [{ nombre: 'acta.pdf', archivo: 'a.pdf', url: 'files/a.pdf', tipo: 'pdf', tamano: 10 }],
    responsable: 'Ana Ruiz', createdAt: '', updatedAt: '', editable: true,
  };
  const vista = (historial: SeguimientoControlAPI[]): RiesgoSeguimientosAPI => ({
    vigencia: 2026, hoy: '2026-11-05', config: { maxMb: 10, extensiones: EXT }, historial,
    controles: [{ controlId: 'c1', descripcion: 'Monitoreo constante', efectividad: 70, cortes: [] }],
  });

  it('incluye los seguimientos registrados con fecha, resultado, responsable y evidencias', () => {
    const t = textoSeguimientosExportacion(vista([seg]));
    expect(t).toContain('Monitoreo constante (efectividad actual: 70%)');
    expect(t).toContain('Cuatrimestre 2 2026 · 05/06/2026 · Aplicado parcialmente · 70% · Ana Ruiz');
    expect(t).toContain('Comentarios: Se revisó con el abogado');
    expect(t).toContain('Evidencias: acta.pdf');
  });
  it('indica cuando no hay seguimientos o no se pudo consultar', () => {
    expect(textoSeguimientosExportacion(vista([]))).toContain('Sin seguimientos registrados');
    expect(textoSeguimientosExportacion(null)).toContain('No se pudo consultar');
  });
});
