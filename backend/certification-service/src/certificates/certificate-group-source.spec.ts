import { Certificate } from './certificate.entity';
import { CertificateRequest } from './certificate-request.entity';
import { CertificatesService } from './certificates.service';
import { LaborCertificatePdfService } from './labor-certificate-pdf.service';

/**
 * [GRUPO] imprime el grupo interno de trabajo (`internal_group` y, si no hay,
 * `cost_center`: en las filas de Oracle el CENTROCOSTO ES el grupo) y solo cae
 * a la ubicacion del cargo (`position_location`) cuando la solicitud no trae
 * grupo. La regla vale para las dos plantillas y para los certificados
 * corregidos, donde manda lo que guardo el coordinador.
 */
describe('[GRUPO] toma el grupo interno de trabajo', () => {
  const service = Object.create(CertificatesService.prototype) as CertificatesService;
  const pdf = Object.create(LaborCertificatePdfService.prototype) as LaborCertificatePdfService;

  const solicitud = (overrides: Record<string, unknown> = {}) =>
    ({
      id: 'solicitud',
      id_number: '53062883',
      status: 'A',
      observations: 'N',
      position_category: 'Cra. Administrativa',
      career_category: 'Profesional Especializado Grado 16',
      cod_cargo: '2028',
      cod_grade: '16',
      hiring_date: '2024-05-14',
      department: 'Direccion de Talento Humano',
      organization_department: 'Direccion de Talento Humano',
      internal_group: 'Grupo de Administracion de Personal',
      cost_center: null,
      position_location: 'Ubicacion de la solicitud',
      monthly_salary: 1000000,
      ...overrides,
    }) as unknown as CertificateRequest;

  const certificado = (
    overrides: Record<string, unknown> = {},
    requestOverrides: Record<string, unknown> = {},
  ) => {
    const request = solicitud(requestOverrides);
    return {
      ...request,
      certificate_number: 'CERT-GRUPO',
      full_name: 'PERSONA DE PRUEBA',
      request,
      ...overrides,
    } as unknown as Certificate;
  };

  const render = (
    certificate: Certificate,
    templateType: 'administrador' | 'docente' = 'administrador',
  ) =>
    pdf['buildCertificateContent']({
      certificate,
      templateType,
      includeSalary: false,
      includeTechnicalBonus: false,
      templateHtml: '<p>GRUPO:[GRUPO]</p><p>DEP:[DEPENDENCIA]</p>',
    });

  it.each(['administrador', 'docente'] as const)(
    'imprime el grupo interno antes que la ubicacion del cargo (%s)',
    (templateType) => {
      const html = render(certificado(), templateType);

      expect(html).toContain('GRUPO:Grupo de Administracion de Personal');
      expect(html).not.toContain('GRUPO:Ubicacion de la solicitud');
    },
  );

  it.each([
    { internal_group: null, esperado: 'Ubicacion de la solicitud' },
    { internal_group: '', esperado: 'Ubicacion de la solicitud' },
    { internal_group: '   ', esperado: 'Ubicacion de la solicitud' },
    { internal_group: 'N/A', esperado: 'Ubicacion de la solicitud' },
    { internal_group: 'NO APLICA', esperado: 'Ubicacion de la solicitud' },
    { internal_group: 'Ninguno', esperado: 'Ubicacion de la solicitud' },
    { internal_group: 'Grupo real', esperado: 'Grupo real' },
  ])(
    'cae a la ubicacion del cargo cuando el grupo interno es "$internal_group"',
    ({ internal_group, esperado }) => {
      const html = render(certificado({}, { internal_group }));

      expect(html).toContain(`GRUPO:${esperado}`);
    },
  );

  it('sin grupo ni ubicacion en la solicitud usa la columna del certificado', () => {
    const html = render(
      certificado(
        { position_location: 'Ubicacion del certificado' },
        { internal_group: null, position_location: null },
      ),
    );

    expect(html).toContain('GRUPO:Ubicacion del certificado');
  });

  it('el certificado corregido imprime lo que guardo el coordinador', () => {
    const html = render(
      certificado({ is_corrected: true, position_location: 'Grupo CORREGIDO' }),
    );

    expect(html).toContain('GRUPO:Grupo CORREGIDO');
    expect(html).not.toContain('GRUPO:Grupo de Administracion de Personal');
  });

  it('la correccion que no toca el campo imprime exactamente lo mismo', () => {
    const original = certificado();
    const antes = render(original);

    // El formulario precarga el grupo efectivo y el coordinador lo deja igual;
    // al aprobar, ese valor queda en certificate.position_location.
    const corregido = certificado({
      is_corrected: true,
      position_location: service['resolveEffectiveCertificateGroup'](original),
    });

    expect(render(corregido)).toBe(antes);
  });

  it('el snapshot de la correccion expone el grupo efectivo', () => {
    const snapshot = service['certificateCorrectionSnapshot'](certificado());

    expect(snapshot.position_location).toBe('Grupo de Administracion de Personal');
  });

  it('resuelve el grupo efectivo con la misma precedencia que el PDF', () => {
    expect(service['resolveEffectiveCertificateGroup'](certificado())).toBe(
      'Grupo de Administracion de Personal',
    );

    expect(
      service['resolveEffectiveCertificateGroup'](
        certificado({}, { internal_group: 'N/A' }),
      ),
    ).toBe('Ubicacion de la solicitud');

    expect(
      service['resolveEffectiveCertificateGroup'](
        certificado({ is_corrected: true, position_location: 'Grupo CORREGIDO' }),
      ),
    ).toBe('Grupo CORREGIDO');
  });

  it('se oculta cuando la plantilla ya imprime el mismo valor en [DEPENDENCIA]', () => {
    // Sin dependencia, [DEPENDENCIA] cae al centro de costo y coincide con el
    // grupo: la regla de no duplicar sigue vigente.
    const html = render(
      certificado({ department: null }, { department: null, organization_department: null }),
    );

    expect(html).toContain('GRUPO:</p>');
    expect(html).toContain('DEP:Grupo de Administracion de Personal');
  });
});

