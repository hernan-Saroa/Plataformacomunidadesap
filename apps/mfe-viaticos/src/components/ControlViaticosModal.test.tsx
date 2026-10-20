import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ControlViaticosModal from './ControlViaticosModal';

vi.mock('./FirmaDigitalViaticosModal', () => ({
  default: ({ isOpen, onFirmaCompleta, onCancelar }: any) =>
    isOpen ? (
      <div data-testid="firma-digital-viaticos-modal">
        <span>Modal Firma OTP Abierta</span>
        <button
          type="button"
          onClick={async () => {
            try {
              await onFirmaCompleta({
                codigoOtp: '654321',
                certificado_id: 'ESAP-CERT-VIAT-2026-TEST',
                hash: 'SHA256:mockedhash1234567890abcdef',
                timestamp: new Date().toISOString(),
                firmante: 'Revisor Control',
                cargo: 'Control de Viáticos / 2do Nivel',
              });
            } catch {
              // noop
            }
          }}
        >
          Confirmar Firma OTP Test
        </button>
        <button type="button" onClick={onCancelar}>
          Cancelar Firma OTP
        </button>
      </div>
    ) : null,
}));

vi.mock('../services/api/authService', () => ({
  default: {
    getCurrentUserSync: vi.fn(() => ({
      primerNombre: 'Revisor',
      primerApellido: 'Control',
      cargo: 'Control de Viáticos',
      numeroDocumento: '987654321',
    })),
    getCurrentUser: vi.fn().mockResolvedValue({
      primerNombre: 'Revisor',
      primerApellido: 'Control',
      cargo: 'Control de Viáticos',
      numeroDocumento: '987654321',
    }),
  },
}));

vi.mock('../services/api/viaticosService', () => ({
  default: {
    verificarSegundoNivel: vi.fn(),
    devolverAAnalista: vi.fn(),
    obtenerDependencias: vi.fn(),
    obtenerUrlArchivo: vi.fn((url: string) => url),
    obtenerSolicitudControlViaticos: vi.fn(),
    solicitarOtpFirma: vi.fn(),
    verificarOtpFirma: vi.fn(),
    consultarTarifaEstimada: vi.fn(),
    validarTiquete: vi.fn(),
  },
}));

vi.mock('./TicketBudgetWidget', () => ({
  default: () => <div data-testid="ticket-budget-widget" />,
}));

vi.mock('../utils/viaticosUtils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/viaticosUtils')>();
  return {
    ...actual,
    esPdfMime: (mime: string) => mime === 'application/pdf',
    formatearMoneda: (v: number) => `$${v}`,
    formatearNombreComisionado: (c: any) =>
      [c.primerNombre, c.segundoNombre, c.primerApellido, c.segundoApellido]
        .filter(Boolean)
        .join(' '),
  };
});

import viaticosService from '../services/api/viaticosService';

