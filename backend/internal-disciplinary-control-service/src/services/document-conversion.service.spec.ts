import { DocumentConversionService } from './document-conversion.service';

describe('DocumentConversionService', () => {
  let service: DocumentConversionService;

  beforeEach(() => {
    service = new DocumentConversionService({} as any);
  });

  describe('replaceWordTextPlaceholder', () => {
    it('should replace consecutive marker when Word splits it across runs', () => {
      const xml =
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
        '<w:body><w:p>' +
        '<w:r><w:t>[Consecutivo</w:t></w:r>' +
        '<w:r><w:t>_</w:t></w:r>' +
        '<w:r><w:t>Auto]</w:t></w:r>' +
        '</w:p></w:body></w:document>';

      const result = (service as any).replaceWordTextPlaceholder(
        xml,
        '[Consecutivo_Auto]',
        'AUTO-00024',
      );

      expect(result).toContain('<w:t>AUTO-00024</w:t>');
      expect(result).not.toContain('[Consecutivo');
      expect(result).not.toContain('Auto]');
    });
  });
});
