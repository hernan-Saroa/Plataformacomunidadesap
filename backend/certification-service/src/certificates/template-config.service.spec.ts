import { TemplateConfigService } from './template-config.service';

describe('TemplateConfigService defaults', () => {
  let service: TemplateConfigService;

  beforeEach(() => {
    service = Object.create(TemplateConfigService.prototype) as TemplateConfigService;
  });

  it('separa la vinculaci\u00F3n y la categor\u00EDa docente en p\u00E1rrafos consecutivos', () => {
    const content = service['getDefaultContent']('docente');

    expect(content).toContain(
      'desde el [FECHA_INICIO].</p><p>Actualmente desempe\u00F1a la categor\u00EDa de [CARGO] ubicado en [DEPENDENCIA].</p>',
    );
    expect(content.match(/<p>/g)).toHaveLength(7);
    expect(content).not.toContain('[FECHA_INICIO], en la categor\u00EDa');
    expect(content.indexOf('[FUNCIONES]')).toBeLessThan(content.indexOf('[SALARIO]'));
    expect(content).toContain('data-functions-template="true"');
  });

  it('separa la vinculaci\u00F3n y el cargo administrativo en p\u00E1rrafos consecutivos', () => {
    const content = service['getDefaultContent']('administrador');

    expect(content).toContain(
      'desde el [FECHA_INICIO].</p><p>Actualmente, desempe\u00F1a el cargo de [CARGO] ubicado en [DEPENDENCIA].</p>',
    );
    expect(content.match(/<p>/g)).toHaveLength(7);
    expect(content).not.toContain('[FECHA_INICIO], desempe\u00F1ando');
    expect(content.indexOf('[FUNCIONES]')).toBeLessThan(content.indexOf('[SALARIO]'));
    expect(content).toContain('data-functions-template="true"');
  });

  it('elige de forma determinista la configuraci\u00F3n activa m\u00E1s reciente', async () => {
    const config = { id: 2, templateType: 'administrador' };
    const findOne = jest.fn().mockResolvedValue(config);
    service = new TemplateConfigService(
      { findOne } as any,
      {} as any,
      {} as any,
    );

    await expect(service['getOrCreateConfig']('administrador')).resolves.toBe(config);
    expect(findOne).toHaveBeenCalledWith({
      where: { isActive: true, templateType: 'administrador' },
      relations: ['signer'],
      order: { updatedAt: 'DESC', id: 'DESC' },
    });
  });
});
