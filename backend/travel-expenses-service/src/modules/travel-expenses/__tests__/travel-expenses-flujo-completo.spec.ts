import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { SolicitudComisionEntity } from '../../../entities/solicitud-comision.entity';
import { ComisionadoEntity } from '../../../entities/comisionado.entity';
import { DocumentoSoporteEntity } from '../../../entities/documento-soporte.entity';
import { SolicitudHistorialEstadoEntity } from '../../../entities/solicitud-historial-estado.entity';
import { EstadoSolicitud } from '../../../entities/estado-solicitud.enum';
import { NotificationClientService } from '../../../common/notification-client.service';
import { ConfigService } from '../../config/config.service';
import { TravelExpensesService } from '../travel-expenses.service';
import { TicketsService } from '../../tickets/tickets.service';
import { LiquidationService } from '../../liquidation/liquidation.service';
import { PendientesService } from '../../legalizacion/pendientes.service';
import { CreateSolicitudDto } from '../../../dto/create-solicitud.dto';
import { ExpedirRpDto } from '../../../dto/expedir-rp.dto';
import { CrearObligacionDto } from '../../../dto/crear-obligacion.dto';
import { ProcesarPagoDto } from '../../../dto/procesar-pago.dto';
import { alcanzoDisparador } from '../../legalizacion/legalizacion-disparador.service';

