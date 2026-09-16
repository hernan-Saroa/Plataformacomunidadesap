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

  describe('montos al aprobar una correccion', () => {
    const normalize = (input: any, certificate: any) =>
      service['normalizeCorrectedCertificateData'](
        {
          full_name: 'DIANA MARIA GUTIERREZ RAMIREZ',
          document_type: 'CC',
          id_number: '53062883',
          career_category: 'Profesional Especializado',
          position_category: 'Cra. Administrativa',
          hiring_date: '2024-05-14',
          department: 'Dirección de Talento Humano',
          campus: 'Bogotá',
          ...certificate,
        } as any,
        input,
      );

    it('conserva los centavos del monto calculado cuando no se editó', () => {
      // La prima es salario x porcentaje: 1508313.52 llega al formulario como
      // 1508314 porque la corrección solo admite pesos enteros.
      const patch = normalize(
        { technical_bonus: 1508314, include_technical_bonus: true },
        { technical_bonus: '1508313.52', include_technical_bonus: true },
      );

      expect(Number(patch.technical_bonus)).toBe(1508313.52);
    });

    it('aplica el monto nuevo cuando sí se editó', () => {
      const patch = normalize(
        { technical_bonus: 1600000, include_technical_bonus: true },
        { technical_bonus: '1508313.52', include_technical_bonus: true },
      );

      expect(Number(patch.technical_bonus)).toBe(1600000);
    });

    it('sigue rechazando un monto con decimales escrito a mano', () => {
      expect(() =>
        normalize(
          { technical_bonus: 1508313.99, include_technical_bonus: true },
          { technical_bonus: '1000000', include_technical_bonus: true },
        ),
      ).toThrow('pesos enteros');
    });

    it('no falla cuando el monto no viene en la petición', () => {
      const patch = normalize(
        { include_technical_bonus: true },
        { technical_bonus: '1508313.52', include_technical_bonus: true },
      );

      expect(Number(patch.technical_bonus)).toBe(1508313.52);
    });

    it('aplica el mismo criterio al salario', () => {
      const conservado = normalize(
        { monthly_salary: 4772636 },
        { monthly_salary: '4772635.60' },
      );
      expect(Number(conservado.monthly_salary)).toBe(4772635.6);

      const editado = normalize(
        { monthly_salary: 5000000 },
        { monthly_salary: '4772635.60' },
      );
      expect(Number(editado.monthly_salary)).toBe(5000000);
    });
  });

  describe('comparativo de cambios en montos', () => {
    const changes = (before: any, after: any) =>
      service['correctionChanges'](before, after);

    it('no reporta cambio cuando solo se perdieron los centavos', () => {
      // Caso real: la prima llega de Oracle con centavos y el formulario de
      // corrección la redondea al abrirse, sin que el coordinador toque nada.
      expect(changes({ technical_bonus: '1508313.52' }, { technical_bonus: 1508314 })).toEqual([]);
      expect(changes({ monthly_salary: '4772636.40' }, { monthly_salary: 4772636 })).toEqual([]);
    });

    it('sigue reportando un cambio real de monto', () => {
      const resultado = changes(
        { technical_bonus: '1508313.52' },
        { technical_bonus: 1600000 },
      );
      expect(resultado).toEqual([
        {
          field: 'technical_bonus',
          label: 'Prima técnica o de coordinación',
          before: '1508314',
          after: '1600000',
        },
      ]);
    });

    it('detecta una diferencia de un solo peso', () => {
      expect(changes({ monthly_salary: 100 }, { monthly_salary: 101 })).toHaveLength(1);
    });

    it('tolera montos vacíos o no numéricos sin inventar cambios', () => {
      expect(changes({ technical_bonus: null }, { technical_bonus: 0 })).toEqual([]);
      expect(changes({ technical_bonus: undefined }, { technical_bonus: '0' })).toEqual([]);
    });

    it('no altera la comparación de los demás campos', () => {
      expect(
        changes({ department: 'Dirección A' }, { department: 'Dirección B' }),
      ).toHaveLength(1);
      expect(changes({ department: 'Igual' }, { department: 'Igual' })).toEqual([]);
    });
  });

  describe('ordenamiento de la bandeja de correcciones', () => {
    const resolve = (sort?: string) =>
      service['resolveCorrectionSort'](sort as any);

    it('acepta cada columna de la lista blanca', () => {
      expect(resolve('status')).toEqual({ column: 'correction.status', field: 'status' });
      expect(resolve('request_number')).toEqual({
        column: 'correction.request_number',
        field: 'request_number',
      });
      expect(resolve('requester_name')).toEqual({
        column: 'correction.requester_name',
        field: 'requester_name',
      });
      expect(resolve('certificate_number')).toEqual({
        column: 'certificate.certificate_number',
        field: 'certificate_number',
      });
      expect(resolve('created_at')).toEqual({
        column: 'correction.created_at',
        field: 'created_at',
      });
      expect(resolve('due_date')).toEqual({
        column: 'correction.due_date',
        field: 'due_date',
      });
    });

    it('cae a la fecha de recepción ante cualquier valor desconocido', () => {
      const porDefecto = { column: 'correction.created_at', field: 'created_at' };
      expect(resolve(undefined)).toEqual(porDefecto);
      expect(resolve('')).toEqual(porDefecto);
      expect(resolve('resolution_description')).toEqual(porDefecto);
      expect(resolve('correction.created_at')).toEqual(porDefecto);
    });

    it('nunca deja pasar texto arbitrario al ORDER BY', () => {
      // El ORDER BY no admite parámetros vinculados: la unica defensa es que la
      // columna salga siempre del mapa.
      const inyecciones = [
        'created_at; DROP TABLE certification.certificates',
        "created_at' OR '1'='1",
        '(SELECT 1)',
        '1',
        '__proto__',
        'constructor',
      ];
      for (const intento of inyecciones) {
        expect(resolve(intento)).toEqual({
          column: 'correction.created_at',
          field: 'created_at',
        });
      }
    });

    it('normaliza mayúsculas y espacios de la columna', () => {
      expect(resolve('  DUE_DATE  ')).toEqual({
        column: 'correction.due_date',
        field: 'due_date',
      });
    });
  });

  describe('avisos al radicar una solicitud de correccion', () => {
    const buildRequest = () =>
      ({
        request_number: 'COR-20260915-ABC12345',
        description: 'El cargo del certificado no corresponde al actual.',
        requester_name: 'Diana Maria Gutierrez',
        requester_email: 'solicitante@gmail.com',
        certificate_snapshot: {
          certificate_number: '12_620_700_20_CD 104',
          id_number: '53062883',
        },
        created_at: new Date(2026, 8, 15, 10, 42, 0),
        due_date: new Date(2026, 9, 6, 12, 0, 0),
      }) as any;

    const prepare = (
      reviewers: Array<{ email: string; name: string | null }>,
      post = jest.fn().mockResolvedValue(undefined),
    ) => {
      (service as any).logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
      (service as any).permissionsService = {
        findActiveRecipientsWithPermission: jest.fn().mockResolvedValue(reviewers),
      };
      // Sin modo seguro, para verificar los destinatarios reales.
      (service as any).resolveOutboundEmailRecipient = (email: string) => email;
      (service as any).postCorrectionNotificationEmail = post;
      return post;
    };

    it('envia el acuse al solicitante y un aviso a cada revisor con el permiso', async () => {
      const post = prepare([
        { email: 'coordinador@esap.edu.co', name: 'Coordinador Uno' },
        { email: 'revisor@esap.edu.co', name: null },
      ]);

      await service['sendCorrectionRequestCreatedEmails'](buildRequest(), 2);

      expect(post).toHaveBeenCalledTimes(3);
      const [acuse, ...avisos] = post.mock.calls.map((call) => call[0]);

      expect(acuse.to).toBe('solicitante@gmail.com');
      expect(acuse.subject).toContain('COR-20260915-ABC12345 radicada');
      expect(acuse.html).toContain('Recibimos tu solicitud de corrección');
      // El acuse no expone informacion interna del tramite.
      expect(acuse.html).not.toContain('bandeja de correcciones');

      expect(avisos.map((aviso: any) => aviso.to)).toEqual([
        'coordinador@esap.edu.co',
        'revisor@esap.edu.co',
      ]);
      expect(avisos[0].subject).toContain('Nueva solicitud de corrección');
      expect(avisos[0].html).toContain('Coordinador Uno');
      expect(avisos[0].html).toContain('12_620_700_20_CD 104');
      expect(avisos[0].html).toContain('53062883');
      expect(avisos[0].html).toContain('2 archivos');
      // Sin nombre de persona el aviso sale igual, con saludo generico.
      expect(avisos[1].html).toContain('Se radicó una solicitud');
    });

    it('no interrumpe el radicado cuando el servicio de notificaciones falla', async () => {
      const post = prepare(
        [{ email: 'coordinador@esap.edu.co', name: 'Coordinador Uno' }],
        jest.fn().mockRejectedValue(new Error('notifications-service no disponible')),
      );

      await expect(
        service['sendCorrectionRequestCreatedEmails'](buildRequest(), 0),
      ).resolves.toBeUndefined();

      expect(post).toHaveBeenCalledTimes(2);
      expect((service as any).logger.error).toHaveBeenCalledWith(
        expect.stringContaining('acuse de recibo'),
      );
      expect((service as any).logger.error).toHaveBeenCalledWith(
        expect.stringContaining('falló para 1 de 1'),
      );
    });

    it('envia el acuse aunque no haya nadie con el permiso y deja el aviso en el log', async () => {
      const post = prepare([]);

      await service['sendCorrectionRequestCreatedEmails'](buildRequest(), 0);

      expect(post).toHaveBeenCalledTimes(1);
      expect(post.mock.calls[0][0].to).toBe('solicitante@gmail.com');
      expect((service as any).logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('no tiene revisores con el permiso'),
      );
    });

    it('en modo seguro sigue avisando por cada revisor, marcando el destinatario real', async () => {
      const post = jest.fn().mockResolvedValue(undefined);
      prepare(
        [
          { email: 'coordinador@esap.edu.co', name: 'Coordinador Uno' },
          { email: 'revisor@esap.edu.co', name: 'Revisor Dos' },
        ],
        post,
      );
      (service as any).resolveOutboundEmailRecipient = () => 'pruebasesap@gmail.com';

      await service['sendCorrectionRequestCreatedEmails'](buildRequest(), 0);

      // Un acuse + un aviso POR REVISOR: antes se deduplicaba por el correo ya
      // redirigido y los dos colapsaban en un unico envio, con lo que parecia
      // que solo se avisaba al primero de la lista.
      expect(post).toHaveBeenCalledTimes(3);
      const avisos = post.mock.calls.slice(1).map((call) => call[0]);
      expect(avisos.every((aviso: any) => aviso.to === 'pruebasesap@gmail.com')).toBe(true);
      expect(avisos[0].subject).toContain('[Para coordinador@esap.edu.co]');
      expect(avisos[1].subject).toContain('[Para revisor@esap.edu.co]');
      expect(avisos[0].html).toContain('Coordinador Uno');
      expect(avisos[1].html).toContain('Revisor Dos');
    });

    it('deduplica por el correo real cuando alguien tiene el permiso por varios roles', async () => {
      const post = prepare([
        { email: 'coordinador@esap.edu.co', name: 'Coordinador Uno' },
        { email: 'COORDINADOR@esap.edu.co', name: 'Coordinador Uno' },
        { email: 'revisor@esap.edu.co', name: 'Revisor Dos' },
      ]);

      await service['sendCorrectionRequestCreatedEmails'](buildRequest(), 0);

      // Un acuse + dos avisos: la misma persona no recibe el aviso dos veces.
      expect(post).toHaveBeenCalledTimes(3);
      expect(post.mock.calls.slice(1).map((call) => call[0].to)).toEqual([
        'coordinador@esap.edu.co',
        'revisor@esap.edu.co',
      ]);
    });

    it('sin redireccion no altera el asunto', async () => {
      const post = prepare([{ email: 'coordinador@esap.edu.co', name: 'Coordinador Uno' }]);

      await service['sendCorrectionRequestCreatedEmails'](buildRequest(), 0);

      expect(post.mock.calls[1][0].subject).not.toContain('[Para ');
    });
  });

  describe('avisos al resolver una solicitud de correccion', () => {
    const buildResolved = (approved: boolean) =>
      ({
        request_number: 'COR-20260915-UD3PW0TDN',
        description: 'El cargo del certificado no corresponde al que desempeño hoy.',
        requester_name: 'DIANA MARIA GUTIERREZ RAMIREZ',
        requester_email: 'esap.pruebas@gmail.com',
        reviewed_by_name: 'Diego Fernando Ramírez',
        reviewed_by_email: 'diego.ramirez@esap.edu.co',
        resolution_description: approved
          ? 'Se actualizó el cargo conforme a la resolución de encargo aportada.'
          : 'La evidencia aportada no corresponde al periodo certificado.',
        resolved_at: new Date(2026, 8, 15, 15, 20, 0),
        certificate_snapshot: {
          certificate_number: '12_620_700_20_CD 104',
          id_number: '53062883',
        },
      }) as any;

    const prepare = (post = jest.fn().mockResolvedValue(undefined)) => {
      (service as any).logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
      (service as any).permissionsService = {
        findActiveRecipientsWithPermission: jest
          .fn()
          .mockResolvedValue([
            { email: 'coordinador@esap.edu.co', name: 'Coordinador Uno' },
            { email: 'revisor@esap.edu.co', name: 'Revisor Dos' },
          ]),
      };
      (service as any).resolveOutboundEmailRecipient = (email: string) => email;
      (service as any).postCorrectionNotificationEmail = post;
      return post;
    };

    it('avisa la aprobación a cada revisor con el comparativo de cambios', async () => {
      const post = prepare();

      await service['sendCorrectionResolutionReviewerEmails'](buildResolved(true), {
        approved: true,
        changes: [
          {
            label: 'Cargo',
            before: 'Profesional Especializado Código 2028 Grado 12',
            after: 'Profesional Especializado Código 2028 Grado 16',
          },
          { label: 'Grado', before: '12', after: '16' },
        ],
        evidenceCount: 1,
        certificateNumber: '12_620_700_20_CD 104',
      });

      expect(post).toHaveBeenCalledTimes(2);
      const aviso = post.mock.calls[0][0];
      expect(aviso.to).toBe('coordinador@esap.edu.co');
      expect(aviso.subject).toContain('COR-20260915-UD3PW0TDN aprobada');
      expect(aviso.text).toContain('Campos modificados: Cargo, Grado.');
      expect(aviso.html).toContain('2 campos modificados');
      expect(aviso.html).toContain('Antes');
      expect(aviso.html).toContain('Grado 12');
      expect(aviso.html).toContain('Grado 16');
      expect(aviso.html).toContain('Diego Fernando Ramírez');
      expect(aviso.html).toContain('Coordinador Uno');
    });

    it('no repite la direccion cuando el revisor no tiene nombre propio', async () => {
      const post = prepare();
      const request = buildResolved(true);
      // El token sin `name` deja el username (que aqui es el correo) como nombre.
      request.reviewed_by_name = 'superuser@esap.edu.co';
      request.reviewed_by_email = 'superuser@esap.edu.co';

      await service['sendCorrectionResolutionReviewerEmails'](request, {
        approved: true,
        changes: [],
        evidenceCount: 0,
        certificateNumber: '12_620_700_20_CD 107',
      });

      const html = post.mock.calls[0][0].html;
      const bloque = html.slice(html.indexOf('Resuelta por'));
      const ocurrencias = bloque.split('superuser@esap.edu.co').length - 1;
      expect(ocurrencias).toBe(1);
    });

    it('muestra nombre y correo cuando son datos distintos', async () => {
      const post = prepare();

      await service['sendCorrectionResolutionReviewerEmails'](buildResolved(true), {
        approved: true,
        changes: [],
        evidenceCount: 0,
        certificateNumber: '12_620_700_20_CD 107',
      });

      const html = post.mock.calls[0][0].html;
      expect(html).toContain('Diego Fernando Ramírez');
      expect(html).toContain('diego.ramirez@esap.edu.co');
    });

    it('avisa el rechazo con el motivo y sin comparativo de cambios', async () => {
      const post = prepare();

      await service['sendCorrectionResolutionReviewerEmails'](buildResolved(false), {
        approved: false,
        changes: [],
        evidenceCount: 0,
        certificateNumber: '12_620_700_20_CD 104',
      });

      const aviso = post.mock.calls[0][0];
      expect(aviso.subject).toContain('COR-20260915-UD3PW0TDN rechazada');
      expect(aviso.html).toContain('Motivo del rechazo');
      expect(aviso.html).toContain('no corresponde al periodo certificado');
      expect(aviso.html).not.toContain('Cambios aplicados al certificado');
    });

    it('indica cuando se reemitió el certificado sin cambios de información', async () => {
      const post = prepare();

      await service['sendCorrectionResolutionReviewerEmails'](buildResolved(true), {
        approved: true,
        changes: [],
        evidenceCount: 0,
        certificateNumber: '12_620_700_20_CD 104',
      });

      expect(post.mock.calls[0][0].html).toContain(
        'No se modificaron datos del certificado',
      );
    });

    it('recorta los valores muy largos del comparativo', () => {
      const largo = 'Funciones: '.concat('a'.repeat(400));
      const html = service['buildCorrectionChangesBlockHtml']([
        { label: 'Funciones laborales', before: 'Sin funciones', after: largo },
      ]);

      expect(html).toContain('…');
      expect(html).not.toContain('a'.repeat(300));
    });

    it('no interrumpe la resolución cuando el aviso interno falla', async () => {
      const post = prepare(
        jest.fn().mockRejectedValue(new Error('notifications-service no disponible')),
      );

      await expect(
        service['sendCorrectionResolutionReviewerEmails'](buildResolved(true), {
          approved: true,
          changes: [],
          evidenceCount: 0,
          certificateNumber: '12_620_700_20_CD 104',
        }),
      ).resolves.toBeUndefined();

      expect(post).toHaveBeenCalledTimes(2);
      expect((service as any).logger.error).toHaveBeenCalledWith(
        expect.stringContaining('falló para 2 de 2'),
      );
    });

    it('registra el rechazo aunque no se pueda resolver a quién avisar', async () => {
      const save = jest.fn();
      const request = {
        id: 'request-id',
        request_number: 'COR-PRUEBA-004',
        status: 'IN_REVIEW',
        requester_email: 'persona@esap.edu.co',
        submitted_evidence: [],
        resolution_evidence: [],
        traceability: [],
        certificate: { certificate_number: 'CERT-004' },
      };
      (service as any).logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
      (service as any).correctionRequestRepo = {
        findOne: jest.fn().mockResolvedValue(request),
        save,
      };
      jest
        .spyOn(service as any, 'sendCorrectionRejectionEmail')
        .mockResolvedValue({ to: 'persona@esap.edu.co' });
      (service as any).permissionsService = {
        findActiveRecipientsWithPermission: jest
          .fn()
          .mockRejectedValue(new Error('auth no disponible')),
      };

      await expect(
        service.rejectCertificateCorrectionRequest(
          'request-id',
          'La solicitud no procede conforme a la evidencia institucional.',
          [],
          { name: 'Coordinador' },
        ),
      ).resolves.toMatchObject({ email_sent: true });

      // El rechazo quedó guardado pese al fallo del aviso interno.
      expect(save).toHaveBeenCalled();
      expect((service as any).logger.error).toHaveBeenCalledWith(
        expect.stringContaining('No fue posible resolver los revisores'),
      );
    });
  });
});
