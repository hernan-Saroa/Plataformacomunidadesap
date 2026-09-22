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
 * Regla compartida: manda el GRUPO INTERNO DE TRABAJO (`internal_group` y, si
 * no hay, `cost_center`) y la ubicación del cargo (`position_location`) solo
 * entra cuando no hay grupo.
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

/**
 * Caso real reportado en preproduccion: la plantilla decia
 * "ubicado en [DEPENDENCIA]. [GRUPO]" y salia el GRUPO en las dos variables,
 * porque en las filas sincronizadas desde Oracle `department` guarda el
 * CENTROCOSTO (el grupo) y la dependencia real vive en
 * `organization_department`.
 */
describe('[DEPENDENCIA] y [GRUPO] juntos en una fila sincronizada desde Oracle', () => {
  const DEPENDENCIA = 'Direccion de Talento Humano';
  const GRUPO = 'Grupo de Administracion de Personal y de Carrera Administrativa';

  const certificadoOracle = (extra = {}) => ({
    consecutivo: 'PRUEBA-ORACLE',
    observations: 'E',
    cod_cargo: '202816',
    cod_grade: '16',
    // Columnas crudas tal como las deja el sincronizador de Oracle.
    department: GRUPO,
    position_location: DEPENDENCIA,
    request: {
      department: GRUPO,
      organization_department: DEPENDENCIA,
      internal_group: GRUPO,
      cost_center: GRUPO,
      position_location: DEPENDENCIA,
    },
    empleado: {
      nombre: 'Persona de prueba',
      documento: '53062883',
      email: '',
      cargo: 'Profesional Especializado',
      dependencia: GRUPO,
      tipoVinculacion: 'Cra. Administrativa',
      fechaVinculacion: '2024-05-14',
      grado: '16',
      salario: 5099764,
    },
    fechaSolicitud: '2026-09-17',
    estado: 'VALID',
    templateType: 'administrador' as const,
    templateSnapshot: {
      certificateContentHtml: '<p>ubicado en [DEPENDENCIA]. [GRUPO]</p>',
    },
    ...extra,
  });

  it.each(['administrador', 'docente'] as const)(
    'imprime la dependencia y el grupo por separado (%s)',
    async (templateType) => {
      render(
        <VisorPDFCertificado
          isOpen
          onClose={() => {}}
          certificado={certificadoOracle({ templateType })}
        />,
      );

      expect(
        (await screen.findAllByText(`ubicado en ${DEPENDENCIA}. ${GRUPO}`)).length,
      ).toBeGreaterThan(0);
    },
  );

  it('funciona tambien con los campos ya aplanados por el listado', async () => {
    // El dashboard no pasa `request`: manda las columnas ya resueltas.
    render(
      <VisorPDFCertificado
        isOpen
        onClose={() => {}}
        certificado={certificadoOracle({
          request: undefined,
          organization_department: DEPENDENCIA,
          department: DEPENDENCIA,
          internal_group: GRUPO,
          cost_center: GRUPO,
          position_location: DEPENDENCIA,
          empleado: { ...certificadoOracle().empleado, dependencia: DEPENDENCIA },
        })}
      />,
    );

    expect(
      (await screen.findAllByText(`ubicado en ${DEPENDENCIA}. ${GRUPO}`)).length,
    ).toBeGreaterThan(0);
  });
});

/**
 * Durante un encargo, [DEPENDENCIA] y [GRUPO] describen un solo lugar: los dos
 * salen de la vinculacion normal vigente, que el backend resuelve en
 * `certificate_dependency` y `certificate_group`.
 */
describe('[GRUPO] durante un encargo', () => {
  const DTH = 'Direccion de Talento Humano';
  const SST = 'Grupo de Seguridad y Salud en el Trabajo';
  const SNGC = 'Subdireccion Nacional de Gestion Corporativa';

  it('usa el grupo de la misma vinculacion que la dependencia', async () => {
    render(
      <VisorPDFCertificado
        isOpen
        onClose={() => {}}
        certificado={{
          consecutivo: 'PRUEBA-ENCARGO',
          observations: 'E',
          cod_cargo: '202812',
          cod_grade: '12',
          // Columnas del encargo: otra subdireccion, sin grupo interno propio.
          department: SNGC,
          position_location: SNGC,
          request: {
            department: SNGC,
            organization_department: SNGC,
            internal_group: SNGC,
            cost_center: SNGC,
            position_location: SNGC,
            // Contexto de la vinculacion normal vigente.
            certificate_dependency: DTH,
            certificate_group: SST,
          },
          empleado: {
            nombre: 'Persona de prueba',
            documento: '1057600214',
            email: '',
            cargo: 'Profesional Especializado',
            dependencia: SNGC,
            tipoVinculacion: 'Cra. Administrativa',
            fechaVinculacion: '2025-04-01',
            grado: '12',
            salario: 5099764,
          },
          fechaSolicitud: '2026-09-18',
          estado: 'VALID',
          templateType: 'administrador' as const,
          templateSnapshot: {
            certificateContentHtml: '<p>ubicado en [DEPENDENCIA]. [GRUPO]</p>',
          },
        }}
      />,
    );

    expect((await screen.findAllByText(`ubicado en ${DTH}. ${SST}`)).length).toBeGreaterThan(0);
    expect(screen.queryByText(new RegExp(SNGC))).toBeNull();
  });
});
