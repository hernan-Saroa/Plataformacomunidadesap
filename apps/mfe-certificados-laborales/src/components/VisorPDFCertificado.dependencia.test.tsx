import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../services/api/certificados.service', () => ({
  certificadosService: {
    laborales: { obtenerPDFBlob: vi.fn() },
    plantilla: { obtenerConfiguracion: vi.fn() },
  },
}));

vi.mock('qrcode.react', () => ({ QRCodeCanvas: () => null }));

import { resolverCentroCosto, VisorPDFCertificado } from './VisorPDFCertificado';

afterEach(cleanup);

describe('vista previa de [DEPENDENCIA] con encargo', () => {
  const certificado = (extra = {}) => ({
    consecutivo: 'PRUEBA', observations: 'E', cod_cargo: '202812', cod_grade: '12',
    internal_group: 'Grupo del encargo', department: 'Dependencia del encargo',
    position_location: 'Ubicacion del encargo',
    empleado: {
      nombre: 'Persona de prueba', documento: '123', email: '',
      cargo: 'Profesional Especializado', dependencia: 'Dependencia del encargo',
      tipoVinculacion: 'Cra. Administrativa', fechaVinculacion: '2024-05-14',
      grado: '12', salario: 5099764,
    },
    fechaSolicitud: '2026-09-15', estado: 'VALID', templateType: 'administrador' as const,
    templateSnapshot: {
      certificateContentHtml: '<p>DEP:[DEPENDENCIA]</p><p>CARGO:[CARGO]</p><p>GRUPO:[GRUPO]</p><p>DATO7:[DATO7]</p>',
    },
    ...extra,
  });

  it.each((['administrador', 'docente'] as const).flatMap(templateType => [
    { templateType, certificate_dependency: 'Grupo del nombramiento' },
    { templateType, request: { certificate_dependency: 'Grupo del nombramiento', internal_group: 'Grupo del encargo' } },
  ]))('imprime la dependencia normal recibida del backend y conserva el encargo ($templateType)', async (extra) => {
    render(<VisorPDFCertificado isOpen onClose={() => {}} certificado={certificado(extra)} />);
    expect((await screen.findAllByText('DEP:Grupo del nombramiento')).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/CARGO:Profesional Especializado.*2028.*\(E\)/).length).toBeGreaterThan(0);
    // [GRUPO] es el grupo interno de trabajo, no la ubicacion del cargo.
    expect(screen.getAllByText('GRUPO:Grupo del encargo').length).toBeGreaterThan(0);
    expect(screen.getAllByText('DATO7:Dependencia del encargo').length).toBeGreaterThan(0);
  });

  it('conserva el respaldo cuando el backend no indica otra vinculacion', async () => {
    render(<VisorPDFCertificado isOpen onClose={() => {}} certificado={certificado()} />);
    expect((await screen.findAllByText('DEP:Dependencia del encargo')).length).toBeGreaterThan(0);
  });

  it('cae al centro de costo cuando no hay dependencia', async () => {
    render(
      <VisorPDFCertificado
        isOpen
        onClose={() => {}}
        certificado={certificado({
          department: '',
          empleado: { ...certificado().empleado, dependencia: '' },
        })}
      />,
    );
    expect((await screen.findAllByText('DEP:Grupo del encargo')).length).toBeGreaterThan(0);
  });

  it('no rellena una dependencia normal vacia con el grupo del encargo', async () => {
    render(<VisorPDFCertificado isOpen onClose={() => {}} certificado={certificado({ certificate_dependency: '' })} />);
    expect((await screen.findAllByText('DEP:')).length).toBeGreaterThan(0);
  });
});

/**
 * La vista previa y las descargas del certificado se arman EN EL FRONTEND: este
 * componente tiene su propia copia de la resolución de placeholders. Si esa
 * copia y `labor-certificate-pdf.service.ts` no coinciden, el usuario ve una
 * cosa en pantalla y otra en el PDF — que es el bug que originó esta prueba.
 *
 * Regla compartida para [DEPENDENCIA]: gana la DEPENDENCIA y solo se usa el
 * CENTRO DE COSTO (grupo interno) cuando no hay dependencia. Igual para filas
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
