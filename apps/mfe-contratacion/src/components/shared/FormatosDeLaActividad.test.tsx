import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FormatosDeLaActividad } from './FormatosDeLaActividad';
import { contratacionService } from '../../services/contratacionService';

const formato = (cambios: Record<string, unknown> = {}) => ({
  id: crypto.randomUUID(),
  codigo: 'BS-FO-047',
  nombre: 'Estudios previos para licitación pública',
  numeral: '5.9',
  version: '2',
  modalidades: [],
  archivoUrl: '/archivos/bs-fo-047.docx',
  activo: true,
  ...cambios,
});

const montar = (lista: unknown[]) => {
  vi.spyOn(contratacionService, 'plantillasDeActividad').mockResolvedValue(lista as never);
  return render(<FormatosDeLaActividad numeral="5.9" modalidad="LICITACION_PUBLICA" />);
};

describe('FormatosDeLaActividad · qué ve el gestor', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('ofrece descargar el formato cuando está subido', async () => {
    montar([formato()]);

    const enlace = await screen.findByRole('link', { name: /Descargar/ });
    expect(enlace).toHaveAttribute('href', expect.stringContaining('bs-fo-047'));
  });

  it('avisa del formato asignado que Contratación aún no ha subido', async () => {
    montar([formato({ archivoUrl: null })]);

    // Callarlo dejaría al gestor creyendo que la actividad no pide documento:
    // la asignación ya dice que aquí se entrega ese formato.
    expect(await screen.findByText(/aún no ha subido/)).toBeInTheDocument();
    expect(screen.getByText(/BS-FO-047/)).toBeInTheDocument();
  });

  it('no ofrece un enlace que no descargaría nada', async () => {
    montar([formato({ archivoUrl: null })]);

    await screen.findByText(/aún no ha subido/);
    expect(screen.queryByRole('link', { name: /Descargar/ })).not.toBeInTheDocument();
  });

  it('separa los descargables de los que faltan por subir', async () => {
    montar([
      formato({ codigo: 'BS-FO-047' }),
      formato({ codigo: 'BS-FO-061', archivoUrl: null }),
    ]);

    expect(await screen.findByRole('link', { name: /Descargar/ })).toBeInTheDocument();
    expect(screen.getByText(/BS-FO-061/)).toBeInTheDocument();
    // Solo el que tiene archivo se ofrece: uno de los dos, no los dos.
    expect(screen.getAllByRole('link', { name: /Descargar/ })).toHaveLength(1);
  });

  it('calla del todo cuando quien lo monta se lo pide', async () => {
    vi.spyOn(contratacionService, 'plantillasDeActividad').mockResolvedValue([] as never);

    const { container } = render(
      <FormatosDeLaActividad numeral="5.9" modalidad="LICITACION_PUBLICA" sinFormatos="" />,
    );

    // Se monta en las treinta y ocho actividades: una caja explicando la
    // ausencia en todas sería ruido en casi toda la pantalla.
    await vi.waitFor(() => expect(container).toBeEmptyDOMElement());
  });
});
