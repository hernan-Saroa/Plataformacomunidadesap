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

import { VisorPDFCertificado } from './VisorPDFCertificado';

afterEach(cleanup);

/**
 * La vista previa se arma EN EL FRONTEND: si esta copia y
 * `labor-certificate-pdf.service.ts` no resuelven [GRUPO] igual, el usuario ve
 * una cosa en pantalla y otra en el PDF.
 *
 * Regla compartida: manda el GRUPO INTERNO DE TRABAJO (`internal_group`) y la
 * ubicación del cargo (`position_location`) solo entra cuando no hay grupo.
 */
describe('vista previa de [GRUPO]', () => {
  const certificado = (extra = {}) => ({
    consecutivo: 'PRUEBA',
    observations: 'N',
    cod_cargo: '202812',
    cod_grade: '12',
    internal_group: 'Grupo de Administracion de Personal',
    department: 'Direccion de Talento Humano',
    position_location: 'Ubicacion de la solicitud',
    empleado: {
      nombre: 'Persona de prueba',
      documento: '123',
      email: '',
      cargo: 'Profesional Especializado',
      dependencia: 'Direccion de Talento Humano',
      tipoVinculacion: 'Cra. Administrativa',
      fechaVinculacion: '2024-05-14',
      grado: '12',
      salario: 5099764,
    },
    fechaSolicitud: '2026-09-15',
    estado: 'VALID',
    templateType: 'administrador' as const,
    templateSnapshot: {
      certificateContentHtml: '<p>GRUPO:[GRUPO]</p><p>DEP:[DEPENDENCIA]</p>',
    },
    ...extra,
  });

  it.each(['administrador', 'docente'] as const)(
    'imprime el grupo interno antes que la ubicacion del cargo (%s)',
    async (templateType) => {
      render(
        <VisorPDFCertificado
          isOpen
          onClose={() => {}}
          certificado={certificado({ templateType })}
        />,
      );

      expect(
        (await screen.findAllByText('GRUPO:Grupo de Administracion de Personal')).length,
      ).toBeGreaterThan(0);
      expect(screen.queryByText('GRUPO:Ubicacion de la solicitud')).toBeNull();
    },
  );

  it.each(['', '   ', 'N/A', 'NO APLICA', 'Ninguno'])(
    'cae a la ubicacion del cargo cuando el grupo interno es "%s"',
    async (internal_group) => {
      render(
        <VisorPDFCertificado
          isOpen
          onClose={() => {}}
          certificado={certificado({ internal_group })}
        />,
      );

      expect(
        (await screen.findAllByText('GRUPO:Ubicacion de la solicitud')).length,
      ).toBeGreaterThan(0);
    },
  );

  it('toma el grupo interno de la solicitud cuando llega dentro de request', async () => {
    render(
      <VisorPDFCertificado
        isOpen
        onClose={() => {}}
        certificado={certificado({
          internal_group: '',
          request: { internal_group: 'Grupo de la solicitud' },
        })}
      />,
    );

    expect(
      (await screen.findAllByText('GRUPO:Grupo de la solicitud')).length,
    ).toBeGreaterThan(0);
  });

  it('el certificado corregido imprime lo que guardo el coordinador', async () => {
    render(
      <VisorPDFCertificado
        isOpen
        onClose={() => {}}
        certificado={certificado({
          is_corrected: true,
          position_location: 'Grupo CORREGIDO',
        })}
      />,
    );

    expect((await screen.findAllByText('GRUPO:Grupo CORREGIDO')).length).toBeGreaterThan(0);
    expect(
      screen.queryByText('GRUPO:Grupo de Administracion de Personal'),
    ).toBeNull();
  });

  it('se oculta cuando [DEPENDENCIA] ya imprime el mismo valor', async () => {
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

    expect(
      (await screen.findAllByText('DEP:Grupo de Administracion de Personal')).length,
    ).toBeGreaterThan(0);
    expect(
      screen.queryByText('GRUPO:Grupo de Administracion de Personal'),
    ).toBeNull();
  });
});
