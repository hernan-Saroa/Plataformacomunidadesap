import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BancoDocenteRecategorizacionModal } from './BancoDocenteRecategorizacionModal';
import {
  decidirRecategorizacionDocente, iniciarRecategorizacionDocente, listarRecategorizacionesDocente,
  revisarRecategorizacionDocente, vincularRundSoporte,
} from '../../../services/api/ptaApi';

vi.mock('../../../services/api/ptaApi', () => ({
  decidirRecategorizacionDocente: vi.fn(),
  iniciarRecategorizacionDocente: vi.fn(),
  listarRecategorizacionesDocente: vi.fn(),
  revisarRecategorizacionDocente: vi.fn(),
  vincularRundSoporte: vi.fn(),
}));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ userPersonId: 'persona-ggp', userEmail: 'ggp@esap.edu.co' }) }));

const docente = { docente_id: 'docente-1', nombre_completo: 'DOCENTE ACTIVO', periodo_carga: '2026-2' };
const pdf = (name = 'titulo.pdf') => new File(['%PDF-1.4'], name, { type: 'application/pdf' });
const item = (estado: string, extra: Record<string, unknown> = {}) => ({
  id: 'rec-1', estado, estadoEtiqueta: estado, justificacion: 'Nuevo título de maestría', propuesta: { escalafon: 'Asociado', puntajeSalarial: 250 },
  soporteIds: ['a'], revision: null, decisionComite: null, ...extra,
});

function abrir() {
  const onClose = vi.fn();
  const onChanged = vi.fn();
  render(<BancoDocenteRecategorizacionModal docente={docente} onClose={onClose} onChanged={onChanged} />);
  return { onClose, onChanged };
}
const lista = (data: unknown[]) => vi.mocked(listarRecategorizacionesDocente).mockResolvedValue({ success: true, data } as any);

