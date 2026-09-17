import { Certificate } from './certificate.entity';
import { CertificateRequest } from './certificate-request.entity';
import { CertificatesService } from './certificates.service';
import { LaborCertificatePdfService } from './labor-certificate-pdf.service';

/**
 * [GRUPO] imprime el grupo interno de trabajo (`internal_group`) y solo cae a
 * la ubicacion del cargo (`position_location`) cuando la solicitud no trae
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
