import { BadRequestException } from '@nestjs/common';
import { RUND_CARPETAS_CONFIGURABLES, RundCarpetasConfigService, claveTipoVinculacion, esCarpetaObligatoria } from './rund-carpetas-config';
import { RUND_REQUIRED_BLOCKS, EVIDENCE_TYPES } from './rund-evidence-workflow';
import { RUND_PERMISSIONS } from './rund-permissions';

const servicio = (query: jest.Mock) => new RundCarpetasConfigService({ query } as any);

describe('Configuración de carpetas RUND por tipo de vinculación', () => {
  it.each([
    ['Cátedra', 'CATEDRA'], ['CATEDRA', 'CATEDRA'], ['Hora Cátedra', 'CATEDRA'], ['Carrera1', 'CARRERA1'], ['Carrera 2', 'CARRERA2'],
    ['CARRERA', 'CARRERA2'], ['Periodo de Prueba', 'PERIODO_DE_PRUEBA'], ['PERIODO DE PRUEBA', 'PERIODO_DE_PRUEBA'],
    ['Ocasional', 'OCASIONAL'], ['Especial', 'ESPECIAL'], ['Visitante', 'VISITANTE'], ['', 'OCASIONAL'], [null, 'OCASIONAL'],
    ['Directivo', 'DIRECTIVO'], ['CARRERA_003', 'CARRERA_003'],
  ])('normaliza %p como %p', (valor, clave) => {
    expect(claveTipoVinculacion(valor)).toBe(clave);
  });

  it('el permiso de configuración es propio y no se mezcla con los de carga, revisión o incorporación', () => {
    expect(RUND_PERMISSIONS.CONFIGURE).toBe('banco-docentes.rund.configure');
    expect([RUND_PERMISSIONS.CARGADOR, RUND_PERMISSIONS.REVISOR, RUND_PERMISSIONS.INCORPORADOR]).not.toContain(RUND_PERMISSIONS.CONFIGURE);
  });

  it('las carpetas configurables son todas las del expediente salvo Contacto', () => {
    expect([...RUND_CARPETAS_CONFIGURABLES].sort()).toEqual(Object.keys(EVIDENCE_TYPES).filter(bloque => bloque !== 'CONTACTO').sort());
  });

  it('las obligatorias para activar el perfil no se pueden desactivar', async () => {
    const query = jest.fn();
    for (const bloque of RUND_REQUIRED_BLOCKS) {
      expect(esCarpetaObligatoria(bloque)).toBe(true);
      await expect(servicio(query).definir('CATEDRA', bloque, false)).rejects.toThrow(BadRequestException);
    }
    expect(query).not.toHaveBeenCalled();
  });

  it('desactiva una carpeta opcional para un tipo y la guarda con quien la cambió', async () => {
    const query = jest.fn().mockResolvedValue([]);
    const resultado = await servicio(query).definir('Cátedra', 'PRODUCTIVIDAD_ACADEMICA', false, 'actor-1');
    expect(resultado).toEqual({ tipoVinculacion: 'CATEDRA', bloque: 'PRODUCTIVIDAD_ACADEMICA', activo: false });
    expect(query.mock.calls[0][1]).toEqual(['CATEDRA', 'PRODUCTIVIDAD_ACADEMICA', false, 'actor-1']);
  });

  it('una carpeta obligatoria sí se puede dejar activa', async () => {
    const query = jest.fn().mockResolvedValue([]);
    await expect(servicio(query).definir('CATEDRA', 'IDENTIDAD', true)).resolves.toMatchObject({ activo: true });
  });

  it.each([
    ['', 'SEGUNDA_LENGUA', true], ['CATEDRA', 'NO_EXISTE', true], ['CATEDRA', 'CONTACTO', false], ['CATEDRA', 'SEGUNDA_LENGUA', undefined],
  ])('rechaza datos inválidos (%p, %p, %p)', async (tipo, bloque, activo) => {
    const query = jest.fn();
    await expect(servicio(query).definir(tipo as string, bloque as string, activo as any)).rejects.toThrow(BadRequestException);
    expect(query).not.toHaveBeenCalled();
  });

  it('sin configuración todas las carpetas aplican', async () => {
    const query = jest.fn().mockResolvedValue([]);
    expect((await servicio(query).carpetasInactivas('Ocasional')).size).toBe(0);
  });

  it('las carpetas inactivas se consultan por el tipo normalizado', async () => {
    const query = jest.fn().mockResolvedValue([{ bloque: 'PRODUCTIVIDAD_ACADEMICA' }]);
    const inactivas = await servicio(query).carpetasInactivas('Hora Cátedra');
    expect(query.mock.calls[0][1]).toEqual(['CATEDRA']);
    expect([...inactivas]).toEqual(['PRODUCTIVIDAD_ACADEMICA']);
  });

  it('la matriz lista los tipos conocidos, los usados por docentes y las carpetas inactivas', async () => {
    const query = jest.fn()
      .mockResolvedValueOnce([{ tipo_vinculacion: 'CATEDRA', bloque: 'PRODUCTIVIDAD_ACADEMICA' }])
      .mockResolvedValueOnce([{ tipo: 'PERIODO DE PRUEBA' }, { tipo: 'ADMINISTRATIVO' }]);
    const matriz = await servicio(query).matriz();
    const codigos = matriz.tipos.map(tipo => tipo.codigo);
    expect(codigos).toEqual(expect.arrayContaining(['CARRERA1', 'CARRERA2', 'CATEDRA', 'OCASIONAL', 'PERIODO_DE_PRUEBA', 'ADMINISTRATIVO']));
    expect(new Set(codigos).size).toBe(codigos.length);
    expect(matriz.inactivas).toEqual({ CATEDRA: ['PRODUCTIVIDAD_ACADEMICA'] });
    expect(matriz.carpetas.filter(carpeta => carpeta.obligatoria).map(carpeta => carpeta.bloque).sort()).toEqual([...RUND_REQUIRED_BLOCKS].sort());
  });
});
