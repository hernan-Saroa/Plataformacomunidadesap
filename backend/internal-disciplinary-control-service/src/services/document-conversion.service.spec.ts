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

  describe('buildHeaderTemplate', () => {
    it('should return empty div when neither images nor text are present', () => {
      expect(service.buildHeaderTemplate('', '')).toBe('<div></div>');
    });

    it('should overlay header text on banner image using absolute positioning and overflow hidden', () => {
      const headerImage = '<img src="data:image/png;base64,abc" style="display:block; width:100%;" />';
      const headerText = '<div style="text-align:center;">ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA</div>';

      const template = service.buildHeaderTemplate(headerImage, headerText);

      expect(template).toContain('overflow:hidden');
      expect(template).toContain('position:relative; width:100%;');
      expect(template).toContain('position:absolute; left:0; top:8px;');
      expect(template).toContain(headerImage);
      expect(template).toContain(headerText);
    });

    it('should render only text with padding if no header image is present', () => {
      const headerText = '<div style="text-align:center;">TEXT ONLY HEADER</div>';

      const template = service.buildHeaderTemplate('', headerText);

      expect(template).toContain('overflow:hidden');
      expect(template).toContain('padding:0 2cm; box-sizing:border-box;');
      expect(template).toContain(headerText);
      expect(template).not.toContain('position:absolute');
    });
  });

  describe('buildFooterTemplate', () => {
    it('should return empty div when neither images nor text are present', () => {
      expect(service.buildFooterTemplate('', '')).toBe('<div></div>');
    });

    it('should render footer with page numbers and overlaid text when image is present', () => {
      const footerImage = '<img src="data:image/png;base64,xyz" style="display:block; width:100%;" />';
      const footerText = '<div style="text-align:left;">Sede principal</div>';

      const template = service.buildFooterTemplate(footerImage, footerText);

      expect(template).toContain('pageNumber');
      expect(template).toContain('totalPages');
      expect(template).toContain('position:relative; width:100%;');
      expect(template).toContain('position:absolute; left:0; top:4px;');
      expect(template).toContain(footerImage);
      expect(template).toContain(footerText);
    });
  });
});
