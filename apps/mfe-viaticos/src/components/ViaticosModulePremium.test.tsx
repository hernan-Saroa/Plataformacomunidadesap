import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ViaticosModulePremium from '../components/ViaticosModulePremium';
import viaticosService from '../services/api/viaticosService';
import { CreateSolicitudRequest } from '../types/viaticos';

vi.mock('../services/api/viaticosService', () => ({
  __esModule: true,
  default: {
    obtenerSolicitudes: vi.fn(),
    obtenerResumenEstadistico: vi.fn(),
    consultarComisionado: vi.fn(),
    crearSolicitudComision: vi.fn(),
    subirDocumento: vi.fn(),
  },
}));

const mockSolicitudes = [
  {
    id: 'sol-001',
    codigo: 'SOL-VIA-2026-001',
    cedulaComisionado: '1019283746',
    nombreComisionado: 'Carlos Eduardo Ramírez',
    cargoComisionado: 'Docente Ocasional',
    dependencia: 'Subdirección Académica',
    sedeOrigen: 'Sede Central Bogotá',
    ciudadDestino: 'Medellín',
    departamentoDestino: 'Antioquia',
    fechaInicio: '2026-08-20',
    fechaFin: '2026-08-23',
    diasComision: 3,
    tipoComision: 'CAPACITACION_DOCENTE',
    medioTransporte: 'AEREO',
    justificacion: 'Impartir módulo presencial.',
    montoSolicitadoViaticos: 840000,
    montoSolicitadoGastosViaje: 180000,
    montoTotalEstimado: 1020000,
    estado: 'RESOLUCION_EMITIDA',
    requiereTiqueteAereo: true,
    numeroResolucion: 'RES-0452-2026',
    fechaResolucion: '2026-08-15',
    creadoEn: '2026-08-10',
    actualizadoEn: '2026-08-15',
  },
];

const mockResumen = {
  totalSolicitudes: 1,
  enProcesoAprobacion: 0,
  enComisionActivas: 0,
  pendientesLegalizar: 0,
  montoTotalEjecutado: 1020000,
};

const mockComisionado = {
  id: 'com-001',
  numeroDocumento: '1019283746',
  primerNombre: 'Carlos Eduardo',
  segundoNombre: '',
  primerApellido: 'Ramírez',
  segundoApellido: '',
  email: 'carlos.ramirez@esap.edu.co',
  telefonoContacto: '3001234567',
  tipoComisionado: 'FUNCIONARIO',
  origenDatos: 'HUMANO',
  autorizacionHabeasData: true,
  fechaAutorizacionHabeasData: new Date(),
  ipRegistroHabeasData: '127.0.0.1',
};

