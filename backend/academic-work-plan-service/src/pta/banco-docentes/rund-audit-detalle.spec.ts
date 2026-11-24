import { auditCambios } from './rund-audit-cambios';
import { protectRundSensitiveData } from './banco-docentes-sensitive-data';
import { cambiosDeCreacion, columnasCargaModificadas, describirCambio, PROTEGIDO } from './rund-audit-detalle';

describe('detalle de auditoría del perfil RUND (HU 1365)', () => {
  describe('describirCambio', () => {
    it('registra el valor real del puntaje salarial (se protege al leer, no al guardar)', () => {
      expect(describirCambio('puntajeSalarial', 398.26, 450.25)).toEqual({ anterior: 398.26, nuevo: 450.25 });
    });

    it('no repite el bloque de la carga masiva en el log', () => {
      expect(describirCambio('datosCargaMasiva', { a: 1 }, { a: 2 })).toEqual({ anterior: PROTEGIDO, nuevo: PROTEGIDO });
    });

    it('convierte undefined en null y conserva el resto de valores', () => {
      expect(describirCambio('dedicacion', undefined, 'HC')).toEqual({ anterior: null, nuevo: 'HC' });
      expect(describirCambio('horasAsignables', 800, 0)).toEqual({ anterior: 800, nuevo: 0 });
    });
  });

  describe('columnasCargaModificadas', () => {
    it('lista solo las columnas cuyo valor cambió, sin valores y ordenadas', () => {
      expect(columnasCargaModificadas({ B: 1, A: 'x', C: null }, { B: 2, A: 'x', C: 'nuevo' })).toEqual(['B', 'C']);
    });

    it('detecta columnas agregadas o retiradas y trata null y ausente como lo mismo', () => {
      expect(columnasCargaModificadas({ A: 1 }, { B: 2 })).toEqual(['A', 'B']);
      expect(columnasCargaModificadas({ A: null }, {})).toEqual([]);
    });

    it('tolera entradas nulas o que no son objetos', () => {
      expect(columnasCargaModificadas(null, { A: 1 })).toEqual(['A']);
      expect(columnasCargaModificadas('texto', undefined)).toEqual([]);
      expect(columnasCargaModificadas(null, null)).toEqual([]);
    });
  });

  describe('cambiosDeCreacion', () => {
    it('enumera cada dato con anterior vacío y valor nuevo', () => {
      const cambios = cambiosDeCreacion({
        tipoVinculacion: 'CARRERA2', dedicacion: 'TC', horasAsignables: 800, puntajeSalarial: 398.26, observaciones: null,
        correoAlternativo: '', titulosAdicionales: [], fechaInicioVinculacion: new Date('2024-08-01T00:00:00Z'),
      });
      expect(Object.keys(cambios).sort()).toEqual(['dedicacion', 'fechaInicioVinculacion', 'horasAsignables', 'puntajeSalarial', 'tipoVinculacion']);
      expect(cambios.dedicacion).toEqual({ anterior: null, nuevo: 'TC' });
      expect(cambios.puntajeSalarial).toEqual({ anterior: null, nuevo: 398.26 });
    });

    it('conserva el cero como dato válido y descarta nulos, vacíos y listas vacías', () => {
      const cambios = cambiosDeCreacion({ horasAsignables: 0, dedicacionHorasSemana: 0, nucleoTematico: undefined, escalafon: '' });
      expect(Object.keys(cambios).sort()).toEqual(['dedicacionHorasSemana', 'horasAsignables']);
    });

    it('omite identificadores y campos técnicos', () => {
      const cambios = cambiosDeCreacion({ id: 'x', personaId: 'p', territorialId: 't', sedeId: 's', estadoAprobacion: 'PENDIENTE', idRund: 'RUND-1',
        ordenListado: 3, createdAt: new Date(), updatedAt: new Date(), eliminadoRund: false, dedicacion: 'MT' });
      expect(Object.keys(cambios)).toEqual(['dedicacion']);
    });

    it('anota la carga masiva como protegida sin copiar la fila del Excel', () => {
      const cambios = cambiosDeCreacion({ dedicacion: 'TC', datosCargaMasiva: { DOCUMENTO_IDENTIDAD: '123', PUNTAJE_SALARIAL: 400 } });
      expect(cambios.datosCargaMasiva).toEqual({ anterior: null, nuevo: PROTEGIDO });
      expect(JSON.stringify(cambios)).not.toContain('123');
    });

    it('sin datos devuelve un objeto vacío', () => {
      expect(cambiosDeCreacion({})).toEqual({});
    });
  });

  describe('lectura protegida del historial', () => {
    const fila = (cambios: any) => ({
      id: 'log', accion: 'EDITAR', campoAfectado: Object.keys(cambios).join(','), datoPrevio: null, datoNuevo: null,
      metadata: { cambios },
    });
    const cambios = {
      puntajeSalarial: { anterior: 398.26, nuevo: 450.25 },
      dedicacion: { anterior: 'TC', nuevo: 'HC' },
    };

    it('quien tiene acceso a datos sensibles ve el puntaje real en cambios[]', () => {
      const row = fila(cambios);
      const out = protectRundSensitiveData({ ...row, cambios: auditCambios(row) }, true) as any;
      expect(out.cambios).toEqual(expect.arrayContaining([{ campo: 'puntajeSalarial', anterior: '398.26', nuevo: '450.25' }]));
    });

    it('quien no lo tiene recibe el puntaje enmascarado en cambios[] y en metadata, y ve el resto', () => {
      const row = fila(cambios);
      const out = protectRundSensitiveData({ ...row, cambios: auditCambios(row) }, false) as any;
      const puntaje = out.cambios.find((c: any) => c.campo === 'puntajeSalarial');
      expect(puntaje.anterior).toBeNull();
      expect(puntaje.nuevo).toBeNull();
      expect(JSON.stringify(out)).not.toContain('398.26');
      expect(JSON.stringify(out)).not.toContain('450.25');
      expect(out.cambios.find((c: any) => c.campo === 'dedicacion')).toEqual({ campo: 'dedicacion', anterior: 'TC', nuevo: 'HC' });
    });

    it('enmascara una cédula registrada como cambio sin romper otros campos', () => {
      const row = fila({ num_identificacion: { anterior: '1020304050', nuevo: '1020304051' }, dedicacion: { anterior: 'TC', nuevo: 'MT' } });
      const out = protectRundSensitiveData({ ...row, cambios: auditCambios(row) }, false) as any;
      const cedula = out.cambios.find((c: any) => c.campo === 'num_identificacion');
      expect(cedula.anterior).toBe('******4050');
      expect(cedula.nuevo).toBe('******4051');
      expect(JSON.stringify(out)).not.toContain('1020304050');
    });

    it('cuando el cambio es de un solo campo sensible, también se enmascaran las columnas dato_previo/dato_nuevo', () => {
      const row = { id: 'l', accion: 'EDITAR', campoAfectado: 'puntajeSalarial', datoPrevio: '398.26', datoNuevo: '450.25',
        metadata: { cambios: { puntajeSalarial: { anterior: 398.26, nuevo: 450.25 } } } };
      const out = protectRundSensitiveData({ ...row, cambios: auditCambios(row) }, false) as any;
      expect(out.datoPrevio).toBeNull();
      expect(out.datoNuevo).toBeNull();
      expect(JSON.stringify(out)).not.toMatch(/398\.26|450\.25/);
    });

    it('un cambio sin campos sensibles no se modifica', () => {
      const row = fila({ dedicacion: { anterior: 'TC', nuevo: 'HC' } });
      const input = { ...row, cambios: auditCambios(row) };
      const out = protectRundSensitiveData(input, false) as any;
      expect(out).toMatchObject(input);
      expect(out.proteccion_datos).toEqual({ acceso_completo: false, campos_sensibles: [], campos_enmascarados: [] });
    });
  });
});
