"""Arranque compatible de la imagen RUND OCR (PaddleOCR 2.9 / Paddle 3.2).

PaddleOCR 2.9 solo habilita MKLDNN condicionalmente; no lo deshabilita cuando
la configuración por defecto de Paddle 3.2 ya lo tiene activo. Se fuerza su
desactivación en cada predictor CPU para evitar fallos entre solicitudes.
Se mantiene la API /extract-text de la imagen y sus volúmenes de modelos.
"""
import threading
from functools import partial
from concurrent.futures import ThreadPoolExecutor

import cv2
import numpy as np
from flask import jsonify, request
from paddle import inference
from ocr_lines import recognized_page
from visual_pages import render_visual_pages, MAX_BYTES

original_config = inference.Config


def cpu_config(*args, **kwargs):
    config = original_config(*args, **kwargs)
    config.disable_mkldnn()
    config.set_cpu_math_library_num_threads(2)
    return config


inference.Config = cpu_config

import app as ocr_app  # noqa: E402: los predictores se crean después del ajuste.

# Las cédulas escaneadas suelen ocupar una fracción de una página A4. Con el
# límite original de 960 px, reducir toda la hoja vuelve ilegibles las etiquetas
# pequeñas (tipo documental y sexo), aunque los nombres grandes sí se detecten.
ocr_app.PaddleOCR = partial(ocr_app.PaddleOCR, det_limit_side_len=2048)


def preserve_document_image(image):
    # pdf2image/PIL entrega RGB. El umbral adaptativo de la imagen original
    # elimina texto sobre fondos de seguridad de las cédulas y fragmenta letras.
    # PaddleOCR recibe la imagen a color en BGR, sin destruir ese contraste.
    if image.ndim == 3 and image.shape[2] == 4:
        return cv2.cvtColor(image, cv2.COLOR_RGBA2BGR)
    if image.ndim == 3 and image.shape[2] == 3:
        return cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
    return image


ocr_app.preprocess_image = preserve_document_image


# Paddle predictors keep native thread-local state. A lock alone serializes
# requests but Flask still uses different threads, which can crash later calls.
# Construct AND invoke every predictor on this same dedicated thread.
inference_worker = ThreadPoolExecutor(max_workers=1, thread_name_prefix='rund-paddle')


def recognize_image(image_data):
    image = np.asarray(image_data) if hasattr(image_data, 'mode') else image_data
    result = ocr_app.get_ocr_engine().ocr(preserve_document_image(image), cls=True)
    recognitions = []
    if result and result[0]:
        for line in result[0]:
            if not line or len(line) < 2 or not line[1] or len(line[1]) < 2:
                raise ValueError('Incomplete OCR line')
            recognitions.append((line[1][0], line[1][1]))
    return recognized_page(recognitions)


def extract_text_with_line_confidence(image_data):
    return inference_worker.submit(recognize_image, image_data).result()


ocr_app.extract_text_from_image = extract_text_with_line_confidence
gate = threading.Lock()
original_extract = ocr_app.app.view_functions['extract_text']


def extract_one_document():
    # Los predictores compartidos no admiten dos inferencias simultáneas.
    if not gate.acquire(blocking=False):
        return jsonify({'success': False, 'error': 'OCR ocupado. Reintente después.'}), 503
    try:
        return original_extract()
    finally:
        gate.release()


ocr_app.app.view_functions['extract_text'] = extract_one_document


@ocr_app.app.route('/render-pages', methods=['POST'])
def render_pages():
    if not gate.acquire(blocking=False):
        return jsonify({'error': 'OCR ocupado. Reintente después.'}), 503
    try:
        file = request.files.get('file')
        if file is None:
            return jsonify({'error': 'PDF requerido'}), 400
        return jsonify(render_visual_pages(file.stream.read(MAX_BYTES + 1)))
    except Exception:
        return jsonify({'error': 'No se pudieron preparar las vistas del PDF.'}), 422
    finally:
        gate.release()

if __name__ == '__main__':
    inference_worker.submit(ocr_app.get_ocr_engine).result()
    ocr_app.app.run(host='0.0.0.0', port=8000, debug=False, threaded=True)
