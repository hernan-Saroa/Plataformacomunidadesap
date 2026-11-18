import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BancoDocenteComiteIncorporacionModal } from './BancoDocenteComiteIncorporacionModal';
import { registrarDecisionComiteIncorporacion, vincularRundSoporte } from '../../../services/api/ptaApi';
import { hoyColombiaISO } from '../../../utils/rundPeriodoPrueba';

vi.mock('../../../services/api/ptaApi', () => ({
  registrarDecisionComiteIncorporacion: vi.fn(),
  vincularRundSoporte: vi.fn(),
}));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ userPersonId: 'persona-ggp', userEmail: 'ggp@esap.edu.co' }) }));

const docente = {
  docente_id: 'docente-1', nombre_completo: 'DOCENTE VALIDADO', periodo_carga: '2026-2', estado: 'ACTIVO', estadoAprobacion: 'ACTIVO_RUND',
  ciclo: { etapa: 'VALIDADO_CUMPLE', etapaEtiqueta: 'Validado – Cumple', puedeRegistrarComite: true, decision: null },
};
const pdf = () => new File(['%PDF-1.4'], 'acta-comite.pdf', { type: 'application/pdf' });
const adjuntar = (file: File) => fireEvent.change(screen.getByLabelText(/Soporte de la decisión del comité/, { selector: 'input' }), { target: { files: [file] } });

function abrir(extra: Record<string, unknown> = {}) {
  const onClose = vi.fn();
  const onSaved = vi.fn();
  render(<BancoDocenteComiteIncorporacionModal docente={{ ...docente, ...extra }} onClose={onClose} onSaved={onSaved} />);
  return { onClose, onSaved };
}
const llenar = (resultado = 'FAVORABLE') => {
  fireEvent.change(screen.getByLabelText(/Resultado de la decisión/), { target: { value: resultado } });
  fireEvent.change(screen.getByLabelText(/Fecha del comité/), { target: { value: '2026-11-10' } });
};

