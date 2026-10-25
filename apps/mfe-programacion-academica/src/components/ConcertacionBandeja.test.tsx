// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConcertacionBandeja } from './ConcertacionBandeja';
import { aprobarConcertacion, getBandejaConcertacion, revisarConcertacion } from '../services/api/concertacionApi';
import { invalidarProgramacion } from '../services/actualizacionProgramacion';

vi.mock('../services/api/concertacionApi', () => ({
  getBandejaConcertacion: vi.fn(), revisarConcertacion: vi.fn(), aprobarConcertacion: vi.fn(), devolverConcertacion: vi.fn(),
}));

/**
 * Reporte de Tomás: como jefatura o superadmin solo aparecía «Devolver», no «Aprobar».
 * El flujo es: el área académica REVISA y la jefatura APRUEBA, y cada paso se firma en el modal del PTA.
 */
const item = (estado: 'ENVIADA' | 'REVISADA', puede: { revisar: string[]; aprobar: boolean; devolver: boolean }) => ({
  idConcertacion: 'c-1', idPeriodo: '499', periodoCodigo: '2026-2', nivel: 'pregrado', estado, horas: 96, numFranjas: 4,
  franjas: [{ idFranja: 'f1', codigoAsignatura: 'ASIG-00003', asignatura: 'Fundamentos', horas: 32 }],
  docente: 'Pedro Docente Prueba', documento: '1020304053', revisiones: estado === 'REVISADA' ? ['academica'] : [],
  firmas: [{ rol: 'docente', firmadoEn: '2026-10-18T23:41:12Z', modoOtp: 'simulado' }], puede,
});
const SUPERADMIN = { revisar: ['academica'], aprobar: true, devolver: true };
const JEFATURA = { revisar: [], aprobar: true, devolver: true };

beforeEach(() => { vi.clearAllMocks(); });
afterEach(cleanup);

const montar = async (filas: any[]) => {
  vi.mocked(getBandejaConcertacion).mockResolvedValue(filas as any);
  render(<ConcertacionBandeja firmaSimulada />);
  await screen.findByText('Pedro Docente Prueba', { exact: false });
};
const boton = (nombre: RegExp) => screen.queryByRole('button', { name: nombre }) as HTMLButtonElement | null;

