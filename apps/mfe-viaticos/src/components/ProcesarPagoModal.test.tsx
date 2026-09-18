import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProcesarPagoModal from './ProcesarPagoModal';

const mockSolicitudObligada = {
  id: 'sol-obli-100',
  consecutivoUnico: 'COM-2026-0089',
  estado: 'OBLIGADA',
  estadoSolicitud: 'OBLIGADA',
  objetoComision: 'Auditoría en sede regional',
  destinoCiudad: 'Cali',
  fechaInicio: '2026-11-20',
  fechaFin: '2026-11-24',
  diasComision: 4,
  montoViaticos: 850000,
  montoGastosViaje: 0,
  valorComprometido: 850000,
  codigoRp: '2026-10-25_RP_48920',
  numeroRp: '48920',
  numeroObligacion: 'OBL-2026-00481',
  fechaObligacion: '2026-10-25',
  valorObligacion: 850000,
  modalidadPago: 'AVANCE',
  diasHabilesPrevios: 7,
  comisionado: {
    id: 'com-100',
    numeroDocumento: '1098765432',
    primerNombre: 'Carlos',
    primerApellido: 'Gómez',
    tipoComisionado: 'FUNCIONARIO',
  },
} as any;

const mockSolicitudPosterior = {
  ...mockSolicitudObligada,
  id: 'sol-obli-101',
  consecutivoUnico: 'COM-2026-0090',
  numeroObligacion: 'OBL-2026-00482',
  modalidadPago: 'RECONOCIMIENTO_POSTERIOR',
  valorObligacion: 450000,
};

vi.mock('../services/api/viaticosService', () => {
  const service = {
    procesarPago: vi.fn(),
    subirSoportePago: vi.fn(),
    obtenerUrlArchivo: vi.fn((url) => (url ? `http://localhost:3010${url}` : '')),
  };
  return {
    default: service,
    viaticosService: service,
  };
});

import { viaticosService } from '../services/api/viaticosService';

