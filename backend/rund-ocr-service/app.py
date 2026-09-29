"""REQ-RUND-F014: OCR local. Sin acceso a perfiles, BD ni servicios de nube."""
import hmac
import logging
import math
import os
import threading
from fastapi import FastAPI, File, HTTPException, UploadFile, Request
from fastapi.responses import JSONResponse

MAX_BYTES = 25 * 1024 * 1024
MAX_PAGES = 25
MAX_TEXT = 50000
MAX_RENDER_SCALE = 3.0
TOKEN = os.environ.get('RUND_OCR_TOKEN', '')
OCR_DETECTION_MODEL = 'PP-OCRv6_medium_det'
OCR_RECOGNITION_MODEL = 'PP-OCRv6_medium_rec'
app = FastAPI(title='RUND OCR local', docs_url=None, redoc_url=None, openapi_url=None)
gate = threading.Lock()
engine = None


@app.middleware('http')
async def authenticate(request: Request, call_next):
    if request.url.path != '/health':
        expected = f'Bearer {TOKEN}'
        if len(TOKEN) < 32 or not hmac.compare_digest(request.headers.get('authorization', ''), expected):
            return JSONResponse({'detail': 'No autorizado'}, status_code=401)
        try:
            if int(request.headers.get('content-length', '0')) > MAX_BYTES + 1048576:
                return JSONResponse({'detail': 'PDF demasiado grande'}, status_code=413)
        except ValueError:
            return JSONResponse({'detail': 'Solicitud inválida'}, status_code=400)
    return await call_next(request)


@app.get('/health')
def health():
    return {'status': 'ready' if engine is not None else 'starting', 'configured': len(TOKEN) >= 32, 'local': True}


def get_engine():
    global engine
    if engine is None:
        from paddleocr import PaddleOCR
        # Perfil de alta precisión para expedientes: PP-OCRv6 medium reconoce
        # español de forma nativa y corrige rotación, perspectiva y líneas.
        engine = PaddleOCR(device='cpu', text_detection_model_name=OCR_DETECTION_MODEL,
                           text_recognition_model_name=OCR_RECOGNITION_MODEL,
                           enable_mkldnn=False, cpu_threads=2, use_doc_orientation_classify=True,
                           use_doc_unwarping=True, use_textline_orientation=True)
    return engine


@app.post('/warmup')
def warmup():
    if not gate.acquire(blocking=False):
        raise HTTPException(503, 'OCR ocupado. Reintente después.')
    try:
        get_engine()
        return health()
    except Exception:
        raise HTTPException(503, 'El motor OCR local no está disponible.')
    finally:
        gate.release()


def extract_pdf(content: bytes, ocr):
    import numpy as np
    import pypdfium2 as pdfium
    if not content.startswith(b'%PDF-'):
        raise HTTPException(422, 'El archivo no es un PDF válido.')
    pages = []
    count = 0
    with pdfium.PdfDocument(content) as pdf:
        if not 1 <= len(pdf) <= MAX_PAGES:
            raise HTTPException(422, f'El PDF debe tener entre 1 y {MAX_PAGES} páginas.')
        for index in range(len(pdf)):
            page = pdf[index]
            try:
                width, height = page.get_size()
                if width <= 0 or height <= 0 or not math.isfinite(width * height):
                    raise HTTPException(422, 'Tamaño de página inválido.')
                # ~216 DPI en un PDF estándar: mejora caracteres pequeños sin
                # superar el límite defensivo de 12 millones de píxeles.
                scale = min(MAX_RENDER_SCALE, math.sqrt(12_000_000 / (width * height)))
                bitmap = page.render(scale=scale)
                try:
                    # Paddle recibe imagen BGR, no se escribe el PDF ni las imágenes en disco.
                    image = np.asarray(bitmap.to_pil().convert('RGB'))[:, :, ::-1].copy()
                    texts, scores = [], []
                    try:
                        for result in ocr.predict(image):
                            texts.extend(str(text) for text in result['rec_texts'])
                            scores.extend(float(score) for score in result['rec_scores'])
                    except Exception as error:
                        logging.getLogger('rund.ocr').warning('Fallo de inferencia OCR: %s', type(error).__name__)
                        raise HTTPException(503, 'El motor OCR no pudo procesar el documento. Reintente después.')
                    text = '\n'.join(texts)
                    count += len(text)
                    if count > MAX_TEXT:
                        raise HTTPException(422, 'El documento supera el límite de texto procesable.')
                    # Percentil conservador: una página con lecturas débiles no se anuncia como segura.
                    confidence = float(np.quantile(scores, 0.1)) if scores else 0.0
                    pages.append({'pagina': index + 1, 'texto': text, 'confianza': max(0.0, min(1.0, confidence))})
                finally:
                    bitmap.close()
            finally:
                page.close()
    return {'motor': f'PaddleOCR 3.7.0 / {OCR_DETECTION_MODEL} / {OCR_RECOGNITION_MODEL} / corrección documental', 'paginas': pages}


@app.post('/extract')
def extract(file: UploadFile = File(...)):
    if not gate.acquire(blocking=False):
        raise HTTPException(503, 'OCR ocupado. Reintente después.')
    try:
        content = file.file.read(MAX_BYTES + 1)
        if len(content) > MAX_BYTES:
            raise HTTPException(413, 'El PDF supera 25 MB.')
        if not content.startswith(b'%PDF-'):
            raise HTTPException(422, 'El archivo no es un PDF válido.')
        try:
            ocr = get_engine()
        except Exception:
            raise HTTPException(503, 'El motor OCR local no está disponible. Reintente después.')
        return extract_pdf(content, ocr)
    except HTTPException:
        raise
    except Exception:
        # No exponer rutas locales, texto del documento ni trazas de los modelos.
        raise HTTPException(422, 'No se pudo leer el PDF. Verifique que no esté dañado ni protegido con contraseña.')
    finally:
        file.file.close()
        gate.release()
