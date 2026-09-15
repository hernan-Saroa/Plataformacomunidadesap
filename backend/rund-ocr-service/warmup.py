"""Inicializa el motor dentro del servidor activo, sin duplicarlo en otro proceso."""
import json
import os
from urllib.request import Request, urlopen

request = Request('http://127.0.0.1:8091/warmup', method='POST', data=b'',
                  headers={'Authorization': 'Bearer ' + os.environ['RUND_OCR_TOKEN']})
with urlopen(request, timeout=900) as response:
    result = json.load(response)
    if result.get('status') != 'ready':
        raise RuntimeError('El OCR no quedó listo.')
print('PaddleOCR inicializado en el servidor local.')
