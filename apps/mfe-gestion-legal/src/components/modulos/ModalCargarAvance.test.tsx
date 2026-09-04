import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

import { toast } from 'sonner';
import { ModalCargarAvance } from './ModalCargarAvance';

const indicador = {
  id: '1',
  codigo: 'IND-01',
  nombre: 'Indicador de prueba',
  meta: 100,
  valorActual: 50,
  avance: 50,
  unidadMedida: 'PORCENTAJE',
  ejeEstrategico: 'GESTION_INSTITUCIONAL',
};

describe('ModalCargarAvance · Actualizar Avance (Plan de Acción)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('en éxito debe esperar a onGuardar, mostrar el toast de éxito y cerrar el modal', async () => {
    const onGuardar = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <ModalCargarAvance isOpen indicador={indicador} onClose={onClose} onGuardar={onGuardar} />,
    );

    fireEvent.change(screen.getByLabelText(/Observaciones del Avance/i), {
      target: { value: 'Se avanzó según lo planeado' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Guardar Avance/i }));

    await waitFor(() => expect(onGuardar).toHaveBeenCalledTimes(1));
    expect(onGuardar.mock.calls[0][0]).toEqual(
      expect.objectContaining({ observacionesAvance: 'Se avanzó según lo planeado' }),
    );

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(toast.success).toHaveBeenCalled();
  });

  it('si el guardado falla, el modal NO debe cerrarse ni mostrar éxito (evita que el usuario crea que se guardó cuando en realidad no)', async () => {
    const onGuardar = vi.fn().mockRejectedValue(new Error('Error al guardar el avance'));
    const onClose = vi.fn();

    render(
      <ModalCargarAvance isOpen indicador={indicador} onClose={onClose} onGuardar={onGuardar} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Guardar Avance/i }));

    await waitFor(() => expect(onGuardar).toHaveBeenCalledTimes(1));

    expect(onClose).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('mientras la petición está en curso, deshabilita el botón para evitar doble envío', async () => {
    let resolveGuardar: () => void = () => {};
    const onGuardar = vi.fn(
      () => new Promise<void>((resolve) => { resolveGuardar = resolve; }),
    );
    const onClose = vi.fn();

    render(
      <ModalCargarAvance isOpen indicador={indicador} onClose={onClose} onGuardar={onGuardar} />,
    );

    const boton = screen.getByRole('button', { name: /Guardar Avance/i });
    fireEvent.click(boton);

    await waitFor(() => expect(screen.getByRole('button', { name: /Guardando/i })).toBeDisabled());
    expect(onGuardar).toHaveBeenCalledTimes(1);

    resolveGuardar();
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('debe incluir el archivo de evidencia seleccionado en los datos enviados a onGuardar', async () => {
    const onGuardar = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    const { container } = render(
      <ModalCargarAvance isOpen indicador={indicador} onClose={onClose} onGuardar={onGuardar} />,
    );

    const file = new File(['contenido'], 'evidencia.pdf', { type: 'application/pdf' });
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.click(screen.getByRole('button', { name: /Guardar Avance/i }));

    await waitFor(() => expect(onGuardar).toHaveBeenCalledTimes(1));
    expect(onGuardar.mock.calls[0][0]).toEqual(
      expect.objectContaining({ evidenciaFile: file }),
    );
  });
});
