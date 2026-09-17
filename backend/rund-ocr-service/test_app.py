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
                return [{'rec_texts': ['Título de prueba'], 'rec_scores': [0.92]}]
        with patch.object(app, 'get_engine', return_value=Engine()):
            response = self.client.post('/extract', headers=self.auth, files={'file': ('test.pdf', data.getvalue(), 'application/pdf')})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['paginas'][0]['texto'], 'Título de prueba')
        self.assertEqual(response.json()['paginas'][0]['pagina'], 1)

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


if __name__ == '__main__':
    unittest.main()
