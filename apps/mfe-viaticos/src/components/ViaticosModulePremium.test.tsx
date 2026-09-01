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
    obtenerDepartamentos: vi.fn(),
    obtenerCiudadesPorDepartamento: vi.fn(),
    obtenerParametrizacionFormulario: vi.fn().mockResolvedValue({ campos: [], configuraciones: {} }),
    obtenerParametrizacionPorCodigoFormulario: vi.fn().mockResolvedValue(null),
    obtenerChecklistDocumentos: vi.fn().mockResolvedValue({ obligatorios: [], opcionales: [] }),
    finalizarSolicitud: vi.fn().mockResolvedValue({ id: 'sol-nueva', estadoSolicitud: 'RADICADA' }),
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
  borradores: 0,
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
    viaticosService.obtenerSolicitudes = vi.fn().mockResolvedValue({ solicitudes: mockSolicitudes, esSuperAdmin: false });
    viaticosService.obtenerResumenEstadistico = vi.fn().mockResolvedValue(mockResumen);
    viaticosService.consultarComisionado = vi.fn().mockResolvedValue(mockComisionado);
    viaticosService.crearSolicitudComision = vi.fn().mockResolvedValue({ id: 'sol-nueva' });
    viaticosService.obtenerDepartamentos = vi.fn().mockResolvedValue([
      { idGeopolitica: 1, codGeopolitica: '5', codDepartamento: 5, nomDivGeopolitica: 'Antioquia', tipDivision: 'DEPTO' },
      { idGeopolitica: 2, codGeopolitica: '13', codDepartamento: 13, nomDivGeopolitica: 'Bolívar', tipDivision: 'DEPTO' },
    ]);
    viaticosService.obtenerCiudadesPorDepartamento = vi.fn().mockImplementation(async (id: number) =>
      id === 13
        ? [
            { idGeopolitica: 10, codGeopolitica: '13', codDepartamento: 13, nomDivGeopolitica: 'Cartagena', tipDivision: 'CIUDAD', idPadre: 2 },
            { idGeopolitica: 11, codGeopolitica: '13', codDepartamento: 13, nomDivGeopolitica: 'Magangué', tipDivision: 'CIUDAD', idPadre: 2 },
          ]
        : [
            { idGeopolitica: 20, codGeopolitica: '5', codDepartamento: 5, nomDivGeopolitica: 'Medellín', tipDivision: 'CIUDAD', idPadre: 1 },
            { idGeopolitica: 21, codGeopolitica: '5', codDepartamento: 5, nomDivGeopolitica: 'Rionegro', tipDivision: 'CIUDAD', idPadre: 1 },
          ],
    );
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

    const deptoSelect = screen.getByLabelText(/Departamento/i);
    fireEvent.click(deptoSelect);
    await userEvent.type(screen.getByPlaceholderText('Buscar...'), 'Bolívar');
    await screen.findByText('Bolívar');
    fireEvent.click(screen.getByText('Bolívar'));

    await waitFor(() => expect(viaticosService.obtenerCiudadesPorDepartamento).toHaveBeenCalledWith(13));

    const ciudadSelect = screen.getByLabelText(/Ciudad/i);
    fireEvent.click(ciudadSelect);
    await userEvent.type(screen.getByPlaceholderText('Buscar...'), 'Cartagena');
    await screen.findByText('Cartagena');
    fireEvent.click(screen.getByText('Cartagena'));

    fireEvent.change(screen.getByLabelText(/Fecha Inicio/i), { target: { value: '2026-09-01' } });
    fireEvent.change(screen.getByLabelText(/Fecha Fin/i), { target: { value: '2026-09-05' } });
    await userEvent.type(screen.getByPlaceholderText(/Ej\. Rubro 01/i), 'Rubro 01');
    fireEvent.change(screen.getByLabelText(/Viáticos/i), { target: { value: '560000' } });
    fireEvent.change(screen.getByLabelText(/Gastos de viaje/i), { target: { value: '120000' } });
    fireEvent.change(screen.getByLabelText(/Días/i), { target: { value: '5' } });
  };

  const guardarYBContinuar = async () => {
    fireEvent.click(screen.getByText(/Guardar y continuar/i));
    await screen.findByText(/3\. Documentos de la Comisión/i);
  };

  const irAlConfirmacion = async () => {
    await llenarPaso2();
    await guardarYBContinuar();
    fireEvent.click(screen.getByText(/Siguiente/i));
    await screen.findByText(/4\. Confirmación de la Solicitud/i);
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

    const filtroEstadoSelect = screen.getByRole('button', { name: 'Todos los Estados' });
    fireEvent.click(filtroEstadoSelect);
    await userEvent.type(screen.getByPlaceholderText('Buscar...'), 'LEGALIZADO');
    await screen.findByText('Legalizado');
    fireEvent.click(screen.getByText('Legalizado'));

    expect(screen.queryByText(/Carlos Eduardo Ramírez/i)).not.toBeInTheDocument();
    expect(screen.getByText(/No se encontraron solicitudes de viáticos registradas/i)).toBeInTheDocument();
  });

  it('debe abrir el modal de nueva solicitud', async () => {
    render(<ViaticosModulePremium />);

    await waitFor(() => {
      expect(screen.getByText(/Carlos Eduardo Ramírez/i)).toBeInTheDocument();
    });

    await abrirModalNueva();

    expect(screen.getByText(/Paso 1 de 4/i)).toBeInTheDocument();
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

    expect(screen.getByText(/Paso 2 de 4/i)).toBeInTheDocument();
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

    expect(screen.getByText(/Paso 2 de 4/i)).toBeInTheDocument();
    expect(screen.getByText(/Objeto y Destino de la Comisión/i)).toBeInTheDocument();
  });

  it('debe regresar al paso anterior con el botón Atrás', async () => {
    render(<ViaticosModulePremium />);

    await waitFor(() => {
      expect(screen.getByText(/Carlos Eduardo Ramírez/i)).toBeInTheDocument();
    });

    await irAlPaso2();

    fireEvent.click(screen.getByText(/Atrás/i));

    expect(screen.getByText(/Paso 1 de 4/i)).toBeInTheDocument();
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

  it('debe cargar departamentos y ciudades desde la geopolítica del auth-service', async () => {
    render(<ViaticosModulePremium />);

    await waitFor(() => {
      expect(screen.getByText(/Carlos Eduardo Ramírez/i)).toBeInTheDocument();
    });

    await irAlPaso2();

    // Los departamentos se consultan al abrir el modal
    expect(viaticosService.obtenerDepartamentos).toHaveBeenCalled();

    const ciudadSelect = screen.getByLabelText(/Ciudad/i);
    expect(ciudadSelect).toBeDisabled();

    const deptoSelect = screen.getByLabelText(/Departamento/i);
    fireEvent.click(deptoSelect);
    await userEvent.type(screen.getByPlaceholderText('Buscar...'), 'Bolívar');
    await screen.findByText('Bolívar');
    fireEvent.click(screen.getByText('Bolívar'));

    // Las ciudades se consultan al elegir departamento usando el CÓDIGO del
    // departamento (codDepartamento DANE, p. ej. Bolívar = 13), no su idGeopolitica.
    await waitFor(() => expect(viaticosService.obtenerCiudadesPorDepartamento).toHaveBeenCalledWith(13));
    expect(ciudadSelect).not.toBeDisabled();

    fireEvent.click(ciudadSelect);
    await userEvent.type(screen.getByPlaceholderText('Buscar...'), 'Cartagena');
    await screen.findByText('Cartagena');
    fireEvent.click(screen.getByText('Cartagena'));

    expect(screen.getByText('Cartagena')).toBeInTheDocument();
    expect(screen.queryByText('Medellín')).not.toBeInTheDocument();

    // Cambiar de departamento limpia la ciudad y consulta las nuevas ciudades
    fireEvent.click(deptoSelect);
    await userEvent.type(screen.getByPlaceholderText('Buscar...'), 'Antioquia');
    await screen.findByText('Antioquia');
    fireEvent.click(screen.getByText('Antioquia'));

    await waitFor(() => expect(viaticosService.obtenerCiudadesPorDepartamento).toHaveBeenCalledWith(5));

    fireEvent.click(ciudadSelect);
    await userEvent.type(screen.getByPlaceholderText('Buscar...'), 'Medellín');
    await screen.findByText('Medellín');
    fireEvent.click(screen.getByText('Medellín'));

    expect(screen.queryByText('Cartagena')).not.toBeInTheDocument();
  });

  it('debe usar codDepartamento (código DANE) para las ciudades aunque haya un duplicado sin código', async () => {
    // Reproduce el bug reportado: Risaralda tenía un duplicado sin codDepartamento
    // (idGeopolitica 105) junto al registro correcto (idGeopolitica 920,
    // codDepartamento 66). El dedupe debe preferir el registro CON código, de modo
    // que el llamado a ciudades use 66 y no 105.
    viaticosService.obtenerDepartamentos = vi.fn().mockResolvedValue([
      { idGeopolitica: 920, codGeopolitica: '66', codDepartamento: 66, nomDivGeopolitica: 'Risaralda', tipDivision: 'DEPTO' },
      { idGeopolitica: 105, nomDivGeopolitica: 'Risaralda', tipDivision: 'DEPTO' },
    ]);
    viaticosService.obtenerCiudadesPorDepartamento = vi.fn().mockResolvedValue([
      { idGeopolitica: 921, codGeopolitica: '66001', codDepartamento: 66, nomDivGeopolitica: 'Pereira', tipDivision: 'CIUDAD', idPadre: 920 },
    ]);

    render(<ViaticosModulePremium />);
    await waitFor(() => {
      expect(screen.getByText(/Carlos Eduardo Ramírez/i)).toBeInTheDocument();
    });
    await irAlPaso2();

    const deptoSelect = screen.getByLabelText(/Departamento/i);
    fireEvent.click(deptoSelect);
    await userEvent.type(screen.getByPlaceholderText('Buscar...'), 'Risaralda');
    await screen.findByText('Risaralda');
    fireEvent.click(screen.getByText('Risaralda'));

    await waitFor(() => expect(viaticosService.obtenerCiudadesPorDepartamento).toHaveBeenCalledWith(66));

    const ciudadSelect = screen.getByLabelText(/Ciudad/i);
    fireEvent.click(ciudadSelect);
    await userEvent.type(screen.getByPlaceholderText('Buscar...'), 'Pereira');
    await screen.findByText('Pereira');
    fireEvent.click(screen.getByText('Pereira'));

    // El llamado a ciudades usa el código DANE (66), no el idGeopolitica (105).
    expect(viaticosService.obtenerCiudadesPorDepartamento).toHaveBeenCalledWith(66);
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

    fireEvent.click(screen.getByText(/Guardar y continuar/i));

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

    fireEvent.click(screen.getByText(/Guardar y continuar/i));

    await waitFor(() => {
      expect(screen.getByText(/Debe indicar las fechas de inicio y fin/i)).toBeInTheDocument();
    });
  });

  it('debe mostrar error cuando la fecha de inicio es anterior a hoy', async () => {
    render(<ViaticosModulePremium />);

    await waitFor(() => {
      expect(screen.getByText(/Carlos Eduardo Ramírez/i)).toBeInTheDocument();
    });

    await irAlPaso2();

    fireEvent.change(screen.getByLabelText(/Fecha Inicio/i), { target: { value: '2020-01-01' } });
    fireEvent.change(screen.getByLabelText(/Fecha Fin/i), { target: { value: '2020-01-05' } });

    fireEvent.click(screen.getByText(/Guardar y continuar/i));

    await waitFor(() => {
      expect(screen.getByText(/La fecha de inicio no puede ser anterior a hoy/i)).toBeInTheDocument();
    });
  });

  it('debe mostrar el aviso de comisión extemporánea (menos de 14 días hábiles)', async () => {
    const fechaInicio = new Date();
    fechaInicio.setDate(fechaInicio.getDate() + 2);
    const inicioISO = fechaInicio.toISOString().slice(0, 10);
    const fechaFin = new Date();
    fechaFin.setDate(fechaFin.getDate() + 4);
    const finISO = fechaFin.toISOString().slice(0, 10);

    render(<ViaticosModulePremium />);

    await waitFor(() => {
      expect(screen.getByText(/Carlos Eduardo Ramírez/i)).toBeInTheDocument();
    });

    await irAlPaso2();

    fireEvent.change(screen.getByLabelText(/Fecha Inicio/i), { target: { value: inicioISO } });
    fireEvent.change(screen.getByLabelText(/Fecha Fin/i), { target: { value: finISO } });

    await guardarYBContinuar();
    fireEvent.click(screen.getByText(/Siguiente/i));

    await screen.findByText(/Comisión Extemporánea/i);
  });

  it('debe enviar solicitud exitosamente', async () => {
    render(<ViaticosModulePremium />);

    await waitFor(() => {
      expect(screen.getByText(/Carlos Eduardo Ramírez/i)).toBeInTheDocument();
    });

    await irAlConfirmacion();

    fireEvent.click(screen.getByText(/Finalizar y Radicar/i));

    await waitFor(() => {
      expect(viaticosService.finalizarSolicitud).toHaveBeenCalledWith('sol-nueva');
    });
  });

  it('debe radicar con payload alineado al DTO CreateSolicitudDto (camelCase)', async () => {
    render(<ViaticosModulePremium />);

    await waitFor(() => {
      expect(screen.getByText(/Carlos Eduardo Ramírez/i)).toBeInTheDocument();
    });

    await llenarPaso2();

    fireEvent.click(screen.getByText(/Guardar y continuar/i));

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
        modoBorrador: true,
        tipoComision: 'TERRESTRE',
        documentos: [],
      }),
    );
  });

  it('debe radicar la solicitud luego de cargar los documentos obligatorios en PDF', async () => {
    viaticosService.obtenerChecklistDocumentos = vi.fn().mockResolvedValue({
      obligatorios: [{ codigo: 'CDP', nombre: 'Certificación Débito Presupuestal', descripcion: null }],
      opcionales: [],
    });
    viaticosService.subirDocumento = vi.fn().mockResolvedValue({
      id: 'doc-001',
      tipoDocumento: 'CDP',
      nombreArchivoOriginal: 'cdp.pdf',
      nombreArchivoSeguro: 'cdp_seguro.pdf',
      urlRepositorio: '/uploads/cdp_seguro.pdf',
      tipoMime: 'application/pdf',
    });
    viaticosService.finalizarSolicitud = vi.fn().mockResolvedValue({ id: 'sol-rad', estadoSolicitud: 'RADICADA' });

    render(<ViaticosModulePremium />);

    await waitFor(() => {
      expect(screen.getByText(/Carlos Eduardo Ramírez/i)).toBeInTheDocument();
    });

    await llenarPaso2();
    await guardarYBContinuar();

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, {
      target: { files: [new File(['contenido-pdf'], 'cdp.pdf', { type: 'application/pdf' })] },
    });

    await screen.findByText('Cargado');

    expect(viaticosService.subirDocumento).toHaveBeenCalledWith(
      'sol-nueva',
      'CDP',
      expect.any(File),
      'application/pdf',
    );

    fireEvent.click(screen.getByText(/Siguiente/i));
    await screen.findByText(/4\. Confirmación de la Solicitud/i);

    const finalizarBtn = screen.getByText(/Finalizar y Radicar/i);
    expect(finalizarBtn).toBeEnabled();
    fireEvent.click(finalizarBtn);

    await waitFor(() => {
      expect(viaticosService.finalizarSolicitud).toHaveBeenCalledWith('sol-nueva');
    });
  });

  it('debe pedir pasaporte, carta de invitación y resolución al marcar comisión internacional', async () => {
    viaticosService.obtenerChecklistDocumentos = vi.fn().mockResolvedValue({
      obligatorios: [
        { codigo: 'PASAPORTE', nombre: 'Pasaporte', descripcion: null },
        { codigo: 'CARTA_INVITACION', nombre: 'Carta de Invitación', descripcion: null },
        { codigo: 'RESOLUCION_ACTO', nombre: 'Resolución / Acto Administrativo', descripcion: null },
      ],
      opcionales: [],
    });

    render(<ViaticosModulePremium />);

    await waitFor(() => {
      expect(screen.getByText(/Carlos Eduardo Ramírez/i)).toBeInTheDocument();
    });

    await llenarPaso2();

    fireEvent.click(screen.getByLabelText(/Comisión internacional/i));
    await guardarYBContinuar();

    expect(viaticosService.obtenerChecklistDocumentos).toHaveBeenCalledWith('INTERNACIONAL');
    expect(screen.getByText('Pasaporte')).toBeInTheDocument();
    expect(screen.getByText('Carta de Invitación')).toBeInTheDocument();
    expect(screen.getByText('Resolución / Acto Administrativo')).toBeInTheDocument();
    expect(screen.getAllByText(/Subir/i)).toHaveLength(3);
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
