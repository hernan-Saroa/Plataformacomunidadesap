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
    crearTipoDocumentoSoporte: vi.fn(),
    actualizarTipoDocumentoSoporte: vi.fn(),
    eliminarTipoDocumentoSoporte: vi.fn(),
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

  it('permite aplicar opciones a través del Editor JSON', async () => {
    vi.mocked(viaticosService.obtenerCamposFormulario).mockResolvedValueOnce(camposMock);
    vi.mocked(viaticosService.actualizarCampoFormulario).mockResolvedValueOnce({
      ...camposMock[0],
      tipoCampo: 'SELECT',
      opciones: [
        { value: 'JSON_1', label: 'Opción JSON 1' },
        { value: 'JSON_2', label: 'Opción JSON 2' },
      ],
    });

    render(<ParametrizacionManager />);

    const botonesEditar = await screen.findAllByTitle('Editar campo');
    fireEvent.click(botonesEditar[0]);

    // Cambiar tipo a SELECT
    const selectTipo = screen.getByDisplayValue('TEXT');
    fireEvent.change(selectTipo, { target: { value: 'SELECT' } });

    // Cambiar a pestaña Editor JSON
    const btnTabJson = screen.getByRole('button', { name: 'Editor JSON' });
    fireEvent.click(btnTabJson);

    // Escribir JSON
    const textarea = screen.getByPlaceholderText(/Cuenta de Ahorros/);
    fireEvent.change(textarea, {
      target: {
        value: JSON.stringify([
          { value: 'JSON_1', label: 'Opción JSON 1' },
          { value: 'JSON_2', label: 'Opción JSON 2' },
        ]),
      },
    });

    // Clic en Aplicar JSON a Opciones
    const btnAplicar = screen.getByRole('button', { name: /Aplicar JSON a Opciones/i });
    fireEvent.click(btnAplicar);

    // Guardar campo
    const btnGuardar = screen.getByRole('button', { name: /^Guardar$/i });
    fireEvent.click(btnGuardar);

    await waitFor(() => {
      expect(viaticosService.actualizarCampoFormulario).toHaveBeenCalledWith(
        'areaSolicitante',
        expect.objectContaining({
          tipoCampo: 'SELECT',
          opciones: [
            { value: 'JSON_1', label: 'Opción JSON 1' },
            { value: 'JSON_2', label: 'Opción JSON 2' },
          ],
        }),
      );
    });
  });

  it('permite importar opciones desde texto plano / CSV en la pestaña Importar', async () => {
    vi.mocked(viaticosService.obtenerCamposFormulario).mockResolvedValueOnce(camposMock);
    vi.mocked(viaticosService.actualizarCampoFormulario).mockResolvedValueOnce({
      ...camposMock[0],
      tipoCampo: 'SELECT',
      opciones: [
        { value: 'AHO', label: 'Ahorros' },
        { value: 'CTE', label: 'Corriente' },
      ],
    });

    render(<ParametrizacionManager />);

    const botonesEditar = await screen.findAllByTitle('Editar campo');
    fireEvent.click(botonesEditar[0]);

    // Cambiar a SELECT
    const selectTipo = screen.getByDisplayValue('TEXT');
    fireEvent.change(selectTipo, { target: { value: 'SELECT' } });

    // Ir a pestaña Importar / Pegar
    const btnTabImportar = screen.getByRole('button', { name: 'Importar / Pegar' });
    fireEvent.click(btnTabImportar);

    // Pegar contenido tipo CSV
    const textarea = screen.getByPlaceholderText(/Ejemplo CSV \/ Texto/);
    fireEvent.change(textarea, {
      target: { value: 'AHO, Ahorros\nCTE, Corriente' },
    });

    // Clic en Importar
    const btnImportar = screen.getByRole('button', { name: /Importar \(2\)/i });
    fireEvent.click(btnImportar);

    // Guardar campo
    const btnGuardar = screen.getByRole('button', { name: /^Guardar$/i });
    fireEvent.click(btnGuardar);

    await waitFor(() => {
      expect(viaticosService.actualizarCampoFormulario).toHaveBeenCalledWith(
        'areaSolicitante',
        expect.objectContaining({
          tipoCampo: 'SELECT',
          opciones: [
            { value: 'AHO', label: 'Ahorros' },
            { value: 'CTE', label: 'Corriente' },
          ],
        }),
      );
    });
  });

  describe('ParametrizacionManager — Pruebas de Separación y Gestión de Documentos Soporte', () => {
    const docsMock = [
      {
        id: 'doc-1',
        codigo: 'CERT_BANCARIA',
        nombre: 'Certificación Bancaria',
        descripcion: 'Certificación no mayor a 90 días',
        instruccionesValidacion: 'Vigencia: Máximo 90 días y firmas legibles',
        activo: true,
      },
      {
        id: 'doc-2',
        codigo: 'RUT',
        nombre: 'Registro Único Tributario (RUT)',
        descripcion: 'RUT expedido por la DIAN',
        instruccionesValidacion: null,
        activo: false,
      },
    ];

    it('permite alternar hacia la vista de Documentos Soporte usando la separación visual', async () => {
      vi.mocked(viaticosService.obtenerCamposFormulario).mockResolvedValueOnce(camposMock);
      vi.mocked(viaticosService.obtenerTiposDocumentoSoporte).mockResolvedValueOnce(docsMock);

      render(<ParametrizacionManager />);

      // Cambiar a la sub-pestaña / vista de Documentos Soporte
      const botonesDoc = await screen.findAllByRole('button', { name: /Documentos Soporte/i });
      fireEvent.click(botonesDoc[0]);

      // Verificar que se listan los documentos
      expect(await screen.findByText('CERT_BANCARIA')).toBeTruthy();
      expect(screen.getByText('Certificación Bancaria')).toBeTruthy();
      expect(screen.getByText('Registro Único Tributario (RUT)')).toBeTruthy();
      expect(screen.getByText(/Vigencia: Máximo 90 días/)).toBeTruthy();
      expect(screen.getByText('Sin instrucciones')).toBeTruthy();
    });

    it('permite alternar el estado activo/inactivo de un documento soporte', async () => {
      vi.mocked(viaticosService.obtenerCamposFormulario).mockResolvedValue(camposMock);
      vi.mocked(viaticosService.obtenerTiposDocumentoSoporte).mockResolvedValue(docsMock);
      vi.mocked(viaticosService.actualizarTipoDocumentoSoporte).mockResolvedValueOnce({
        ...docsMock[0],
        activo: false,
      });

      render(<ParametrizacionManager />);

      const botonesDoc = await screen.findAllByRole('button', { name: /Documentos Soporte/i });
      fireEvent.click(botonesDoc[0]);

      const toggleDoc = await screen.findAllByTitle(/Clic para cambiar estado activo \/ inactivo/i);
      fireEvent.click(toggleDoc[0]);

      await waitFor(() => {
        expect(viaticosService.actualizarTipoDocumentoSoporte).toHaveBeenCalledWith(
          'CERT_BANCARIA',
          { activo: false },
        );
      });
    });

    it('permite abrir el modal y registrar un nuevo documento soporte con instrucciones y sugerencias', async () => {
      vi.mocked(viaticosService.obtenerCamposFormulario).mockResolvedValue(camposMock);
      vi.mocked(viaticosService.obtenerTiposDocumentoSoporte).mockResolvedValue(docsMock);
      vi.mocked(viaticosService.crearTipoDocumentoSoporte).mockResolvedValueOnce({
        id: 'doc-3',
        codigo: 'POLIZA_SECOP',
        nombre: 'Póliza de Cumplimiento',
        descripcion: 'Garantía del contrato',
        instruccionesValidacion: '• Vigencia: Máximo 90 días calendario a partir de su fecha de expedición.',
        activo: true,
      });

      render(<ParametrizacionManager />);

      const botonesDoc = await screen.findAllByRole('button', { name: /Documentos Soporte/i });
      fireEvent.click(botonesDoc[0]);

      // Clic en Nuevo Documento Soporte
      const btnNuevo = await screen.findByRole('button', { name: /Nuevo Documento Soporte/i });
      fireEvent.click(btnNuevo);

      // Llenar campos
      const inputCodigo = screen.getByPlaceholderText(/ej: POLIZA_CUMPLIMIENTO/i);
      const inputNombre = screen.getByPlaceholderText(/ej: Certificación Bancaria Vigente/i);
      const inputDesc = screen.getByPlaceholderText(/ej: Certificación expedida por la entidad bancaria/i);

      fireEvent.change(inputCodigo, { target: { value: 'POLIZA_SECOP' } });
      fireEvent.change(inputNombre, { target: { value: 'Póliza de Cumplimiento' } });
      fireEvent.change(inputDesc, { target: { value: 'Garantía del contrato' } });

      // Clic en sugerencia rápida de validación
      const btnSugerenciaVigencia = screen.getByRole('button', { name: /\+ 📅 Vigencia ≤ 90 días/i });
      fireEvent.click(btnSugerenciaVigencia);

      // Guardar
      const btnGuardarDoc = screen.getByRole('button', { name: /Guardar Documento/i });
      fireEvent.click(btnGuardarDoc);

      await waitFor(() => {
        expect(viaticosService.crearTipoDocumentoSoporte).toHaveBeenCalledWith(
          expect.objectContaining({
            codigo: 'POLIZA_SECOP',
            nombre: 'Póliza de Cumplimiento',
            descripcion: 'Garantía del contrato',
            instruccionesValidacion: expect.stringContaining('Vigencia: Máximo 90 días'),
            activo: true,
          }),
        );
      });
    });

    it('renderiza la pestaña unificada Formulario y Soportes y permite acceder a Soportes de Legalización', async () => {
      vi.mocked(viaticosService.obtenerCamposFormulario).mockResolvedValue(camposMock);
      vi.mocked(viaticosService.obtenerTiposDocumentoSoporte).mockResolvedValue(docsMock);

      render(<ParametrizacionManager />);

      // Pestaña unificada
      expect(screen.getByRole('button', { name: /Formulario y Soportes/i })).toBeInTheDocument();

      // Pestaña Soportes de Legalización
      const btnLegalizacion = screen.getByRole('button', { name: /Soportes de Legalización/i });
      expect(btnLegalizacion).toBeInTheDocument();

      fireEvent.click(btnLegalizacion);

      // Ahora muestra la vista de soportes de legalización
      expect(await screen.findByRole('heading', { name: /Soportes de legalización/i })).toBeInTheDocument();
    });
  });
});