describe('ProcesarPagoModal — [RF-PAG-003] Etapa 8: Procesar Desembolso y Pago de Comisión', () => {
  const mockOnCerrar = vi.fn();
  const mockOnExito = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no renderiza nada cuando abierta es false', () => {
    const { container } = render(
      <ProcesarPagoModal
        abierta={false}
        solicitud={mockSolicitudObligada}
        onCerrar={mockOnCerrar}
        onExito={mockOnExito}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderiza la información de la comisión: Consecutivo, RP, Obligación y Modalidad AVANCE', () => {
    render(
      <ProcesarPagoModal
        abierta={true}
        solicitud={mockSolicitudObligada}
        onCerrar={mockOnCerrar}
        onExito={mockOnExito}
      />,
    );

    expect(screen.getByText(/Procesar Desembolso y Pago de Comisión/i)).toBeDefined();
    expect(screen.getByText('COM-2026-0089')).toBeDefined();
    expect(screen.getByText('2026-10-25_RP_48920')).toBeDefined();
    expect(screen.getByText('OBL-2026-00481')).toBeDefined();
    expect(screen.getByText(/AVANCE \(Desembolso Previo\)/i)).toBeDefined();
    expect(screen.getByText(/Estado resultante: PAGADA/i)).toBeDefined();
  });

  it('valida que la fecha de pago sea obligatoria antes de enviar', async () => {
    render(
      <ProcesarPagoModal
        abierta={true}
        solicitud={mockSolicitudObligada}
        onCerrar={mockOnCerrar}
        onExito={mockOnExito}
      />,
    );

    const inputFecha = screen.getByLabelText(/Fecha de Desembolso \/ Pago/i);
    fireEvent.change(inputFecha, { target: { value: '' } });

    const botonEnviar = screen.getByRole('button', { name: /Confirmar Desembolso y Pago/i });
    fireEvent.click(botonEnviar);

    expect(
      await screen.findByText(/Por favor seleccione la fecha en la que se efectuó el pago o desembolso/i),
    ).toBeDefined();
    expect(viaticosService.procesarPago).not.toHaveBeenCalled();
  });

  it('valida que el valor pagado sea mayor a cero', async () => {
    render(
      <ProcesarPagoModal
        abierta={true}
        solicitud={mockSolicitudObligada}
        onCerrar={mockOnCerrar}
        onExito={mockOnExito}
      />,
    );

    const inputValor = screen.getByLabelText(/Valor Pagado \(COP\)/i);
    fireEvent.change(inputValor, { target: { value: '0' } });

    const botonEnviar = screen.getByRole('button', { name: /Confirmar Desembolso y Pago/i });
    fireEvent.click(botonEnviar);

    expect(
      await screen.findByText(/El valor pagado debe ser un monto positivo mayor a cero/i),
    ).toBeDefined();
    expect(viaticosService.procesarPago).not.toHaveBeenCalled();
  });

  it('envía el formulario correctamente y llama a onExito con estado PAGADA', async () => {
    (viaticosService.procesarPago as any).mockResolvedValue({
      data: {
        ...mockSolicitudObligada,
        estadoSolicitud: 'PAGADA',
        fechaPago: '2026-10-26',
        valorPagado: 850000,
        numeroOrdenPago: 'OP-SIIF-2026-98124',
      },
    });

    render(
      <ProcesarPagoModal
        abierta={true}
        solicitud={mockSolicitudObligada}
        onCerrar={mockOnCerrar}
        onExito={mockOnExito}
      />,
    );

    const inputOrden = screen.getByLabelText(/Nº Orden de Pago \/ Egreso SIIF/i);
    fireEvent.change(inputOrden, { target: { value: 'OP-SIIF-2026-98124' } });

    const botonEnviar = screen.getByRole('button', { name: /Confirmar Desembolso y Pago/i });
    fireEvent.click(botonEnviar);

    await waitFor(() => {
      expect(viaticosService.procesarPago).toHaveBeenCalledWith(
        'sol-obli-100',
        expect.objectContaining({
          valorPagado: 850000,
          numeroOrdenPago: 'OP-SIIF-2026-98124',
          modalidadPago: 'AVANCE',
        }),
      );
      expect(mockOnExito).toHaveBeenCalled();
      expect(mockOnCerrar).toHaveBeenCalled();
    });
  });

  it('respeta la modalidad RECONOCIMIENTO_POSTERIOR en solicitud posterior', () => {
    render(
      <ProcesarPagoModal
        abierta={true}
        solicitud={mockSolicitudPosterior}
        onCerrar={mockOnCerrar}
        onExito={mockOnExito}
      />,
    );

    expect(screen.getByText('COM-2026-0090')).toBeDefined();
    expect(screen.getByText('OBL-2026-00482')).toBeDefined();
    expect(screen.getByText(/RECONOCIMIENTO POSTERIOR/i)).toBeDefined();
  });

  it('muestra mensaje de error si el servicio falla', async () => {
    (viaticosService.procesarPago as any).mockRejectedValue({
      response: {
        data: {
          message: 'Error en conexión con el servicio de Tesorería SIIF',
        },
      },
    });

    render(
      <ProcesarPagoModal
        abierta={true}
        solicitud={mockSolicitudObligada}
        onCerrar={mockOnCerrar}
        onExito={mockOnExito}
      />,
    );

    const botonEnviar = screen.getByRole('button', { name: /Confirmar Desembolso y Pago/i });
    fireEvent.click(botonEnviar);

    expect(
      await screen.findByText(/Error en conexión con el servicio de Tesorería SIIF/i),
    ).toBeDefined();
    expect(mockOnExito).not.toHaveBeenCalled();
    expect(mockOnCerrar).not.toHaveBeenCalled();
  });

  it('permite adjuntar un archivo soporte físico y lo sube al backend al confirmar el pago', async () => {
    (viaticosService.subirSoportePago as any).mockResolvedValue({
      urlRepositorio: '/uploads/sol-obli-100/pago_123_comprobante.pdf',
      nombreArchivo: 'comprobante_bancario_8920.pdf',
    });

    (viaticosService.procesarPago as any).mockResolvedValue({
      data: {
        ...mockSolicitudObligada,
        estadoSolicitud: 'PAGADA',
        soportePagoPath: '/uploads/sol-obli-100/pago_123_comprobante.pdf',
      },
    });

    render(
      <ProcesarPagoModal
        abierta={true}
        solicitud={mockSolicitudObligada}
        onCerrar={mockOnCerrar}
        onExito={mockOnExito}
      />,
    );

    const inputArchivo = screen.getByLabelText(/Cargar soporte de desembolso/i);
    const archivo = new File(['dummy content'], 'comprobante_bancario_8920.pdf', {
      type: 'application/pdf',
    });

    fireEvent.change(inputArchivo, { target: { files: [archivo] } });

    // El nombre del archivo y estado deben mostrarse en pantalla
    expect(await screen.findByText('comprobante_bancario_8920.pdf')).toBeDefined();
    expect(screen.getByText(/Listo para cargar al proyecto/i)).toBeDefined();

    const botonEnviar = screen.getByRole('button', { name: /Confirmar Desembolso y Pago/i });
    fireEvent.click(botonEnviar);

    await waitFor(() => {
      expect(viaticosService.subirSoportePago).toHaveBeenCalledWith('sol-obli-100', archivo);
      expect(viaticosService.procesarPago).toHaveBeenCalledWith(
        'sol-obli-100',
        expect.objectContaining({
          soportePagoPath: '/uploads/sol-obli-100/pago_123_comprobante.pdf',
        }),
      );
      expect(mockOnExito).toHaveBeenCalled();
    });
  });

  it('muestra error de formato si se adjunta un archivo no permitido', async () => {
    render(
      <ProcesarPagoModal
        abierta={true}
        solicitud={mockSolicitudObligada}
        onCerrar={mockOnCerrar}
        onExito={mockOnExito}
      />,
    );

    const inputArchivo = screen.getByLabelText(/Cargar soporte de desembolso/i);
    const archivoInvalido = new File(['binario'], 'ejecutable.exe', {
      type: 'application/x-msdownload',
    });

    fireEvent.change(inputArchivo, { target: { files: [archivoInvalido] } });

    expect(
      await screen.findByText(/Solo se admiten documentos PDF o imágenes/i),
    ).toBeDefined();
  });
});

