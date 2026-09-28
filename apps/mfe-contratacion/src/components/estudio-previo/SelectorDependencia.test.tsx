import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SelectorDependencia } from './SelectorDependencia';
import { contratacionService } from '../../services/contratacionService';

const dependencias = [
  { id: '1', nombre: 'Vicerrectoría Académica' },
  { id: '2', nombre: 'Secretaría General' },
];

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * El área solicitante del estudio previo se elige del catálogo, no se escribe
 * (EFDS-2065). Con texto libre la misma dependencia quedaba registrada de
 * varias formas y el expediente dejaba de servir para filtrar por área.
 */
describe('SelectorDependencia', () => {
  it('carga el catálogo y lo ofrece como opciones', async () => {
    vi.spyOn(contratacionService, 'dependencias').mockResolvedValue(dependencias);

    render(<SelectorDependencia id="area" value="" onChange={vi.fn()} />);

    await waitFor(() =>
      expect(screen.getByRole('option', { name: 'Vicerrectoría Académica' })).toBeInTheDocument(),
    );
    expect(screen.getByRole('option', { name: 'Secretaría General' })).toBeInTheDocument();
  });

  it('avisa al elegir una dependencia', async () => {
    vi.spyOn(contratacionService, 'dependencias').mockResolvedValue(dependencias);
    const onChange = vi.fn();

    render(<SelectorDependencia id="area" value="" onChange={onChange} />);
    await waitFor(() => screen.getByRole('option', { name: 'Secretaría General' }));

    await userEvent.selectOptions(screen.getByRole('combobox'), 'Secretaría General');

    expect(onChange).toHaveBeenCalledWith('Secretaría General');
  });

  it('ofrece igual el valor que ya trae el proceso aunque no esté en el catálogo', async () => {
    // Una dependencia inactivada después de radicar, o un dato de antes de
    // este selector: no se puede borrar silenciosamente lo que el expediente
    // ya dice.
    vi.spyOn(contratacionService, 'dependencias').mockResolvedValue(dependencias);

    render(<SelectorDependencia id="area" value="Dependencia ya inactiva" onChange={vi.fn()} />);

    await waitFor(() =>
      expect(
        screen.getByRole('option', { name: 'Dependencia ya inactiva' }),
      ).toBeInTheDocument(),
    );
    expect(screen.getByRole('combobox')).toHaveValue('Dependencia ya inactiva');
  });

  it('dice cuando el catálogo no carga, en vez de mostrar un desplegable vacío', async () => {
    vi.spyOn(contratacionService, 'dependencias').mockRejectedValue(new Error('sin conexión'));

    render(<SelectorDependencia id="area" value="" onChange={vi.fn()} />);

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('sin conexión'));
  });
});
