import { CertificatesService } from './certificates.service';
import { CertificateRequest } from './certificate-request.entity';
import { Certificate } from './certificate.entity';

describe('CertificatesService', () => {
  let service: CertificatesService;

  beforeEach(() => {
    service = Object.create(CertificatesService.prototype) as CertificatesService;
  });

  it('calcula el plazo de correccion en 15 dias habiles sin contar fines de semana', () => {
    const start = new Date(2026, 7, 21, 12, 0, 0);
    const dueDate = service['addBusinessDays'](start, 15);

    expect(dueDate.getFullYear()).toBe(2026);
    expect(dueDate.getMonth()).toBe(8);
    expect(dueDate.getDate()).toBe(11);
    expect(dueDate.getDay()).toBe(5);
  });

  it('excluye los festivos colombianos del plazo de correccion', () => {
    const start = new Date(2026, 11, 7, 12, 0, 0);
    const dueDate = service['addBusinessDays'](start, 1);

    expect(dueDate.getFullYear()).toBe(2026);
    expect(dueDate.getMonth()).toBe(11);
    expect(dueDate.getDate()).toBe(9);
  });

  it('normaliza los campos editables y marca el certificado como corregido', () => {
    const certificate = {
      full_name: 'Nombre anterior',
      document_type: 'CC',
      id_number: '123',
      career_category: 'Cargo anterior',
      position_category: 'Vinculacion anterior',
      position_location: '',
      department: 'Dependencia anterior',
      cod_cargo: '202816',
      cod_grade: '16',
      encargo_type: 'E',
      campus: '',
      hiring_date: new Date('2024-05-14'),
      monthly_salary: 1000000,
      salary_text: '',
      technical_bonus: 0,
      include_salary: true,
      include_technical_bonus: false,
    } as unknown as Certificate;

    const patch = service['normalizeCorrectedCertificateData'](certificate, {
      full_name: '  Nombre corregido  ',
      career_category: 'Cargo corregido',
      position_category: 'Carrera administrativa',
      monthly_salary: '2500000',
      include_salary: false,
      include_technical_bonus: true,
      encargo_type: 'N',
    });

    expect(patch.full_name).toBe('Nombre corregido');
    expect(patch.monthly_salary).toBe(2500000);
    expect(patch.include_salary).toBe(false);
    expect(patch.include_technical_bonus).toBe(false);
    expect(patch.cod_cargo).toBe('2028');
    expect(patch.cod_grade).toBe('16');
    expect(patch.encargo_type).toBe('N');
    expect(patch.is_corrected).toBe(true);
    expect(patch.last_corrected_at).toBeInstanceOf(Date);
  });

  it('rechaza decimales en salario y prima durante una corrección', () => {
    const certificate = {
      full_name: 'Nombre empleado',
      document_type: 'CC',
      id_number: '123456',
      career_category: 'Cargo',
      position_category: 'Vinculación',
      hiring_date: new Date('2024-05-14'),
      monthly_salary: 1000000,
      salary_text: '',
      technical_bonus: 800000,
      include_salary: true,
      include_technical_bonus: true,
    } as unknown as Certificate;

    expect(() =>
      service['normalizeCorrectedCertificateData'](certificate, {
        monthly_salary: '1000000.50',
      }),
    ).toThrow('pesos enteros, sin decimales');

    expect(() =>
      service['normalizeCorrectedCertificateData'](certificate, {
        technical_bonus: '800000.25',
      }),
    ).toThrow('pesos enteros, sin decimales');
  });

  it('permite incluir y ordenar funciones desde una corrección', () => {
    const certificate = {
      full_name: 'Nombre empleado',
      document_type: 'CC',
      id_number: '123456',
      career_category: 'Docente',
      position_category: 'Planta docente',
      hiring_date: new Date('2024-05-14'),
      monthly_salary: 1000000,
      salary_text: '',
      technical_bonus: 0,
      include_salary: true,
      include_technical_bonus: false,
      include_functions: false,
      functions_snapshot: null,
    } as unknown as Certificate;

    const patch = service['normalizeCorrectedCertificateData'](certificate, {
      include_functions: 'true',
      functions: JSON.stringify([
        'Orientar los procesos académicos asignados.',
        'Verificar el cumplimiento de los lineamientos institucionales.',
      ]),
    });

    expect(patch.include_functions).toBe(true);
    expect(patch.functions_snapshot).toMatchObject({
      correction_source: 'CERTIFICATE_CORRECTION',
      functions: [
        { ordinal: 1, description: 'Orientar los procesos académicos asignados.' },
        {
          ordinal: 2,
          description: 'Verificar el cumplimiento de los lineamientos institucionales.',
        },
      ],
    });
  });

  it('permite retirar las funciones sin borrar el snapshot del certificado', () => {
    const functionsSnapshot = {
      profile_id: 'profile-1',
      functions: [
        { ordinal: 1, description: 'Función institucional existente.' },
      ],
    };
    const certificate = {
      full_name: 'Nombre empleado',
      document_type: 'CC',
      id_number: '123456',
      career_category: 'Cargo',
      position_category: 'Vinculación',
      hiring_date: new Date('2024-05-14'),
      monthly_salary: 1000000,
      salary_text: '',
      technical_bonus: 0,
      include_salary: true,
      include_technical_bonus: false,
      include_functions: true,
      functions_snapshot: functionsSnapshot,
    } as unknown as Certificate;

    const patch = service['normalizeCorrectedCertificateData'](certificate, {
      include_functions: false,
      functions: [],
    });

    expect(patch.include_functions).toBe(false);
    expect(patch.functions_snapshot).toBe(functionsSnapshot);
  });

  it('rechaza funciones vacías y duplicadas durante una corrección', () => {
    const certificate = {
      full_name: 'Nombre empleado',
      document_type: 'CC',
      id_number: '123456',
      career_category: 'Cargo',
      position_category: 'Vinculación',
      hiring_date: new Date('2024-05-14'),
      monthly_salary: 1000000,
      salary_text: '',
      technical_bonus: 0,
      include_salary: true,
      include_technical_bonus: false,
      include_functions: false,
      functions_snapshot: null,
    } as unknown as Certificate;

    expect(() =>
      service['normalizeCorrectedCertificateData'](certificate, {
        include_functions: true,
        functions: ['Función válida.', ''],
      }),
    ).toThrow('La función 2 está vacía');

    expect(() =>
      service['normalizeCorrectedCertificateData'](certificate, {
        include_functions: true,
        functions: ['Orientar procesos académicos.', 'orientar procesos academicos'],
      }),
    ).toThrow('la función 2 repite la función 1');
  });

  it('incluye las funciones en el snapshot y en la trazabilidad de correcciones', () => {
    const original = {
      include_functions: false,
      functions_snapshot: null,
    };
    const corrected = {
      include_functions: true,
      functions_snapshot: {
        functions: [
          { ordinal: 1, description: 'Acompañar procesos institucionales.' },
        ],
      },
    };

    const changes = service['correctionChanges'](original, corrected);

    expect(changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'include_functions',
          before: 'No',
          after: 'Sí',
        }),
        expect.objectContaining({
          field: 'functions_snapshot',
          after: expect.stringContaining('1 función: 1. Acompañar procesos institucionales.'),
        }),
      ]),
    );
  });

  it('prioriza un encargo activo sobre un registro normal activo', () => {
    const normalRequest = {
      id: 'normal',
      position_category: 'Cra. Administrativa',
      observations: 'N',
      status: 'A',
      hiring_date: new Date('2024-06-18'),
      request_date: null,
    } as unknown as CertificateRequest;
    const encargoRequest = {
      id: 'encargo',
      position_category: 'Cra. Administrativa',
      observations: 'E',
      status: 'A',
      hiring_date: new Date('2025-12-01'),
      request_date: null,
    } as unknown as CertificateRequest;

    const selected = service['selectPreferredRequestForCertificate']([
      encargoRequest,
      normalRequest,
    ]);

    expect(selected?.id).toBe('encargo');
  });

  it('usa la fecha de inicio del cargo activo normal aunque el certificado tome el encargo', () => {
    const normalRequest = {
      id: 'normal',
      career_category: 'Profesional Especializado Grado 14',
      position_category: 'Cra. Administrativa',
      observations: 'N',
      status: 'A',
      hiring_date: new Date('2024-05-14'),
      request_date: null,
      monthly_salary: 5912927,
      salary_text: '5912927',
    } as unknown as CertificateRequest;
    const encargoRequest = {
      id: 'encargo',
      career_category: 'Profesional Especializado Grado 16',
      position_category: 'Cra. Administrativa',
      observations: 'E',
      status: 'A',
      hiring_date: new Date('2025-05-01'),
      request_date: null,
      monthly_salary: 7048194,
      salary_text: '7048194',
    } as unknown as CertificateRequest;

    const merged = service['mergeRequestWithSalarySource'](
      encargoRequest,
      null,
      [encargoRequest, normalRequest],
    );

    expect(merged.id).toBe('encargo');
    expect(merged.career_category).toBe('Profesional Especializado Grado 16');
    expect(merged.monthly_salary).toBe(7048194);
    expect(merged.hiring_date).toEqual(new Date('2024-05-14'));
  });

  it('mantiene el primer encargo activo cuando hay mas de uno', () => {
    const firstEncargoRequest = {
      id: 'encargo-1',
      position_category: 'Cra. Administrativa',
      observations: 'E',
      status: 'A',
      hiring_date: new Date('2025-12-01'),
      request_date: null,
    } as unknown as CertificateRequest;
    const secondEncargoRequest = {
      id: 'encargo-2',
      position_category: 'Libre Nombramiento',
      observations: 'E',
      status: 'A',
      hiring_date: new Date('2025-12-01'),
      request_date: null,
    } as unknown as CertificateRequest;

    const selected = service['selectPreferredRequestForCertificate']([
      firstEncargoRequest,
      secondEncargoRequest,
    ]);

    expect(selected?.id).toBe('encargo-1');
  });

  it('prioriza FECHA_CREACION sobre FECHA_INGRESO entre encargos activos', () => {
    const ingresoMasReciente = {
      id: 'ingreso-mas-reciente',
      position_category: 'Cra. Administrativa',
      observations: 'E',
      status: 'A',
      hiring_date: new Date('2026-07-01'),
      request_date: new Date('2026-07-10'),
    } as unknown as CertificateRequest;
    const creacionMasReciente = {
      id: 'creacion-mas-reciente',
      position_category: 'Cra. Administrativa',
      observations: 'E',
      status: 'A',
      hiring_date: new Date('2026-06-01'),
      request_date: new Date('2026-08-01'),
    } as unknown as CertificateRequest;

    const selected = service['selectPreferredRequestForCertificate']([
      ingresoMasReciente,
      creacionMasReciente,
    ]);

    expect(selected?.id).toBe('creacion-mas-reciente');
  });

  it('usa FECHA_INGRESO para desempatar la misma FECHA_CREACION', () => {
    const ingresoAnterior = {
      id: 'ingreso-anterior',
      position_category: 'Cra. Administrativa',
      observations: 'E',
      status: 'A',
      hiring_date: new Date('2026-06-01'),
      request_date: new Date('2026-08-01'),
    } as unknown as CertificateRequest;
    const ingresoMasReciente = {
      id: 'ingreso-mas-reciente',
      position_category: 'Cra. Administrativa',
      observations: 'E',
      status: 'A',
      hiring_date: new Date('2026-07-01'),
      request_date: new Date('2026-08-01'),
    } as unknown as CertificateRequest;

    const selected = service['selectPreferredRequestForCertificate']([
      ingresoAnterior,
      ingresoMasReciente,
    ]);

    expect(selected?.id).toBe('ingreso-mas-reciente');
  });

  it('prioriza carrera administrativa sobre provisional cuando ambos registros estan activos y sin encargo', () => {
    const provisionalRequest = {
      id: 'provisional',
      position_category: 'Provisional',
      observations: 'N',
      status: 'A',
      hiring_date: new Date('2001-07-30'),
      request_date: null,
    } as unknown as CertificateRequest;
    const primaryRequest = {
      id: 'principal',
      position_category: 'Cra. Administrativa',
      observations: 'N',
      status: 'A',
      hiring_date: new Date('2001-07-30'),
      request_date: null,
    } as unknown as CertificateRequest;

    const selected = service['selectPreferredRequestForCertificate']([
      provisionalRequest,
      primaryRequest,
    ]);

    expect(selected?.id).toBe('principal');
  });

  it('mantiene el orden original cuando no existe un registro de carrera administrativa para desempatar', () => {
    const firstRequest = {
      id: 'provisional-1',
      position_category: 'Provisional',
      observations: 'N',
      status: 'A',
      hiring_date: new Date('2001-07-30'),
      request_date: null,
    } as unknown as CertificateRequest;
    const secondRequest = {
      id: 'provisional-2',
      position_category: 'Libre Nombramiento',
      observations: 'N',
      status: 'A',
      hiring_date: new Date('2001-07-30'),
      request_date: null,
    } as unknown as CertificateRequest;

    const selected = service['selectPreferredRequestForCertificate']([
      firstRequest,
      secondRequest,
    ]);

    expect(selected?.id).toBe('provisional-1');
  });

  it('prioriza el cod_cargo compatible que conserva el cero a la izquierda', () => {
    const selectedRequest = {
      id: 'selected',
      career_category: 'Jefe de Oficina',
      position_category: 'Administrativo',
      cod_cargo: '13718',
      cod_grade: '18',
      monthly_salary: 1000,
      salary_text: '1000',
    } as unknown as CertificateRequest;
    const requestWithLeadingZero = {
      id: 'better-code',
      career_category: 'Jefe de Oficina',
      position_category: 'Administrativo',
      cod_cargo: '013718',
      cod_grade: '18',
      monthly_salary: 950,
      salary_text: '950',
    } as unknown as CertificateRequest;

    const merged = service['mergeRequestWithSalarySource'](
      selectedRequest,
      null,
      [selectedRequest, requestWithLeadingZero],
    );

    expect(merged.cod_cargo).toBe('013718');
    expect(merged.cod_grade).toBe('18');
    expect(merged.monthly_salary).toBe(1000);
  });

  it('no toma el cod_cargo de otro cargo diferente', () => {
    const selectedRequest = {
      id: 'selected',
      career_category: 'Jefe de Oficina',
      position_category: 'Administrativo',
      cod_cargo: '13718',
      cod_grade: '18',
      monthly_salary: 1000,
      salary_text: '1000',
    } as unknown as CertificateRequest;
    const unrelatedRequest = {
      id: 'other-role',
      career_category: 'Auxiliar de Servicios Generales',
      position_category: 'Administrativo',
      cod_cargo: '013718',
      cod_grade: '18',
      monthly_salary: 950,
      salary_text: '950',
    } as unknown as CertificateRequest;

    const merged = service['mergeRequestWithSalarySource'](
      selectedRequest,
      null,
      [selectedRequest, unrelatedRequest],
    );

    expect(merged.cod_cargo).toBe('13718');
  });

  it('rellena el cero perdido cuando el valor llega como numero compacto', () => {
    const normalized = service['normalizePersistedCodeValue'](13718, 18);

    expect(normalized).toBe('013718');
  });

  it('rehidrata un certificado existente con el cod_cargo compatible que conserva el cero', () => {
    const certificate = {
      id: 'cert-1',
      request_id: 'selected',
      id_number: '1049615021',
      cod_cargo: '13718',
      cod_grade: '18',
      request: {
        id: 'selected',
        id_number: '1049615021',
        career_category: 'Jefe de Oficina',
        position_category: 'Administrativo',
        cod_cargo: '13718',
        cod_grade: '18',
        monthly_salary: 1000,
        salary_text: '1000',
      },
    } as unknown as Certificate & { request: CertificateRequest };

    const requestWithLeadingZero = {
      id: 'better-code',
      id_number: '1049615021',
      career_category: 'Jefe de Oficina',
      position_category: 'Administrativo',
      cod_cargo: '013718',
      cod_grade: '18',
      monthly_salary: 950,
      salary_text: '950',
    } as unknown as CertificateRequest;

    service['applyRequestContextToCertificate'](certificate, [
      certificate.request,
      requestWithLeadingZero,
    ]);

    expect(certificate.cod_cargo).toBe('013718');
    expect(certificate.request.cod_cargo).toBe('013718');
  });

  it('redirige los codigos de validacion al correo seguro del microservicio', async () => {
    const originalFetch = global.fetch;
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as any;
    (service as any).logger = {
      debug: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
    };

    try {
      await service['enviarCodigoPorEmail'](
        'docente.real@esap.edu.co',
        '123456',
      );

      const request = fetchMock.mock.calls[0][1];
      const payload = JSON.parse(request.body);
      expect(payload).toEqual({
        to: 'pruebasesap@gmail.com',
        code: '123456',
      });
      expect(JSON.stringify(payload)).not.toContain(
        'docente.real@esap.edu.co',
      );
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('redirige los certificados adjuntos al correo seguro del microservicio', async () => {
    const originalFetch = global.fetch;
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as any;
    (service as any).logger = {
      debug: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
    };
    (service as any).laborPdfService = {
      generateCertificatePdf: jest.fn().mockResolvedValue({
        filename: 'certificado.pdf',
        buffer: Buffer.from('pdf-de-prueba'),
      }),
    };

    try {
      const result = await service['enviarCertificadoLaboralPorEmail'](
        {
          full_name: 'Persona de Prueba',
          certificate_number: 'CERT-PRUEBA',
          include_salary: true,
          include_technical_bonus: false,
          request: { email: 'administrativo.real@esap.edu.co' },
        } as any,
      );

      const request = fetchMock.mock.calls[0][1];
      const payload = JSON.parse(request.body);
      expect(payload.to).toBe('pruebasesap@gmail.com');
      expect(payload.attachmentName).toBe('certificado.pdf');
      expect(JSON.stringify(payload)).not.toContain(
        'administrativo.real@esap.edu.co',
      );
      expect(result.to).toBe('pruebasesap@gmail.com');
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('construye el correo de aprobación con PDF, descripción y evidencias', async () => {
    const originalFetch = global.fetch;
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as any;
    (service as any).logger = { debug: jest.fn(), log: jest.fn(), warn: jest.fn() };
    (service as any).laborPdfService = {
      generateCertificatePdf: jest.fn().mockResolvedValue({
        filename: 'certificado-corregido.pdf',
        buffer: Buffer.from('pdf-corregido'),
      }),
    };

    try {
      await service['enviarCertificadoLaboralPorEmail'](
        {
          full_name: 'Persona de Prueba',
          certificate_number: 'CERT-APROBADO',
          include_salary: true,
          include_technical_bonus: false,
        } as any,
        {
          to: 'persona@esap.edu.co',
          correctionMessage: 'Se corrigió la dependencia conforme a la evidencia aportada.',
          correctionRequestNumber: 'COR-PRUEBA-001',
          correctionEvidenceCount: 1,
          additionalAttachments: [{
            filename: 'soporte.png',
            contentBase64: Buffer.from('imagen').toString('base64'),
            contentType: 'image/png',
          }],
        },
      );

      const request = fetchMock.mock.calls[0][1];
      const payload = JSON.parse(request.body);
      expect(payload.subject).toContain('Corrección aprobada COR-PRUEBA-001');
      expect(payload.attachmentName).toBe('certificado-corregido.pdf');
      expect(payload.additionalAttachments).toHaveLength(1);
      expect(payload.additionalAttachments[0].filename).toBe('soporte.png');
      expect(payload.html).toContain('Tu solicitud de corrección fue aprobada');
      expect(payload.html).toContain('Se corrigió la dependencia');
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('construye el correo de rechazo con descripción y evidencias adjuntas', async () => {
    const originalFetch = global.fetch;
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as any;
    (service as any).logger = { debug: jest.fn(), log: jest.fn(), warn: jest.fn() };

    try {
      await service['sendCorrectionRejectionEmail'](
        {
          request_number: 'COR-PRUEBA-002',
          requester_name: 'Persona de Prueba',
          requester_email: 'persona@esap.edu.co',
          resolution_description: 'La información del certificado coincide con los soportes institucionales.',
          certificate: { certificate_number: 'CERT-RECHAZADO' },
        } as any,
        [{
          originalname: 'respuesta.png',
          path: __filename,
          mimetype: 'image/png',
        }],
      );

      const request = fetchMock.mock.calls[0][1];
      const payload = JSON.parse(request.body);
      expect(payload.subject).toContain('Corrección no aprobada COR-PRUEBA-002');
      expect(payload.attachments).toHaveLength(1);
      expect(payload.attachments[0].filename).toBe('respuesta.png');
      expect(payload.html).toContain('Descripción de la decisión');
      expect(payload.html).toContain('CERT-RECHAZADO');
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('exige una descripción explícita para aprobar y rechazar', async () => {
    (service as any).correctionRequestRepo = {
      findOne: jest.fn().mockResolvedValue({ status: 'IN_REVIEW' }),
    };

    await expect(
      service.approveCertificateCorrectionRequest('request-id', {}, {}, []),
    ).rejects.toThrow('descripción de la aprobación');
    await expect(
      service.rejectCertificateCorrectionRequest('request-id', '', [], {}),
    ).rejects.toThrow('motivo del rechazo');
  });

  it('reenvía una corrección aprobada con su snapshot, respuesta y trazabilidad', async () => {
    const save = jest.fn(async (value) => value);
    const request = {
      id: 'correction-approved-id',
      request_number: 'COR-PRUEBA-REENVIO',
      status: 'APPROVED',
      requester_email: 'persona@esap.edu.co',
      requester_name: 'Persona de Prueba',
      resolution_description:
        'Se corrigió la dependencia conforme a la información institucional.',
      resolution_evidence: [{ originalName: 'soporte.png' }],
      traceability: [],
      reviewed_by_name: 'Coordinador original',
      reviewed_by_email: 'coordinador@esap.edu.co',
      corrected_data: {
        certificate_number: 'CERT-CORREGIDO-001',
        full_name: 'NOMBRE APROBADO',
        department: 'DEPENDENCIA APROBADA',
        include_salary: true,
        include_technical_bonus: false,
      },
      certificate: {
        id: 'certificate-id',
        certificate_number: 'CERT-CORREGIDO-001',
        full_name: 'NOMBRE CAMBIADO DESPUÉS',
        department: 'DEPENDENCIA CAMBIADA DESPUÉS',
        status: 'VALID',
        template_snapshot: { version: 'aprobada' },
        request: { email: 'persona@esap.edu.co' },
      },
    };
    (service as any).correctionRequestRepo = {
      findOne: jest.fn().mockResolvedValue(request),
      save,
    };
    jest
      .spyOn(service as any, 'tieneFormatoCorreoValido')
      .mockReturnValue(true);
    jest
      .spyOn(service as any, 'ensureTemplateSnapshotForCertificate')
      .mockResolvedValue(undefined);
    jest
      .spyOn(service as any, 'correctionEmailAttachmentsFromEvidence')
      .mockReturnValue([{
        filename: 'soporte.png',
        contentBase64: 'aW1hZ2Vu',
        contentType: 'image/png',
      }]);
    const send = jest
      .spyOn(service as any, 'enviarCertificadoLaboralPorEmail')
      .mockResolvedValue({ to: 'pruebasesap@gmail.com' });

    const result = await service.resendApprovedCertificateCorrectionRequest(
      request.id,
      { name: 'Coordinador reenvío', email: 'reenvio@esap.edu.co' },
      { publicBaseUrl: 'https://comunidades.esap.edu.co' },
    );

    const [approvedCertificate, emailOptions] = send.mock.calls[0];
    expect(approvedCertificate.full_name).toBe('NOMBRE APROBADO');
    expect(approvedCertificate.department).toBe('DEPENDENCIA APROBADA');
    expect(approvedCertificate.template_snapshot).toEqual({ version: 'aprobada' });
    expect(emailOptions).toMatchObject({
      to: 'persona@esap.edu.co',
      correctionRequestNumber: 'COR-PRUEBA-REENVIO',
      correctionMessage:
        'Se corrigió la dependencia conforme a la información institucional.',
      correctionEvidenceCount: 1,
      publicBaseUrl: 'https://comunidades.esap.edu.co',
    });
    expect(emailOptions.additionalAttachments).toHaveLength(1);
    expect(save).toHaveBeenCalledTimes(1);
    expect(request.traceability).toHaveLength(1);
    expect(request.traceability[0]).toMatchObject({
      type: 'CERTIFICATE_RESENT',
      status: 'APPROVED',
      actor_name: 'Coordinador reenvío',
      metadata: {
        recipient: 'pruebasesap@gmail.com',
        delivery_status: 'SENT',
        evidence_count: 1,
        resend: true,
      },
    });
    expect(result.email_sent).toBe(true);
  });

  it('impide reenviar una solicitud que todavía no fue aprobada', async () => {
    const save = jest.fn();
    (service as any).correctionRequestRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'correction-pending-id',
        status: 'IN_REVIEW',
      }),
      save,
    };

    await expect(
      service.resendApprovedCertificateCorrectionRequest(
        'correction-pending-id',
        { name: 'Coordinador' },
      ),
    ).rejects.toThrow('Solo se pueden reenviar certificados');
    expect(save).not.toHaveBeenCalled();
  });

  it('no guarda el rechazo cuando falla el correo institucional', async () => {
    const save = jest.fn();
    const request = {
      id: 'request-id',
      request_number: 'COR-PRUEBA-003',
      status: 'IN_REVIEW',
      requester_email: 'persona@esap.edu.co',
      submitted_evidence: [],
      resolution_evidence: [],
      traceability: [],
      certificate: { certificate_number: 'CERT-003' },
    };
    (service as any).correctionRequestRepo = {
      findOne: jest.fn().mockResolvedValue(request),
      save,
    };
    jest
      .spyOn(service as any, 'sendCorrectionRejectionEmail')
      .mockRejectedValue(new Error('servicio de correo no disponible'));

    await expect(
      service.rejectCertificateCorrectionRequest(
        'request-id',
        'La solicitud no procede conforme a la evidencia institucional.',
        [],
        { name: 'Coordinador' },
      ),
    ).rejects.toThrow('servicio de correo no disponible');
    expect(save).not.toHaveBeenCalled();
  });

  it('envia el certificado desde el autoservicio despues de validar el codigo', async () => {
    const solicitud = {
      id: 'solicitud-autoservicio',
      id_number: '53062883',
      document_type: 'CC',
      email: 'empleado@esap.edu.co',
      status: 'A',
      validation_code: '123456',
      validation_expires_at: new Date(Date.now() + 60_000),
    } as unknown as CertificateRequest;
    const certificado = {
      id: 'certificado-autoservicio',
      request: solicitud,
    } as unknown as Certificate;
    const update = jest.fn().mockResolvedValue(undefined);
    (service as any).requestRepo = {
      findOne: jest.fn().mockResolvedValue(solicitud),
      save: jest.fn().mockResolvedValue(solicitud),
      update,
    };
    jest
      .spyOn(service as any, 'resolveEmploymentStatus')
      .mockReturnValue('ACTIVO');
    jest.spyOn(service, 'createCertificado').mockResolvedValue(certificado);
    const enviar = jest
      .spyOn(service as any, 'enviarCertificadoLaboralPorEmail')
      .mockResolvedValue({ to: 'empleado@esap.edu.co' });

    const result = await service.validarCodigoYGenerarCertificado(
      '53062883',
      '123456',
      {
        documentType: 'CC',
        includeSalary: true,
        includeTechnicalBonus: true,
        includeFunctions: true,
        publicBaseUrl: 'https://comunidad.esap.edu.co',
      },
    );

    expect(update).toHaveBeenCalledWith(solicitud.id, {
      validation_code: null,
      validation_expires_at: null,
    });
    expect(enviar).toHaveBeenCalledWith(certificado, {
      to: 'empleado@esap.edu.co',
      includeSalary: true,
      includeTechnicalBonus: true,
      includeFunctions: true,
      publicBaseUrl: 'https://comunidad.esap.edu.co',
    });
    expect(update.mock.invocationCallOrder[0]).toBeLessThan(
      enviar.mock.invocationCallOrder[0],
    );
    expect(result).toMatchObject({
      certificado,
      emailSent: true,
      email: 'empleado@esap.edu.co',
    });
  });

  it('conserva el certificado generado si falla el correo del autoservicio', async () => {
    const solicitud = {
      id: 'solicitud-autoservicio',
      id_number: '53062883',
      document_type: 'CC',
      email: 'empleado@esap.edu.co',
      status: 'A',
      validation_code: '123456',
      validation_expires_at: new Date(Date.now() + 60_000),
    } as unknown as CertificateRequest;
    const certificado = {
      id: 'certificado-autoservicio',
      request: solicitud,
    } as unknown as Certificate;
    (service as any).requestRepo = {
      findOne: jest.fn().mockResolvedValue(solicitud),
      save: jest.fn().mockResolvedValue(solicitud),
      update: jest.fn().mockResolvedValue(undefined),
    };
    (service as any).logger = { warn: jest.fn() };
    jest
      .spyOn(service as any, 'resolveEmploymentStatus')
      .mockReturnValue('ACTIVO');
    jest.spyOn(service, 'createCertificado').mockResolvedValue(certificado);
    jest
      .spyOn(service as any, 'enviarCertificadoLaboralPorEmail')
      .mockRejectedValue(new Error('notifications-service no disponible'));

    const result = await service.validarCodigoYGenerarCertificado(
      '53062883',
      '123456',
    );

    expect(result).toMatchObject({
      certificado,
      emailSent: false,
      email: 'empleado@esap.edu.co',
    });
    expect((service as any).logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('notifications-service no disponible'),
    );
  });
});
