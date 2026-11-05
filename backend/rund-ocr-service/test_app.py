import io
import os
import unittest
from unittest.mock import patch
os.environ['RUND_OCR_TOKEN'] = 'token-de-prueba-local-000000000000000'
import app
from fastapi.testclient import TestClient
from fastapi import HTTPException


class OcrContractTest(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app.app)
        self.auth = {'Authorization': 'Bearer ' + app.TOKEN}

    def test_authentication_before_processing(self):
        with patch.object(app, 'get_engine') as engine:
            response = self.client.post('/extract', files={'file': ('test.pdf', b'%PDF-1.7', 'application/pdf')})
            self.assertEqual(response.status_code, 401)
            engine.assert_not_called()

    def test_size_limit(self):
        response = self.client.post('/extract', headers={**self.auth, 'Content-Length': str(27 * 1024 * 1024)})
        self.assertEqual(response.status_code, 413)

    def test_warmup_requires_authentication(self):
        with patch.object(app, 'get_engine') as engine:
            self.assertEqual(self.client.post('/warmup').status_code, 401)
            engine.assert_not_called()

    def test_warmup_initializes_the_server_engine(self):
        with patch.object(app, 'get_engine') as engine:
            self.assertEqual(self.client.post('/warmup', headers=self.auth).status_code, 200)
            engine.assert_called_once()

    def test_high_accuracy_models_are_explicit(self):
        self.assertEqual(app.OCR_DETECTION_MODEL, 'PP-OCRv6_medium_det')
        self.assertEqual(app.OCR_RECOGNITION_MODEL, 'PP-OCRv6_medium_rec')
        self.assertEqual(app.MAX_RENDER_SCALE, 3.0)

    def test_response_contract_with_simulated_ocr(self):
        import pypdfium2 as pdfium
        pdf = pdfium.PdfDocument.new()
        page = pdf.new_page(500, 500)
        page.close()
        data = io.BytesIO()
        pdf.save(data)
        pdf.close()
        class Engine:
            def predict(self, image):
                return [{'rec_texts': ['Formación de José Muñoz: áéíóúñü'], 'rec_scores': [0.92]}]
        with patch.object(app, 'get_engine', return_value=Engine()):
            response = self.client.post('/extract', headers=self.auth, files={'file': ('test.pdf', data.getvalue(), 'application/pdf')})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['paginas'][0]['texto'], 'Formación de José Muñoz: áéíóúñü')
        self.assertEqual(response.json()['paginas'][0]['pagina'], 1)
        self.assertEqual(response.json()['paginas'][0]['lineas'], [{'texto': 'Formación de José Muñoz: áéíóúñü', 'confianza': 0.92}])

    def test_keeps_weak_line_confidence_separate_from_readable_lines(self):
        import pypdfium2 as pdfium
        pdf = pdfium.PdfDocument.new()
        pdf.new_page(500, 500).close()
        data = io.BytesIO()
        pdf.save(data)
        pdf.close()
        class Engine:
            def predict(self, image):
                return [{'rec_texts': ['TÍTULO DE:', 'AENTACIONHDEIUAHTUNT'], 'rec_scores': [0.99, 0.24]}]
        result = app.extract_pdf(data.getvalue(), Engine())
        self.assertEqual(result['paginas'][0]['lineas'][1]['confianza'], 0.24)
        self.assertLess(result['paginas'][0]['confianza'], 0.85)

    def test_rejects_missing_or_invalid_line_scores(self):
        import pypdfium2 as pdfium
        pdf = pdfium.PdfDocument.new()
        pdf.new_page(500, 500).close()
        data = io.BytesIO()
        pdf.save(data)
        pdf.close()
        for scores in [[], [float('nan')], [float('inf')], [1.5]]:
            with self.subTest(scores=scores):
                class Engine:
                    def predict(self, image):
                        return [{'rec_texts': ['Economista'], 'rec_scores': scores}]
                with self.assertRaises(HTTPException) as error:
                    app.extract_pdf(data.getvalue(), Engine())
                self.assertEqual(error.exception.status_code, 503)

    def test_busy_worker_does_not_queue_in_memory(self):
        app.gate.acquire()
        try:
            response = self.client.post('/extract', headers=self.auth, files={'file': ('test.pdf', b'%PDF-1.7', 'application/pdf')})
            self.assertEqual(response.status_code, 503)
        finally:
            app.gate.release()

    def test_invalid_pdf(self):
        with self.assertRaises(HTTPException):
            app.extract_pdf(b'not pdf', None)

    def test_visual_renderer_requires_authentication_and_does_not_initialize_ocr(self):
        with patch.object(app, 'get_engine') as engine:
            response = self.client.post('/render-pages', files={'file': ('test.pdf', b'%PDF-1.7', 'application/pdf')})
            self.assertEqual(response.status_code, 401)
            engine.assert_not_called()
            with patch.object(app, 'render_visual_pages', return_value={'paginas': [], 'total_paginas': 1}) as render:
                response = self.client.post('/render-pages', headers=self.auth, files={'file': ('test.pdf', b'%PDF-1.7', 'application/pdf')})
                self.assertEqual(response.status_code, 200)
                render.assert_called_once_with(b'%PDF-1.7')
                engine.assert_not_called()


if __name__ == '__main__':
    unittest.main()
