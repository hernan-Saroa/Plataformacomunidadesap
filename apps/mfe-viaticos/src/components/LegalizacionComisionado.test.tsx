import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LegalizacionComisionado, { formatearFechaLimite } from './LegalizacionComisionado';
import { legalizacionService } from '../services/api/legalizacionService';

vi.mock('../services/api/legalizacionService', () => ({
  legalizacionService: {
    listarMias: vi.fn(),
    detalle: vi.fn(),
    subirSoporte: vi.fn(),
    eliminarSoporte: vi.fn(),
    enviar: vi.fn(),
    abrirSoporte: vi.fn(),
  },
}));

const svc = legalizacionService as unknown as Record<string, ReturnType<typeof vi.fn>>;

const RESUMEN = {
  legalizacionId: 'leg-1',
  solicitudId: 'sol-1',
  consecutivoUnico: 'COM-2026-0001',
  estadoSolicitud: 'PENDIENTE_LEGALIZACION',
  comisionadoNombre: 'Carlos Eduardo Ramírez Gómez',
  destino: 'Bogotá, Cundinamarca',
  fechaInicio: '2026-09-01',
  fechaFin: '2026-09-05',
  modalidadPago: 'RECONOCIMIENTO_POSTERIOR',
  plazoDiasHabiles: 5,
  fechaLimite: '2026-10-02T21:30:00.000Z',
  diasHabilesRestantes: 3,
  calendarioIncompleto: false,
  fechaEnvio: null,
  semaforo: 'VIGENTE' as const,
  obligatoriosPendientes: 2,
  checklistCompleto: false,
};

const item = (codigo: string, nombre: string, cargado: boolean) => ({
  tipoDocumentoSoporteId: `tipo-${codigo}`,
  codigo,
  nombre,
  descripcion: null,
  tipoRequisito: 'OBLIGATORIO' as const,
  condicion: null,
  soportes: cargado ? [{ id: `sop-${codigo}`, nombreArchivoOriginal: `${codigo}.pdf`, tamanoBytes: 2048, creadoEn: '' }] : [],
  cumplido: cargado,
});

const detalle = (items: ReturnType<typeof item>[], extra: Record<string, unknown> = {}) => ({
  ...RESUMEN,
  puedeEditar: true,
  checklist: {
    items,
    sinConfiguracion: items.length === 0,
    obligatoriosPendientes: items.filter((i) => !i.cumplido).length,
    completo: items.length > 0 && items.every((i) => i.cumplido),
  },
  ...extra,
});

