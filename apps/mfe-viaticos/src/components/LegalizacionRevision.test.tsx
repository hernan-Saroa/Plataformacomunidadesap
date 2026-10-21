import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LegalizacionRevision from './LegalizacionRevision';
import { legalizacionService } from '../services/api/legalizacionService';

vi.mock('../services/api/legalizacionService', () => ({
  legalizacionService: {
    bandejaRevision: vi.fn(),
    detalleRevision: vi.fn(),
    revisarSoporte: vi.fn(),
    devolver: vi.fn(),
    aprobarRevision: vi.fn(),
    exportarSiif: vi.fn(),
    registrarSiif: vi.fn(),
    abrirSoporte: vi.fn(),
    solicitarReversion: vi.fn(),
  },
}));

const svc = legalizacionService as unknown as Record<string, ReturnType<typeof vi.fn>>;

const ITEM_BANDEJA = {
  legalizacionId: 'leg-1', solicitudId: 'sol-1', consecutivoUnico: 'COM-2026-0001', estadoSolicitud: 'PENDIENTE_LEGALIZACION',
  comisionadoNombre: 'Carlos Eduardo Ramírez Gómez', destino: 'Bogotá, Cundinamarca', fechaInicio: '2026-09-01', fechaFin: '2026-09-05',
  valorPagado: 1500000, fechaEnvio: '2026-09-25T17:00:00Z', fechaLimite: '2026-10-02T21:30:00Z', enviadaFueraDePlazo: false,
  numeroDevoluciones: 0, devueltaEn: null, revisionAprobadaEn: null, siifExportadoEn: null, cerradaEn: null,
  numeroRegistroSiif: null, valorReintegro: null, soportes: 4, sinRevisar: 4, rechazados: 0,
};

const soporte = (id: string, revision: 'APROBADO' | 'RECHAZADO' | null = null) => ({
  id, nombreArchivoOriginal: `${id}.pdf`, tamanoBytes: 1000, creadoEn: '', revision, observacionRevision: null,
});

const detalle = (extra: Record<string, unknown> = {}, soportes = [soporte('s1'), soporte('s2')]) => ({
  ...ITEM_BANDEJA,
  plazoDiasHabiles: 5, diasHabilesRestantes: 3, calendarioIncompleto: false, semaforo: 'ENVIADA', modalidadPago: 'AVANCE',
  devuelta: false, observacionDevolucion: null, valorLegalizado: null, fechaRegistroSiif: null,
  numeroObligacion: 'OBL-2026-00481', codigoRp: '2026-09-24_RP_24567', fechaPago: '2026-09-23', diasComision: '1.00',
  puedeEditar: false, enRevision: true, puedeRevisar: true, puedeAprobar: false, puedeRegistrarSiif: false, historialRevision: [],
  checklist: {
    items: [{ tipoDocumentoSoporteId: 't1', codigo: 'LEG_GF_FO_031', nombre: 'Formato GF-FO-031', descripcion: null,
      tipoRequisito: 'OBLIGATORIO', condicion: null, soportes, cumplido: true }],
    sinConfiguracion: false, obligatoriosPendientes: 0, completo: true,
  },
  ...extra,
});

const abrirDetalle = async () => {
  render(<LegalizacionRevision />);
  fireEvent.click(await screen.findByText('COM-2026-0001'));
};