beforeEach(() => {
  lista([]);
  vi.mocked(vincularRundSoporte).mockResolvedValue({ success: true, data: { id: 'soporte-9' } } as any);
  vi.mocked(iniciarRecategorizacionDocente).mockResolvedValue({ success: true, data: item('EN_REVISION') } as any);
  vi.mocked(revisarRecategorizacionDocente).mockResolvedValue({ success: true, data: item('EN_COMITE') } as any);
  vi.mocked(decidirRecategorizacionDocente).mockResolvedValue({ success: true, data: item('APROBADA') } as any);
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('BancoDocenteRecategorizacionModal (HU 2349 · CA-03)', () => {
  it('avisa que la información vigente no cambia hasta que apruebe el comité', async () => {
    abrir();
    expect(await screen.findByText(/no cambia hasta que el comité apruebe/)).toBeTruthy();
  });

  it('iniciar sin justificación, categoría ni soportes no envía nada', async () => {
    abrir();
    fireEvent.click(await screen.findByRole('button', { name: 'Iniciar recategorización' }));
    expect(await screen.findByText('Explique la justificación con mínimo 10 caracteres.')).toBeTruthy();
    expect(screen.getByText('Indique la categoría o escalafón propuesto.')).toBeTruthy();
    expect(screen.getByText('Adjunte al menos un soporte nuevo.')).toBeTruthy();
    expect(vincularRundSoporte).not.toHaveBeenCalled();
    expect(iniciarRecategorizacionDocente).not.toHaveBeenCalled();
  });

  it('iniciar: sube cada soporte, crea la solicitud y avisa al listado', async () => {
    vi.mocked(vincularRundSoporte).mockResolvedValueOnce({ success: true, data: { id: 's1' } } as any).mockResolvedValueOnce({ success: true, data: { id: 's2' } } as any);
    const { onChanged } = abrir();
    fireEvent.change(await screen.findByLabelText(/Justificación/), { target: { value: 'Nuevo título de maestría' } });
    fireEvent.change(screen.getByLabelText(/Categoría o escalafón/), { target: { value: 'Asociado' } });
    fireEvent.change(screen.getByLabelText(/Puntaje salarial/), { target: { value: '250,5' } });
    fireEvent.change(screen.getByLabelText(/Soportes nuevos/), { target: { files: [pdf('a.pdf'), pdf('b.pdf')] } });
    expect(screen.getByTestId('recategorizacion-archivos').textContent).toContain('a.pdf');
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar recategorización' }));

    await waitFor(() => expect(onChanged).toHaveBeenCalledWith(expect.stringContaining('Recategorización iniciada')));
    expect(vincularRundSoporte).toHaveBeenCalledTimes(2);
    expect(iniciarRecategorizacionDocente).toHaveBeenCalledWith('docente-1', {
      justificacion: 'Nuevo título de maestría', propuesta: { escalafon: 'Asociado', puntajeSalarial: 250.5 }, soporteIds: ['s1', 's2'], periodoCarga: '2026-2',
    });
  });

  it('un soporte que falla al subir detiene el proceso: no crea la solicitud', async () => {
    vi.mocked(vincularRundSoporte).mockResolvedValue({ success: false, data: null, message: 'Disco lleno' } as any);
    const { onChanged } = abrir();
    fireEvent.change(await screen.findByLabelText(/Justificación/), { target: { value: 'Nuevo título de maestría' } });
    fireEvent.change(screen.getByLabelText(/Categoría o escalafón/), { target: { value: 'Asociado' } });
    fireEvent.change(screen.getByLabelText(/Soportes nuevos/), { target: { files: [pdf()] } });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar recategorización' }));
    expect(await screen.findByText('Disco lleno')).toBeTruthy();
    expect(iniciarRecategorizacionDocente).not.toHaveBeenCalled();
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('rechaza archivos de tipo no permitido y permite quitar uno', async () => {
    abrir();
    fireEvent.change(await screen.findByLabelText(/Soportes nuevos/), { target: { files: [new File(['x'], 'x.exe', { type: 'application/x-msdownload' })] } });
    expect(await screen.findByText('Use archivos PDF, JPG o PNG de máximo 10 MB.')).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/Soportes nuevos/), { target: { files: [pdf('a.pdf')] } });
    fireEvent.click(screen.getByRole('button', { name: 'Quitar a.pdf' }));
    expect(screen.getByTestId('recategorizacion-archivos').textContent).toBe('');
  });

  it('el doble clic en «Iniciar» solo crea una solicitud', async () => {
    let liberar!: (value: unknown) => void;
    vi.mocked(iniciarRecategorizacionDocente).mockImplementation(() => new Promise((resolve) => { liberar = resolve; }) as any);
    abrir();
    fireEvent.change(await screen.findByLabelText(/Justificación/), { target: { value: 'Nuevo título de maestría' } });
    fireEvent.change(screen.getByLabelText(/Categoría o escalafón/), { target: { value: 'Asociado' } });
    fireEvent.change(screen.getByLabelText(/Soportes nuevos/), { target: { files: [pdf()] } });
    const boton = screen.getByRole('button', { name: 'Iniciar recategorización' });
    fireEvent.click(boton);
    fireEvent.click(boton);
    await waitFor(() => expect(iniciarRecategorizacionDocente).toHaveBeenCalledTimes(1));
    liberar({ success: true, data: item('EN_REVISION') });
  });

  it('En revisión: muestra el resumen y no deja iniciar otra solicitud', async () => {
    lista([item('EN_REVISION')]);
    abrir();
    expect((await screen.findByTestId('recategorizacion-resumen')).textContent).toContain('Asociado');
    expect(screen.queryByRole('button', { name: 'Iniciar recategorización' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Registrar revisión' })).toBeTruthy();
  });

  it('revisión «No cumple» exige motivo; «Cumple» pasa a comité', async () => {
    lista([item('EN_REVISION')]);
    const { onChanged } = abrir();
    fireEvent.click(await screen.findByRole('button', { name: 'Registrar revisión' }));
    expect(await screen.findByText('Seleccione el resultado de la revisión.')).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/Revisión de los soportes/), { target: { value: 'NO_CUMPLE' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar revisión' }));
    expect(await screen.findByText('El motivo es obligatorio cuando los soportes no cumplen.')).toBeTruthy();
    expect(revisarRecategorizacionDocente).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/Revisión de los soportes/), { target: { value: 'CUMPLE' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar revisión' }));
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith(expect.stringContaining('pasó a comité')));
    expect(revisarRecategorizacionDocente).toHaveBeenCalledWith('docente-1', 'rec-1', { resultado: 'CUMPLE', observacion: undefined, periodoCarga: '2026-2' });
  });

  it('En comité: sin soporte ni fecha no guarda; aprobada envía todo y avisa que se actualizó', async () => {
    lista([item('EN_COMITE')]);
    const { onChanged } = abrir();
    fireEvent.click(await screen.findByRole('button', { name: 'Registrar decisión' }));
    expect(await screen.findByText('Seleccione el resultado de la decisión.')).toBeTruthy();
    expect(screen.getByText('La fecha del comité es obligatoria.')).toBeTruthy();
    expect(screen.getByText('Adjunte el soporte de la decisión del comité.')).toBeTruthy();
    expect(decidirRecategorizacionDocente).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/Decisión del comité/), { target: { value: 'APROBADA' } });
    fireEvent.change(screen.getByLabelText(/Fecha del comité/), { target: { value: '2026-11-10' } });
    fireEvent.change(screen.getByLabelText(/Soporte de la decisión del comité/), { target: { files: [pdf('acta.pdf')] } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar decisión' }));
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith(expect.stringContaining('información del docente fue actualizada')));
    expect(decidirRecategorizacionDocente).toHaveBeenCalledWith('docente-1', 'rec-1', {
      resultado: 'APROBADA', fechaComite: '2026-11-10', soporteId: 'soporte-9', motivo: undefined, periodoCarga: '2026-2',
    });
  });

  it('el comité que rechaza exige motivo', async () => {
    lista([item('EN_COMITE')]);
    abrir();
    fireEvent.change(await screen.findByLabelText(/Decisión del comité/), { target: { value: 'RECHAZADA' } });
    fireEvent.change(screen.getByLabelText(/Fecha del comité/), { target: { value: '2026-11-10' } });
    fireEvent.change(screen.getByLabelText(/Soporte de la decisión del comité/), { target: { files: [pdf()] } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar decisión' }));
    expect(await screen.findByText('El motivo es obligatorio cuando se rechaza la recategorización.')).toBeTruthy();
    expect(decidirRecategorizacionDocente).not.toHaveBeenCalled();
  });

  it('muestra el error del servidor al decidir y no avisa al listado', async () => {
    lista([item('EN_COMITE')]);
    vi.mocked(decidirRecategorizacionDocente).mockResolvedValue({ success: false, data: null, message: 'La recategorización ya fue resuelta (APROBADA).' } as any);
    const { onChanged } = abrir();
    fireEvent.change(await screen.findByLabelText(/Decisión del comité/), { target: { value: 'APROBADA' } });
    fireEvent.change(screen.getByLabelText(/Fecha del comité/), { target: { value: '2026-11-10' } });
    fireEvent.change(screen.getByLabelText(/Soporte de la decisión del comité/), { target: { files: [pdf()] } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar decisión' }));
    expect(await screen.findByText(/ya fue resuelta/)).toBeTruthy();
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('historial: las solicitudes cerradas se listan y permiten iniciar una nueva', async () => {
    lista([item('APROBADA', { id: 'old', decisionComite: { resultado: 'APROBADA', fechaComite: '2026-05-02', motivo: null, soporteNombre: 'acta.pdf' } })]);
    abrir();
    expect(await screen.findByText('Historial de recategorizaciones')).toBeTruthy();
    expect(screen.getByText(/Aprobada \(02\/05\/2026\)/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Iniciar recategorización' })).toBeTruthy();
  });

  it('si falla la consulta muestra el error con «Reintentar»', async () => {
    vi.mocked(listarRecategorizacionesDocente).mockResolvedValueOnce({ success: false, data: [], message: 'Sin conexión' } as any);
    abrir();
    expect(await screen.findByText(/Sin conexión/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(listarRecategorizacionesDocente).toHaveBeenCalledTimes(2));
  });
});
