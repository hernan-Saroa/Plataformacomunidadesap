#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

INPUT_MD="DOCUMENTACION_TECNICA.md"
OUTPUT_PDF="DOCUMENTACION_TECNICA.pdf"

TMP_NO_MERMAID="DOCUMENTACION_TECNICA_pdf_tmp.md"
TMP_BODY_HTML="DOCUMENTACION_TECNICA_pdf_body.html"
TMP_HTML="DOCUMENTACION_TECNICA_pdf.html"

awk 'BEGIN{in_mermaid=0} /^```mermaid/{in_mermaid=1; next} in_mermaid && /^```/{in_mermaid=0; next} !in_mermaid{print}' "$INPUT_MD" > "$TMP_NO_MERMAID"

npx -y marked "$TMP_NO_MERMAID" > "$TMP_BODY_HTML"

cat > "$TMP_HTML" <<'HTML'
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Documentacion Tecnica ESAP</title>
  <style>
    @page { size: A4; margin: 18mm 14mm; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111827; font-size: 11pt; line-height: 1.45; }
    h1, h2, h3, h4 { color: #0f3d75; margin-top: 1.2em; }
    h1 { font-size: 21pt; page-break-after: avoid; }
    h2 { font-size: 16pt; page-break-after: avoid; }
    h3 { font-size: 13pt; page-break-after: avoid; }
    p, li { orphans: 3; widows: 3; }
    img { max-width: 100%; height: auto; border: 1px solid #d1d5db; page-break-inside: avoid; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0 14px; font-size: 10pt; }
    th, td { border: 1px solid #d1d5db; padding: 6px 8px; vertical-align: top; }
    th { background: #f3f4f6; }
    code { background: #f3f4f6; padding: 1px 3px; border-radius: 3px; }
    pre { background: #f9fafb; border: 1px solid #e5e7eb; padding: 10px; overflow-wrap: anywhere; white-space: pre-wrap; }
    hr { border: 0; border-top: 1px solid #d1d5db; margin: 16px 0; }
  </style>
</head>
<body>
HTML

cat "$TMP_BODY_HTML" >> "$TMP_HTML"
cat >> "$TMP_HTML" <<'HTML'
</body>
</html>
HTML

weasyprint --base-url . "$TMP_HTML" "$OUTPUT_PDF"

echo "PDF generado: $OUTPUT_PDF"

rm -f "$TMP_NO_MERMAID" "$TMP_BODY_HTML" "$TMP_HTML"