beforeEach(() => {
  vi.mocked(vincularRundSoporte).mockResolvedValue({ success: true, data: { id: 'soporte-9' } } as any);
  vi.mocked(registrarDecisionComiteIncorporacion).mockResolvedValue({ success: true, data: {} } as any);
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('BancoDocenteComiteIncorporacionModal (HU 2349 · CA-01)', () => {
  it('muestra la etapa actual y a qué pasa con una decisión favorable', () => {
    abrir();
    const resumen = screen.getByTestId('comite-incorporacion-resumen').textContent || '';
    expect(resumen).toContain('Validado – Cumple');
    expect(resumen).toContain('Apto para incorporación / Activo');
  });

  it('sin soporte no guarda, nombra el campo y no toca el servidor', async () => {
    abrir();
    llenar();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar decisión' }));
    expect(await screen.findByText('Adjunte el soporte de la decisión del comité.')).toBeTruthy();
    expect((await screen.findAllByRole('alert')).map((a) => a.textContent).join('|')).toContain('Revise los campos obligatorios: soporte.');
    expect(vincularRundSoporte).not.toHaveBeenCalled();
    expect(registrarDecisionComiteIncorporacion).not.toHaveBeenCalled();
  });

  it('formulario vacío: nombra resultado, fecha y soporte', async () => {
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar decisión' }));
    expect((await screen.findAllByRole('alert')).map((a) => a.textContent).join('|')).toContain('resultado, fecha del comité, soporte');
  });

  it('decisión favorable: sube el soporte, registra y avisa al listado', async () => {
    const { onSaved } = abrir();
    llenar();
    fireEvent.change(screen.getByLabelText('Observación'), { target: { value: 'Acta 21' } });
    adjuntar(pdf());
    fireEvent.click(screen.getByRole('button', { name: 'Registrar decisión' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith('FAVORABLE'));
    expect(vincularRundSoporte).toHaveBeenCalledWith('docente-1', 'TRANSVERSAL',
      expect.objectContaining({ tipoSoporte: 'soporte_cambio_estado_perfil', nombreArchivo: 'acta-comite.pdf', cargadoPor: 'persona-ggp' }), expect.any(File));
    expect(registrarDecisionComiteIncorporacion).toHaveBeenCalledWith('docente-1', {
      resultado: 'FAVORABLE', fechaComite: '2026-11-10', soporteId: 'soporte-9', motivo: undefined, observacion: 'Acta 21', periodoCarga: '2026-2',
    });
  });

  it('decisión no favorable exige motivo y lo envía', async () => {
    const { onSaved } = abrir();
    llenar('NO_FAVORABLE');
    adjuntar(pdf());
    fireEvent.click(screen.getByRole('button', { name: 'Registrar decisión' }));
    expect(await screen.findByText('El motivo es obligatorio cuando la decisión no es favorable.')).toBeTruthy();
    expect(registrarDecisionComiteIncorporacion).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/Motivo/), { target: { value: 'Falta experiencia' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar decisión' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith('NO_FAVORABLE'));
    expect(registrarDecisionComiteIncorporacion).toHaveBeenCalledWith('docente-1', expect.objectContaining({ resultado: 'NO_FAVORABLE', motivo: 'Falta experiencia' }));
  });

  it('no permite fecha futura ni archivos que no sean PDF/JPG/PNG', async () => {
    abrir();
    expect((screen.getByLabelText(/Fecha del comité/) as HTMLInputElement).max).toBe(hoyColombiaISO());
    adjuntar(new File(['x'], 'datos.xlsx', { type: 'application/vnd.ms-excel' }));
    expect(await screen.findByText('Use un archivo PDF, JPG o PNG de máximo 10 MB.')).toBeTruthy();
    adjuntar(new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'grande.pdf', { type: 'application/pdf' }));
    expect(await screen.findByText('Use un archivo PDF, JPG o PNG de máximo 10 MB.')).toBeTruthy();
  });

  it('si falla la carga del soporte no registra la decisión', async () => {
    vi.mocked(vincularRundSoporte).mockResolvedValue({ success: false, data: null, message: 'Archivo infectado' } as any);
    const { onSaved } = abrir();
    llenar();
    adjuntar(pdf());
    fireEvent.click(screen.getByRole('button', { name: 'Registrar decisión' }));
    expect(await screen.findByText('Archivo infectado')).toBeTruthy();
    expect(registrarDecisionComiteIncorporacion).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('muestra el error del servidor (409/400) y no cierra', async () => {
    vi.mocked(registrarDecisionComiteIncorporacion).mockResolvedValue({ success: false, data: null, message: 'El docente debe estar Validado – Cumple antes de pasar al comité.' } as any);
    const { onSaved } = abrir();
    llenar();
    adjuntar(pdf());
    fireEvent.click(screen.getByRole('button', { name: 'Registrar decisión' }));
    expect(await screen.findByText(/debe estar Validado – Cumple/)).toBeTruthy();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('el doble clic no envía dos veces', async () => {
    let liberar!: (value: unknown) => void;
    vi.mocked(registrarDecisionComiteIncorporacion).mockImplementation(() => new Promise((resolve) => { liberar = resolve; }) as any);
    abrir();
    llenar();
    adjuntar(pdf());
    const boton = screen.getByRole('button', { name: 'Registrar decisión' });
    fireEvent.click(boton);
    fireEvent.click(boton);
    await waitFor(() => expect(registrarDecisionComiteIncorporacion).toHaveBeenCalledTimes(1));
    expect(vincularRundSoporte).toHaveBeenCalledTimes(1);
    liberar({ success: true, data: {} });
  });

  it('un perfil sin identificador RUND no envía nada', async () => {
    const { onSaved } = abrir({ docente_id: undefined, id: undefined });
    llenar();
    adjuntar(pdf());
    fireEvent.click(screen.getByRole('button', { name: 'Registrar decisión' }));
    expect(await screen.findByText(/identificador RUND válido/)).toBeTruthy();
    expect(vincularRundSoporte).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('Cancelar cierra sin guardar', () => {
    const { onClose } = abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalled();
    expect(registrarDecisionComiteIncorporacion).not.toHaveBeenCalled();
  });
});
