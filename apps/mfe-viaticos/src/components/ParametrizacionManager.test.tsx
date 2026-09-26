import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ParametrizacionManager from './ParametrizacionManager';
import viaticosService from '../services/api/viaticosService';
import { CampoFormulario } from '../types/parametrizacion';

vi.mock('../services/api/viaticosService', () => ({
  __esModule: true,
  default: {
    obtenerCamposFormulario: vi.fn(),
    obtenerTodasConfiguraciones: vi.fn().mockResolvedValue([]),
    obtenerTiposDocumentoSoporte: vi.fn().mockResolvedValue([]),
    crearCampoFormulario: vi.fn(),
    actualizarCampoFormulario: vi.fn(),
    eliminarCampoFormulario: vi.fn(),
  },
}));

describe('ParametrizacionManager — Pruebas de Configuración de Campos', () => {
  const camposMock: CampoFormulario[] = [
    {
      id: '1',
      clave: 'areaSolicitante',
      etiqueta: 'Área Solicitante',
      tipoCampo: 'TEXT',
      placeholder: 'Ingrese el área',
      grupo: 'comision',
      orden: 1,
      activo: true,
      opciones: null,
      creadoEn: '2026-09-01',
      actualizadoEn: '2026-09-01',
    },
    {
      id: '2',
      clave: 'rubroPresupuestal',
      etiqueta: 'Rubro Presupuestal',
      tipoCampo: 'TEXT',
      placeholder: 'Ej: Rubro 01',
      grupo: 'valores',
      orden: 2,
      activo: false,
      opciones: null,
      creadoEn: '2026-09-01',
      actualizadoEn: '2026-09-01',
    },
  ];

  it('renderiza la lista de campos con su tipo, orden y estado', async () => {
    vi.mocked(viaticosService.obtenerCamposFormulario).mockResolvedValueOnce(camposMock);

    render(<ParametrizacionManager />);

    expect(await screen.findByText('Área Solicitante')).toBeTruthy();
    expect(screen.getByText('rubroPresupuestal')).toBeTruthy();
    expect(screen.getByText('Activo')).toBeTruthy();
    expect(screen.getByText('Inactivo')).toBeTruthy();
  });

  it('permite desactivar o activar un campo con el toggle directo', async () => {
    vi.mocked(viaticosService.obtenerCamposFormulario).mockResolvedValueOnce(camposMock);
    vi.mocked(viaticosService.actualizarCampoFormulario).mockResolvedValueOnce({
      ...camposMock[0],
      activo: false,
    });

    render(<ParametrizacionManager />);

    const botonesToggle = await screen.findAllByTitle(/Clic para cambiar estado activo \/ inactivo/i);
    fireEvent.click(botonesToggle[0]);

    await waitFor(() => {
      expect(viaticosService.actualizarCampoFormulario).toHaveBeenCalledWith(
        'areaSolicitante',
        { activo: false },
      );
    });
  });

  it('permite reordenar campos usando los botones de subir y bajar orden', async () => {
    vi.mocked(viaticosService.obtenerCamposFormulario).mockResolvedValueOnce(camposMock);
    vi.mocked(viaticosService.actualizarCampoFormulario).mockResolvedValueOnce({
      ...camposMock[0],
      orden: 2,
    });

    render(<ParametrizacionManager />);

    const botonBajar = await screen.findAllByTitle('Bajar orden');
    fireEvent.click(botonBajar[0]);

    await waitFor(() => {
      expect(viaticosService.actualizarCampoFormulario).toHaveBeenCalledWith(
        'areaSolicitante',
        { orden: 2 },
      );
    });
  });

  it('permite abrir el modal y cambiar el tipo de campo a SELECT con opciones', async () => {
    vi.mocked(viaticosService.obtenerCamposFormulario).mockResolvedValueOnce(camposMock);
    vi.mocked(viaticosService.actualizarCampoFormulario).mockResolvedValueOnce({
      ...camposMock[0],
      tipoCampo: 'SELECT',
      opciones: [{ value: 'VAL1', label: 'Opción 1' }],
    });

    render(<ParametrizacionManager />);

    const botonesEditar = await screen.findAllByTitle('Editar campo');
    fireEvent.click(botonesEditar[0]);

    // Modal abierto: cambiar tipo a SELECT
    const selectTipo = screen.getByDisplayValue('TEXT');
    fireEvent.change(selectTipo, { target: { value: 'SELECT' } });

    // Añadir opción
    const btnAddOpcion = screen.getByText('+ Añadir opción');
    fireEvent.click(btnAddOpcion);

    const inputValor = screen.getByPlaceholderText('Valor');
    const inputEtiqueta = screen.getByPlaceholderText('Etiqueta');

    fireEvent.change(inputValor, { target: { value: 'VAL1' } });
    fireEvent.change(inputEtiqueta, { target: { value: 'Opción 1' } });

    // Guardar
    const btnGuardar = screen.getByRole('button', { name: /^Guardar$/i });
    fireEvent.click(btnGuardar);

    await waitFor(() => {
      expect(viaticosService.actualizarCampoFormulario).toHaveBeenCalledWith(
        'areaSolicitante',
        expect.objectContaining({
          tipoCampo: 'SELECT',
          opciones: [{ value: 'VAL1', label: 'Opción 1' }],
        }),
      );
    });
  });
});