describe('bandeja de concertación: cada perfil ve su acción según la etapa', () => {
  it('ENVIADA, superadmin: «Revisar y firmar» activo; «Aprobar» visible pero deshabilitado con el motivo', async () => {
    await montar([item('ENVIADA', SUPERADMIN)]);
    expect(boton(/Revisar y firmar/)!.disabled).toBe(false);
    expect(boton(/Aprobar y firmar/)!.disabled).toBe(true);
    expect(screen.getByText(/se habilita cuando termine la revisión académica/)).toBeTruthy();
    expect(boton(/Devolver al programador/)).toBeTruthy();
  });

  it('ENVIADA, jefatura: no revisa; ve «Aprobar» (deshabilitado hasta la revisión) y «Devolver»', async () => {
    await montar([item('ENVIADA', JEFATURA)]);
    expect(boton(/Revisar y firmar/)).toBeNull();
    expect(boton(/Aprobar y firmar/)!.disabled).toBe(true);
    expect(boton(/Devolver al programador/)).toBeTruthy();
  });

  it('REVISADA, jefatura: «Aprobar y firmar» abre el modal de firma y aprueba con el código', async () => {
    vi.mocked(aprobarConcertacion).mockResolvedValue({} as any);
    await montar([item('REVISADA', JEFATURA)]);
    fireEvent.click(boton(/Aprobar y firmar/)!);
    expect(await screen.findByRole('dialog', { name: /Aprobación de la docencia/ })).toBeTruthy();
    '654321'.split('').forEach((d, i) => fireEvent.change(screen.getByLabelText(`Dígito ${i + 1} del código`), { target: { value: d } }));
    fireEvent.click(await screen.findByRole('button', { name: /Firmar y aprobar/ }, { timeout: 8000 }));
    await waitFor(() => expect(aprobarConcertacion).toHaveBeenCalledWith('c-1', '654321'));
    expect(await screen.findByText('Firma registrada')).toBeTruthy();
  }, 15000);

  it('ENVIADA, superadmin: «Revisar y firmar» abre el modal y revisa la académica', async () => {
    vi.mocked(revisarConcertacion).mockResolvedValue({} as any);
    await montar([item('ENVIADA', SUPERADMIN)]);
    fireEvent.click(boton(/Revisar y firmar/)!);
    expect(await screen.findByRole('dialog', { name: /Revisión académica/ })).toBeTruthy();
    '111222'.split('').forEach((d, i) => fireEvent.change(screen.getByLabelText(`Dígito ${i + 1} del código`), { target: { value: d } }));
    fireEvent.click(await screen.findByRole('button', { name: /Firmar revisión/ }, { timeout: 8000 }));
    await waitFor(() => expect(revisarConcertacion).toHaveBeenCalledWith('c-1', '111222', 'academica'));
  }, 15000);

  it('si el servidor rechaza, el modal muestra el motivo y no da la firma por hecha', async () => {
    vi.mocked(aprobarConcertacion).mockRejectedValue(new Error('No se aprueba: la docencia cambió después de la firma del docente.'));
    await montar([item('REVISADA', JEFATURA)]);
    fireEvent.click(boton(/Aprobar y firmar/)!);
    '654321'.split('').forEach((d, i) => fireEvent.change(screen.getByLabelText(`Dígito ${i + 1} del código`), { target: { value: d } }));
    fireEvent.click(await screen.findByRole('button', { name: /Firmar y aprobar/ }, { timeout: 8000 }));
    expect(await screen.findByText(/la docencia cambió/)).toBeTruthy();
    expect(screen.queryByText('Firma registrada')).toBeNull();
  }, 15000);

  it('muestra las etapas y el registro de firmas', async () => {
    await montar([item('REVISADA', JEFATURA)]);
    expect(screen.getByLabelText('Etapas de la concertación')).toBeTruthy();
    expect(screen.getByText('Registro de firmas')).toBeTruthy();
    expect(screen.getByText(/Periodo 2026-2/)).toBeTruthy();
  });

  // Orden del flujo vigente: el programador envía; el docente acepta al final.
  it('la bandeja y las etapas dicen el orden nuevo: programador envía, se revisa y aprueba, el docente acepta', async () => {
    await montar([item('ENVIADA', SUPERADMIN)]);
    expect(screen.getByText(/el programador envía/)).toBeTruthy();
    expect(screen.getByText(/el docente acepta y firma/)).toBeTruthy();
    expect(screen.queryByText(/el docente envía/)).toBeNull();
    const etapas = screen.getByLabelText('Etapas de la concertación').textContent!;
    expect(etapas.indexOf('Enviada por el programador')).toBeGreaterThanOrEqual(0);
    expect(etapas.indexOf('Revisión académica')).toBeGreaterThan(etapas.indexOf('Enviada por el programador'));
    expect(etapas.indexOf('Aprobación')).toBeGreaterThan(etapas.indexOf('Revisión académica'));
    expect(etapas.indexOf('Aceptación del docente')).toBeGreaterThan(etapas.indexOf('Aprobación'));
    expect(etapas).not.toMatch(/por el docente/);
  });

  // Reporte de Tomás: al firmar, la bandeja se recargaba, se desmontaba el modal y reaparecía en la
  // verificación del código aunque la firma ya estaba registrada.
  it('al registrarse la firma el modal no vuelve a la verificación aunque la bandeja se recargue, y se cierra solo', async () => {
    let cargas = 0;
    vi.mocked(getBandejaConcertacion).mockImplementation(async () => {
      cargas++;
      if (cargas === 1) return [item('REVISADA', JEFATURA)] as any;
      await new Promise((r) => setTimeout(r, 300)); // recarga lenta tras la firma
      return [] as any;
    });
    vi.mocked(aprobarConcertacion).mockImplementation(async () => { invalidarProgramacion('concertacion'); return {} as any; });
    render(<ConcertacionBandeja firmaSimulada />);
    await screen.findByText('Pedro Docente Prueba', { exact: false });
    fireEvent.click(boton(/Aprobar y firmar/)!);
    '654321'.split('').forEach((d, i) => fireEvent.change(screen.getByLabelText(`Dígito ${i + 1} del código`), { target: { value: d } }));
    fireEvent.click(await screen.findByRole('button', { name: /Firmar y aprobar/ }, { timeout: 8000 }));
    expect(await screen.findByText('Firma registrada')).toBeTruthy();
    await waitFor(() => expect(cargas).toBeGreaterThan(1));
    await new Promise((r) => setTimeout(r, 500)); // la recarga ya terminó
    expect(screen.queryByLabelText('Dígito 1 del código')).toBeNull();
    expect(screen.queryByText('Verificación de identidad')).toBeNull();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), { timeout: 4000 });
  }, 20000);
});
