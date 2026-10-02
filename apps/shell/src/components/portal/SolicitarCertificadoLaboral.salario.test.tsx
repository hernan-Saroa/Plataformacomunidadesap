import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SolicitarCertificadoLaboral } from './SolicitarCertificadoLaboral';
import { certificadosService } from '../../services/api/certificados.service';

const visorProps = vi.hoisted(() => ({ last: null as any }));

vi.mock('../../services/api/certificados.service', () => ({ certificadosService: { autoservicio: {
  verificarDocumento: vi.fn(), generarCodigoValidacion: vi.fn(), validarCodigoYGenerarCertificado: vi.fn(),
} } }));
vi.mock('../certificados-laborales/VisorPDFCertificado', () => ({
  VisorPDFCertificado: (props: any) => { visorProps.last = props; return null; },
}));
vi.mock('./CertificateCorrectionRequestModal', () => ({ CertificateCorrectionRequestModal: () => null }));
vi.mock('./PublicNavbar', () => ({ PublicNavbar: () => null }));
vi.mock('../assets/ESAPLogo', () => ({ ESAPLogo: () => null }));
vi.mock('../../config/environment', () => ({ getPublicBaseUrl: () => 'https://example.test' }));
vi.mock('../ui/use-mobile', () => ({ useIsMobile: () => true }));
vi.mock('qrcode.react', () => ({ QRCodeCanvas: () => null }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

const api = certificadosService.autoservicio;
const solicitud = {
  id_number: '53062883', full_name: 'DIANA MARIA GUTIERREZ RAMIREZ', status: 'A', email: 'persona@example.test',
  hiring_date: '2024-05-14', career_category: 'Profesional', position_category: 'Cra. Administrativa',
  monthly_salary: 1000000,
};
const certificadoEmitido = (includeSalary: boolean) => ({
  id: 'cert-1', certificate_number: '12_620_700_20_CD 004', verification_code: 'QR-1',
  full_name: solicitud.full_name, id_number: solicitud.id_number, monthly_salary: 1000000,
  include_salary: includeSalary, include_technical_bonus: false, include_functions: false,
  issue_date: '2026-10-02T12:00:00Z', hiring_date: '2024-05-14',
});

async function emitir({ sinSalarioEnPaso1 = false } = {}) {
  vi.mocked(api.validarCodigoYGenerarCertificado).mockResolvedValue({
    mensaje: 'ok', certificado: certificadoEmitido(!sinSalarioEnPaso1), emailSent: true, email: 'persona@example.test',
  } as any);
  render(<SolicitarCertificadoLaboral onBack={() => {}} />);
  fireEvent.change(screen.getByLabelText(/Tipo de Documento/), { target: { value: 'CC' } });
  fireEvent.input(screen.getByLabelText(/Número de Documento/), { target: { value: solicitud.id_number } });
  if (sinSalarioEnPaso1) {
    fireEvent.click(screen.getByRole('checkbox', { name: /Solicitar certificado sin información salarial/ }));
  }
  fireEvent.click(screen.getByRole('button', { name: 'Solicitar Certificado' }));
  await screen.findByText('Paso 2: Valida tu identidad');
  fireEvent.input(screen.getByPlaceholderText('Ingresa el código'), { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: 'Validar y Generar Certificado' }));
  await screen.findByRole('checkbox', { name: /Ocultar salario en este certificado/ });
}

const ocultarSalario = () => screen.getByRole('checkbox', { name: /Ocultar salario en este certificado/ });
const certificadoEnVisor = () => visorProps.last?.certificado;

beforeEach(() => {
  vi.clearAllMocks();
  visorProps.last = null;
  Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: 1 });
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addListener: vi.fn(), removeListener: vi.fn() })));
  vi.mocked(api.verificarDocumento).mockResolvedValue({ existe: true, solicitud } as any);
  vi.mocked(api.generarCodigoValidacion).mockResolvedValue({ email: 'persona@example.test', solicitud } as any);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('"Ocultar salario en este certificado" (paso 3) llega al PDF', () => {
  it('Ver PDF recibe el certificado sin salario después de marcar la opción', async () => {
    await emitir();
    expect(ocultarSalario()).not.toBeChecked();
    expect(certificadoEnVisor().incluyeSalario).toBe(true);

    fireEvent.click(ocultarSalario());
    expect(ocultarSalario()).toBeChecked();
    expect(screen.getByText('El certificado se generará sin información salarial.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Ver PDF/ }));
    expect(visorProps.last.isOpen).toBe(true);
    expect(certificadoEnVisor()).toMatchObject({ id: 'cert-1', incluyeSalario: false, incluyePrimaTecnica: false });
    expect(certificadoEnVisor().empleado.salario).toBe(0);
  });

  it('Descargar PDF también usa la preferencia actual', async () => {
    await emitir();
    fireEvent.click(ocultarSalario());
    fireEvent.click(screen.getByRole('button', { name: /Descargar PDF/ }));
    expect(visorProps.last).toMatchObject({ isOpen: true, autoAction: 'download' });
    expect(certificadoEnVisor().incluyeSalario).toBe(false);
  });

  it('desmarcar la opción vuelve a incluir el salario', async () => {
    await emitir();
    fireEvent.click(ocultarSalario());
    fireEvent.click(ocultarSalario());
    expect(ocultarSalario()).not.toBeChecked();
    expect(certificadoEnVisor().incluyeSalario).toBe(true);
    expect(certificadoEnVisor().empleado.salario).toBe(1000000);
  });

  it('si se pidió sin salario en el paso 1, el paso 3 arranca marcado y coherente', async () => {
    await emitir({ sinSalarioEnPaso1: true });
    expect(api.validarCodigoYGenerarCertificado).toHaveBeenCalledWith(
      solicitud.id_number, '123456', expect.objectContaining({ includeSalary: false }),
    );
    expect(ocultarSalario()).toBeChecked();
    expect(certificadoEnVisor().incluyeSalario).toBe(false);
  });
});