/**
 * Caso real reportado en preproduccion (certificado de una persona sincronizada
 * desde Oracle, con encargo): la plantilla decia
 * "ubicado en [DEPENDENCIA]. [GRUPO]" y salio el GRUPO en las dos variables,
 * porque `department` guarda el CENTROCOSTO en las filas de Oracle y
 * [DEPENDENCIA] lo leia primero; al coincidir con [GRUPO], la regla de no
 * duplicar dejaba [GRUPO] vacio.
 *
 * El modal de "Consulta informativa" mostraba lo correcto porque resuelve la
 * dependencia con `organization_department` primero.
 */
describe('[DEPENDENCIA] y [GRUPO] juntos en una fila sincronizada desde Oracle', () => {
  const pdf = Object.create(LaborCertificatePdfService.prototype) as LaborCertificatePdfService;

  const DEPENDENCIA = 'Direccion de Talento Humano';
  const GRUPO = 'Grupo de Administracion de Personal y de Carrera Administrativa';

  // Forma exacta que deja el sincronizador de Oracle (LaborOracleIntegration):
  //   department = CENTROCOSTO || DEPENDENCIA   ← el CENTROCOSTO es el grupo
  //   organization_department = DEPENDENCIA
  //   internal_group = GRUPO_INTERNO || CENTROCOSTO
  //   position_location = DEPENDENCIA || SUCURSAL
  const solicitudOracle = (overrides: Record<string, unknown> = {}) =>
    ({
      id: 'solicitud-oracle',
      id_number: '53062883',
      status: 'A',
      observations: 'E',
      position_category: 'Cra. Administrativa',
      career_category: 'Profesional Especializado Grado 16',
      cod_cargo: '202816',
      cod_grade: '16',
      hiring_date: '2024-05-14',
      department: GRUPO,
      organization_department: DEPENDENCIA,
      internal_group: GRUPO,
      cost_center: GRUPO,
      position_location: DEPENDENCIA,
      monthly_salary: 1000000,
      ...overrides,
    }) as unknown as CertificateRequest;

  const render = (
    request: CertificateRequest,
    templateType: 'administrador' | 'docente' = 'administrador',
  ) =>
    pdf['buildCertificateContent']({
      certificate: { ...request, request } as unknown as Certificate,
      templateType,
      includeSalary: false,
      includeTechnicalBonus: false,
      templateHtml: '<p>ubicado en [DEPENDENCIA]. [GRUPO]</p>',
    });

  it.each(['administrador', 'docente'] as const)(
    'imprime la dependencia y el grupo por separado (%s)',
    (templateType) => {
      expect(render(solicitudOracle(), templateType)).toContain(
        `ubicado en ${DEPENDENCIA}. ${GRUPO}`,
      );
    },
  );

  it('conserva la dependencia de la vinculacion normal durante un encargo', () => {
    const request = solicitudOracle({ certificate_dependency: DEPENDENCIA });

    expect(render(request)).toContain(`ubicado en ${DEPENDENCIA}. ${GRUPO}`);
  });

  it('la solicitud de correccion precarga la dependencia y el grupo efectivos', () => {
    const service = Object.create(CertificatesService.prototype) as CertificatesService;
    const request = solicitudOracle();
    const certificate = { ...request, request } as unknown as Certificate;

    // Lo que ve el coordinador al abrir la solicitud de edicion: los mismos
    // valores que imprime el certificado, no las columnas crudas.
    const respuesta = service['correctionResponse']({
      id: 'cor-1',
      certificate,
    } as never) as { certificate: Certificate };
    expect(respuesta.certificate.department).toBe(DEPENDENCIA);
    expect(respuesta.certificate.position_location).toBe(GRUPO);

    // Y el "antes / despues" compara contra esos mismos valores.
    const snapshot = service['certificateCorrectionSnapshot'](certificate);
    expect(snapshot.department).toBe(DEPENDENCIA);
    expect(snapshot.position_location).toBe(GRUPO);
  });

  it('sin dependencia organizacional sigue cayendo al grupo y oculta [GRUPO]', () => {
    // Unica fila sin dependencia: [DEPENDENCIA] usa el grupo como ultimo
    // recurso y [GRUPO] se calla para no imprimir dos veces lo mismo.
    const html = render(
      solicitudOracle({ organization_department: null, department: null }),
    );

    expect(html).toContain(`ubicado en ${GRUPO}.`);
    expect(html).not.toContain(`${GRUPO}. ${GRUPO}`);
  });
});