describe('LegalizacionComisionado — EFDS-1309', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    svc.listarMias.mockResolvedValue([RESUMEN]);
  });

  it('muestra la fecha límite en hora de Colombia, no en la del navegador', () => {
    // 21:30 UTC = 16:30 en Colombia.
    expect(formatearFechaLimite('2026-10-02T21:30:00.000Z')).toMatch(/16:30/);
  });

  it('lista las legalizaciones con su plazo y semáforo', async () => {
    render(<LegalizacionComisionado />);
    expect(await screen.findByText('COM-2026-0001')).toBeInTheDocument();
    expect(screen.getByText('En plazo')).toBeInTheDocument();
    expect(screen.getByText(/3 días hábiles/)).toBeInTheDocument();
    expect(screen.getByText('2 pendientes')).toBeInTheDocument();
  });

  it('sin legalizaciones, lo dice en vez de mostrar una lista vacía', async () => {
    svc.listarMias.mockResolvedValue([]);
    render(<LegalizacionComisionado />);
    expect(await screen.findByText('No tiene comisiones pendientes de legalizar.')).toBeInTheDocument();
  });

  it('el botón de envío está deshabilitado mientras falten obligatorios', async () => {
    svc.detalle.mockResolvedValue(detalle([item('LEG_GF_FO_031', 'Formato GF-FO-031', true), item('LEG_AGENDA_CUMPLIDA', 'Agenda cumplida', false)]));
    render(<LegalizacionComisionado />);
    fireEvent.click(await screen.findByText('COM-2026-0001'));
    expect(await screen.findByText('Faltan 1 soporte(s) obligatorio(s).')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Enviar a revisión/ })).toBeDisabled();
  });

  it('carga un PDF por su tipo de soporte y recarga el checklist', async () => {
    svc.detalle
      .mockResolvedValueOnce(detalle([item('LEG_AGENDA_CUMPLIDA', 'Agenda cumplida', false)]))
      .mockResolvedValueOnce(detalle([item('LEG_AGENDA_CUMPLIDA', 'Agenda cumplida', true)]));
    svc.subirSoporte.mockResolvedValue({ id: 'sop-nuevo' });

    render(<LegalizacionComisionado />);
    fireEvent.click(await screen.findByText('COM-2026-0001'));
    const input = await screen.findByLabelText('Archivo para Agenda cumplida');
    const archivo = new File(['%PDF-1.4'], 'agenda.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [archivo] } });

    await waitFor(() =>
      expect(svc.subirSoporte).toHaveBeenCalledWith('sol-1', 'tipo-LEG_AGENDA_CUMPLIDA', archivo),
    );
    expect(await screen.findByText('"agenda.pdf" cargado en Agenda cumplida.')).toBeInTheDocument();
    expect(await screen.findByText('Todos los soportes obligatorios están cargados.')).toBeInTheDocument();
  });

  it('muestra el rechazo del servidor cuando el archivo no es un PDF real', async () => {
    svc.detalle.mockResolvedValue(detalle([item('LEG_AGENDA_CUMPLIDA', 'Agenda cumplida', false)]));
    svc.subirSoporte.mockRejectedValue(
      new Error('"falso.pdf" no es un PDF válido: su contenido no empieza con la cabecera %PDF-.'),
    );
    render(<LegalizacionComisionado />);
    fireEvent.click(await screen.findByText('COM-2026-0001'));
    const input = await screen.findByLabelText('Archivo para Agenda cumplida');
    fireEvent.change(input, { target: { files: [new File(['MZ'], 'falso.pdf', { type: 'application/pdf' })] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('no es un PDF válido');
  });

  it('pide confirmación antes de enviar y avisa el resultado', async () => {
    svc.detalle.mockResolvedValue(detalle([item('LEG_AGENDA_CUMPLIDA', 'Agenda cumplida', true)]));
    svc.enviar.mockResolvedValue({ legalizacionId: 'leg-1', fechaEnvio: '', totalSoportes: 1 });
    render(<LegalizacionComisionado />);
    fireEvent.click(await screen.findByText('COM-2026-0001'));
    fireEvent.click(await screen.findByRole('button', { name: /Enviar a revisión/ }));
    expect(svc.enviar).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Confirmar envío/ }));
    await waitFor(() => expect(svc.enviar).toHaveBeenCalledWith('sol-1'));
    expect(await screen.findByText('Legalización enviada a revisión con 1 soporte(s).')).toBeInTheDocument();
  });

  it('enviada: no ofrece cargar, eliminar ni enviar', async () => {
    svc.detalle.mockResolvedValue(
      detalle([item('LEG_AGENDA_CUMPLIDA', 'Agenda cumplida', true)], {
        puedeEditar: false,
        semaforo: 'ENVIADA',
        fechaEnvio: '2026-09-25T15:00:00Z',
      }),
    );
    render(<LegalizacionComisionado />);
    fireEvent.click(await screen.findByText('COM-2026-0001'));
    expect(await screen.findByText('Enviada a revisión', { selector: 'span' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Archivo para Agenda cumplida')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Eliminar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Enviar a revisión/ })).not.toBeInTheDocument();
  });

  it('sin checklist configurado para el tipo de comisionado, lo explica y no deja enviar', async () => {
    svc.detalle.mockResolvedValue(detalle([]));
    render(<LegalizacionComisionado />);
    fireEvent.click(await screen.findByText('COM-2026-0001'));
    expect(await screen.findByText(/No hay soportes de legalización configurados/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Enviar a revisión/ })).not.toBeInTheDocument();
  });
});
