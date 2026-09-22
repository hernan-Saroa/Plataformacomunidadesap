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

    it('should render structured header with banner constrained to max-height', () => {
      const template = service.buildHeaderTemplate({
        images: [
          {
            src: 'data:image/png;base64,banner123',
            target: 'word/media/image1.png',
            rId: 'rId1',
            widthCm: 21.0,
            heightCm: 3.4,
            isBanner: true,
            behindDoc: true,
            align: 'left',
          },
        ],
        textBlocks: [],
      });

      expect(template).toContain('width:100%');
      expect(template).toContain('max-height:3.2cm');
      expect(template).toContain('object-fit:contain');
    });

    it('should NOT set width: 100% on header icon/logo and bound its size', () => {
      const template = service.buildHeaderTemplate({
        images: [
          {
            src: 'data:image/png;base64,logo123',
            target: 'word/media/logo.png',
            rId: 'rId1',
            widthCm: 4.5,
            heightCm: 2.0,
            isBanner: false,
            behindDoc: false,
            align: 'left',
          },
        ],
        textBlocks: ['MINISTERIO DE EDUCACIÓN'],
      });

      // Debe preservar dimensiones de logo sin forzar width: 100% en el elemento img
      expect(template).not.toContain('<img src="data:image/png;base64,logo123" style="display:block; width:100%;"');
      expect(template).toContain('width:4.50cm');
      expect(template).toContain('max-height:2.00cm');
      expect(template).toContain('MINISTERIO DE EDUCACIÓN');
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

    it('should render footer with banner and address without blowing up', () => {
      const template = service.buildFooterTemplate({
        images: [
          {
            src: 'data:image/png;base64,bannerFoot',
            target: 'word/media/footer.png',
            rId: 'rId1',
            widthCm: 23.0,
            heightCm: 3.2,
            isBanner: true,
            behindDoc: true,
            align: 'left',
          },
        ],
        textBlocks: ['Sede principal', 'Calle 44 # 53 - 37'],
      });

      expect(template).toContain('pageNumber');
      expect(template).toContain('max-height:1.8cm');
      expect(template).toContain('Sede principal');
      expect(template).toContain('Calle 44 # 53 - 37');
    });

    it('should render small footer icons (e.g. ICONTEC / ISO) side-by-side without setting width: 100%', () => {
      const template = service.buildFooterTemplate({
        images: [
          {
            src: 'data:image/png;base64,icontec',
            target: 'word/media/icontec.png',
            rId: 'rId1',
            widthCm: 2.5,
            heightCm: 1.2,
            isBanner: false,
            behindDoc: false,
            align: 'right',
          },
          {
            src: 'data:image/png;base64,iso9001',
            target: 'word/media/iso.png',
            rId: 'rId2',
            widthCm: 2.5,
            heightCm: 1.2,
            isBanner: false,
            behindDoc: false,
            align: 'right',
          },
        ],
        textBlocks: ['Contacto: contacto@esap.edu.co'],
      });

      // No debe tener width: 100% en los íconos
      expect(template).not.toContain('<img src="data:image/png;base64,icontec" style="display:block; width:100%;"');
      expect(template).toContain('width:2.50cm');
      expect(template).toContain('max-height:1.20cm');
      expect(template).toContain('display:flex; align-items:center; justify-content:flex-end; gap:8px;');
      expect(template).toContain('Contacto: contacto@esap.edu.co');
      expect(template).toContain('pageNumber');
    });
  });
});
