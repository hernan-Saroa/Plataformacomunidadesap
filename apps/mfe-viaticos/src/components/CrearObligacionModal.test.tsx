import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CrearObligacionModal from './CrearObligacionModal';

const mockSolicitudComprometida = {
  id: 'sol-comp-100',
  consecutivoUnico: 'COM-2026-0089',
  estado: 'COMPROMETIDA',
  estadoSolicitud: 'COMPROMETIDA',
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
  rubroRp: 'VIATICOS_DOCENTES',
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

vi.mock('../services/api/viaticosService', () => {
  const service = {
    crearObligacion: vi.fn(),
    subirSoporteObligacion: vi.fn(),
    obtenerUrlArchivo: vi.fn((url) => (url ? `http://localhost:3010${url}` : '')),
  };
  return {
    default: service,
    viaticosService: service,
  };
});

import { viaticosService } from '../services/api/viaticosService';

describe('CrearObligacionModal — [RF-PAG-001] Etapa 8: Crear Obligación en SIIF Nación', () => {
  const mockOnCerrar = vi.fn();
  const mockOnExito = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no renderiza nada cuando abierta es false', () => {
    const { container } = render(
      <CrearObligacionModal
        abierta={false}
        solicitud={mockSolicitudComprometida}
        onCerrar={mockOnCerrar}
        onExito={mockOnExito}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderiza la información comparativa de SIIF: RP, modalidad de pago y valor comprometido', () => {
    render(
      <CrearObligacionModal
        abierta={true}
        solicitud={mockSolicitudComprometida}
        onCerrar={mockOnCerrar}
        onExito={mockOnExito}
      />,
    );

    expect(screen.getByText(/Crear Obligación en SIIF Nación/i)).toBeDefined();
    expect(screen.getByText('COM-2026-0089')).toBeDefined();
    expect(screen.getByText('2026-10-25_RP_48920')).toBeDefined();
    expect(screen.getByText(/AVANCE \(Anticipado\)/i)).toBeDefined();
    expect(screen.getByText(/7 días hábiles previos/i)).toBeDefined();
    expect(screen.getByText(/Gestión de Control Comparativo \(SIIF Nación\)/i)).toBeDefined();
  });

  it('valida que el número de obligación sea obligatorio antes de enviar', async () => {
    render(
      <CrearObligacionModal
        abierta={true}
        solicitud={mockSolicitudComprometida}
        onCerrar={mockOnCerrar}
        onExito={mockOnExito}
      />,
    );

    const inputObligacion = screen.getByLabelText(/Número de Obligación SIIF/i);
    fireEvent.change(inputObligacion, { target: { value: '   ' } });

    const botonEnviar = screen.getByRole('button', { name: /Crear Obligación en SIIF/i });
    fireEvent.click(botonEnviar);

    expect(
      await screen.findByText(/Por favor ingrese el número oficial de la obligación expedida en SIIF Nación/i),
    ).toBeDefined();
    expect(viaticosService.crearObligacion).not.toHaveBeenCalled();
  });

  it('envía los datos correctamente a la API y notifica éxito', async () => {
    (viaticosService.crearObligacion as any).mockResolvedValue({
      data: {
        ...mockSolicitudComprometida,
        estadoSolicitud: 'OBLIGADA',
        numeroObligacion: 'OBL-2026-00481',
      },
    });

    render(
      <CrearObligacionModal
        abierta={true}
        solicitud={mockSolicitudComprometida}
        onCerrar={mockOnCerrar}
        onExito={mockOnExito}
      />,
    );

    const inputObligacion = screen.getByLabelText(/Número de Obligación SIIF/i);
    fireEvent.change(inputObligacion, { target: { value: 'OBL-2026-00481' } });

    const botonEnviar = screen.getByRole('button', { name: /Crear Obligación en SIIF/i });
    fireEvent.click(botonEnviar);

    await waitFor(() => {
      expect(viaticosService.crearObligacion).toHaveBeenCalledWith(
        'sol-comp-100',
        expect.objectContaining({
          numeroObligacion: 'OBL-2026-00481',
          modalidadPago: 'AVANCE',
          valorObligacion: 850000,
        }),
      );
      expect(mockOnExito).toHaveBeenCalled();
      expect(mockOnCerrar).toHaveBeenCalled();
    });
  });

  it('permite modificar el valor de la obligación mediante campo monetario con separador de miles', async () => {
    (viaticosService.crearObligacion as any).mockResolvedValue({
      data: {
        ...mockSolicitudComprometida,
        estadoSolicitud: 'OBLIGADA',
        numeroObligacion: 'OBL-2026-00482',
        valorObligacion: 950000,
      },
    });

    render(
      <CrearObligacionModal
        abierta={true}
        solicitud={mockSolicitudComprometida}
        onCerrar={mockOnCerrar}
        onExito={mockOnExito}
      />,
    );

    const inputObligacion = screen.getByLabelText(/Número de Obligación SIIF/i);
    fireEvent.change(inputObligacion, { target: { value: 'OBL-2026-00482' } });

    const inputValor = screen.getByLabelText(/Valor de la Obligación/i);
    // Cambiar valor con caracteres que contengan dígitos
    fireEvent.change(inputValor, { target: { value: '950.000' } });

    const botonEnviar = screen.getByRole('button', { name: /Crear Obligación en SIIF/i });
    fireEvent.click(botonEnviar);

    await waitFor(() => {
      expect(viaticosService.crearObligacion).toHaveBeenCalledWith(
        'sol-comp-100',
        expect.objectContaining({
          numeroObligacion: 'OBL-2026-00482',
          valorObligacion: 950000,
        }),
      );
    });
  });

  it('trae la modalidad del proceso anterior si ya viene definida y la muestra fijada', () => {
    render(
      <CrearObligacionModal
        abierta={true}
        solicitud={mockSolicitudComprometida}
        onCerrar={mockOnCerrar}
        onExito={mockOnExito}
      />,
    );

    expect(screen.getByText(/Traída del proceso anterior/i)).toBeDefined();
    expect(screen.getByText(/AVANCE \(Desembolso previo al viaje\)/i)).toBeDefined();
    // No debe haber un elemento <select> para modalidad cuando viene fijada
    expect(screen.queryByRole('combobox', { name: /Modalidad de Pago/i })).toBeNull();
  });

  it('permite seleccionar la modalidad de pago si la solicitud no la trae del proceso anterior', async () => {
    const solicitudSinModalidad = {
      ...mockSolicitudComprometida,
      modalidadPago: null,
    };

    (viaticosService.crearObligacion as any).mockResolvedValue({
      data: {
        ...solicitudSinModalidad,
        estadoSolicitud: 'OBLIGADA',
        numeroObligacion: 'OBL-2026-00483',
        modalidadPago: 'RECONOCIMIENTO_POSTERIOR',
      },
    });

    render(
      <CrearObligacionModal
        abierta={true}
        solicitud={solicitudSinModalidad}
        onCerrar={mockOnCerrar}
        onExito={mockOnExito}
      />,
    );

    // Debe renderizar el select al no traer modalidad previa
    const selectModalidad = screen.getByLabelText(/Modalidad de Pago/i) as HTMLSelectElement;
    expect(selectModalidad).toBeDefined();
    expect(selectModalidad.tagName.toLowerCase()).toBe('select');

    // Cambiar a RECONOCIMIENTO_POSTERIOR
    fireEvent.change(selectModalidad, { target: { value: 'RECONOCIMIENTO_POSTERIOR' } });
    expect(selectModalidad.value).toBe('RECONOCIMIENTO_POSTERIOR');

    const inputObligacion = screen.getByLabelText(/Número de Obligación SIIF/i);
    fireEvent.change(inputObligacion, { target: { value: 'OBL-2026-00483' } });

    const botonEnviar = screen.getByRole('button', { name: /Crear Obligación en SIIF/i });
    fireEvent.click(botonEnviar);

    await waitFor(() => {
      expect(viaticosService.crearObligacion).toHaveBeenCalledWith(
        'sol-comp-100',
        expect.objectContaining({
          numeroObligacion: 'OBL-2026-00483',
          modalidadPago: 'RECONOCIMIENTO_POSTERIOR',
        }),
      );
    });
  });

  it('permite adjuntar soporte oficial de obligación y lo sube al backend al enviar', async () => {
    (viaticosService.subirSoporteObligacion as any).mockResolvedValue({
      urlRepositorio: '/uploads/sol-comp-100/obligacion_999_comprobante.pdf',
      nombreArchivo: 'comprobante_obligacion.pdf',
    });

    (viaticosService.crearObligacion as any).mockResolvedValue({
      data: {
        ...mockSolicitudComprometida,
        estadoSolicitud: 'OBLIGADA',
        numeroObligacion: 'OBL-2026-00484',
        soporteObligacionPath: '/uploads/sol-comp-100/obligacion_999_comprobante.pdf',
      },
    });

    render(
      <CrearObligacionModal
        abierta={true}
        solicitud={mockSolicitudComprometida}
        onCerrar={mockOnCerrar}
        onExito={mockOnExito}
      />,
    );

    const inputObligacion = screen.getByLabelText(/Número de Obligación SIIF/i);
    fireEvent.change(inputObligacion, { target: { value: 'OBL-2026-00484' } });

    const inputArchivo = screen.getByLabelText(/Cargar soporte de obligación SIIF/i);
    const archivo = new File(['dummy pdf'], 'comprobante_obligacion.pdf', {
      type: 'application/pdf',
    });

    fireEvent.change(inputArchivo, { target: { files: [archivo] } });

    expect(await screen.findByText('comprobante_obligacion.pdf')).toBeDefined();
    expect(screen.getByText(/Listo para cargar al proyecto/i)).toBeDefined();

    const botonEnviar = screen.getByRole('button', { name: /Crear Obligación en SIIF/i });
    fireEvent.click(botonEnviar);

    await waitFor(() => {
      expect(viaticosService.subirSoporteObligacion).toHaveBeenCalledWith('sol-comp-100', archivo);
      expect(viaticosService.crearObligacion).toHaveBeenCalledWith(
        'sol-comp-100',
        expect.objectContaining({
          numeroObligacion: 'OBL-2026-00484',
          soporteObligacionPath: '/uploads/sol-comp-100/obligacion_999_comprobante.pdf',
        }),
      );
      expect(mockOnExito).toHaveBeenCalled();
    });
  });

  it('valida formatos no permitidos en el soporte de obligación', async () => {
    render(
      <CrearObligacionModal
        abierta={true}
        solicitud={mockSolicitudComprometida}
        onCerrar={mockOnCerrar}
        onExito={mockOnExito}
      />,
    );

    const inputArchivo = screen.getByLabelText(/Cargar soporte de obligación SIIF/i);
    const archivoInvalido = new File(['script'], 'virus.bat', {
      type: 'application/x-bat',
    });

    fireEvent.change(inputArchivo, { target: { files: [archivoInvalido] } });

    expect(
      await screen.findByText(/Solo se admiten archivos PDF o imágenes/i),
    ).toBeDefined();
  });
});