const solicitudMock = (overrides: any = {}) => ({
  id: 'sol-001',
  consecutivoUnico: 'COM-2026-0001',
  estadoSolicitud: 'SOLICITADA_SIIF',
  comisionado: {
    id: 'comp-001',
    numeroDocumento: '1234567890',
    primerNombre: 'Juan',
    segundoNombre: 'Pablo',
    primerApellido: 'Pérez',
    segundoApellido: 'Gómez',
    tipoComisionado: 'FUNCIONARIO',
    email: 'juan.perez@esap.edu.co',
    telefonoContacto: '3001234567',
    autorizacionHabeasData: true,
    idDependencia: 42 as any,
    origenDatos: 'ESAP',
  },
  destinoCiudad: 'Bogotá',
  destinoDepartamento: 'Cundinamarca',
  fechaInicio: '2026-10-03T00:00:00Z',
  fechaFin: '2026-10-07T00:00:00Z',
  diasComision: 5,
  objetoComision: 'Comisión de gestión institucional',
  prioridad: 'ALTA',
  rubroPresupuestal: 'Rubro 01',
  requiereTiquetes: false,
  montoViaticos: 560000,
  montoGastosViaje: 120000,
  salarioBasico: 5000000,
  costoEstimadoTiquete: 0,
  analistaAsignadoId: 'analista-001',
  analistaVerificadorNombre: 'María López',
  fechaVerificacionPrimerNivel: '2026-09-08T10:00:00.000Z',
  usuarioExportadorId: 'exp-001',
  documentosSoporte: [
    {
      id: 'doc-001',
      tipoDocumento: 'CDP',
      nombreArchivoOriginal: 'cdp.pdf',
      nombreArchivoSeguro: 'cdp_seguro.pdf',
      urlRepositorio: '/uploads/sol-001/cdp_seguro.pdf',
      tipoMime: 'application/pdf',
    },
  ],
  resumenPresupuestal: {
    totalGastado: 1000000,
    cantidadSolicitudes: 2,
    limitePresupuesto: 10000000,
    porcentajeUso: 10,
    semaforo: 'VERDE',
  },
  ...overrides,
});

const renderModal = (props: any = {}) =>
  render(
    <ControlViaticosModal
      abierta={false}
      solicitud={null}
      cargando={false}
      onCerrar={() => {}}
      onRefrescar={() => {}}
      {...props}
    />,
  );