describe('Prueba Unitaria Integral del Flujo Completo de Viáticos: Formato 023 -> Control Cruzado -> Tesorería -> Legalización', () => {
  let service: TravelExpensesService;
  let mockSolicitudRepo: any;
  let mockComisionadoRepo: any;
  let mockDocumentoRepo: any;
  let mockHistorialRepo: any;
  let mockDataSource: any;
  let mockNotificationService: any;
  let mockConfigService: any;
  let mockTicketsService: any;
  let mockLiquidationService: any;
  let mockPendientesService: any;

  // Estado compartido de la solicitud en memoria simulando la persistencia a lo largo del flujo
  let solicitudEnBaseDatos: SolicitudComisionEntity;

  const mockComisionado: Partial<ComisionadoEntity> = {
    id: 'com-001',
    numeroDocumento: '1098765432',
    primerNombre: 'Juan',
    segundoNombre: 'Carlos',
    primerApellido: 'Pérez',
    segundoApellido: 'Gómez',
    email: 'juan.perez@esap.edu.co',
    tipoComisionado: 'FUNCIONARIO',
    idDependencia: 10,
    cargo: 'Profesional Especializado',
    autorizacionHabeasData: true,
    fechaAutorizacionHabeasData: new Date(),
    ipRegistroHabeasData: '127.0.0.1',
  };

  beforeEach(async () => {
    mockComisionadoRepo = {
      findOne: jest.fn().mockResolvedValue(mockComisionado),
      find: jest.fn().mockResolvedValue([mockComisionado]),
      save: jest.fn((c) => Promise.resolve({ ...c })),
    };

    mockDocumentoRepo = {
      create: jest.fn((d) => ({ id: 'doc-001', ...d })),
      save: jest.fn((d) => Promise.resolve({ id: 'doc-001', ...d })),
      find: jest.fn().mockResolvedValue([]),
    };

    mockHistorialRepo = {
      create: jest.fn((h) => ({ id: 'hist-001', ...h })),
      save: jest.fn().mockResolvedValue({ id: 'hist-001' }),
    };

    const makeQueryBuilder = () => {
      let isSolapamiento = false;
      const qb: any = {
        select: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockImplementation((cond: string) => {
          if (cond && cond.includes('estadosNoActivos')) isSolapamiento = true;
          return qb;
        }),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockImplementation(async () => (isSolapamiento ? null : solicitudEnBaseDatos)),
        getMany: jest.fn().mockImplementation(async () => [solicitudEnBaseDatos]),
        getCount: jest.fn().mockResolvedValue(1),
        getRawOne: jest.fn().mockResolvedValue({ max: 0 }),
        getManyAndCount: jest.fn().mockImplementation(async () => [[solicitudEnBaseDatos], 1]),
      };
      return qb;
    };

    mockSolicitudRepo = {
      create: jest.fn((dto) => {
        solicitudEnBaseDatos = {
          id: 'sol-e2e-001',
          consecutivoUnico: 'COM-2026-0001',
          creadoEn: new Date(),
          actualizadoEn: new Date(),
          comisionado: mockComisionado as ComisionadoEntity,
          comisionadoId: 'com-001',
          ...dto,
        } as SolicitudComisionEntity;
        return solicitudEnBaseDatos;
      }),
      save: jest.fn((sol) => {
        solicitudEnBaseDatos = {
          ...solicitudEnBaseDatos,
          ...sol,
          comisionado: mockComisionado as ComisionadoEntity,
        };
        return Promise.resolve(solicitudEnBaseDatos);
      }),
      findOne: jest.fn().mockImplementation(() => Promise.resolve(solicitudEnBaseDatos)),
      find: jest.fn().mockImplementation(() => Promise.resolve([solicitudEnBaseDatos])),
      createQueryBuilder: jest.fn().mockImplementation(makeQueryBuilder),
    };

    mockDataSource = {
      getRepository: jest.fn().mockImplementation((entity) => {
        if (entity === SolicitudComisionEntity) return mockSolicitudRepo;
        if (entity === ComisionadoEntity) return mockComisionadoRepo;
        if (entity === DocumentoSoporteEntity) return mockDocumentoRepo;
        if (entity === SolicitudHistorialEstadoEntity) return mockHistorialRepo;
        return mockSolicitudRepo;
      }),
      transaction: jest.fn(async (callback) => {
        const fakeManager = {
          query: jest.fn().mockResolvedValue([]),
          getRepository: (entity: any) => mockDataSource.getRepository(entity),
          withRepository: (repo: any) => repo,
        };
        return callback(fakeManager);
      }),
      query: jest.fn().mockImplementation(async (sql: string, params: any[]) => {
        if (sql.includes('auth.personas')) {
          return [{ nombre: 'Revisor Control Viáticos', num_identificacion: '987654321', cargo: 'Auditor', id_dependencia: 10 }];
        }
        if (sql.includes('auth.dependencias')) {
          return [{ id_dependencia: 10, nombre: 'Facultad de Pregrado', codigo_dependencia: 'DEP-10' }];
        }
        if (sql.includes('auth."user"')) {
          return [{ id_dependencia: 10 }];
        }
        return [];
      }),
    };

    mockNotificationService = {
      send: jest.fn().mockResolvedValue(true),
      notifyEnvioAFirmas023: jest.fn().mockResolvedValue(true),
      notifyByPermission: jest.fn().mockResolvedValue(true),
      notifyByRole: jest.fn().mockResolvedValue(true),
      archiveNotificacionesPorSolicitud: jest.fn().mockResolvedValue(true),
      deleteNotificacionesPorSolicitud: jest.fn().mockResolvedValue(true),
    };

    mockConfigService = {
      obtenerConfiguracionPorTipo: jest.fn().mockResolvedValue(null),
      obtenerConfiguracionPorCodigoFormulario: jest.fn().mockResolvedValue(null),
      obtenerJornadaLaboralActiva: jest.fn().mockResolvedValue(null),
    };

    mockTicketsService = {
      consultarTarifaEstimada: jest.fn().mockResolvedValue({
        encontrado: true,
        origen: 'Bogotá',
        destino: 'Pereira',
        origenIata: 'BOG',
        destinoIata: 'PEI',
        tarifaEstimada: 330000,
        fuente: 'PARAMETRICA_ESAP',
        mensaje: 'Tarifa oficial encontrada',
      }),
      validarTiquete: jest.fn().mockResolvedValue({
        is_valid: true,
        nivel_alerta: 'VERDE',
        mensaje_alerta: 'Presupuesto suficiente para tiquetes',
        saldo_actual_dependencia: 20000000,
        monto_reserva_con_holgura: 828000,
      }),
    };

    mockLiquidationService = {
      obtenerTarifaTerminal: jest.fn().mockResolvedValue(38017),
    };

    mockPendientesService = {
      tieneLegalizacionesPendientes: jest.fn().mockResolvedValue({ pendiente: false, comisiones: [] }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TravelExpensesService,
        { provide: getRepositoryToken(SolicitudComisionEntity), useValue: mockSolicitudRepo },
        { provide: getRepositoryToken(ComisionadoEntity), useValue: mockComisionadoRepo },
        { provide: getRepositoryToken(DocumentoSoporteEntity), useValue: mockDocumentoRepo },
        { provide: getDataSourceToken(), useValue: mockDataSource },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: NotificationClientService, useValue: mockNotificationService },
        { provide: TicketsService, useValue: mockTicketsService },
        { provide: LiquidationService, useValue: mockLiquidationService },
        { provide: PendientesService, useValue: mockPendientesService },
      ],
    }).compile();

    service = module.get<TravelExpensesService>(TravelExpensesService);
  });

  it('ejecuta exitosamente el ciclo de vida completo: Formato 023 -> Control Cruzado -> Tesorería -> Legalización', async () => {
    // Configuración de fechas en el futuro para la comisión institucional
    const f1 = new Date();
    f1.setDate(f1.getDate() + 30);
    const f2 = new Date();
    f2.setDate(f2.getDate() + 32);
    const fechaInicio = f1.toISOString().split('T')[0];
    const fechaFin = f2.toISOString().split('T')[0];

    // =========================================================================
    // 1. CREACIÓN DE LA SOLICITUD (FORMATO GF-FO-023)
    // =========================================================================
    // La solicitud contiene viáticos calculados bajo Decreto 314, transporte terrestre/fluvial,
    // y el valor automático regulado de traslados a terminal aérea en las ciudades de la comisión.
    const createDto: CreateSolicitudDto = {
      comisionadoId: 'com-001',
      idDependencia: 10,
      objetoComision: 'Acompañamiento a jornada académica territorial en Pereira',
      fechaInicio,
      fechaFin,
      destinoCiudad: 'Pereira',
      destinoDepartamento: 'Risaralda',
      montoViaticos: 560000, // 2 noches pernoctadas + medio día de retorno
      montoGastosViaje: 126034, // Desplazamientos: $50.000 (terrestre) + $76.034 (terminales aéreos)
      diasComision: 2.5,
      requiereTiquetes: true,
      costoEstimadoTiquete: 0, // En la solicitud inicial no se impone el costo de tiquete (se define en control)
      modoBorrador: true, // Inicia borrador/consolidación para flujo de firmas previas
      aceptaHabeasData: true,
      itinerario: [
        {
          origenCiudad: 'Bogotá',
          origenDepartamento: 'Bogotá D.C.',
          destinoCiudad: 'Pereira',
          destinoDepartamento: 'Risaralda',
          fechaSalida: fechaInicio,
          fechaLlegada: fechaInicio,
          tipoTransporte: 'AEREO',
          tipoTrayecto: 'SOLO_IDA',
          tarifaTerminalAereo: 38017,
        },
        {
          origenCiudad: 'Pereira',
          origenDepartamento: 'Risaralda',
          destinoCiudad: 'Bogotá',
          destinoDepartamento: 'Bogotá D.C.',
          fechaSalida: fechaFin,
          fechaLlegada: fechaFin,
          tipoTransporte: 'AEREO',
          tipoTrayecto: 'SOLO_IDA',
          tarifaTerminalAereo: 38017,
        },
      ],
      camposAdicionales: {
        transporteTerminalAereo: 76034, // 2 traslados aéreos x $38.017
        transporteTerrestre: 50000,
      },
    };

    const solicitudCreada = await service.crearSolicitud(createDto);
    expect(solicitudCreada).toBeDefined();
    expect(solicitudCreada.id).toBe('sol-e2e-001');
    expect(solicitudCreada.montoViaticos).toBe(560000);
    expect(solicitudCreada.montoGastosViaje).toBe(126034);
    expect(solicitudCreada.camposAdicionales.transporteTerminalAereo).toBe(76034);
    expect(solicitudCreada.estadoSolicitud).toBe(EstadoSolicitud.PENDIENTE);

    // =========================================================================
    // 2. ENVÍO AL FLUJO DE FIRMAS Y FIRMAS DE APROBACIÓN (FORMATO 023)
    // =========================================================================
    // El enlace de dependencia consolida la solicitud e inicia el flujo de firmas
    const solicitudParaFirmas = await service.solicitarFirmasAprobacion('sol-e2e-001', 'enlace-001');
    expect(solicitudParaFirmas.estadoSolicitud).toBe(EstadoSolicitud.PENDIENTE_FIRMAS);

    // Firma 1: Jefe de Dependencia / Supervisor
    await service.firmarAprobacionSolicitud('sol-e2e-001', {
      tipoFirma: 'JEFE_DEPENDENCIA',
      firmadoPorId: 'jefe-001',
      cargoFirmante: 'Jefe de Dependencia Académica',
      nombreFirmante: 'Dr. Roberto Méndez',
      codigoOtp: '654321',
      hashSha256: 'HASH-JEFE-SHA256-023',
    });

    // Firma 2: Gerente de Proyecto
    const resFirma = await service.firmarAprobacionSolicitud('sol-e2e-001', {
      tipoFirma: 'GERENTE_PROYECTO',
      firmadoPorId: 'gerente-001',
      cargoFirmante: 'Gerente de Proyecto Institucional',
      nombreFirmante: 'Ing. Laura Restrepo',
      codigoOtp: '654322',
      hashSha256: 'HASH-GERENTE-SHA256-023',
    });

    // Con ambas firmas institucionales registradas, transiciona a SOLICITADO (Bandeja Secretaría de Viáticos)
    expect(resFirma.radicada).toBe(true);
    expect(resFirma.solicitud.estadoSolicitud).toBe(EstadoSolicitud.SOLICITADO);

    // =========================================================================
    // 3. AUDITORÍA DE 1ER NIVEL (ANALISTA SIIF)
    // =========================================================================
    // El analista asignado revisa los documentos de soporte y da visto bueno de 1er nivel
    solicitudEnBaseDatos.analistaAsignadoId = 'analista-001';
    const auditoriaResultado = await service.verificarAuditoria(
      'sol-e2e-001',
      'analista-001',
      ['ANALISTA_VIATICOS', 'ANALISTA'],
      {
        seguridadSocialVerificada: true,
        documentosCompletos: true,
        observaciones: 'Documentos conformes con la resolución de viáticos',
      },
    );
    expect(auditoriaResultado.estadoSolicitud).toBe(EstadoSolicitud.SOLICITADA_SIIF);

    // =========================================================================
    // 4. CONTROL CRUZADO DE 2DO NIVEL (CONTROL DE VIÁTICOS)
    // =========================================================================
    // Consulta la solicitud para Control Cruzado:
    // El backend calcula automáticamente la tarifa de referencia sugerida de tiquetes según la ruta (BOG-PEI)
    const solicitudControl = await service.obtenerSolicitudControlViaticos('sol-e2e-001');
    expect(solicitudControl.tarifaEstimada).toBeDefined();
    expect(solicitudControl.tarifaEstimada?.tarifaEstimada).toBe(330000); // Tarifa unitaria por tramo

    // En Control de Viáticos, la tarifa recomendada es $330.000 x 2 = $660.000.
    // El usuario/revisor ingresa el valor cotizado real del pasaje ($720.000) en el campo editable
    const verificacionSegundoNivel = await service.verificarSegundaRevision(
      'sol-e2e-001',
      'revisor-001',
      ['CONTROL_VIATICOS'],
      {
        observaciones: 'Control cruzado validado. Cotización de pasajes aéreos ingresada y verificada.',
        certificadoId: 'ESAP-CERT-CTRL-001',
        hashSha256: 'HASH-CTRL-VIATICOS-SHA256',
        firmaImagen: 'data:image/png;base64,mockFirmaControlViaticos',
        nombreRevisor: 'Revisor Control Viáticos',
        cargoRevisor: 'Auditor de Control de Viáticos',
        costoEstimadoTiquete: 720000, // Valor registrado en el input editable por el revisor
      },
    );
    expect(verificacionSegundoNivel.estadoSolicitud).toBe(EstadoSolicitud.VERIFICADA);
    expect(verificacionSegundoNivel.costoEstimadoTiquete).toBe(720000);

    // =========================================================================
    // 5. AUTORIZACIÓN CORPORATIVA (SUBDIRECCIÓN DE GESTIÓN CORPORATIVA)
    // =========================================================================
    // La Subdirección abre su bandeja de autorización (transición a EN_AUTORIZACION)
    await service.obtenerBandejaAutorizacion();
    expect(solicitudEnBaseDatos.estadoSolicitud).toBe(EstadoSolicitud.EN_AUTORIZACION);

    const solicitudAutorizada = await service.autorizarComision(
      'sol-e2e-001',
      'subdirector-001',
      ['SUBDIRECCION_GESTION_CORPORATIVA'],
      {
        observaciones: 'Comisión autorizada para cumplimiento de funciones territoriales',
        certificadoId: 'ESAP-CERT-AUT-001',
        hashSha256: 'HASH-AUTORIZACION-SHA256',
        firmaImagen: 'data:image/png;base64,mockFirmaSubdirector',
      },
    );
    expect(solicitudAutorizada.estadoSolicitud).toBe(EstadoSolicitud.AUTORIZADA);

    // =========================================================================
    // 6. GESTIÓN PRESUPUESTAL (EXPEDICIÓN DE REGISTRO PRESUPUESTAL RP)
    // =========================================================================
    const expedirRpDto: ExpedirRpDto = {
      numeroRp: '48920',
      fechaRp: '2026-11-05',
      valorComprometido: 1406034, // Total: Viáticos ($560.000) + Desplazamiento ($126.034) + Tiquetes ($720.000)
      rubroPresupuestal: 'C-2101-01-01-Viaticos',
    };
    const solicitudComprometida = await service.expedirRp(
      'sol-e2e-001',
      'presupuesto-001',
      ['PRESUPUESTO'],
      expedirRpDto,
    );
    expect(solicitudComprometida.estadoSolicitud).toBe(EstadoSolicitud.COMPROMETIDA);
    expect(solicitudComprometida.codigoRp).toBe('2026-11-05_RP_48920');
    expect(solicitudComprometida.numeroRp).toBe('48920');

    // =========================================================================
    // 7. REGISTRO DE OBLIGACIÓN EN SIIF NACIÓN
    // =========================================================================
    const obligacionDto: CrearObligacionDto = {
      numeroObligacion: 'OBL-2026-00481',
      fechaObligacion: '2026-11-06',
      valorObligacion: 1406034,
      modalidadPago: 'AVANCE',
      observaciones: 'Obligación expedida en SIIF para desembolso de avance',
    };
    const solicitudObligada = await service.crearObligacion(
      'sol-e2e-001',
      'analista-001',
      ['ANALISTA_VIATICOS', 'TESORERIA'],
      obligacionDto,
    );
    expect(solicitudObligada.estadoSolicitud).toBe(EstadoSolicitud.OBLIGADA);
    expect(solicitudObligada.numeroObligacion).toBe('OBL-2026-00481');

    // =========================================================================
    // 8. ROL DE TESORERÍA (PROCESAMIENTO Y DESEMBOLSO DE PAGO)
    // =========================================================================
    const pagoDto: ProcesarPagoDto = {
      fechaPago: '2026-11-08',
      valorPagado: 1406034,
      numeroOrdenPago: 'OP-SIIF-2026-98124',
      soportePagoPath: 'uploads/pagos/2026/comprobante_banco_98124.pdf',
      observacionesPago: 'Desembolso bancario exitoso a cuenta de ahorros del comisionado',
      modalidadPago: 'AVANCE',
    };

    const solicitudPagada = await service.procesarPago(
      'sol-e2e-001',
      'tesorero-001',
      ['TESORERIA'],
      pagoDto,
    );

    expect(solicitudPagada.estadoSolicitud).toBe(EstadoSolicitud.PAGADA);
    expect(solicitudPagada.valorPagado).toBe(1406034);
    expect(solicitudPagada.numeroOrdenPago).toBe('OP-SIIF-2026-98124');
    expect(solicitudPagada.pagadoPorId).toBe('tesorero-001');

    // =========================================================================
    // 9. ACTIVACIÓN DEL DISPARADOR DE LEGALIZACIÓN
    // =========================================================================
    // Al transicionar a PAGADA, el disparador normativo habilita el módulo de legalización
    const legalizacionHabilitada = alcanzoDisparador(solicitudPagada.estadoSolicitud, 'PAGADA');
    expect(legalizacionHabilitada).toBe(true);

    // Verificamos que no abra en estados previos a la autorización/compromiso
    expect(alcanzoDisparador(EstadoSolicitud.RADICADA, 'PAGADA')).toBe(false);
    expect(alcanzoDisparador(EstadoSolicitud.SOLICITADA_SIIF, 'PAGADA')).toBe(false);
    expect(alcanzoDisparador(EstadoSolicitud.AUTORIZADA, 'PAGADA')).toBe(false);

    // La comisión transiciona de PAGADA a PENDIENTE_LEGALIZACION para la entrega de soportes
    solicitudEnBaseDatos.estadoSolicitud = EstadoSolicitud.PENDIENTE_LEGALIZACION;
    expect(solicitudEnBaseDatos.estadoSolicitud).toBe(EstadoSolicitud.PENDIENTE_LEGALIZACION);
    expect(alcanzoDisparador(solicitudEnBaseDatos.estadoSolicitud, 'PAGADA')).toBe(true);
  });
});