describe('LegalizacionRevision — EFDS-1310', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    svc.bandejaRevision.mockResolvedValue([ITEM_BANDEJA]);
  });

  it('la bandeja muestra lo pendiente de revisión y cambia de pestaña', async () => {
    render(<LegalizacionRevision />);
    expect(await screen.findByText('COM-2026-0001')).toBeInTheDocument();
    expect(screen.getByText(/4 soportes · 4 sin revisar · 0 rechazados/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Legalizadas' }));
    await waitFor(() => expect(svc.bandejaRevision).toHaveBeenLastCalledWith('CERRADAS'));
  });

  it('aprueba un soporte', async () => {
    svc.detalleRevision.mockResolvedValue(detalle());
    svc.revisarSoporte.mockResolvedValue({});
    await abrirDetalle();
    fireEvent.click(await screen.findByRole('button', { name: 'Aprobar s1.pdf' }));
    await waitFor(() => expect(svc.revisarSoporte).toHaveBeenCalledWith('sol-1', 's1', 'APROBADO', undefined));
  });

  it('rechazar exige un motivo de al menos 10 caracteres', async () => {
    svc.detalleRevision.mockResolvedValue(detalle());
    svc.revisarSoporte.mockResolvedValue({});
    await abrirDetalle();
    fireEvent.click(await screen.findByRole('button', { name: 'Rechazar s1.pdf' }));
    const confirmar = screen.getByRole('button', { name: 'Confirmar rechazo' });
    fireEvent.change(screen.getByLabelText('Motivo del rechazo de s1.pdf'), { target: { value: 'corto' } });
    expect(confirmar).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Motivo del rechazo de s1.pdf'), { target: { value: 'Falta la firma del jefe inmediato' } });
    fireEvent.click(confirmar);
    await waitFor(() =>
      expect(svc.revisarSoporte).toHaveBeenCalledWith('sol-1', 's1', 'RECHAZADO', 'Falta la firma del jefe inmediato'),
    );
  });

  it('devolver exige observación y avisa', async () => {
    svc.detalleRevision.mockResolvedValue(detalle());
    svc.devolver.mockResolvedValue({});
    await abrirDetalle();
    fireEvent.click(await screen.findByRole('button', { name: /Devolver al comisionado/ }));
    const confirmar = screen.getByRole('button', { name: 'Confirmar devolución' });
    expect(confirmar).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Observación para el comisionado'), { target: { value: 'Reemplace el formato GF-FO-031 firmado.' } });
    fireEvent.click(confirmar);
    await waitFor(() => expect(svc.devolver).toHaveBeenCalledWith('sol-1', 'Reemplace el formato GF-FO-031 firmado.'));
    expect(await screen.findByText('Legalización devuelta al comisionado.')).toBeInTheDocument();
  });

  it('no deja aprobar mientras falten soportes por revisar', async () => {
    svc.detalleRevision.mockResolvedValue(detalle({ puedeAprobar: false }));
    await abrirDetalle();
    expect(await screen.findByRole('button', { name: /Aprobar revisión/ })).toBeDisabled();
  });

  it('registrar en SIIF: calcula el reintegro, pide confirmación y envía los datos', async () => {
    svc.detalleRevision.mockResolvedValue(
      detalle({ puedeRevisar: false, puedeRegistrarSiif: true, revisionAprobadaEn: '2026-09-25T18:00:00Z' },
        [soporte('s1', 'APROBADO')]),
    );
    svc.registrarSiif.mockResolvedValue({ devuelta: false, estadoSolicitud: 'LEGALIZADO', valorReintegro: 300000 });
    await abrirDetalle();
    fireEvent.change(await screen.findByLabelText('Número del registro en SIIF'), { target: { value: 'LEG-SIIF-123' } });
    fireEvent.change(screen.getByLabelText('Valor legalizado (COP)'), { target: { value: '1200000' } });
    expect(screen.getByText(/deberá reintegrar/)).toHaveTextContent('300.000');

    fireEvent.click(screen.getByRole('button', { name: 'Registrar en SIIF y cerrar' }));
    expect(svc.registrarSiif).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar registro y cierre' }));
    await waitFor(() =>
      expect(svc.registrarSiif).toHaveBeenCalledWith('sol-1', expect.objectContaining({
        numeroRegistroSiif: 'LEG-SIIF-123', valorLegalizado: 1200000, diasReales: null,
      })),
    );
  });

  it('legalizado mayor que lo pagado: no registra, devuelve al comisionado (sin exigir número SIIF)', async () => {
    svc.detalleRevision.mockResolvedValue(
      detalle({ puedeRevisar: false, puedeRegistrarSiif: true, revisionAprobadaEn: '2026-09-25T18:00:00Z' }),
    );
    svc.registrarSiif.mockResolvedValue({ devuelta: true, estadoSolicitud: 'PENDIENTE_LEGALIZACION', observacionDevolucion: 'x' });
    await abrirDetalle();
    fireEvent.change(await screen.findByLabelText('Valor legalizado (COP)'), { target: { value: '2000000' } });
    fireEvent.change(screen.getByLabelText('Observaciones (opcional)'), { target: { value: 'Factura duplicada.' } });
    expect(screen.getByText(/supera el pagado: no se registra en SIIF/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Registrar en SIIF y cerrar' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Devolver al comisionado por mayor valor' }));
    expect(svc.registrarSiif).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar devolución' }));
    await screen.findByText('Legalización devuelta al comisionado: el valor legalizado supera el pagado.');
    expect(svc.registrarSiif).toHaveBeenCalledWith('sol-1', expect.objectContaining({
      valorLegalizado: 2000000, observaciones: 'Factura duplicada.',
    }));
  });

  it('revisión aprobada: el analista solicita la reversión con un motivo', async () => {
    svc.detalleRevision.mockResolvedValue(
      detalle({ puedeRevisar: false, puedeRegistrarSiif: true, puedeSolicitarReversion: true, revisionAprobadaEn: '2026-09-25T18:00:00Z' }),
    );
    svc.solicitarReversion.mockResolvedValue({ id: 'rev-1' });
    await abrirDetalle();
    fireEvent.click(await screen.findByRole('button', { name: 'Solicitar reversión de la aprobación' }));
    const enviar = screen.getByRole('button', { name: 'Enviar solicitud de reversión' });
    expect(enviar).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Motivo de la reversión'), { target: { value: 'Aprobé por error el formato sin firma.' } });
    fireEvent.click(enviar);
    await screen.findByText('Reversión solicitada. Queda pendiente de aprobación por otra persona.');
    expect(svc.solicitarReversion).toHaveBeenCalledWith('sol-1', 'Aprobé por error el formato sin firma.');
  });

  it('reversión pendiente: lo avisa y no ofrece registrar en SIIF', async () => {
    svc.detalleRevision.mockResolvedValue(
      detalle({
        puedeRevisar: false, puedeRegistrarSiif: false, puedeSolicitarReversion: false, revisionAprobadaEn: '2026-09-25T18:00:00Z',
        reversionPendiente: { id: 'rev-1', motivo: 'Aprobé por error.', solicitadaPorId: 'a', solicitadaEn: '2026-09-26T15:00:00Z' },
      }),
    );
    await abrirDetalle();
    expect(await screen.findByText('Reversión de la aprobación pendiente')).toBeInTheDocument();
    expect(screen.getByText(/Aprobé por error\./)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Registrar en SIIF/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Solicitar reversión de la aprobación' })).not.toBeInTheDocument();
  });

  it('GF-FO-032: muestra el viaje real y no deja legalizar por encima de los días viajados', async () => {
    svc.detalleRevision.mockResolvedValue(
      detalle({
        puedeRevisar: false, puedeRegistrarSiif: true, revisionAprobadaEn: '2026-09-25T18:00:00Z',
        cumplimiento: { fechaInicioReal: '2026-09-01', fechaFinReal: '2026-09-03', comisionExterna: true, entidadExterna: 'Gobernación del Cauca', registrado: true },
        viajeReal: { diasReales: 3, nochesPlaneadas: 4, nochesReales: 2, viaticosPlaneados: 450000, viaticosReales: 250000, reintegroViajeCorto: 200000 },
        maximoLegalizable: 1300000,
      }),
    );
    await abrirDetalle();
    expect(await screen.findByText(/GF-FO-032: cumplida del 2026-09-01 al 2026-09-03 · fuera de la ESAP: Gobernación del Cauca/)).toBeInTheDocument();
    expect(screen.getByText(/Viaje más corto según el GF-FO-032 \(2 de 4 noches\)/)).toHaveTextContent('200.000');
    expect(screen.queryByLabelText('Días reales de la comisión (opcional)')).not.toBeInTheDocument();
    expect(screen.getByText(/Días reales \(GF-FO-032\)/)).toHaveTextContent('3');

    fireEvent.change(screen.getByLabelText('Número del registro en SIIF'), { target: { value: 'LEG-1' } });
    fireEvent.change(screen.getByLabelText('Valor legalizado (COP)'), { target: { value: '1400000' } });
    expect(screen.getByRole('alert')).toHaveTextContent('no puede superar');
    expect(screen.getByRole('button', { name: 'Registrar en SIIF y cerrar' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Valor legalizado (COP)'), { target: { value: '1300000' } });
    expect(screen.getByRole('button', { name: 'Registrar en SIIF y cerrar' })).toBeEnabled();
  });

  it('cerrada: muestra el expediente sin ninguna acción', async () => {
    svc.detalleRevision.mockResolvedValue(
      detalle({ estadoSolicitud: 'LEGALIZADO', puedeRevisar: false, puedeRegistrarSiif: false, enRevision: false,
        numeroRegistroSiif: 'LEG-SIIF-123', fechaRegistroSiif: '2026-09-25', valorLegalizado: '1200000.00', valorReintegro: '300000.00' },
        [soporte('s1', 'APROBADO')]),
    );
    await abrirDetalle();
    expect(await screen.findByText('Expediente cerrado: no admite cambios.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Aprobar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Devolver/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Registrar en SIIF/ })).not.toBeInTheDocument();
  });
});
