import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CorrectionsButton } from './CorrectionsButton';
import { CertificateCorrectionRequests } from './CertificateCorrectionRequests';
import { certificadosService } from '../../services/api/certificados.service';

vi.mock('../../services/api/certificados.service', () => ({
  certificadosService: { correcciones: {
    estadisticas: vi.fn(), listar: vi.fn(), obtener: vi.fn(),
    iniciarRevision: vi.fn(), previsualizar: vi.fn(), aprobar: vi.fn(), rechazar: vi.fn(),
  } },
}));
vi.mock('sonner', () => ({ toast: { info: vi.fn(), error: vi.fn() } }));

const api = certificadosService.correcciones;
const stats = (pending = 0, in_review = 0) => ({ pending, in_review, approved: 7, rejected: 3, overdue: 0, total: pending + in_review + 10 });
const tick = async (ms = 5000) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };
const badge = () => document.querySelector('.certificates-corrections-button__count')?.textContent;
const row = (status = 'PENDING') => ({
  id: 'request-1', request_number: 'COR-1', status, description: 'Corregir el cargo del certificado',
  requester_name: 'Solicitante de prueba', requester_email: 'test@example.com',
  created_at: '2026-09-10', due_date: '2026-10-01', submitted_evidence: [], resolution_evidence: [], traceability: [],
  certificate_snapshot: {
    full_name: 'Solicitante de prueba', certificate_number: 'CERT-1', document_type: 'CC',
    id_number: '12345', career_category: 'Profesional', position_category: 'Administrativo', hiring_date: '2020-01-01',
  },
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.resetAllMocks();
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  vi.mocked(api.estadisticas).mockResolvedValue(stats(1, 2));
  vi.mocked(api.listar).mockResolvedValue({ items: [row()] as any, total: 1, totalPages: 1 });
  vi.mocked(api.previsualizar).mockResolvedValue({ html: '', template_variables: [] } as any);
  window.scrollTo = vi.fn();
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('contador de correcciones', () => {
  it('suma abiertas, aumenta con nuevas solicitudes y baja hasta cero sin recargar', async () => {
    const onClick = vi.fn();
    render(<CorrectionsButton onClick={onClick} />);
    await tick(0);
    expect(badge()).toBe('3');
    vi.mocked(api.estadisticas).mockResolvedValue(stats(3, 2));
    await tick();
    expect(badge()).toBe('5');
    vi.mocked(api.estadisticas).mockResolvedValue(stats());
    await tick();
    expect(badge()).toBe('0');
    expect(screen.getByRole('button').dataset.pending).toBe('false');
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('conserva el último conteo ante fallos y se recupera automáticamente', async () => {
    render(<CorrectionsButton onClick={() => {}} />);
    await tick(0);
    vi.mocked(api.estadisticas).mockRejectedValueOnce(new Error('Sin conexión'));
    await tick();
    expect(badge()).toBe('3');
    expect(screen.getByRole('button').title).toContain('último conteo');
    await tick();
    expect(screen.getByRole('button').dataset.syncFailed).toBe('false');
  });

  it('no presenta cero cuando la primera consulta falla', async () => {
    vi.mocked(api.estadisticas).mockRejectedValueOnce(new Error('Error'));
    render(<CorrectionsButton onClick={() => {}} />);
    await tick(0);
    expect(badge()).toBe('—');
    await tick();
    expect(badge()).toBe('3');
  });

  it('pausa en segundo plano y sin conexión; sincroniza al regresar', async () => {
    render(<CorrectionsButton onClick={() => {}} />);
    await tick(0);
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    await tick(15000);
    expect(api.estadisticas).toHaveBeenCalledTimes(1);
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    fireEvent(document, new Event('visibilitychange'));
    await tick(0);
    expect(api.estadisticas).toHaveBeenCalledTimes(2);
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    await tick();
    expect(api.estadisticas).toHaveBeenCalledTimes(2);
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    fireEvent(window, new Event('online'));
    await tick(0);
    expect(api.estadisticas).toHaveBeenCalledTimes(3);
  });

  it('no superpone consultas lentas y detiene las actualizaciones al desmontar', async () => {
    let resolve!: (value: ReturnType<typeof stats>) => void;
    vi.mocked(api.estadisticas).mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    const view = render(<CorrectionsButton onClick={() => {}} />);
    fireEvent(window, new Event('focus'));
    await tick(20000);
    expect(api.estadisticas).toHaveBeenCalledTimes(1);
    view.unmount();
    await act(async () => resolve(stats(99)));
    fireEvent(window, new Event('focus'));
    await tick(20000);
    expect(api.estadisticas).toHaveBeenCalledTimes(1);
  });
});

describe('confirmación de decisiones', () => {
  const openDecision = async (decision: 'approve' | 'reject') => {
    vi.mocked(api.obtener).mockResolvedValue(row('IN_REVIEW') as any);
    render(<CertificateCorrectionRequests />);
    await tick(0);
    fireEvent.click(screen.getByRole('button', { name: /^Revisar/ }));
    await tick(0);
    fireEvent.click(screen.getByRole('button', { name: decision === 'approve' ? 'Enviar certificado' : 'Rechazar' }));
    fireEvent.change(within(screen.getByRole('dialog')).getByRole('textbox'), {
      target: { value: 'Descripción completa de la decisión tomada.' },
    });
  };

  it('espera la confirmación del servicio, muestra el éxito y permite continuar en el detalle', async () => {
    let resolve!: (value: any) => void;
    vi.mocked(api.aprobar).mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    await openDecision('approve');
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar envío' }));
    expect(screen.queryByText('Certificado enviado con éxito')).toBeNull();
    expect(api.aprobar).toHaveBeenCalledTimes(1);
    await act(async () => resolve({ ...row('APPROVED'), email: 'destino@example.com', email_sent: true }));
    const result = screen.getByRole('dialog', { name: 'Certificado enviado con éxito' });
    expect(within(result).getByText('COR-1')).toBeTruthy();
    expect(within(result).getByText('destino@example.com')).toBeTruthy();
    expect(within(result).getByText('Envío confirmado')).toBeTruthy();
    fireEvent.click(within(result).getByRole('button', { name: 'Entendido' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText('Decisión registrada')).toBeTruthy();
    expect(api.aprobar).toHaveBeenCalledTimes(1);
  });

  it('confirma el rechazo y la notificación al solicitante', async () => {
    vi.mocked(api.rechazar).mockResolvedValue({ ...row('REJECTED'), email_sent: true } as any);
    await openDecision('reject');
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar rechazo' }));
    await tick(0);
    const result = screen.getByRole('dialog', { name: 'Rechazo registrado con éxito' });
    expect(within(result).getByText('test@example.com')).toBeTruthy();
    expect(within(result).getByText('Envío confirmado')).toBeTruthy();
    fireEvent.click(within(result).getByRole('button', { name: 'Entendido' }));
    expect(screen.getByText('Decisión registrada')).toBeTruthy();
    expect(api.rechazar).toHaveBeenCalledTimes(1);
  });

  it.each(['approve', 'reject'] as const)('no muestra éxito cuando falla %s y conserva la descripción', async (decision) => {
    vi.mocked(decision === 'approve' ? api.aprobar : api.rechazar).mockRejectedValueOnce(new Error('No se pudo enviar'));
    await openDecision(decision);
    fireEvent.click(screen.getByRole('button', { name: decision === 'approve' ? 'Confirmar envío' : 'Confirmar rechazo' }));
    await tick(0);
    expect(screen.queryByText(/con éxito/)).toBeNull();
    expect(within(screen.getByRole('dialog')).getByDisplayValue('Descripción completa de la decisión tomada.')).toBeTruthy();
  });

  it('no afirma que el correo fue enviado si la respuesta no lo confirma', async () => {
    vi.mocked(api.rechazar).mockResolvedValue({ ...row('REJECTED'), email_sent: false } as any);
    await openDecision('reject');
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar rechazo' }));
    await tick(0);
    expect(screen.getByText('Correo sin confirmar')).toBeTruthy();
    expect(screen.queryByText('Envío confirmado')).toBeNull();
  });
});

describe('bandeja compartida', () => {
  it('conserva la edición local mientras la solicitud siga abierta', async () => {
    vi.mocked(api.obtener).mockResolvedValue(row('IN_REVIEW') as any);
    render(<CertificateCorrectionRequests />);
    await tick(0);
    fireEvent.click(screen.getByRole('button', { name: /^Revisar/ }));
    await tick(0);
    const input = screen.getByDisplayValue('Solicitante de prueba') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Nombre editado sin guardar' } });
    await tick();
    expect(screen.getByDisplayValue('Nombre editado sin guardar')).toBeTruthy();
    expect(api.obtener).toHaveBeenCalledTimes(2);
  });

  it('ignora respuestas antiguas después de cambiar la búsqueda', async () => {
    let resolve!: (value: any) => void;
    vi.mocked(api.listar).mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    render(<CertificateCorrectionRequests />);
    await tick(0);
    fireEvent.change(screen.getByPlaceholderText(/Buscar por radicado/), { target: { value: 'Nuevo' } });
    vi.mocked(api.listar).mockResolvedValue({ items: [{ ...row(), request_number: 'COR-NUEVO' }] as any, total: 1, totalPages: 1 });
    await tick(350);
    await act(async () => resolve({ items: [row()], total: 1, totalPages: 1 }));
    expect(screen.queryAllByText('COR-1')).toHaveLength(0);
    expect(screen.getAllByText('COR-NUEVO').length).toBeGreaterThan(0);
  });

  it('refleja decisiones de otro usuario y conserva la bandeja ante un fallo temporal', async () => {
    render(<CertificateCorrectionRequests />);
    await tick(0);
    expect(screen.getAllByText('COR-1').length).toBeGreaterThan(0);
    vi.mocked(api.listar).mockRejectedValueOnce(new Error('Temporal'));
    await tick();
    expect(screen.getAllByText('COR-1').length).toBeGreaterThan(0);
    expect(screen.getByText(/Actualización pendiente/)).toBeTruthy();
    vi.mocked(api.listar).mockResolvedValue({ items: [row('APPROVED')] as any, total: 1, totalPages: 1 });
    await tick();
    expect(screen.getByRole('button', { name: /Ver detalle/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Revisar/ })).toBeNull();
  });

  it('vuelve a la última página disponible cuando otro usuario vacía la actual', async () => {
    vi.mocked(api.listar).mockResolvedValue({ items: [row()] as any, total: 11, totalPages: 2 });
    render(<CertificateCorrectionRequests />);
    await tick(0);
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    await tick(0);
    expect(screen.getByText(/Página 2 de 2/)).toBeTruthy();
    vi.mocked(api.listar).mockResolvedValue({ items: [row()] as any, total: 1, totalPages: 1 });
    await tick();
    await tick(1);
    expect(screen.getByText(/Página 1 de 1/)).toBeTruthy();
  });

  it('actualiza el detalle abierto si otro usuario finaliza la solicitud', async () => {
    vi.mocked(api.obtener).mockResolvedValue(row('IN_REVIEW') as any);
    render(<CertificateCorrectionRequests />);
    await tick(0);
    fireEvent.click(screen.getByRole('button', { name: /^Revisar/ }));
    await tick(0);
    vi.mocked(api.obtener).mockResolvedValue({ ...row('REJECTED'), resolution_description: 'Decisión tomada por otro coordinador.' } as any);
    await tick();
    expect(screen.getByText('Decisión registrada')).toBeTruthy();
    expect(screen.getByText('Decisión tomada por otro coordinador.')).toBeTruthy();
  });
});
