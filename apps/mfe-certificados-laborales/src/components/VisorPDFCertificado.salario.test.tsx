import React from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
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

const obtenerPDFBlob = certificadosService.laborales.obtenerPDFBlob as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  obtenerPDFBlob.mockReset();
  obtenerPDFBlob.mockRejectedValue(new Error('sin sesión'));
});
afterEach(cleanup);

/**
 * "Ocultar salario en este certificado" se cambia después de emitir. El visor
 * prioriza el PDF del backend, así que debe pedirlo con la preferencia actual;
 * si no, el resultado dependía de si el navegador tenía sesión en ese ambiente.
 */
describe('VisorPDFCertificado — preferencia de salario en el PDF oficial', () => {
  const certificado = (extra = {}) => ({
    id: 'cert-1',
    consecutivo: 'PRUEBA',
    empleado: {
      nombre: 'Persona de prueba', documento: '123', email: '',
      cargo: 'Profesional', dependencia: 'Dependencia',
      tipoVinculacion: 'Cra. Administrativa', fechaVinculacion: '2024-05-14',
      grado: '12', salario: 1000000,
    },
    fechaSolicitud: '2026-09-15', estado: 'VALID', templateType: 'administrador' as const,
    templateSnapshot: { certificateContentHtml: '<p>SAL:[SALARIO]</p>' },
    ...extra,
  });

  it('pide el PDF sin salario cuando el usuario lo oculta', async () => {
    render(<VisorPDFCertificado isOpen onClose={() => {}} certificado={certificado({ incluyeSalario: false, incluyePrimaTecnica: true })} />);
    await waitFor(() => expect(obtenerPDFBlob).toHaveBeenCalled());
    expect(obtenerPDFBlob).toHaveBeenCalledWith('cert-1', { includeSalary: false, includeTechnicalBonus: false });
  });

  it('pide el PDF con salario y prima cuando el usuario los incluye', async () => {
    render(<VisorPDFCertificado isOpen onClose={() => {}} certificado={certificado({ incluyeSalario: true, incluyePrimaTecnica: true })} />);
    await waitFor(() => expect(obtenerPDFBlob).toHaveBeenCalled());
    expect(obtenerPDFBlob).toHaveBeenCalledWith('cert-1', { includeSalary: true, includeTechnicalBonus: true });
  });

  it('sin preferencia explícita deja que el backend use lo persistido', async () => {
    render(<VisorPDFCertificado isOpen onClose={() => {}} certificado={certificado()} />);
    await waitFor(() => expect(obtenerPDFBlob).toHaveBeenCalled());
    expect(obtenerPDFBlob).toHaveBeenCalledWith('cert-1', { includeSalary: undefined, includeTechnicalBonus: undefined });
  });

  it('vuelve a pedir el PDF cuando cambia la preferencia', async () => {
    const { rerender } = render(
      <VisorPDFCertificado isOpen onClose={() => {}} certificado={certificado({ incluyeSalario: true })} />,
    );
    await waitFor(() => expect(obtenerPDFBlob).toHaveBeenCalledTimes(1));
    rerender(<VisorPDFCertificado isOpen onClose={() => {}} certificado={certificado({ incluyeSalario: false })} />);
    await waitFor(() => expect(obtenerPDFBlob).toHaveBeenCalledTimes(2));
    expect(obtenerPDFBlob).toHaveBeenLastCalledWith('cert-1', { includeSalary: false, includeTechnicalBonus: false });
  });
});
