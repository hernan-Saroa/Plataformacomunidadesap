import { CertificatesService } from './certificates.service';
import { CertificateRequest } from './certificate-request.entity';
import { Certificate } from './certificate.entity';

describe('CertificatesService', () => {
  let service: CertificatesService;

  beforeEach(() => {
    service = Object.create(CertificatesService.prototype) as CertificatesService;
  });

  it('prioriza carrera administrativa sobre provisional cuando ambos registros estan activos y sin encargo', () => {
    const provisionalRequest = {
      id: 'provisional',
      position_category: 'Provisional',
      observations: 'N',
      status: 'A',
      hiring_date: new Date('2001-07-30'),
      request_date: null,
    } as CertificateRequest;
    const primaryRequest = {
      id: 'principal',
      position_category: 'Cra. Administrativa',
      observations: 'N',
      status: 'A',
      hiring_date: new Date('2001-07-30'),
      request_date: null,
    } as CertificateRequest;

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
    } as CertificateRequest;
    const secondRequest = {
      id: 'provisional-2',
      position_category: 'Libre Nombramiento',
      observations: 'N',
      status: 'A',
      hiring_date: new Date('2001-07-30'),
      request_date: null,
    } as CertificateRequest;

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
    } as CertificateRequest;
    const requestWithLeadingZero = {
      id: 'better-code',
      career_category: 'Jefe de Oficina',
      position_category: 'Administrativo',
      cod_cargo: '013718',
      cod_grade: '18',
      monthly_salary: 950,
      salary_text: '950',
    } as CertificateRequest;

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
    } as CertificateRequest;
    const unrelatedRequest = {
      id: 'other-role',
      career_category: 'Auxiliar de Servicios Generales',
      position_category: 'Administrativo',
      cod_cargo: '013718',
      cod_grade: '18',
      monthly_salary: 950,
      salary_text: '950',
    } as CertificateRequest;

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
    } as Certificate & { request: CertificateRequest };

    const requestWithLeadingZero = {
      id: 'better-code',
      id_number: '1049615021',
      career_category: 'Jefe de Oficina',
      position_category: 'Administrativo',
      cod_cargo: '013718',
      cod_grade: '18',
      monthly_salary: 950,
      salary_text: '950',
    } as CertificateRequest;

    service['applyRequestContextToCertificate'](certificate, [
      certificate.request,
      requestWithLeadingZero,
    ]);

    expect(certificate.cod_cargo).toBe('013718');
    expect(certificate.request.cod_cargo).toBe('013718');
  });
});
