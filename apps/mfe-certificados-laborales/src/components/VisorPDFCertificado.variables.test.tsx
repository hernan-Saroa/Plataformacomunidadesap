import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../services/api/certificados.service', () => ({
  certificadosService: {
    laborales: { obtenerPDFBlob: vi.fn() },
    plantilla: { obtenerConfiguracion: vi.fn() },
  },
}));

vi.mock('qrcode.react', () => ({ QRCodeCanvas: () => null }));

import { certificadosService } from '../../services/api/certificados.service';
import { VisorPDFCertificado } from './VisorPDFCertificado';

beforeEach(() => {
  // Sin sesión: el visor arma la vista en el navegador (mismo caso que el portal público).
  (certificadosService.laborales.obtenerPDFBlob as any).mockRejectedValue(new Error('401'));
});
afterEach(cleanup);

/**
 * La vista local debe interpretar las variables igual que el PDF del backend
 * aunque en la plantilla queden pegadas a palabras o a otras variables.
 */
describe('VisorPDFCertificado — variables pegadas en la plantilla', () => {
  const certificado = (contenido: string, extra = {}) => ({
    id: 'cert-1',
    consecutivo: 'PRUEBA',
    empleado: {
      nombre: 'DIANA MARIA GUTIERREZ RAMIREZ', documento: '53062883', email: '',
      cargo: 'Profesional Especializado', dependencia: 'Dirección de Talento Humano',
      tipoVinculacion: 'Cra. Administrativa', fechaVinculacion: '2024-05-14',
      grado: '16', salario: 1000000,
    },
    fechaSolicitud: '2026-10-02', estado: 'VALID', templateType: 'administrador' as const,
    templateSnapshot: { certificateContentHtml: contenido },
    ...extra,
  });

  it('reemplaza variables pegadas a palabras y entre sí sin agregar espacios', async () => {
    render(
      <VisorPDFCertificado
        isOpen
        onClose={() => {}}
        certificado={certificado(
          '<p>Que[NOMBRE_EMPLEADO]identificado con No. [DOCUMENTO].</p><p>Percibe de[SALARIO][SALARIO_LETRAS]pesos m/cte.</p>',
        )}
      />,
    );
    expect((await screen.findAllByText('QueDIANA MARIA GUTIERREZ RAMIREZidentificado con No. 53062883.')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Percibe de($1.000.000)un millónpesos m/cte.').length).toBeGreaterThan(0);
  });

  it('reemplaza variables en minúsculas o partidas por negrita', async () => {
    render(
      <VisorPDFCertificado
        isOpen
        onClose={() => {}}
        certificado={certificado('<p>Que [nombre empleado] con No. [DOCU<b>MENTO]</b> trabaja.</p>')}
      />,
    );
    const parrafos = await screen.findAllByText((_, el) =>
      el?.tagName === 'P' && /^Que DIANA MARIA GUTIERREZ RAMIREZ con No\. 53062883\s*trabaja\.$/.test(el.textContent || ''),
    );
    expect(parrafos.length).toBeGreaterThan(0);
  });

  it('oculta el salario aunque las variables estén pegadas', async () => {
    render(
      <VisorPDFCertificado
        isOpen
        onClose={() => {}}
        certificado={certificado(
          '<p>Que [NOMBRE_EMPLEADO] trabaja.</p><p>Percibe una asignación salarial de[SALARIO][SALARIO_LETRAS]pesos.</p>',
          { incluyeSalario: false },
        )}
      />,
    );
    expect((await screen.findAllByText('Que DIANA MARIA GUTIERREZ RAMIREZ trabaja.')).length).toBeGreaterThan(0);
    expect(screen.queryByText(/asignación salarial/)).toBeNull();
    expect(screen.queryByText(/millón/)).toBeNull();
  });
});