/**
 * Por que en dev y qa salia bien y en pre mal con el MISMO codigo: no es el
 * ambiente, es la FORMA de la fila.
 *
 *   - dev / qa: filas locales (sin Oracle FNC a la vista). `department` guarda
 *     la dependencia, asi que leerlo primero acertaba por casualidad.
 *   - pre / produccion: filas sincronizadas desde Oracle. `department` guarda
 *     el CENTROCOSTO (el grupo) y la dependencia vive en
 *     `organization_department`.
 *
 * Leer `organization_department` primero hace que las dos formas impriman lo
 * mismo, que es lo unico que garantiza el mismo resultado en todos los
 * servidores.
 */
describe('la misma persona imprime igual en las dos formas de datos', () => {
  const pdf = Object.create(LaborCertificatePdfService.prototype) as LaborCertificatePdfService;

  const DEPENDENCIA = 'Direccion de Talento Humano';
  const GRUPO = 'Grupo de Administracion de Personal y de Carrera Administrativa';

  const base = {
    id_number: '53062883',
    full_name: 'PERSONA DE PRUEBA',
    status: 'A',
    observations: 'E',
    position_category: 'Cra. Administrativa',
    career_category: 'Profesional Especializado Grado 16',
    cod_cargo: '202816',
    cod_grade: '16',
    hiring_date: '2024-05-14',
    monthly_salary: 1000000,
  };

  /** dev / qa: fila local; `department` ES la dependencia. */
  const formaLocal = {
    ...base,
    department: DEPENDENCIA,
    organization_department: DEPENDENCIA,
    internal_group: GRUPO,
    cost_center: null,
    position_location: GRUPO,
  } as unknown as CertificateRequest;

  /** pre / produccion: fila de Oracle; `department` ES el CENTROCOSTO. */
  const formaOracle = {
    ...base,
    department: GRUPO,
    organization_department: DEPENDENCIA,
    internal_group: GRUPO,
    cost_center: GRUPO,
    position_location: DEPENDENCIA,
  } as unknown as CertificateRequest;

  const render = (
    request: CertificateRequest,
    templateType: 'administrador' | 'docente' = 'administrador',
  ) =>
    pdf['buildCertificateContent']({
      certificate: { ...request, request } as unknown as Certificate,
      templateType,
      includeSalary: false,
      includeTechnicalBonus: false,
      templateHtml: '<p>ubicado en [DEPENDENCIA]. [GRUPO]</p>',
    });

  it.each(['administrador', 'docente'] as const)(
    'local y Oracle dan el mismo texto (%s)',
    (templateType) => {
      const esperado = `ubicado en ${DEPENDENCIA}. ${GRUPO}`;

      expect(render(formaLocal, templateType)).toContain(esperado);
      expect(render(formaOracle, templateType)).toContain(esperado);
      expect(render(formaLocal, templateType)).toBe(render(formaOracle, templateType));
    },
  );
});

