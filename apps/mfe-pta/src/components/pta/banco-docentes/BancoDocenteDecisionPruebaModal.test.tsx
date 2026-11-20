import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BancoDocenteDecisionPruebaModal } from './BancoDocenteDecisionPruebaModal';
import { registrarDecisionPeriodoPrueba, vincularRundSoporte } from '../../../services/api/ptaApi';
import { hoyColombiaISO } from '../../../utils/rundPeriodoPrueba';

vi.mock('../../../services/api/ptaApi', () => ({
  registrarDecisionPeriodoPrueba: vi.fn(),
  vincularRundSoporte: vi.fn(),
}));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ userPersonId: 'persona-ggp', userEmail: 'ggp@esap.edu.co' }) }));

const docente = {
  docente_id: 'docente-1', nombre_completo: 'DOCENTE EN PRUEBA', periodo_carga: '2026-2',
  periodo_prueba: { en_periodo_prueba: true, inicio: '2025-08-01', cumplimiento: '2026-08-01', dias_restantes: -106, pendiente_decision: true, decision: null },
};
const pdf = () => new File(['%PDF-1.4'], 'acta-comite.pdf', { type: 'application/pdf' });

function abrir(extra: Partial<typeof docente> & Record<string, unknown> = {}) {
  const onClose = vi.fn();
  const onSaved = vi.fn();
  render(<BancoDocenteDecisionPruebaModal docente={{ ...docente, ...extra }} onClose={onClose} onSaved={onSaved} />);
  return { onClose, onSaved };
}
const adjuntar = (file: File) => fireEvent.change(screen.getByLabelText(/Soporte \(acto administrativo/, { selector: 'input' }), { target: { files: [file] } });

beforeEach(() => {
  vi.mocked(vincularRundSoporte).mockResolvedValue({ success: true, data: { id: 'soporte-9' } } as any);
  vi.mocked(registrarDecisionPeriodoPrueba).mockResolvedValue({ success: true, data: {} } as any);
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('BancoDocenteDecisionPruebaModal (HU 2424)', () => {
  it('resume el periodo de prueba del docente: inicio, cumplimiento y días', () => {
    abrir();
    const resumen = screen.getByTestId('decision-prueba-resumen').textContent || '';
    expect(resumen).toContain('inicio 01/08/2025');
    expect(resumen).toContain('cumple 01/08/2026');
    expect(resumen).toContain('Vencido hace 106 días');
  });

  it('CA-06: sin soporte ni fecha no guarda y nombra los campos obligatorios faltantes', async () => {
    abrir();
    fireEvent.change(screen.getByLabelText(/Resultado de la decisión/), { target: { value: 'SUPERA' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar decisión' }));
    expect((await screen.findAllByRole('alert')).map((a) => a.textContent).join('|')).toContain('Revise los campos obligatorios: fecha del comité, soporte.');
    expect(screen.getByText('La fecha del comité es obligatoria.')).toBeTruthy();
    expect(screen.getByText('Adjunte el soporte (acto administrativo o certificación).')).toBeTruthy();
    expect(vincularRundSoporte).not.toHaveBeenCalled();
    expect(registrarDecisionPeriodoPrueba).not.toHaveBeenCalled();
  });

  it('CA-07: «No supera» sin motivo no guarda e indica que el motivo es obligatorio', async () => {
    abrir();
    fireEvent.change(screen.getByLabelText(/Resultado de la decisión/), { target: { value: 'NO_SUPERA' } });
    fireEvent.change(screen.getByLabelText(/Fecha del comité/), { target: { value: '2026-11-10' } });
    adjuntar(pdf());
    fireEvent.click(screen.getByRole('button', { name: 'Registrar decisión' }));
    expect(await screen.findByText('El motivo es obligatorio cuando el docente no supera el periodo de prueba.')).toBeTruthy();
    expect(registrarDecisionPeriodoPrueba).not.toHaveBeenCalled();
  });

  it('CA-04: «Supera» sube el soporte, registra la decisión y avisa al listado', async () => {
    const { onSaved } = abrir();
    fireEvent.change(screen.getByLabelText(/Resultado de la decisión/), { target: { value: 'SUPERA' } });
    fireEvent.change(screen.getByLabelText(/Fecha del comité/), { target: { value: '2026-11-10' } });
    fireEvent.change(screen.getByLabelText('Observación'), { target: { value: 'Acta 14' } });
    adjuntar(pdf());
    fireEvent.click(screen.getByRole('button', { name: 'Registrar decisión' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith('SUPERA'));
    expect(vincularRundSoporte).toHaveBeenCalledWith('docente-1', 'TRANSVERSAL',
      expect.objectContaining({ tipoSoporte: 'soporte_cambio_estado_perfil', nombreArchivo: 'acta-comite.pdf', cargadoPor: 'persona-ggp' }), expect.any(File));
    expect(registrarDecisionPeriodoPrueba).toHaveBeenCalledWith('docente-1', {
      resultado: 'SUPERA', fechaComite: '2026-11-10', soporteId: 'soporte-9', motivo: undefined, observacion: 'Acta 14', periodoCarga: '2026-2',
    });
  });

  it('CA-05: «No supera» envía el motivo', async () => {
    const { onSaved } = abrir();
    fireEvent.change(screen.getByLabelText(/Resultado de la decisión/), { target: { value: 'NO_SUPERA' } });
    fireEvent.change(screen.getByLabelText(/Fecha del comité/), { target: { value: '2026-11-10' } });
    fireEvent.change(screen.getByLabelText(/Motivo/), { target: { value: 'No cumple segunda lengua' } });
    adjuntar(pdf());
    fireEvent.click(screen.getByRole('button', { name: 'Registrar decisión' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith('NO_SUPERA'));
    expect(registrarDecisionPeriodoPrueba).toHaveBeenCalledWith('docente-1', expect.objectContaining({ resultado: 'NO_SUPERA', motivo: 'No cumple segunda lengua' }));
  });

  it('no permite elegir una fecha del comité futura', () => {
    abrir();
    expect((screen.getByLabelText(/Fecha del comité/) as HTMLInputElement).max).toBe(hoyColombiaISO());
  });

  it('rechaza archivos que no son PDF, JPG o PNG', async () => {
    abrir();
    adjuntar(new File(['x'], 'datos.xlsx', { type: 'application/vnd.ms-excel' }));
    expect(await screen.findByText('Use un archivo PDF, JPG o PNG de máximo 10 MB.')).toBeTruthy();
  });

  it('muestra el error del servidor y no cierra el modal', async () => {
    vi.mocked(registrarDecisionPeriodoPrueba).mockResolvedValue({ success: false, data: null, message: 'El periodo de prueba aún no se cumple: vence el 2027-01-01 (faltan 47 días).' } as any);
    const { onSaved } = abrir();
    fireEvent.change(screen.getByLabelText(/Resultado de la decisión/), { target: { value: 'SUPERA' } });
    fireEvent.change(screen.getByLabelText(/Fecha del comité/), { target: { value: '2026-11-10' } });
    adjuntar(pdf());
    fireEvent.click(screen.getByRole('button', { name: 'Registrar decisión' }));
    expect(await screen.findByText(/aún no se cumple: vence el 2027-01-01/)).toBeTruthy();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('el doble clic no envía dos veces la decisión', async () => {
    let liberar!: (value: unknown) => void;
    vi.mocked(registrarDecisionPeriodoPrueba).mockImplementation(() => new Promise((resolve) => { liberar = resolve; }) as any);
    abrir();
    fireEvent.change(screen.getByLabelText(/Resultado de la decisión/), { target: { value: 'SUPERA' } });
    fireEvent.change(screen.getByLabelText(/Fecha del comité/), { target: { value: '2026-11-10' } });
    adjuntar(pdf());
    const boton = screen.getByRole('button', { name: 'Registrar decisión' });
    fireEvent.click(boton);
    fireEvent.click(boton);
    await waitFor(() => expect(registrarDecisionPeriodoPrueba).toHaveBeenCalledTimes(1));
    expect(vincularRundSoporte).toHaveBeenCalledTimes(1);
    liberar({ success: true, data: {} });
  });

  it('RN-08: con una decisión previa se abre como corrección con los valores cargados', () => {
    abrir({ periodo_prueba: { ...docente.periodo_prueba, en_periodo_prueba: false, pendiente_decision: false, decision: {
      resultado: 'NO_SUPERA', resultadoEtiqueta: 'No supera el periodo de prueba', fechaComite: '2026-10-01', motivo: 'Sin segunda lengua', observacion: 'Acta 9', soporteNombre: 'a.pdf' } } });
    expect(screen.getByText('Corregir decisión del Comité Docente')).toBeTruthy();
    expect((screen.getByLabelText(/Resultado de la decisión/) as HTMLSelectElement).value).toBe('NO_SUPERA');
    expect((screen.getByLabelText(/Fecha del comité/) as HTMLInputElement).value).toBe('2026-10-01');
    expect((screen.getByLabelText(/Motivo/) as HTMLTextAreaElement).value).toBe('Sin segunda lengua');
    expect(screen.getByRole('button', { name: 'Guardar corrección' })).toBeTruthy();
  });

  it('Cancelar cierra sin guardar', () => {
    const { onClose } = abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalled();
    expect(registrarDecisionPeriodoPrueba).not.toHaveBeenCalled();
  });
});
