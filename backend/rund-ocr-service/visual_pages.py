"""Bounded in-memory PDF views for local visual rereading. No model/network access."""
import base64
import io
import math

MAX_BYTES = 25 * 1024 * 1024
MAX_PAGES = 25
MAX_VISUAL_PAGES = 3
MAX_SIDE = 1800


def encode_views(image, page_number):
    image = image.convert('RGB')
    image.thumbnail((MAX_SIDE, MAX_SIDE))
    # A second, enlarged view helps with ornamental diploma lettering. It is
    # deliberately independent of the expected profile value or the OCR text.
    detail = image.crop((0, int(image.height * .15), image.width, int(image.height * .85)))
    focus = image.crop((0, int(image.height * .35), image.width, int(image.height * .68)))
    # Paired regional views enlarge handwriting/checkboxes without changing pixels.
    # Whole-page resizing otherwise makes small form cells unreadable to vision.
    regions = [
        (image.crop((0, 0, image.width, int(image.height * .60))),
         image.crop((0, int(image.height * .08), image.width, int(image.height * .58)))),
        (image.crop((0, int(image.height * .40), image.width, image.height)),
         image.crop((0, int(image.height * .43), image.width, int(image.height * .98)))),
    ]
    def encode(view):
        data = io.BytesIO()
        view.save(data, format='PNG')
        if data.tell() > 3 * 1024 * 1024:
            raise ValueError('Vista demasiado grande')
        return base64.b64encode(data.getvalue()).decode('ascii')
    try:
        return {'pagina': page_number, 'imagen': encode(image), 'detalle': encode(detail), 'enfoque': encode(focus),
                'zonas': [{'imagen': encode(first), 'detalle': encode(second)} for first, second in regions]}
    finally:
        detail.close()
        focus.close()
        for first, second in regions:
            first.close()
            second.close()
        image.close()


def render_visual_pages(content):
    if not content.startswith(b'%PDF-') or len(content) > MAX_BYTES:
        raise ValueError('PDF inválido o demasiado grande')
    try:
        import pypdfium2 as pdfium
    except ImportError:
        # The existing RUND image already ships Poppler/pdf2image.
        from pdf2image import convert_from_bytes, pdfinfo_from_bytes
        count = int(pdfinfo_from_bytes(content, timeout=15)['Pages'])
        if not 1 <= count <= MAX_PAGES:
            raise ValueError('Cantidad de páginas inválida')
        images = convert_from_bytes(content, first_page=1, last_page=min(count, MAX_VISUAL_PAGES),
                                    size=MAX_SIDE, thread_count=1, timeout=30)
        try:
            return {'paginas': [encode_views(image, index + 1) for index, image in enumerate(images)],
                    'total_paginas': count}
        finally:
            for image in images:
                image.close()
    with pdfium.PdfDocument(content) as pdf:
        count = len(pdf)
        if not 1 <= count <= MAX_PAGES:
            raise ValueError('Cantidad de páginas inválida')
        pages = []
        for index in range(min(count, MAX_VISUAL_PAGES)):
            page = pdf[index]
            try:
                width, height = page.get_size()
                if min(width, height) <= 0 or not math.isfinite(width * height):
                    raise ValueError('Tamaño de página inválido')
                bitmap = page.render(scale=min(3, MAX_SIDE / max(width, height)))
                try:
                    pages.append(encode_views(bitmap.to_pil(), index + 1))
                finally:
                    bitmap.close()
            finally:
                page.close()
        return {'paginas': pages, 'total_paginas': count}
