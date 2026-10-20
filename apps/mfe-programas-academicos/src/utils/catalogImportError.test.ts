import { describe, expect, it } from 'vitest';
import { describeCatalogImportError } from './catalogImportError';

const detail = 'ASIGNATURAS fila 490 (ASIG-00489, Pensum AP_34): nombre_programa "Administración Pública - Nocturno" corresponde a PRO-002, pero codigo_programa "PRO-001" corresponde a "Administración Pública - Diurno". Corrija la asociación entre código y nombre del programa antes de importar.';

describe('presentación de errores de importación', () => {
  it.each([false, true])('recupera el detalle estructurado del backend, incluso con mensaje anidado (%s)', nested => {
    const body = { message: 'Validación del Excel fallida (Reglas bloqueantes R1-R6).', errors: [detail, detail] };
    const failure = describeCatalogImportError({ status: 400, message: body.message + detail,
      response: { data: nested ? { message: body } : body } });
    expect(failure.problems).toHaveLength(1);
    expect(failure.problems[0]).toMatchObject({ sheet: 'ASIGNATURAS', row: '490', reference: 'ASIG-00489, Pensum AP_34' });
    expect(failure.problems[0].message).toContain('Código del programa "PRO-001"');
    expect(failure.notification).toBe('Hay 1 problema por corregir. Consulta el detalle en pantalla.');
    expect(failure.notification).not.toContain('ASIG-00489');
  });

  it('conserva problemas sin fila y listas de mensajes de validación', () => {
    const failure = describeCatalogImportError({ response: { status: 422, data: {
      message: ['Falta la hoja PROGRAMAS.', 'Falta la hoja ASIGNATURAS.'],
    } } });
    expect(failure.kind).toBe('validation');
    expect(failure.problems.map(problem => problem.message)).toEqual(['Falta la hoja PROGRAMAS.', 'Falta la hoja ASIGNATURAS.']);
  });

  it('no confunde una validación de créditos con un fallo de red', () => {
    expect(describeCatalogImportError({ status: 400, message: 'Los creditos deben ser enteros.' }).kind).toBe('validation');
  });

  it.each([undefined, new Error('Error de red al subir archivo'), new Error('Timeout al subir archivo'),
    { status: 500, message: '<html>Internal server error: stack trace muy largo</html>' },
    { status: 401 }, { status: 403 }, { status: 413 }])('resume fallos generales sin mostrar respuestas técnicas (%j)', error => {
    const failure = describeCatalogImportError(error);
    expect(failure.title.length).toBeLessThan(80);
    expect(failure.notification.length).toBeLessThan(120);
    expect(failure.problems).toEqual([]);
    expect(JSON.stringify(failure)).not.toContain('<html>');
  });
});
