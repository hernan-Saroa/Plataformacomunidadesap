import { CertificatesService } from './certificates.service';

/**
 * El portal permite cambiar "Ocultar salario" e "Incluir prima" después de
 * emitir el certificado. El PDF oficial (vista previa, descarga e impresión)
 * debe respetar ese cambio; sin override se usa lo persistido al emitir.
 */
describe('GET certificados/:id/pdf — override de salario y prima', () => {
  const build = (persisted: { include_salary?: boolean | null; include_technical_bonus?: boolean | null }) => {
    const service = Object.create(CertificatesService.prototype) as CertificatesService;
    const generateCertificatePdf = jest.fn().mockResolvedValue({
      filename: 'certificado.pdf',
      buffer: Buffer.from('pdf'),
    });
    (service as any).certificateRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'cert-1',
        include_functions: false,
        template_snapshot: null,
        ...persisted,
      }),
    };
    (service as any).hydrateCertificatesRequestContext = jest.fn();
    (service as any).ensureTemplateSnapshotForCertificate = jest.fn();
    (service as any).laborPdfService = { generateCertificatePdf };
    return { service, generateCertificatePdf };
  };

  const optionsOf = (mock: jest.Mock) => mock.mock.calls[0][1];

  it('sin override usa lo persistido al emitir', async () => {
    const { service, generateCertificatePdf } = build({ include_salary: true, include_technical_bonus: true });
    await service.generateCertificadoPdfBufferById('cert-1');
    expect(optionsOf(generateCertificatePdf)).toMatchObject({ includeSalary: true, includeTechnicalBonus: true });
  });

  it('oculta el salario (y la prima) cuando llega includeSalary=false', async () => {
    const { service, generateCertificatePdf } = build({ include_salary: true, include_technical_bonus: true });
    await service.generateCertificadoPdfBufferById('cert-1', { includeSalary: 'false' });
    expect(optionsOf(generateCertificatePdf)).toMatchObject({ includeSalary: false, includeTechnicalBonus: false });
  });

  it('vuelve a incluir el salario cuando llega includeSalary=true', async () => {
    const { service, generateCertificatePdf } = build({ include_salary: false, include_technical_bonus: false });
    await service.generateCertificadoPdfBufferById('cert-1', { includeSalary: 'true' });
    expect(optionsOf(generateCertificatePdf)).toMatchObject({ includeSalary: true, includeTechnicalBonus: false });
  });

  it('respeta el toggle de prima cuando el salario está incluido', async () => {
    const { service, generateCertificatePdf } = build({ include_salary: true, include_technical_bonus: true });
    await service.generateCertificadoPdfBufferById('cert-1', { includeSalary: 'true', includeTechnicalBonus: 'false' });
    expect(optionsOf(generateCertificatePdf)).toMatchObject({ includeSalary: true, includeTechnicalBonus: false });
  });

  it('ignora valores no reconocidos y conserva lo persistido', async () => {
    const { service, generateCertificatePdf } = build({ include_salary: false, include_technical_bonus: false });
    await service.generateCertificadoPdfBufferById('cert-1', { includeSalary: 'quizas' });
    expect(optionsOf(generateCertificatePdf)).toMatchObject({ includeSalary: false });
  });
});
