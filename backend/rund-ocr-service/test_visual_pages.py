import io
import unittest
import pypdfium2 as pdfium
from PIL import Image
from visual_pages import render_visual_pages, MAX_BYTES
import base64


class VisualPagesTest(unittest.TestCase):
    def pdf(self, count=1):
        with pdfium.PdfDocument.new() as pdf:
            for _ in range(count):
                pdf.new_page(600, 800).close()
            data = io.BytesIO()
            pdf.save(data)
            return data.getvalue()

    def test_two_bounded_views_per_page_and_original_numbering(self):
        result = render_visual_pages(self.pdf(4))
        self.assertEqual(result['total_paginas'], 4)
        self.assertEqual([page['pagina'] for page in result['paginas']], [1, 2, 3])
        for page in result['paginas']:
            for key in ['imagen', 'detalle', 'enfoque']:
                with Image.open(io.BytesIO(base64.b64decode(page[key]))) as image:
                    self.assertEqual(image.format, 'PNG')
                    self.assertLessEqual(max(image.size), 1800)
            self.assertNotEqual(page['imagen'], page['detalle'])
            self.assertEqual(len(page['zonas']), 2)
            for region in page['zonas']:
                for key in ['imagen', 'detalle']:
                    with Image.open(io.BytesIO(base64.b64decode(region[key]))) as image:
                        self.assertLessEqual(max(image.size), 1800)

    def test_rejects_invalid_oversize_and_too_many_pages(self):
        for content in [b'bad', b'%PDF-' + b'x' * MAX_BYTES, self.pdf(26)]:
            with self.subTest(size=len(content)), self.assertRaises(ValueError):
                render_visual_pages(content)


if __name__ == '__main__':
    unittest.main()
