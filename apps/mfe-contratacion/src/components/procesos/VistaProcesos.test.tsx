import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { VistaProcesos } from './VistaProcesos';
import { contratacionService } from '../../services/contratacionService';

vi.mock('../../services/contratacionService', () => ({
  contratacionService: {
    listarProcesos: vi.fn(),
    modalidades: vi.fn(),
    crearProceso: vi.fn(),
    // Desde EFDS-1147 el formulario consulta la modalidad que corresponde a la
    // cuantía mientras se digita el valor.
    sugerenciaModalidad: vi.fn(),
  },
}));

const servicio = contratacionService as unknown as {
  listarProcesos: ReturnType<typeof vi.fn>;
  modalidades: ReturnType<typeof vi.fn>;
  crearProceso: ReturnType<typeof vi.fn>;
  sugerenciaModalidad: ReturnType<typeof vi.fn>;
};

const MODALIDADES = [
  { codigo: 'MINIMA_CUANTIA', nombre: 'Mínima Cuantía', orden: 90 },
  { codigo: 'LICITACION_PUBLICA', nombre: 'Licitación Pública', orden: 10 },
];

/**
 * La modalidad decide qué actividades recorre el proceso, así que es
 * obligatoria al crearlo. Eso hace que un fallo al cargar el catálogo deje al
 * usuario sin poder avanzar: la primera versión respondía al error con un
 * `setModalidades([])`, y el desplegable quedaba vacío sin decir por qué.
 */
describe('VistaProcesos · selector de modalidad', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    servicio.listarProcesos.mockResolvedValue([]);
    servicio.sugerenciaModalidad.mockResolvedValue({ modalidad: null, forzosa: false });
  });

  const abrirModal = async () => {
    render(<VistaProcesos onAbrir={vi.fn()} />);
    await userEvent.click(await screen.findByRole('button', { name: /Nuevo proceso|Nuevo/ }));
  };

  it('ofrece las modalidades que devuelve el backend', async () => {
    servicio.modalidades.mockResolvedValue(MODALIDADES);
    await abrirModal();

    expect(await screen.findByRole('option', { name: 'Mínima Cuantía' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Licitación Pública' })).toBeInTheDocument();
  });

  it('explica el fallo en vez de mostrar un desplegable vacío', async () => {
    // Este era el sintoma del 500 que devolvia el endpoint: sin mensaje, el
    // usuario no tenia forma de saber por que no podia crear el proceso.
    servicio.modalidades.mockRejectedValue(new Error('Error 500'));
    await abrirModal();

    expect(await screen.findByRole('alert')).toHaveTextContent('Error 500');
  });

  it('avisa cuando el catálogo llega vacío', async () => {
    // Un catálogo vacío no es un error de red, pero deja igual de bloqueado.
    servicio.modalidades.mockResolvedValue([]);
    await abrirModal();

    expect(await screen.findByRole('alert')).toHaveTextContent(/No hay modalidades configuradas/);
  });

  it('deshabilita el selector cuando no hay nada que elegir', async () => {
    servicio.modalidades.mockResolvedValue([]);
    await abrirModal();

    await waitFor(() => expect(screen.getByLabelText(/Modalidad/)).toBeDisabled());
  });

  it('no deja crear el proceso sin modalidad', async () => {
    servicio.modalidades.mockResolvedValue(MODALIDADES);
    await abrirModal();

    await userEvent.type(screen.getByLabelText(/Objeto a contratar/), 'Adquisición de equipos');

    // Con objeto pero sin modalidad el boton sigue bloqueado: sin ella el
    // backend no puede instanciar las actividades del proceso.
    expect(screen.getByRole('button', { name: /Crear y abrir/ })).toBeDisabled();
  });

  it('envía la modalidad elegida junto al objeto y la cuantía', async () => {
    servicio.modalidades.mockResolvedValue(MODALIDADES);
    servicio.crearProceso.mockResolvedValue({ id: 'proc-1' });
    await abrirModal();

    await userEvent.type(screen.getByLabelText(/Objeto a contratar/), 'Adquisición de equipos');
    // El valor estimado se pide al crear desde EFDS-1147: de él depende la
    // modalidad aplicable, así que el proceso no puede nacer sin él.
    await userEvent.type(screen.getByLabelText(/Valor estimado/), '1000000');
    await userEvent.selectOptions(screen.getByLabelText(/Modalidad/), 'MINIMA_CUANTIA');
    await userEvent.click(screen.getByRole('button', { name: /Crear y abrir/ }));

    await waitFor(() =>
      expect(servicio.crearProceso).toHaveBeenCalledWith(
        'Adquisición de equipos',
        'MINIMA_CUANTIA',
        1000000,
      ),
    );
  });
});