describe('ViaticosModulePremium', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    viaticosService.obtenerSolicitudes = vi.fn().mockResolvedValue(mockSolicitudes);
    viaticosService.obtenerResumenEstadistico = vi.fn().mockResolvedValue(mockResumen);
    viaticosService.consultarComisionado = vi.fn().mockResolvedValue(mockComisionado);
    viaticosService.crearSolicitudComision = vi.fn().mockResolvedValue({ id: 'sol-nueva' });
  });

  const abrirModalNueva = async () => {
    fireEvent.click(screen.getByText(/Nueva Solicitud de Comisión/i));
    await screen.findByText(/Nueva Solicitud de Comisión de Servicios/i);
  };

  const consultarComisionadoAutorizado = async () => {
    await abrirModalNueva();
    const inputDoc = screen.getByPlaceholderText(/Ej\. 1019283746/i);
    await userEvent.type(inputDoc, '1019283746');
    fireEvent.click(screen.getByText(/Consultar/i));
    await screen.findByText(/Carlos Eduardo/i);
  };

  const irAlPaso2 = async () => {
    await consultarComisionadoAutorizado();
    fireEvent.click(screen.getByText(/Siguiente/i));
    await screen.findByText(/Objeto y Destino de la Comisión/i);
  };

  const llenarPaso2 = async () => {
    await irAlPaso2();
    await userEvent.type(
      screen.getByPlaceholderText(/Describa el objetivo institucional/i),
      'Comisión de gestión institucional',
    );
    fireEvent.change(screen.getByLabelText(/Departamento/i), { target: { value: 'Bolívar' } });
    fireEvent.change(screen.getByLabelText(/Ciudad/i), { target: { value: 'Cartagena' } });
    fireEvent.change(screen.getByLabelText(/Fecha Inicio/i), { target: { value: '2026-09-01' } });
    fireEvent.change(screen.getByLabelText(/Fecha Fin/i), { target: { value: '2026-09-05' } });
    await userEvent.type(screen.getByPlaceholderText(/Ej\. Rubro 01/i), 'Rubro 01');
    fireEvent.change(screen.getByLabelText(/Viáticos/i), { target: { value: '560000' } });
    fireEvent.change(screen.getByLabelText(/Gastos de viaje/i), { target: { value: '120000' } });
    fireEvent.change(screen.getByLabelText(/Días/i), { target: { value: '5' } });
  };

  it('debe renderizar el módulo con título y descripción', async () => {
    render(<ViaticosModulePremium />);

    expect(screen.getByText(/VIÁTICOS Y GASTOS DE VIAJE/i)).toBeInTheDocument();
    expect(screen.getByText(/Gestión de Comisiones de Servicios/i)).toBeInTheDocument();
  });

  it('debe mostrar el resumen estadístico al cargar', async () => {
    render(<ViaticosModulePremium />);

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    expect(viaticosService.obtenerSolicitudes).toHaveBeenCalled();
    expect(viaticosService.obtenerResumenEstadistico).toHaveBeenCalled();
  });

  it('debe mostrar la tabla de solicitudes', async () => {
    render(<ViaticosModulePremium />);

    await waitFor(() => {
      expect(screen.getByText(/Carlos Eduardo Ramírez/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/SOL-VIA-2026-001/i)).toBeInTheDocument();
    expect(screen.getByText(/Medellín/i)).toBeInTheDocument();
  });

  it('debe filtrar solicitudes por búsqueda', async () => {
    render(<ViaticosModulePremium />);

    await waitFor(() => {
      expect(screen.getByText(/Carlos Eduardo Ramírez/i)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Buscar por funcionario/i);
    await userEvent.type(searchInput, 'Ramírez');

    expect(screen.getByText(/Carlos Eduardo Ramírez/i)).toBeInTheDocument();
  });

  it('debe ocultar solicitudes que no coinciden con la búsqueda', async () => {
    render(<ViaticosModulePremium />);

    await waitFor(() => {
      expect(screen.getByText(/Carlos Eduardo Ramírez/i)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Buscar por funcionario/i);
    await userEvent.type(searchInput, 'Inexistente');

    expect(screen.queryByText(/Carlos Eduardo Ramírez/i)).not.toBeInTheDocument();
    expect(screen.getByText(/No se encontraron solicitudes de viáticos registradas/i)).toBeInTheDocument();
  });

  it('debe filtrar solicitudes por estado', async () => {
    render(<ViaticosModulePremium />);

    await waitFor(() => {
      expect(screen.getByText(/Carlos Eduardo Ramírez/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'LEGALIZADO' } });

    expect(screen.queryByText(/Carlos Eduardo Ramírez/i)).not.toBeInTheDocument();
    expect(screen.getByText(/No se encontraron solicitudes de viáticos registradas/i)).toBeInTheDocument();
  });

  it('debe abrir el modal de nueva solicitud', async () => {
    render(<ViaticosModulePremium />);

    await waitFor(() => {
      expect(screen.getByText(/Carlos Eduardo Ramírez/i)).toBeInTheDocument();
    });

    await abrirModalNueva();

    expect(screen.getByText(/Paso 1 de 3/i)).toBeInTheDocument();
  });

  it('debe consultar comisionado por documento', async () => {
    render(<ViaticosModulePremium />);

    await waitFor(() => {
      expect(screen.getByText(/Carlos Eduardo Ramírez/i)).toBeInTheDocument();
    });

    await abrirModalNueva();

    const inputDoc = screen.getByPlaceholderText(/Ej\. 1019283746/i);
    await userEvent.type(inputDoc, '1019283746');

    fireEvent.click(screen.getByText(/Consultar/i));

    await waitFor(() => {
      expect(viaticosService.consultarComisionado).toHaveBeenCalledWith('1019283746');
    });

    await waitFor(() => {
      expect(screen.getByText(/Carlos Eduardo/i)).toBeInTheDocument();
    });
  });

  it('debe mostrar error cuando no se encuentra el comisionado', async () => {
    viaticosService.consultarComisionado = vi.fn().mockResolvedValue(null);
    render(<ViaticosModulePremium />);

    await waitFor(() => {
      expect(screen.getByText(/Carlos Eduardo Ramírez/i)).toBeInTheDocument();
    });

    await abrirModalNueva();

    const inputDoc = screen.getByPlaceholderText(/Ej\. 1019283746/i);
    await userEvent.type(inputDoc, '9999999999');
    fireEvent.click(screen.getByText(/Consultar/i));

    await waitFor(() => {
      expect(screen.getByText(/No se encontró un comisionado con ese documento/i)).toBeInTheDocument();
    });
  });

  it('debe mostrar modal de Habeas Data cuando comisionado no tiene autorización', async () => {
    const comisionadoSinAutorizacion = {
      ...mockComisionado,
      autorizacionHabeasData: false,
    };
    viaticosService.consultarComisionado = vi.fn().mockResolvedValue(comisionadoSinAutorizacion);

    render(<ViaticosModulePremium />);

    await waitFor(() => {
      expect(screen.getByText(/Carlos Eduardo Ramírez/i)).toBeInTheDocument();
    });

    await abrirModalNueva();

    const inputDoc = screen.getByPlaceholderText(/Ej\. 1019283746/i);
    await userEvent.type(inputDoc, '1019283746');

    fireEvent.click(screen.getByText(/Consultar/i));

    await waitFor(() => {
      expect(screen.getByText(/Autorización de Tratamiento de Datos/i)).toBeInTheDocument();
    });
  });

  it('debe avanzar al paso 2 tras aceptar Habeas Data', async () => {
    const comisionadoSinAutorizacion = {
      ...mockComisionado,
      autorizacionHabeasData: false,
    };
    viaticosService.consultarComisionado = vi.fn().mockResolvedValue(comisionadoSinAutorizacion);

    render(<ViaticosModulePremium />);

    await waitFor(() => {
      expect(screen.getByText(/Carlos Eduardo Ramírez/i)).toBeInTheDocument();
    });

    await abrirModalNueva();

    const inputDoc = screen.getByPlaceholderText(/Ej\. 1019283746/i);
    await userEvent.type(inputDoc, '1019283746');
    fireEvent.click(screen.getByText(/Consultar/i));

    await waitFor(() => {
      expect(screen.getByText(/Autorización de Tratamiento de Datos/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByText(/Aceptar y Continuar/i));

    await waitFor(() => {
      expect(screen.queryByText(/Autorización de Tratamiento de Datos/i)).not.toBeInTheDocument();
    });

    const siguienteBtn = screen.getByText(/Siguiente/i);
    expect(siguienteBtn).toBeEnabled();
    fireEvent.click(siguienteBtn);

    expect(screen.getByText(/Paso 2 de 3/i)).toBeInTheDocument();
    expect(screen.getByText(/Objeto y Destino de la Comisión/i)).toBeInTheDocument();
  });

  it('debe avanzar al paso 2 cuando comisionado está autorizado', async () => {
    render(<ViaticosModulePremium />);

    await waitFor(() => {
      expect(screen.getByText(/Carlos Eduardo Ramírez/i)).toBeInTheDocument();
    });

    await abrirModalNueva();

    const inputDoc = screen.getByPlaceholderText(/Ej\. 1019283746/i);
    await userEvent.type(inputDoc, '1019283746');
    fireEvent.click(screen.getByText(/Consultar/i));

    await waitFor(() => {
      expect(screen.getByText(/Carlos Eduardo/i)).toBeInTheDocument();
    });

    const siguienteBtn = screen.getByText(/Siguiente/i);
    fireEvent.click(siguienteBtn);

    expect(screen.getByText(/Paso 2 de 3/i)).toBeInTheDocument();
    expect(screen.getByText(/Objeto y Destino de la Comisión/i)).toBeInTheDocument();
  });

  it('debe regresar al paso anterior con el botón Atrás', async () => {
    render(<ViaticosModulePremium />);

    await waitFor(() => {
      expect(screen.getByText(/Carlos Eduardo Ramírez/i)).toBeInTheDocument();
    });

    await irAlPaso2();

    fireEvent.click(screen.getByText(/Atrás/i));

    expect(screen.getByText(/Paso 1 de 3/i)).toBeInTheDocument();
  });

  it('debe normalizar tildes del objeto de comisión conservando la letra', async () => {
    render(<ViaticosModulePremium />);

    await waitFor(() => {
      expect(screen.getByText(/Carlos Eduardo Ramírez/i)).toBeInTheDocument();
    });

    await irAlPaso2();

    const objetoInput = screen.getByPlaceholderText(/Describa el objetivo institucional/i);
    await userEvent.type(objetoInput, 'Comisión de gestión');

    expect(objetoInput).toHaveValue('Comision de gestion');
  });

  it('debe eliminar caracteres especiales del objeto de comisión', async () => {
    render(<ViaticosModulePremium />);

    await waitFor(() => {
      expect(screen.getByText(/Carlos Eduardo Ramírez/i)).toBeInTheDocument();
    });

    await irAlPaso2();

    const objetoInput = screen.getByPlaceholderText(/Describa el objetivo institucional/i);
    await userEvent.type(objetoInput, 'A@B#C$D%');

    expect(objetoInput).toHaveValue('ABCD');
  });

  it('debe mostrar la restricción SIIF en el campo de descripción', async () => {
    render(<ViaticosModulePremium />);

    await waitFor(() => {
      expect(screen.getByText(/Carlos Eduardo Ramírez/i)).toBeInTheDocument();
    });

    await irAlPaso2();

    expect(
      screen.getByText(/No se permiten caracteres especiales, tildes ni la letra ñ/i),
    ).toBeInTheDocument();
  });

  it('debe permitir solo números en el documento de identidad', async () => {
    render(<ViaticosModulePremium />);

    await waitFor(() => {
      expect(screen.getByText(/Carlos Eduardo Ramírez/i)).toBeInTheDocument();
    });

    await abrirModalNueva();

    const inputDoc = screen.getByPlaceholderText(/Ej\. 1019283746/i);
    await userEvent.type(inputDoc, 'abc101928');

    expect(inputDoc).toHaveValue('101928');
  });

  it('debe cargar ciudades en cascada según el departamento seleccionado', async () => {
    render(<ViaticosModulePremium />);

    await waitFor(() => {
      expect(screen.getByText(/Carlos Eduardo Ramírez/i)).toBeInTheDocument();
    });

    await irAlPaso2();

    const ciudadSelect = screen.getByLabelText(/Ciudad/i);
    expect(ciudadSelect).toBeDisabled();

    const deptoSelect = screen.getByLabelText(/Departamento/i);
    fireEvent.change(deptoSelect, { target: { value: 'Bolívar' } });

    expect(ciudadSelect).toBeEnabled();
    expect(screen.getByRole('option', { name: 'Cartagena' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Medellín' })).not.toBeInTheDocument();

    // Cambiar de departamento limpia la ciudad
    fireEvent.change(deptoSelect, { target: { value: 'Antioquia' } });
    expect(screen.getByRole('option', { name: 'Medellín' })).toBeInTheDocument();
    expect(ciudadSelect).toHaveValue('');
  });

  it('debe formatear los campos monetarios como moneda y rechazar texto', async () => {
    render(<ViaticosModulePremium />);

    await waitFor(() => {
      expect(screen.getByText(/Carlos Eduardo Ramírez/i)).toBeInTheDocument();
    });

    await irAlPaso2();

    const montoInput = screen.getByLabelText(/Viáticos/i);
    fireEvent.change(montoInput, { target: { value: 'abc560000' } });

    expect(montoInput).toHaveValue('$560.000');

    const diasInput = screen.getByLabelText(/Días/i);
    fireEvent.change(diasInput, { target: { value: 'x12' } });
    expect(diasInput).toHaveValue('12');
  });

  it('debe mostrar error cuando fecha fin es anterior a fecha inicio', async () => {
    render(<ViaticosModulePremium />);

    await waitFor(() => {
      expect(screen.getByText(/Carlos Eduardo Ramírez/i)).toBeInTheDocument();
    });

    await irAlPaso2();

    const fechaInicio = screen.getByLabelText(/Fecha Inicio/i);
    const fechaFin = screen.getByLabelText(/Fecha Fin/i);

    fireEvent.change(fechaInicio, { target: { value: '2026-09-05' } });
    fireEvent.change(fechaFin, { target: { value: '2026-09-01' } });

    const submitBtn = screen.getByText(/Enviar Solicitud/i);
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Debe ser posterior o igual a fecha inicio/i)).toBeInTheDocument();
    });
  });

  it('debe exigir fechas antes de radicar la solicitud', async () => {
    render(<ViaticosModulePremium />);

    await waitFor(() => {
      expect(screen.getByText(/Carlos Eduardo Ramírez/i)).toBeInTheDocument();
    });

    await irAlPaso2();

    fireEvent.click(screen.getByText(/Enviar Solicitud/i));

    await waitFor(() => {
      expect(screen.getByText(/Debe indicar las fechas de inicio y fin/i)).toBeInTheDocument();
    });
  });

  it('debe enviar solicitud exitosamente', async () => {
    render(<ViaticosModulePremium />);

    await waitFor(() => {
      expect(screen.getByText(/Carlos Eduardo Ramírez/i)).toBeInTheDocument();
    });

    await llenarPaso2();

    fireEvent.click(screen.getByText(/Siguiente/i));

    const submitBtn = screen.getByText(/Enviar Solicitud/i);
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(viaticosService.crearSolicitudComision).toHaveBeenCalled();
    });
  });

  it('debe radicar con payload alineado al DTO CreateSolicitudDto (camelCase)', async () => {
    render(<ViaticosModulePremium />);

    await waitFor(() => {
      expect(screen.getByText(/Carlos Eduardo Ramírez/i)).toBeInTheDocument();
    });

    await llenarPaso2();

    fireEvent.click(screen.getByText(/Siguiente/i));
    fireEvent.click(screen.getByText(/Enviar Solicitud/i));

    await waitFor(() => {
      expect(viaticosService.crearSolicitudComision).toHaveBeenCalled();
    });

    const payload = vi.mocked(viaticosService.crearSolicitudComision).mock.calls[0][0] as CreateSolicitudRequest;

    expect(payload).toEqual(
      expect.objectContaining({
        comisionadoId: 'com-001',
        destinoCiudad: 'Cartagena',
        destinoDepartamento: 'Bolívar',
        fechaInicio: '2026-09-01',
        fechaFin: '2026-09-05',
        objetoComision: 'Comision de gestion institucional',
        prioridad: 'MEDIA',
        rubroPresupuestal: 'Rubro 01',
        requiereTiquetes: true,
        montoViaticos: 560000,
        montoGastosViaje: 120000,
        diasComision: 5,
        creadoPorUsuarioId: expect.any(String),
        aceptaHabeasData: true,
        documentos: [],
      }),
    );
  });

  it('debe reiniciar el formulario al cerrar y reabrir el modal', async () => {
    render(<ViaticosModulePremium />);

    await waitFor(() => {
      expect(screen.getByText(/Carlos Eduardo Ramírez/i)).toBeInTheDocument();
    });

    await abrirModalNueva();

    const inputDoc = screen.getByPlaceholderText(/Ej\. 1019283746/i);
    await userEvent.type(inputDoc, '1019283746');

    fireEvent.click(screen.getByText('✕'));

    await screen.findByText(/Nueva Solicitud de Comisión/i);

    await abrirModalNueva();

    expect(screen.getByPlaceholderText(/Ej\. 1019283746/i)).toHaveValue('');
  });

  it('debe cerrar modal al cancelar', async () => {
    render(<ViaticosModulePremium />);

    await waitFor(() => {
      expect(screen.getByText(/Carlos Eduardo Ramírez/i)).toBeInTheDocument();
    });

    await abrirModalNueva();

    const cerrarBtn = screen.getByText('✕');
    fireEvent.click(cerrarBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Nueva Solicitud de Comisión de Servicios/i)).not.toBeInTheDocument();
    });
  });

  it('debe mostrar el detalle de una solicitud al pulsar Ver Detalle', async () => {
    render(<ViaticosModulePremium />);

    await waitFor(() => {
      expect(screen.getByText(/Carlos Eduardo Ramírez/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Ver Detalle/i));

    expect(screen.getByText(/Justificación:/i)).toBeInTheDocument();
    expect(screen.getByText(/Impartir módulo presencial\./i)).toBeInTheDocument();
  });

  it('debe navegar a la sección de pasajes y alojamiento', async () => {
    render(<ViaticosModulePremium />);

    await waitFor(() => {
      expect(screen.getByText(/Carlos Eduardo Ramírez/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Pasajes y Alojamiento/i));

    expect(screen.getByText(/Reserva y Emisión de Pasajes/i)).toBeInTheDocument();
  });
});
