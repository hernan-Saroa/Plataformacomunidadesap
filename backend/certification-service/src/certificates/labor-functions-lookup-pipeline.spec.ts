import { CertificatesService } from './certificates.service';

/**
 * La consulta de empleado debe decir el MISMO cargo que sale impreso en el
 * certificado.
 *
 * Caso real (Diana, doc 53062883): tiene dos vinculaciones —la base de carrera
 * administrativa en 2028/14 y un encargo vigente en 2028/16—. El certificado
 * imprime "Código 2028 Grado 16 (E)". Antes la consulta mostraba grado 14,
 * porque usaba solo `selectPreferredRequestForCertificate` y se saltaba el
 * merge de códigos que aplica el certificado después.
 */
describe('CertificatesService.resolveRequestUsedForCertificate', () => {
  const service = Object.create(
    CertificatesService.prototype,
  ) as CertificatesService;

  const base = {
    id: 'req-base',
    full_name: 'DIANA MARIA GUTIERREZ RAMIREZ',
    id_number: '53062883',
    career_category: 'Profesional Especializado',
    position_category: 'Cra. Administrativa',
    observations: 'N',
    status: 'APPROVED',
    hiring_date: '2024-05-14',
    request_date: '2024-05-14',
    created_at: new Date('2024-05-14T10:00:00.000Z'),
    cod_cargo: '202814',
    cod_grade: '14',
    monthly_salary: 6326832,
    salary_text: null,
  } as any;

  const encargo = {
    ...base,
    id: 'req-encargo',
    observations: 'E',
    hiring_date: '2025-04-30',
    request_date: '2025-04-30',
    created_at: new Date('2025-04-30T10:00:00.000Z'),
    cod_cargo: '202816',
    cod_grade: '16',
  } as any;

  it('devuelve el grado del encargo vigente, igual que el certificado impreso', () => {
    const resultado = service.resolveRequestUsedForCertificate([base, encargo]);

    expect(resultado?.cod_grade).toBe('16');
    expect(resultado?.cod_cargo).toBe('202816');
  });

  it('el orden en que lleguen las vinculaciones no cambia el resultado', () => {
    const enOrden = service.resolveRequestUsedForCertificate([base, encargo]);
    const alReves = service.resolveRequestUsedForCertificate([encargo, base]);

    expect(alReves?.cod_cargo).toBe(enOrden?.cod_cargo);
    expect(alReves?.cod_grade).toBe(enOrden?.cod_grade);
  });

  it('con una sola vinculación devuelve esa misma', () => {
    const resultado = service.resolveRequestUsedForCertificate([base]);

    expect(resultado?.cod_cargo).toBe('202814');
    expect(resultado?.cod_grade).toBe('14');
  });

  it('sin vinculaciones devuelve null', () => {
    expect(service.resolveRequestUsedForCertificate([])).toBeNull();
  });
});