describe('ControlViaticosModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no renderiza nada cuando abierta=false', () => {
    const { container } = renderModal({ abierta: false });
    expect(container.firstChild).toBeNull();
  });

  it('muestra el detalle del expediente cuando solicitud está cargada', async () => {
    renderModal({
      abierta: true,
      solicitud: solicitudMock(),
      cargando: false,
    });

    expect(screen.getByText('COM-2026-0001')).toBeDefined();
    expect(screen.getAllByText('Juan Pablo Pérez Gómez').length).toBeGreaterThan(0);
    expect(screen.getAllByText('1234567890').length).toBeGreaterThan(0);
    expect(screen.getByText('Bogotá, Cundinamarca')).toBeDefined();
  });

  it('muestra "Cargando expediente..." cuando cargando=true', () => {
    renderModal({
      abierta: true,
      solicitud: null,
      cargando: true,
    });

    expect(screen.getByText('Cargando expediente...')).toBeDefined();
  });

  it('muestra el semáforo presupuestal VERDE', () => {
    renderModal({
      abierta: true,
      solicitud: solicitudMock(),
      cargando: false,
    });

    expect(screen.getByText('Presupuesto OK')).toBeDefined();
  });

  it('muestra el semáforo presupuestal ROJO', () => {
    renderModal({
      abierta: true,
      solicitud: solicitudMock({
        resumenPresupuestal: {
          totalGastado: 9000000,
          cantidadSolicitudes: 10,
          limitePresupuesto: 10000000,
          porcentajeUso: 90,
          semaforo: 'ROJO',
        },
      }),
      cargando: false,
    });

    expect(screen.getByText('Presupuesto crítico')).toBeDefined();
  });

  it('muestra el nombre del analista verificador de 1er nivel', () => {
    renderModal({
      abierta: true,
      solicitud: solicitudMock(),
      cargando: false,
    });

    expect(screen.getByText('María López')).toBeDefined();
  });

  it('muestra los documentos de soporte en PDF', () => {
    renderModal({
      abierta: true,
      solicitud: solicitudMock(),
      cargando: false,
    });

    expect(screen.getByText('cdp.pdf')).toBeDefined();
  });

  it('muestra "No hay documentos PDF cargados" cuando no hay documentos', () => {
    renderModal({
      abierta: true,
      solicitud: solicitudMock({ documentosSoporte: [] }),
      cargando: false,
    });

    expect(screen.getByText('No hay documentos PDF cargados.')).toBeDefined();
  });

  it('muestra el botón "Aprobar y Verificar (2do Nivel)"', () => {
    renderModal({
      abierta: true,
      solicitud: solicitudMock(),
      cargando: false,
    });

    expect(screen.getByRole('button', { name: 'Aprobar y Verificar (2do Nivel)' })).toBeDefined();
  });

  it('solicita OTP y abre el modal de firma digital al hacer clic en "Aprobar y Verificar (2do Nivel)"', async () => {
    (viaticosService.solicitarOtpFirma as any).mockResolvedValue({
      verificationId: 'v-123',
      emailEnviadoA: 'control@esap.edu.co',
      devCode: '654321',
    });

    renderModal({
      abierta: true,
      solicitud: solicitudMock(),
      cargando: false,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Aprobar y Verificar (2do Nivel)' }));

    await waitFor(() => {
      expect(viaticosService.solicitarOtpFirma).toHaveBeenCalledWith('sol-001', {
        tipoFirma: 'CONTROL_VIATICOS',
        etapaLabel: 'Control Viáticos — Control Cruzado (2do Nivel)',
      });
      expect(screen.getByTestId('firma-digital-viaticos-modal')).toBeDefined();
    });
  });

  it('llama a verificarSegundoNivel con OTP y firma digital al confirmar la firma', async () => {
    (viaticosService.solicitarOtpFirma as any).mockResolvedValue({
      verificationId: 'v-123',
      emailEnviadoA: 'control@esap.edu.co',
      devCode: '654321',
    });
    (viaticosService.verificarSegundoNivel as any).mockResolvedValue({
      success: true,
      data: { id: 'sol-001', estadoSolicitud: 'VERIFICADA' },
    });

    renderModal({
      abierta: true,
      solicitud: solicitudMock(),
      cargando: false,
      onRefrescar: vi.fn(),
      onCerrar: vi.fn(),
    });

    fireEvent.click(screen.getByRole('button', { name: 'Aprobar y Verificar (2do Nivel)' }));

    await waitFor(() => {
      expect(screen.getByTestId('firma-digital-viaticos-modal')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Confirmar Firma OTP Test'));

    await waitFor(() => {
      expect(viaticosService.verificarSegundoNivel).toHaveBeenCalledWith(
        'sol-001',
        expect.objectContaining({
          otp: '654321',
          verificationId: 'v-123',
          certificadoId: 'ESAP-CERT-VIAT-2026-TEST',
          hashSha256: 'SHA256:mockedhash1234567890abcdef',
        }),
      );
    });
  });

  it('muestra "Verificación de 2do nivel registrada" después de aprobar y firmar exitosamente', async () => {
    (viaticosService.solicitarOtpFirma as any).mockResolvedValue({
      verificationId: 'v-123',
    });
    (viaticosService.verificarSegundoNivel as any).mockResolvedValue({
      success: true,
      data: { id: 'sol-001', estadoSolicitud: 'VERIFICADA' },
    });

    renderModal({
      abierta: true,
      solicitud: solicitudMock(),
      cargando: false,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Aprobar y Verificar (2do Nivel)' }));

    await waitFor(() => {
      expect(screen.getByTestId('firma-digital-viaticos-modal')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Confirmar Firma OTP Test'));

    await waitFor(() => {
      expect(screen.getByText('Verificación de 2do nivel registrada')).toBeDefined();
    });
  });

  it('muestra error de solicitud de OTP cuando solicitarOtpFirma falla', async () => {
    (viaticosService.solicitarOtpFirma as any).mockRejectedValue(
      new Error('Error al generar código OTP'),
    );

    renderModal({
      abierta: true,
      solicitud: solicitudMock(),
      cargando: false,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Aprobar y Verificar (2do Nivel)' }));

    await waitFor(() => {
      expect(screen.getByText('Error al generar código OTP')).toBeDefined();
    });
  });

  it('muestra error de verificación cuando verificarSegundoNivel falla durante la firma OTP', async () => {
    (viaticosService.solicitarOtpFirma as any).mockResolvedValue({
      verificationId: 'v-123',
    });
    (viaticosService.verificarSegundoNivel as any).mockRejectedValue(
      new Error('Violación de Segregación de Funciones'),
    );

    renderModal({
      abierta: true,
      solicitud: solicitudMock(),
      cargando: false,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Aprobar y Verificar (2do Nivel)' }));

    await waitFor(() => {
      expect(screen.getByTestId('firma-digital-viaticos-modal')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Confirmar Firma OTP Test'));

    await waitFor(() => {
      expect(screen.getByText('Violación de Segregación de Funciones')).toBeDefined();
    });
  });

  it('muestra el formulario de devolución al hacer clic en "Devolver a Analista"', () => {
    renderModal({
      abierta: true,
      solicitud: solicitudMock(),
      cargando: false,
    });

    fireEvent.click(screen.getByText('Devolver a Analista'));

    expect(
      screen.getByText('Ingrese el motivo obligatorio de la devolución.', { exact: false }),
    ).toBeDefined();
    expect(screen.getByPlaceholderText('Describa detalladamente el motivo de la devolución...')).toBeDefined();
  });

  it('el botón "Confirmar Devolución" está deshabilitado cuando el textarea está vacío', () => {
    renderModal({
      abierta: true,
      solicitud: solicitudMock(),
      cargando: false,
    });

    fireEvent.click(screen.getByText('Devolver a Analista'));

    const confirmBtn = screen.getByText('Confirmar Devolución') as HTMLButtonElement;
    expect(confirmBtn).toBeDisabled();
  });

  it('el botón "Confirmar Devolución" está deshabilitado con menos de 3 caracteres', () => {
    renderModal({
      abierta: true,
      solicitud: solicitudMock(),
      cargando: false,
    });

    fireEvent.click(screen.getByText('Devolver a Analista'));

    const textarea = screen.getByPlaceholderText('Describa detalladamente el motivo de la devolución...');
    fireEvent.change(textarea, { target: { value: 'ab' } });

    const confirmBtn = screen.getByText('Confirmar Devolución') as HTMLButtonElement;
    expect(confirmBtn).toBeDisabled();
  });

  it('el botón "Confirmar Devolución" está habilitado con 3+ caracteres', () => {
    renderModal({
      abierta: true,
      solicitud: solicitudMock(),
      cargando: false,
    });

    fireEvent.click(screen.getByText('Devolver a Analista'));

    const textarea = screen.getByPlaceholderText('Describa detalladamente el motivo de la devolución...');
    fireEvent.change(textarea, { target: { value: 'Falta documento de soporte' } });

    const confirmBtn = screen.getByText('Confirmar Devolución') as HTMLButtonElement;
    expect(confirmBtn).toBeEnabled();
  });

  it('debe llamar a devolverAAnalista con observaciones al confirmar', async () => {
    (viaticosService.devolverAAnalista as any).mockResolvedValue({
      success: true,
      data: { id: 'sol-001', estadoSolicitud: 'EN_VERIFICACION' },
    });

    const onRefrescar = vi.fn();
    const onCerrar = vi.fn();
    renderModal({
      abierta: true,
      solicitud: solicitudMock(),
      cargando: false,
      onRefrescar,
      onCerrar,
    });

    fireEvent.click(screen.getByText('Devolver a Analista'));

    const textarea = screen.getByPlaceholderText('Describa detalladamente el motivo de la devolución...');
    fireEvent.change(textarea, { target: { value: 'Falta documento de soporte' } });

    fireEvent.click(screen.getByText('Confirmar Devolución'));

    await waitFor(() => {
      expect(viaticosService.devolverAAnalista).toHaveBeenCalledWith(
        'sol-001',
        'Falta documento de soporte',
      );
    });
  });

  it('cancelar devolución cierra el formulario sin llamar al servicio', () => {
    renderModal({
      abierta: true,
      solicitud: solicitudMock(),
      cargando: false,
    });

    fireEvent.click(screen.getByText('Devolver a Analista'));

    fireEvent.click(screen.getByText('Cancelar'));

    expect(viaticosService.devolverAAnalista).not.toHaveBeenCalled();
  });

  it('muestra error de devolución cuando devolverAAnalista falla', async () => {
    (viaticosService.devolverAAnalista as any).mockRejectedValue(
      new Error('No autorizado para devolver'),
    );

    renderModal({
      abierta: true,
      solicitud: solicitudMock(),
      cargando: false,
    });

    fireEvent.click(screen.getByText('Devolver a Analista'));

    const textarea = screen.getByPlaceholderText('Describa detalladamente el motivo de la devolución...');
    fireEvent.change(textarea, { target: { value: 'Falta documento' } });

    fireEvent.click(screen.getByText('Confirmar Devolución'));

    await waitFor(() => {
      expect(screen.getByText('No autorizado para devolver')).toBeDefined();
    });
  });

  it('no muestra los botones de aprobar ni de devolver cuando la solicitud está en estado VERIFICADA', () => {
    renderModal({
      abierta: true,
      solicitud: solicitudMock({ estadoSolicitud: 'VERIFICADA' }),
      cargando: false,
    });

    expect(screen.queryByRole('button', { name: 'Aprobar y Verificar (2do Nivel)' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Devolver a Analista' })).toBeNull();
  });

  it('muestra el banner de expediente verificado cuando la solicitud está en estado VERIFICADA', () => {
    renderModal({
      abierta: true,
      solicitud: solicitudMock({
        estadoSolicitud: 'VERIFICADA',
        fechaSegundaRevision: '2026-09-11T12:00:00Z',
      }),
      cargando: false,
    });

    expect(screen.getByText('Expediente Verificado en Segundo Nivel')).toBeDefined();
    expect(screen.getAllByText('VERIFICADA').length).toBeGreaterThan(0);
  });

  describe('Desplazamiento Aéreo y Estimación de Tiquetes (Control de Viáticos)', () => {
    it('consulta tarifa estimada y muestra la comparativa de desplazamiento institucional cuando requiereTiquetes es true', async () => {
      (viaticosService.consultarTarifaEstimada as any).mockResolvedValue({
        encontrado: true,
        origen: 'Bogotá',
        destino: 'Pereira',
        origenIata: 'BOG',
        destinoIata: 'PEI',
        tarifaEstimada: 330000,
        tarifaMinima: 280000,
        tarifaMaxima: 420000,
        fuente: 'API_AMADEUS',
        ultimaActualizacion: new Date().toISOString(),
        mensaje: 'Tarifa obtenida correctamente',
      });
      (viaticosService.validarTiquete as any).mockResolvedValue({
        is_valid: true,
        nivel_alerta: 'VERDE',
        mensaje_alerta: 'Saldo presupuestal disponible',
        saldo_actual_dependencia: 25000000,
        monto_reserva_con_holgura: 759000,
        holgura_aplicada_porcentaje: 15,
      });

      renderModal({
        abierta: true,
        solicitud: solicitudMock({
          requiereTiquetes: true,
          montoViaticos: 560000,
          montoGastosViaje: 76034,
          costoEstimadoTiquete: 0,
          itinerario: [
            {
              id: 'r-1',
              origenCiudad: 'Bogotá, D.C.',
              origenDepartamento: 'Bogotá D.C.',
              destinoCiudad: 'Pereira',
              destinoDepartamento: 'Risaralda',
              fechaSalida: '2026-10-20',
              fechaLlegada: '2026-10-20',
              tipoTrayecto: 'SOLO_IDA',
              tipoTransporte: 'AEREO',
            },
            {
              id: 'r-2',
              origenCiudad: 'Pereira',
              origenDepartamento: 'Risaralda',
              destinoCiudad: 'Bogotá, D.C.',
              destinoDepartamento: 'Bogotá D.C.',
              fechaSalida: '2026-10-22',
              fechaLlegada: '2026-10-22',
              tipoTrayecto: 'SOLO_IDA',
              tipoTransporte: 'AEREO',
            },
          ],
        }),
        cargando: false,
      });

      // Debe consultar origen 'Bogotá, D.C.' y destino 'Pereira'
      await waitFor(() => {
        expect(viaticosService.consultarTarifaEstimada).toHaveBeenCalledWith('Bogotá, D.C.', 'Pereira');
      });

      // Debe mostrar la sección de tiquetes y las etiquetas IATA BOG ⇄ PEI
      await waitFor(() => {
        expect(screen.getByText('Desplazamiento Aéreo y Transporte a Terminal Aérea')).toBeDefined();
        expect(screen.getByText('BOG ⇄ PEI')).toBeDefined();
        expect(screen.getByText('Tarifa Estimada de Referencia (Vuelos)')).toBeDefined();
        expect(screen.getByText('Fuente: API_AMADEUS')).toBeDefined();
      });

      // Debe mostrar el cálculo de 2 tramos ida y vuelta ($330.000 * 2 = $660.000)
      expect(screen.getByText('2 tramos (Ida y Vuelta)')).toBeDefined();
      expect(screen.getAllByText('$660000').length).toBeGreaterThan(0);

      // Debe renderizar la comparativa de desplazamiento institucional
      expect(screen.getByText('Comparativa de Desplazamiento Institucional')).toBeDefined();
      expect(screen.getByText('Traslados Terrestres (Terminal):')).toBeDefined();
      expect(screen.getByText('Pasajes Aéreos (Tiquetes):')).toBeDefined();

      // Debe incluir TicketBudgetWidget
      expect(screen.getByTestId('ticket-budget-widget')).toBeDefined();

      // Debe mostrar el total consolidado proyectado ($560.000 + $76.034 + $660.000 = $1.296.034)
      expect(screen.getByText('Total Consolidado Proyectado')).toBeDefined();
      expect(screen.getAllByText('$1296034').length).toBeGreaterThan(0);
    });

    it('utiliza tarifaEstimada precargada sin invocar el servicio de nuevo', async () => {
      renderModal({
        abierta: true,
        solicitud: solicitudMock({
          requiereTiquetes: true,
          destinoCiudad: 'Pereira',
          tarifaEstimada: {
            encontrado: true,
            origen: 'Bogotá',
            destino: 'Pereira',
            origenIata: 'BOG',
            destinoIata: 'PEI',
            tarifaEstimada: 330000,
            tarifaMinima: 250000,
            tarifaMaxima: 450000,
            fuente: 'PARAMETRICO_ESAP',
            ultimaActualizacion: new Date().toISOString(),
            mensaje: 'OK',
          },
          itinerario: [
            {
              id: 'r-1',
              origenCiudad: 'Bogotá',
              destinoCiudad: 'Pereira',
              fechaSalida: '2026-10-20',
              fechaLlegada: '2026-10-20',
              tipoTrayecto: 'SOLO_IDA',
              tipoTransporte: 'AEREO',
            },
          ],
        }),
        cargando: false,
      });

      expect(viaticosService.consultarTarifaEstimada).not.toHaveBeenCalled();
      expect(screen.getByText('Fuente: PARAMETRICO_ESAP')).toBeDefined();
      expect(screen.getByText('BOG ⇄ PEI')).toBeDefined();
      expect(screen.getByText('1 tramo (Solo Ida)')).toBeDefined();
    });

    it('respeta costoEstimadoTiquete cuando ya está registrado en la solicitud cargándolo en el input editable', async () => {
      renderModal({
        abierta: true,
        solicitud: solicitudMock({
          requiereTiquetes: true,
          costoEstimadoTiquete: 720000,
          montoViaticos: 400000,
          montoGastosViaje: 80000,
        }),
        cargando: false,
      });

      expect(screen.getByDisplayValue('720000')).toBeDefined();
      expect(screen.getByText('Valor de gasto registrado manualmente')).toBeDefined();
      expect(screen.getAllByText('$720000').length).toBeGreaterThan(0);
      expect(screen.getAllByText('$1200000').length).toBeGreaterThan(0);
    });

    it('permite al usuario ingresar o modificar el gasto de tiquete manualmente o aplicar la sugerencia automática', async () => {
      renderModal({
        abierta: true,
        solicitud: solicitudMock({
          requiereTiquetes: true,
          costoEstimadoTiquete: 0,
          montoViaticos: 500000,
          montoGastosViaje: 50000,
          tarifaEstimada: {
            encontrado: true,
            origen: 'Bogotá',
            destino: 'Pereira',
            origenIata: 'BOG',
            destinoIata: 'PEI',
            tarifaEstimada: 330000,
            tarifaMinima: 250000,
            tarifaMaxima: 450000,
            fuente: 'PARAMETRICO_ESAP',
            ultimaActualizacion: new Date().toISOString(),
            mensaje: 'OK',
          },
          itinerario: [
            {
              id: 'r-1',
              origenCiudad: 'Bogotá',
              destinoCiudad: 'Pereira',
              fechaSalida: '2026-10-20',
              fechaLlegada: '2026-10-20',
              tipoTrayecto: 'SOLO_IDA',
              tipoTransporte: 'AEREO',
            },
            {
              id: 'r-2',
              origenCiudad: 'Pereira',
              destinoCiudad: 'Bogotá',
              fechaSalida: '2026-10-22',
              fechaLlegada: '2026-10-22',
              tipoTrayecto: 'SOLO_IDA',
              tipoTransporte: 'AEREO',
            },
          ],
        }),
        cargando: false,
      });

      // Inicialmente la sugerencia automática de 2 tramos ($660.000) está precargada por usabilidad
      const input = screen.getByLabelText('Valor del Pasaje Aéreo (COP)') as HTMLInputElement;
      expect(input.value).toBe('660000');
      expect(screen.getAllByText('$660000').length).toBeGreaterThan(0);
      // Total consolidado inicial: 500.000 + 50.000 + 660.000 = 1.210.000
      expect(screen.getAllByText('$1210000').length).toBeGreaterThan(0);

      // El usuario ingresa un valor de cotización real diferente: 750.000
      fireEvent.change(input, { target: { value: '750000' } });
      expect(input.value).toBe('750000');
      expect(screen.getByText('Valor de gasto registrado manualmente')).toBeDefined();
      expect(screen.getAllByText('$750000').length).toBeGreaterThan(0);
      // Total consolidado recalculado dinámicamente: 500.000 + 50.000 + 750.000 = 1.300.000
      expect(screen.getAllByText('$1300000').length).toBeGreaterThan(0);

      // Ahora hace clic en el botón de "Usar tarifa sugerida ($660.000)"
      const botonSugerida = screen.getByRole('button', { name: /Usar tarifa sugerida/i });
      fireEvent.click(botonSugerida);
      expect(input.value).toBe('660000');
      expect(screen.getAllByText('$660000').length).toBeGreaterThan(0);
      expect(screen.getAllByText('$1210000').length).toBeGreaterThan(0);
    });

    it('no muestra la sección de tiquetes aéreos cuando requiereTiquetes es false', () => {
      renderModal({
        abierta: true,
        solicitud: solicitudMock({ requiereTiquetes: false }),
        cargando: false,
      });

      expect(screen.queryByText('Desplazamiento Aéreo y Transporte a Terminal Aérea')).toBeNull();
      expect(viaticosService.consultarTarifaEstimada).not.toHaveBeenCalled();
    });
  });
});