/**
 * Solicitud de edicion de certificado, caso real COR-20260918-UWFYU1EXP.
 *
 * El certificado imprimia bien "Direccion de Talento Humano. Grupo de
 * Administracion de Personal...", pero en la solicitud de edicion la vista
 * previa se quedaba sin [GRUPO] y el campo "Grupo o ubicacion" precargaba la
 * DEPENDENCIA. Motivo: ese flujo nunca hidrataba el contexto de la vinculacion
 * normal, asi que `certificate_dependency` y `certificate_group` llegaban
 * vacios y todo se resolvia con la fila del encargo; al coincidir con la
 * dependencia, la regla de no duplicar callaba [GRUPO].
 */
describe('solicitud de edicion de certificado con encargo', () => {
  const service = Object.create(CertificatesService.prototype) as CertificatesService;
  const pdf = Object.create(LaborCertificatePdfService.prototype) as LaborCertificatePdfService;

  const DTH = 'Direccion de Talento Humano';
  const GRUPO = 'Grupo de Administracion de Personal y de Carrera Administrativa';

  const base = {
    id_number: '53062883',
    full_name: 'DIANA MARIA GUTIERREZ RAMIREZ',
    status: 'A',
    position_category: 'Cra. Administrativa',
    monthly_salary: 5099764,
  };

  /** Vinculacion normal vigente: aqui viven la dependencia y el grupo. */
  const normal = {
    ...base,
    id: 'normal',
    observations: 'N',
    career_category: 'Profesional Universitario Grado 09',
    cod_cargo: '204409',
    cod_grade: '09',
    hiring_date: '2024-05-14',
    request_date: '2026-04-01 12:00:00',
    department: DTH,
    organization_department: DTH,
    internal_group: GRUPO,
    cost_center: GRUPO,
    position_location: DTH,
  } as unknown as CertificateRequest;

  /** Encargo: no tiene grupo propio, por eso arrastraba la dependencia. */
  const encargo = {
    ...base,
    id: 'encargo',
    observations: 'E',
    career_category: 'Profesional Especializado Grado 16',
    cod_cargo: '202816',
    cod_grade: '16',
    hiring_date: '2025-04-01',
    request_date: '2025-06-05 12:00:00',
    department: DTH,
    organization_department: DTH,
    internal_group: null,
    cost_center: null,
    position_location: DTH,
  } as unknown as CertificateRequest;

  const certificadoHidratado = (extra: Record<string, unknown> = {}) => {
    const certificate = {
      ...encargo,
      certificate_number: '12_620_700_20_CD 117',
      request: { ...encargo },
      ...extra,
    } as unknown as Certificate;
    // Lo que hace el flujo real al cargar la solicitud de correccion.
    service['applyRequestContextToCertificate'](certificate, [encargo, normal]);
    return certificate;
  };

  it('hidrata la dependencia y el grupo de la vinculacion normal', () => {
    const certificate = certificadoHidratado();

    expect(certificate.request?.certificate_dependency).toBe(DTH);
    expect(certificate.request?.certificate_group).toBe(GRUPO);
  });

  it('el formulario precarga cada campo con su propio dato', () => {
    const certificate = certificadoHidratado();
    const respuesta = service['correctionResponse']({
      id: 'cor-1',
      certificate,
    } as never) as { certificate: Certificate };

    expect(respuesta.certificate.department).toBe(DTH);
    // El bug: aqui se precargaba la dependencia en vez del grupo.
    expect(respuesta.certificate.position_location).toBe(GRUPO);
  });

  it('la vista previa de la correccion imprime las dos variables', () => {
    const html = pdf['buildCertificateContent']({
      certificate: certificadoHidratado(),
      templateType: 'administrador',
      includeSalary: false,
      includeTechnicalBonus: false,
      templateHtml: '<p>ubicado en [DEPENDENCIA]. [GRUPO]</p>',
    });

    expect(html).toContain(`ubicado en ${DTH}. ${GRUPO}`);
  });

  it('un certificado ya corregido no hereda el contexto de otra vinculacion', () => {
    // Manda lo que guardo el coordinador, sin que la vinculacion normal lo pise.
    const certificate = certificadoHidratado({
      is_corrected: true,
      department: 'Dependencia CORREGIDA',
      position_location: 'Grupo CORREGIDO',
    });

    expect(certificate.request?.certificate_dependency).toBeUndefined();
    expect(certificate.request?.certificate_group).toBeUndefined();

    const html = pdf['buildCertificateContent']({
      certificate,
      templateType: 'administrador',
      includeSalary: false,
      includeTechnicalBonus: false,
      templateHtml: '<p>ubicado en [DEPENDENCIA]. [GRUPO]</p>',
    });

    expect(html).toContain('ubicado en Dependencia CORREGIDA. Grupo CORREGIDO');
  });
});
