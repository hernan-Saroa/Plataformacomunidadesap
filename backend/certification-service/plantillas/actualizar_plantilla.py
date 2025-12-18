#!/usr/bin/env python3
"""
Script para actualizar la plantilla CERT_DOCENTE.docx con variables de docxtemplater
"""

import zipfile
import os
import re

# Ruta al archivo DOCX
docx_path = 'CERT_DOCENTE.docx'
docx_output = 'CERT_DOCENTE_TEMPLATE.docx'

# Leer el DOCX
with zipfile.ZipFile(docx_path, 'r') as zip_ref:
    # Leer el documento XML
    document_xml = zip_ref.read('word/document.xml').decode('utf-8')

    # Reemplazos a realizar
    replacements = {
        '12_620_700_20_CD 001': '{CONSECUTIVO}',
        'Juan Leonardo Santana Landaeta': '{NOMBRE_COMPLETO}',
        '9.431.423': '{NUMERO_DOCUMENTO}',
        'Carrera Administrativa': '{TIPO_VINCULACION}',
        '08 de julio de 2024': '{FECHA_VINCULACION}',
        'Doc. TITULAR': '{CATEGORIA}',
        '(DATO6)': '{UBICACION}',
        '($7.413.445)': '{SALARIO_NUMERO}',
        'siete millones cuatrocientos trece mil cuatrocientos cuarenta y cinco pesos m/cte': '{SALARIO_TEXTO}',
        'cinco (05) días del mes de agosto del año dos mil veinticinco (2025)': '{FECHA_EXPEDICION}',
        'ALBA LUCÍA MARÍN ZULUAGA': '{FIRMANTE}',
    }

    # Aplicar reemplazos
    for old, new in replacements.items():
        document_xml = document_xml.replace(old, new)

    # Crear el nuevo DOCX
    with zipfile.ZipFile(docx_output, 'w') as zip_out:
        # Copiar todos los archivos excepto document.xml
        for item in zip_ref.infolist():
            if item.filename != 'word/document.xml':
                zip_out.writestr(item, zip_ref.read(item.filename))

        # Escribir el document.xml modificado
        zip_out.writestr('word/document.xml', document_xml.encode('utf-8'))

print(f'[OK] Plantilla actualizada: {docx_output}')
print('Variables agregadas:')
for old, new in replacements.items():
    print(f'  - {new}')
