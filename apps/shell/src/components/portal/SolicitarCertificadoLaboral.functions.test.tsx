import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SolicitarCertificadoLaboral } from './SolicitarCertificadoLaboral';
import { certificadosService } from '../../services/api/certificados.service';

vi.mock('../../services/api/certificados.service', () => ({ certificadosService: { autoservicio: {
  verificarDocumento: vi.fn(), generarCodigoValidacion: vi.fn(), validarCodigoYGenerarCertificado: vi.fn(),
} } }));
vi.mock('../certificados-laborales/VisorPDFCertificado', () => ({ VisorPDFCertificado: () => null }));
vi.mock('./CertificateCorrectionRequestModal', () => ({ CertificateCorrectionRequestModal: () => null }));
vi.mock('./PublicNavbar', () => ({ PublicNavbar: () => null }));
vi.mock('../assets/ESAPLogo', () => ({ ESAPLogo: () => null }));
vi.mock('../../config/environment', () => ({ getPublicBaseUrl: () => 'https://example.test' }));
vi.mock('../ui/use-mobile', () => ({ useIsMobile: () => true }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

const api = certificadosService.autoservicio;
const response = (available = true, reason = available ? 'MATCHED' : 'NOT_FOUND') => ({
  existe: true, functions_available: available, functions_count: available ? 16 : 0,
  functions_match_status: reason,
  technical_bonus_available: true, technical_bonus_value: 100,
  solicitud: { id_number: '12345678', full_name: 'Empleado de prueba', status: 'A', email: 'persona@example.test',
    hiring_date: '2020-01-01', career_category: 'Profesional', position_category: 'Administrativo' },
});
const deferred = () => {
  let resolve!: (v: any) => void;
  let reject!: (e: Error) => void;
  const promise = new Promise<any>((a, b) => { resolve = a; reject = b; });
  return { promise, resolve, reject };
};
function enter(doc = '12345678') {
  fireEvent.change(screen.getByLabelText(/Tipo de Documento/), { target: { value: 'CC' } });
  fireEvent.input(screen.getByLabelText(/Número de Documento/), { target: { value: doc } });
}
const functionsBox = () => screen.getByRole('checkbox', { name: 'Incluir las funciones de mi cargo' });
const submit = () => screen.getByRole('button', { name: 'Solicitar Certificado' });
beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: 1 });
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addListener: vi.fn(), removeListener: vi.fn() })));
  vi.mocked(api.verificarDocumento).mockResolvedValue(response() as any);
  vi.mocked(api.generarCodigoValidacion).mockResolvedValue({ email: 'persona@example.test', solicitud: response().solicitud } as any);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('Per-employee functions eligibility in the public form', () => {
  it('does not query Oracle when opening the form or checking without an identity', () => {
    render(<SolicitarCertificadoLaboral onBack={() => {}} />);
    fireEvent.click(functionsBox());
    expect(api.verificarDocumento).not.toHaveBeenCalled();
    expect(submit()).toBeDisabled();
  });

  it('validates one document when functions are selected', async () => {
    render(<SolicitarCertificadoLaboral onBack={() => {}} />); enter();
    fireEvent.click(functionsBox());
    expect(await screen.findByText(/16 funciones laborales verificadas/)).toBeTruthy();
    expect(api.verificarDocumento).toHaveBeenCalledTimes(1);
    expect(api.verificarDocumento).toHaveBeenCalledWith('12345678');
  });

  it.each(['NOT_FOUND', 'AMBIGUOUS'])('does not send an OTP for a functions request with %s', async reason => {
    vi.mocked(api.verificarDocumento).mockResolvedValue(response(false, reason) as any);
    render(<SolicitarCertificadoLaboral onBack={() => {}} />); enter();
    fireEvent.click(functionsBox());
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    fireEvent.click(submit());
    await waitFor(() => expect(api.verificarDocumento).toHaveBeenCalledTimes(2));
    expect(api.generarCodigoValidacion).not.toHaveBeenCalled();
    // A certificate without functions remains available.
    fireEvent.click(functionsBox());
    await waitFor(() => expect(submit()).not.toBeDisabled());
    fireEvent.click(submit());
    expect(await screen.findByText('Paso 2: Valida tu identidad')).toBeTruthy();
    expect(api.generarCodigoValidacion).toHaveBeenCalledTimes(1);
  });

  it('discards eligibility for a previous document even if its response arrives last', async () => {
    const old = deferred();
    vi.mocked(api.verificarDocumento).mockReturnValueOnce(old.promise);
    render(<SolicitarCertificadoLaboral onBack={() => {}} />); enter();
    fireEvent.click(functionsBox());
    fireEvent.input(screen.getByLabelText(/Número de Documento/), { target: { value: '87654321' } });
    vi.mocked(api.verificarDocumento).mockResolvedValue(response(false) as any);
    await screen.findByRole('alert');
    await act(async () => { old.resolve({ ...response(), functions_count: 99 }); });
    expect(screen.queryByText(/99 funciones/)).toBeNull();
    expect(screen.getByRole('alert')).toHaveTextContent('No cuentas con funciones laborales asociadas');
    expect(api.verificarDocumento).toHaveBeenLastCalledWith('87654321');
  });

  it('automatically revalidates a changed document while functions remain checked', async () => {
    vi.mocked(api.verificarDocumento)
      .mockResolvedValueOnce({ ...response(), functions_count: 13 } as any)
      .mockResolvedValueOnce({ ...response(), functions_count: 5 } as any);
    render(<SolicitarCertificadoLaboral onBack={() => {}} />); enter('53062883');
    fireEvent.click(functionsBox());
    expect(await screen.findByText(/13 funciones laborales verificadas/)).toBeTruthy();

    fireEvent.input(screen.getByLabelText(/Número de Documento/), { target: { value: '87654321' } });
    expect(functionsBox()).toBeChecked();
    expect(screen.getByText(/Validando tus datos laborales/)).toBeTruthy();
    expect(await screen.findByText(/5 funciones laborales verificadas/, {}, { timeout: 2000 })).toBeTruthy();
    expect(api.verificarDocumento).toHaveBeenCalledTimes(2);
    expect(api.verificarDocumento).toHaveBeenNthCalledWith(2, '87654321');
  });

  it('waits for typing to stop and queries only the final complete document', async () => {
    render(<SolicitarCertificadoLaboral onBack={() => {}} />); enter('53062883');
    fireEvent.click(functionsBox());
    await screen.findByText(/16 funciones laborales verificadas/);

    const input = screen.getByLabelText(/Número de Documento/);
    fireEvent.input(input, { target: { value: '8' } });
    fireEvent.input(input, { target: { value: '87' } });
    fireEvent.input(input, { target: { value: '87654321' } });
    expect(await screen.findByText(/16 funciones laborales verificadas/, {}, { timeout: 2000 })).toBeTruthy();
    expect(api.verificarDocumento).toHaveBeenCalledTimes(2);
    expect(api.verificarDocumento).toHaveBeenLastCalledWith('87654321');
  });

  it('unchecking while pending prevents a late response from showing eligibility', async () => {
    const pending = deferred(); vi.mocked(api.verificarDocumento).mockReturnValueOnce(pending.promise);
    render(<SolicitarCertificadoLaboral onBack={() => {}} />); enter();
    fireEvent.click(functionsBox()); fireEvent.click(functionsBox());
    await act(async () => { pending.resolve(response()); });
    expect(functionsBox()).not.toBeChecked();
    expect(screen.queryByText(/funciones laborales verificadas/)).toBeNull();
    expect(submit()).not.toBeDisabled();
  });

  it('clearing the document never reuses the previous submitted document', async () => {
    render(<SolicitarCertificadoLaboral onBack={() => {}} />); enter();
    fireEvent.click(functionsBox()); await screen.findByText(/16 funciones laborales verificadas/);
    fireEvent.input(screen.getByLabelText(/Número de Documento/), { target: { value: '' } });
    expect(api.verificarDocumento).toHaveBeenCalledTimes(1);
    expect(functionsBox()).toBeChecked();
    expect(screen.getByText(/Completa una cédula válida/)).toBeTruthy();
    expect(submit()).toBeDisabled();
  });

  it('changing document type invalidates pending metadata and disables unsupported types', async () => {
    const pending = deferred(); vi.mocked(api.verificarDocumento).mockReturnValueOnce(pending.promise);
    render(<SolicitarCertificadoLaboral onBack={() => {}} />); enter(); fireEvent.click(functionsBox());
    fireEvent.change(screen.getByLabelText(/Tipo de Documento/), { target: { value: 'CE' } });
    await act(async () => { pending.resolve(response()); });
    expect(screen.queryByText(/funciones laborales verificadas/)).toBeNull();
    expect(submit()).toBeDisabled();
  });

  it('shares a pending per-document check between functions and bonus', async () => {
    const pending = deferred(); vi.mocked(api.verificarDocumento).mockReturnValueOnce(pending.promise);
    render(<SolicitarCertificadoLaboral onBack={() => {}} />); enter();
    fireEvent.click(functionsBox());
    fireEvent.click(screen.getByRole('checkbox', { name: /Incluir prima técnica/ }));
    expect(api.verificarDocumento).toHaveBeenCalledTimes(1);
    await act(async () => { pending.resolve(response()); });
    expect(functionsBox()).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Incluir prima técnica/ })).toBeChecked();
  });

  it('a late bonus response cannot re-enable it after hiding salary', async () => {
    const pending = deferred(); vi.mocked(api.verificarDocumento).mockReturnValueOnce(pending.promise);
    render(<SolicitarCertificadoLaboral onBack={() => {}} />); enter();
    const bonus = screen.getByRole('checkbox', { name: /Incluir prima técnica/ });
    fireEvent.click(bonus);
    fireEvent.click(screen.getByRole('checkbox', { name: /Solicitar certificado sin información salarial/ }));
    await act(async () => { pending.resolve(response()); });
    expect(bonus).not.toBeChecked();
    expect(bonus).toBeDisabled();
  });

  it('locks identity/options and prevents duplicate submissions while sending the code', async () => {
    const pending = deferred(); vi.mocked(api.verificarDocumento).mockReturnValueOnce(pending.promise);
    render(<SolicitarCertificadoLaboral onBack={() => {}} />); enter();
    const button = submit();
    fireEvent.click(button); fireEvent.click(button);
    expect(screen.getByLabelText(/Número de Documento/)).toBeDisabled();
    expect(functionsBox()).toBeDisabled();
    await act(async () => { pending.resolve(response()); });
    expect(await screen.findByText('Paso 2: Valida tu identidad')).toBeTruthy();
    expect(api.generarCodigoValidacion).toHaveBeenCalledTimes(1);
  });

  it.each([true, false])('sends the selected functions option to final server validation (%s)', async includeFunctions => {
    const pending = deferred();
    vi.mocked(api.validarCodigoYGenerarCertificado).mockReturnValueOnce(pending.promise);
    render(<SolicitarCertificadoLaboral onBack={() => {}} />); enter();
    if (includeFunctions) {
      fireEvent.click(functionsBox()); await screen.findByText(/16 funciones laborales verificadas/);
    }
    fireEvent.click(submit());
    await screen.findByText('Paso 2: Valida tu identidad');
    fireEvent.input(screen.getByPlaceholderText('Ingresa el código'), { target: { value: '123456' } });
    const button = screen.getByRole('button', { name: 'Validar y Generar Certificado' });
    fireEvent.click(button); fireEvent.click(button);
    expect(api.validarCodigoYGenerarCertificado).toHaveBeenCalledTimes(1);
    expect(api.validarCodigoYGenerarCertificado).toHaveBeenCalledWith('12345678', '123456', expect.objectContaining({
      documentType: 'CC', includeFunctions, includeSalary: true, includeTechnicalBonus: false,
    }));
    await act(async () => { pending.resolve({ mensaje: 'Las funciones cambiaron. Revisa tu solicitud.' }); });
    expect(screen.getByText('Paso 2: Valida tu identidad')).toBeTruthy();
  });

  it('clears a previous eligibility result and permits retrying after a service error', async () => {
    render(<SolicitarCertificadoLaboral onBack={() => {}} />); enter();
    fireEvent.click(functionsBox()); await screen.findByText(/16 funciones laborales verificadas/);
    fireEvent.click(functionsBox());
    vi.mocked(api.verificarDocumento).mockRejectedValueOnce(new Error('Consulta no disponible'));
    fireEvent.click(functionsBox());
    expect(await screen.findByRole('alert')).toHaveTextContent('Consulta no disponible');
    expect(screen.queryByText(/16 funciones laborales verificadas/)).toBeNull();
    fireEvent.click(functionsBox()); fireEvent.click(functionsBox());
    expect(await screen.findByText(/16 funciones laborales verificadas/)).toBeTruthy();
  });
});
