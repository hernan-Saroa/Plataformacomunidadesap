"""Arranque compatible de la imagen RUND OCR (PaddleOCR 2.9 / Paddle 3.2).

PaddleOCR 2.9 solo habilita MKLDNN condicionalmente; no lo deshabilita cuando
la configuración por defecto de Paddle 3.2 ya lo tiene activo. Se fuerza su
desactivación en cada predictor CPU para evitar fallos entre solicitudes.
Se mantiene la API /extract-text de la imagen y sus volúmenes de modelos.
"""
import threading
from functools import partial

import cv2
from flask import jsonify
from paddle import inference

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

if __name__ == '__main__':
    ocr_app.get_ocr_engine()
    ocr_app.app.run(host='0.0.0.0', port=8000, debug=False, threaded=True)
