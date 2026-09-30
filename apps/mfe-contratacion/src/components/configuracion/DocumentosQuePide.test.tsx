import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DocumentosQuePide } from './DocumentosQuePide';
import { contratacionService } from '../../services/contratacionService';
import { DocumentoRequeridoConfig } from '../../types';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const fila = (cambios: Partial<DocumentoRequeridoConfig> = {}): DocumentoRequeridoConfig => ({
  id: 'r-1',
  numeral: '3.1',
  codigo: 'MEMORANDO_SOLICITUD',
  nombre: 'Memorando de solicitud',
  descripcion: 'Firmado por el jefe del área.',
  obligatorio: true,
  modalidades: [],
  tipologias: [],
  orden: 10,
  activo: true,
  confirmado: true,
  notaFuente: null,
  plantillaCodigo: null,
  plantilla: null,
  ...cambios,
});

const modalidades = [
  { codigo: 'MINIMA_CUANTIA', nombre: 'Mínima Cuantía' },
  { codigo: 'CONTRATACION_DIRECTA', nombre: 'Contratación Directa' },
] as never;

/**
 * La lista de chequeo de una actividad, del lado de quien la configura
 * (EFDS-2066). Lo que se decide aquí es lo que el gestor verá en la actividad.
 */
describe('DocumentosQuePide', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(contratacionService, 'plantillas').mockResolvedValue([
      {
        id: 'p-1',
        codigo: 'BS-FO-047',
        nombre: 'Estudio previo',
        numeral: '3.1',
        version: '2',
        modalidades: [],
        archivoUrl: '/files/f.docx',
        activo: true,
      },
    ]);
    vi.spyOn(contratacionService, 'catalogoActividades').mockResolvedValue([
      { etapa: 5, actividades: [{ numeral: '5.4', nombre: 'Aviso', etapa: 5 }] },
    ] as never);
    vi.spyOn(contratacionService, 'campos').mockResolvedValue([
      {
        id: 'c-1',
        numeral: '3.1',
        codigo: 'tipologia_contractual',
        etiqueta: 'Tipología',
        tipo: 'seleccion',
        obligatorio: true,
        orden: 1,
        activo: true,
        soloLectura: false,
        opciones: ['Suministro', 'Obra pública'],
      },
    ]);
  });

  it('muestra cada documento con su obligatoriedad, su plantilla y su alcance', async () => {
    vi.spyOn(contratacionService, 'documentosRequeridos').mockResolvedValue([
      fila({
        plantillaCodigo: 'BS-FO-047',
        plantilla: { id: 'p-1', codigo: 'BS-FO-047', nombre: 'Estudio previo', version: '2', tieneArchivo: true },
        modalidades: ['CONTRATACION_DIRECTA'],
      }),
      fila({ id: 'r-2', nombre: 'Anexo técnico', obligatorio: false, descripcion: null }),
    ]);
    render(<DocumentosQuePide numeral="3.1" modalidades={modalidades} />);

    expect(await screen.findByText(/Memorando de solicitud/)).toBeInTheDocument();
    expect(screen.getByText('Obligatorio')).toBeInTheDocument();
    expect(screen.getByText('Opcional')).toBeInTheDocument();
    expect(screen.getByText(/Plantilla BS-FO-047 v2 · Contratación Directa/)).toBeInTheDocument();
  });

  it('agrega un documento con plantilla, obligatoriedad y alcance', async () => {
    vi.spyOn(contratacionService, 'documentosRequeridos').mockResolvedValue([]);
    const crear = vi
      .spyOn(contratacionService, 'crearDocumentoRequerido')
      .mockResolvedValue(fila());
    render(<DocumentosQuePide numeral="3.1" modalidades={modalidades} />);

    await userEvent.click(await screen.findByRole('button', { name: /Agregar documento/ }));
    await userEvent.type(screen.getByPlaceholderText(/Memorando de solicitud firmado/), 'Memorando');
    await userEvent.selectOptions(screen.getByLabelText('Plantilla'), 'BS-FO-047');
    await userEvent.click(screen.getByLabelText(/Obligatorio: la actividad no avanza/));
    await userEvent.click(screen.getByLabelText('Mínima Cuantía'));
    await userEvent.click(screen.getByLabelText('Suministro'));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() =>
      expect(crear).toHaveBeenCalledWith({
        numeral: '3.1',
        nombre: 'Memorando',
        descripcion: null,
        plantillaCodigo: 'BS-FO-047',
        obligatorio: false,
        modalidades: ['MINIMA_CUANTIA'],
        tipologias: ['Suministro'],
      }),
    );
  });

  it('dejar de pedir un documento lo desactiva, no lo borra', async () => {
    vi.spyOn(contratacionService, 'documentosRequeridos').mockResolvedValue([fila()]);
    const actualizar = vi
      .spyOn(contratacionService, 'actualizarDocumentoRequerido')
      .mockResolvedValue(fila({ activo: false }));
    render(<DocumentosQuePide numeral="3.1" modalidades={modalidades} />);

    await userEvent.click(await screen.findByTitle('Quitar de la lista'));

    await waitFor(() => expect(actualizar).toHaveBeenCalledWith('r-1', { activo: false }));
  });

  it('copia el documento a otra actividad', async () => {
    vi.spyOn(contratacionService, 'documentosRequeridos').mockResolvedValue([fila()]);
    const copiar = vi
      .spyOn(contratacionService, 'copiarDocumentoRequerido')
      .mockResolvedValue(fila({ numeral: '5.4' }));
    render(<DocumentosQuePide numeral="3.1" modalidades={modalidades} />);

    await userEvent.click(await screen.findByTitle('Pedirlo también en otra actividad'));
    await userEvent.selectOptions(screen.getByLabelText('Actividad a la que se copia'), '5.4');
    await userEvent.click(screen.getByRole('button', { name: 'Copiar' }));

    await waitFor(() => expect(copiar).toHaveBeenCalledWith('r-1', '5.4'));
  });
});
