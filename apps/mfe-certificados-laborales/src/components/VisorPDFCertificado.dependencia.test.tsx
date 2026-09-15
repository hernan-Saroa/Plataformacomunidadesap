import { describe, expect, it, vi } from 'vitest';

vi.mock('../../services/api/certificados.service', () => ({
  certificadosService: {
    laborales: { obtenerPDFBlob: vi.fn() },
    plantilla: { obtenerConfiguracion: vi.fn() },
  },
}));

import { resolverCentroCosto } from './VisorPDFCertificado';

/**
 * La vista previa y las descargas del certificado se arman EN EL FRONTEND: este
 * componente tiene su propia copia de la resolución de placeholders. Si esa
 * copia y `labor-certificate-pdf.service.ts` no coinciden, el usuario ve una
 * cosa en pantalla y otra en el PDF — que es el bug que originó esta prueba.
 *
 * Regla compartida para [DEPENDENCIA]: gana el CENTRO DE COSTO (grupo interno)
 * y solo se usa la dependencia cuando no hay centro de costo. Igual para filas
 * locales y de Oracle.
 */
describe('resolverCentroCosto — misma regla que resolveLaborInternalGroup del backend', () => {
  it('toma el grupo interno de las filas locales', () => {
    expect(
      resolverCentroCosto(
        'Grupo de Seguridad y Salud en el Trabajo',
        null,
        undefined,
      ),
    ).toBe('Grupo de Seguridad y Salud en el Trabajo');
  });

  it('toma el centro de costo de las filas de Oracle', () => {
    expect(
      resolverCentroCosto(null, null, 'Grupo de Administración de Personal'),
    ).toBe('Grupo de Administración de Personal');
  });

  it('respeta el orden: el primer valor utilizable gana', () => {
    expect(resolverCentroCosto('', null, 'Segundo', 'Tercero')).toBe('Segundo');
  });

  it('devuelve vacío cuando no hay centro de costo, para que caiga a la dependencia', () => {
    expect(resolverCentroCosto(null, undefined, '', '   ')).toBe('');
  });

  it('descarta los marcadores de "no aplica"', () => {
    expect(resolverCentroCosto('N/A')).toBe('');
    expect(resolverCentroCosto('No Aplica')).toBe('');
    expect(resolverCentroCosto('NO APLICA NINGUNO')).toBe('');
    expect(resolverCentroCosto('Ninguno')).toBe('');
    expect(resolverCentroCosto('na')).toBe('');
  });

  it('salta los "no aplica" y sigue buscando un valor real', () => {
    expect(resolverCentroCosto('N/A', 'Grupo Académico')).toBe('Grupo Académico');
  });

  it('normaliza espacios pero conserva el texto original', () => {
    expect(resolverCentroCosto('  Grupo   Académico  ')).toBe('Grupo Académico');
  });

  it('no confunde una dependencia real con un "no aplica"', () => {
    expect(resolverCentroCosto('Dirección Nacional')).toBe('Dirección Nacional');
  });
});
